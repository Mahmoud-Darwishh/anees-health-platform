import 'server-only';

import { prisma } from '@/lib/db/prisma';
import {
  isWapilotConfigured,
  normalizeWhatsAppChatId,
  sendWapilotTextMessage,
} from '@/lib/auth/wapilot';
import { buildPortalClaimInviteMessage } from '@/lib/utils/booking-whatsapp';

/**
 * Send the patient their portal-claim invite (Case ID + signup link) once a
 * booking's payment is confirmed — by EITHER rail (Kashier webhook or an
 * InstaPay manual confirmation). Best-effort + idempotent (guarded by
 * `inviteSentAt`); NEVER throws, so it can't break the confirming operation.
 *
 * Never log the rendered text — it carries PHI (name) + the Case ID.
 */
export async function sendPortalClaimInviteForBooking(bookingRef: string): Promise<void> {
  if (!isWapilotConfigured()) {
    return;
  }

  try {
    const booking = await prisma.onlineBooking.findUnique({
      where: { bookingRef },
      select: {
        bookingRef: true,
        fullName: true,
        countryCode: true,
        phoneNumber: true,
        locale: true,
        inviteSentAt: true,
        tenantId: true,
      },
    });

    if (!booking || booking.inviteSentAt) {
      return;
    }

    const normalizedPhone = `${booking.countryCode}${booking.phoneNumber}`;
    const claimPatient = await prisma.patient.findFirst({
      // Tenant-scoped: resolve the patient within the booking's tenant.
      where: { phone: normalizedPhone, tenantId: booking.tenantId },
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });

    const chatId = normalizeWhatsAppChatId(`${booking.countryCode}${booking.phoneNumber}`);
    if (!claimPatient?.code || !chatId) {
      return;
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
    const localeForMsg: 'en' | 'ar' = booking.locale === 'ar' ? 'ar' : 'en';
    const claimUrl = `${siteUrl}/${localeForMsg}/auth/signup`;
    const text = buildPortalClaimInviteMessage(
      { fullName: booking.fullName, caseCode: claimPatient.code, claimUrl },
      localeForMsg,
    );

    const result = await sendWapilotTextMessage({ chatId, text });
    if (result.ok) {
      await prisma.onlineBooking.update({
        where: { bookingRef: booking.bookingRef },
        data: { inviteSentAt: new Date() },
      });
    }
  } catch (error) {
    console.error('[portal-invite] Failed to send claim invite for', bookingRef, error);
  }
}
