import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/app-logger';

/**
 * Convert a PAID online booking into an operational Visit — created as a draft,
 * UNASSIGNED, `scheduled` visit that the case-manager assigns + schedules on the
 * dispatch board (/admin/ops). Best-effort + idempotent (guarded by
 * `convertedVisitId`); NEVER throws, so it can't roll back a confirmed payment.
 *
 * Service mapping (sensible launch defaults): telemedicine → first active
 * service in the Telemedicine category; package (in-home programme) → first
 * active service in the Doctor-Consultation category (the intake/assessment
 * visit). Falls back to any active service so a missing catalog never blocks.
 */
export async function createVisitFromBooking(bookingRef: string): Promise<void> {
  try {
    const booking = await prisma.onlineBooking.findUnique({
      where: { bookingRef },
      select: {
        bookingRef: true,
        status: true,
        visitType: true,
        amountEgp: true,
        discountEgp: true,
        preferredDate: true,
        countryCode: true,
        phoneNumber: true,
        tenantId: true,
        convertedVisitId: true,
      },
    });

    if (!booking || booking.convertedVisitId || booking.status !== 'payment_completed') {
      return;
    }

    const patient = await prisma.patient.findFirst({
      // Tenant-scoped: resolve the patient within the booking's tenant so a
      // shared phone number can never match a patient in another tenant.
      where: { phone: `${booking.countryCode}${booking.phoneNumber}`, tenantId: booking.tenantId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!patient) {
      logger.warn('createVisitFromBooking: patient not found', { bookingRef });
      return;
    }

    const categoryCode = booking.visitType === 'telemedicine' ? 'CAT-07' : 'CAT-01';
    const category = await prisma.serviceCategory.findFirst({ where: { code: categoryCode }, select: { id: true } });
    const service =
      (category
        ? await prisma.service.findFirst({
            where: { categoryId: category.id, status: 'active' },
            orderBy: { listPriceEgp: 'asc' },
            select: { id: true, defaultProviderPayoutEgp: true },
          })
        : null) ??
      (await prisma.service.findFirst({ where: { status: 'active' }, select: { id: true, defaultProviderPayoutEgp: true } }));

    if (!service) {
      logger.warn('createVisitFromBooking: no active service to map booking to', { bookingRef });
      return;
    }

    const now = new Date();
    const scheduledDate = booking.preferredDate ?? new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const amount = booking.amountEgp;
    const visitCode = `VST_${now.getTime()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    await prisma.$transaction(async (tx) => {
      // Re-check inside the txn to avoid a double-convert race.
      const fresh = await tx.onlineBooking.findUnique({
        where: { bookingRef },
        select: { convertedVisitId: true },
      });
      if (fresh?.convertedVisitId) {
        return;
      }

      const visit = await tx.visit.create({
        data: {
          code: visitCode,
          patientId: patient.id,
          serviceId: service.id,
          bookedDate: now,
          scheduledDate,
          status: 'scheduled',
          state: 'scheduled',
          visitType: booking.visitType === 'telemedicine' ? 'telemedicine' : 'in_home',
          servicePriceEgp: amount,
          discountEgp: booking.discountEgp ?? 0,
          netPriceEgp: amount,
          providerPayoutEgp: service.defaultProviderPayoutEgp ?? 0,
          tenantId: booking.tenantId,
          bookedBy: 'system:booking_conversion',
        },
        select: { id: true },
      });

      await tx.onlineBooking.update({
        where: { bookingRef },
        data: { convertedVisitId: visit.id, convertedAt: now },
      });

      await tx.auditLog.create({
        data: {
          tableName: 'visits',
          recordId: visit.id,
          action: 'create',
          changedFields: {
            source: 'billing.create_visit_from_booking',
            bookingRef,
            serviceId: service.id,
            unassigned: true,
          },
          changedBy: 'system:booking_conversion',
        },
      });
    });
  } catch (error) {
    logger.error('createVisitFromBooking failed', {
      bookingRef,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}
