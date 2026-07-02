import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import {
  isWapilotConfigured,
  normalizeWhatsAppChatId,
  sendWapilotTextMessage,
  maskWhatsAppChatId,
} from '@/lib/auth/wapilot';
import { buildPaymentConfirmationMessage } from '@/lib/utils/booking-whatsapp';
import { sendPortalClaimInviteForBooking } from '@/lib/billing/portal-invite';
import { createVisitFromBooking } from '@/lib/billing/create-visit-from-booking';
import { reconcilePaymentAmount } from '@/lib/billing/payment-reconciliation';
import { writeAuditLog } from '@/lib/utils/audit';
import { upsertMedplumPatient } from '@/lib/medplum/patients';
import { createProgramCarePlan } from '@/lib/medplum/care-plans';
import type { CareProgramCode } from '@/lib/medplum/fhir-extensions';

export async function POST(request: NextRequest) {
  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { event: string; data: KashierWebhookData };
  try {
    body = (await request.json()) as { event: string; data: KashierWebhookData };
  } catch {
    return NextResponse.json({ received: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { event, data } = body;
  if (!event || !data) {
    return NextResponse.json({ received: false, error: 'Missing event/data' }, { status: 400 });
  }

  // ── Verify signature (BLOCKING — fail closed) ──────────────────────────────
  const apiKey = process.env.KASHIER_API_KEY;
  if (!apiKey) {
    console.error('[Webhook] KASHIER_API_KEY not set — refusing all webhooks');
    return NextResponse.json({ received: false, error: 'Webhook not configured' }, { status: 503 });
  }

  const kashierSignature = request.headers.get('x-kashier-signature');
  if (!kashierSignature) {
    console.error('[Webhook] Missing x-kashier-signature header for order:', data.merchantOrderId);
    return NextResponse.json({ received: false, error: 'Missing signature' }, { status: 401 });
  }

  if (!Array.isArray(data.signatureKeys) || data.signatureKeys.length === 0) {
    console.error('[Webhook] Missing signatureKeys array in payload for order:', data.merchantOrderId);
    return NextResponse.json({ received: false, error: 'Missing signatureKeys' }, { status: 401 });
  }

  if (!verifyWebhookSignature(data, apiKey, kashierSignature)) {
    console.error('[Webhook] Invalid signature for order:', data.merchantOrderId);
    return NextResponse.json({ received: false, error: 'Invalid signature' }, { status: 401 });
  }

  // ── Process event ──────────────────────────────────────────────────────────
  // Wrapped in try/catch so DB failures return 500 — Kashier will then retry.
  try {
    switch (event) {
      case 'pay': {
        const booking = await prisma.onlineBooking.findUnique({
          where: { bookingRef: data.merchantOrderId },
          select: {
            bookingRef: true,
            status: true,
            fullName: true,
            countryCode: true,
            phoneNumber: true,
            visitType: true,
            packageType: true,
            amountEgp: true,
            discountEgp: true,
            promocodeCode: true,
            currency: true,
            locale: true,
            confirmationSentAt: true,
            inviteSentAt: true,
            tenantId: true,
          },
        });

        if (!booking) {
          return NextResponse.json({ received: false, error: 'Booking not found' }, { status: 404 });
        }

        // ── Replay guard (B12) ────────────────────────────────────────────────
        // A `pay` webhook is signed and can be re-delivered at any time. Once a
        // booking has moved to a terminal/locked state, re-processing a `pay`
        // event would resurrect it — most dangerously un-refunding a refunded
        // booking, or regressing a converted one back to payment_completed.
        // These states are settled: acknowledge the delivery (200, so Kashier
        // stops retrying) but do nothing.
        const REPLAY_LOCKED_STATUSES = new Set(['refunded', 'cancelled', 'converted']);
        if (REPLAY_LOCKED_STATUSES.has(booking.status)) {
          console.warn(
            '[Webhook] Ignoring pay event for %s — booking already in terminal status %s',
            booking.bookingRef,
            booking.status,
          );
          return NextResponse.json({ received: true, ignored: true, reason: 'terminal_status' });
        }

        if (data.status === 'SUCCESS') {
          const normalizedPhone = `${booking.countryCode}${booking.phoneNumber}`;
          const invoiceCode = `INV_${booking.bookingRef}`;
          const paymentCode = `PAY_${booking.bookingRef}`;

          // Reconcile the gateway-reported charge against the booked price BEFORE
          // writing the ledger. We never reject (money was received) but flag +
          // audit any discrepancy so finance can review, instead of silently
          // booking the expected figure.
          const reconciliation = reconcilePaymentAmount({
            expectedAmountEgp: Number(booking.amountEgp),
            expectedCurrency: booking.currency,
            gatewayAmount: Number(data.amount),
            gatewayCurrency: data.currency,
          });
          if (!reconciliation.matched) {
            console.error(
              '[Webhook] Payment reconciliation flag (%s) for %s: gateway %s %s vs booked EGP %s',
              reconciliation.reason,
              booking.bookingRef,
              reconciliation.gatewayCurrency ?? '?',
              reconciliation.gatewayAmount ?? '?',
              reconciliation.expectedAmountEgp,
            );
          }
          const reviewNote = reconciliation.matched
            ? ''
            : ` [REVIEW: payment ${reconciliation.reason} — gateway ${reconciliation.gatewayCurrency ?? '?'} ${reconciliation.gatewayAmount ?? '?'} vs booked EGP ${reconciliation.expectedAmountEgp}]`;

          await prisma.$transaction(async (tx) => {
            const patient = await tx.patient.findFirst({
              // Tenant-scoped: never match a patient outside the booking's tenant.
              where: { phone: normalizedPhone, tenantId: booking.tenantId },
              orderBy: { createdAt: 'desc' },
            });

            if (!patient) {
              throw new Error(`Patient not found for booking ${booking.bookingRef}`);
            }

            const cardPaymentMethod = await tx.paymentMethod.findFirst({
              where: { code: 'PM-04', isActive: true },
              select: { id: true },
            });
            const fallbackPaymentMethod = !cardPaymentMethod
              ? await tx.paymentMethod.findFirst({
                  where: { isActive: true },
                  select: { id: true },
                })
              : null;
            const paymentMethodId = cardPaymentMethod?.id ?? fallbackPaymentMethod?.id;

            if (!paymentMethodId) {
              throw new Error('No active payment method configured');
            }

            const invoice = await tx.invoice.upsert({
              where: { code: invoiceCode },
              create: {
                code: invoiceCode,
                patientId: patient.id,
                linkedType: 'visit',
                grossAmountEgp: booking.amountEgp,
                netAmountEgp: booking.amountEgp,
                status: 'paid',
                notes: `Paid via Kashier for booking ${booking.bookingRef}${reviewNote}`,
              },
              update: {
                patientId: patient.id,
                grossAmountEgp: booking.amountEgp,
                netAmountEgp: booking.amountEgp,
                status: 'paid',
                notes: `Paid via Kashier for booking ${booking.bookingRef}${reviewNote}`,
              },
            });

            await tx.auditLog.create({
              data: {
                tableName: 'invoices',
                recordId: invoice.id,
                action: 'update',
                changedFields: {
                  source: 'api.booking.payment.webhook',
                  fields: ['status', 'grossAmountEgp', 'netAmountEgp'],
                  bookingRef: booking.bookingRef,
                },
                changedBy: 'system:kashier_webhook',
              },
            });

            await tx.payment.upsert({
              where: { code: paymentCode },
              create: {
                code: paymentCode,
                invoiceId: invoice.id,
                patientId: patient.id,
                amountEgp: booking.amountEgp,
                paymentMethodId,
                referenceNumber: data.transactionId || data.kashierOrderId || booking.bookingRef,
                notes: `Kashier order ${data.kashierOrderId}; transaction ${data.transactionId}${reviewNote}`,
              },
              update: {
                invoiceId: invoice.id,
                patientId: patient.id,
                amountEgp: booking.amountEgp,
                paymentMethodId,
                referenceNumber: data.transactionId || data.kashierOrderId || booking.bookingRef,
                notes: `Kashier order ${data.kashierOrderId}; transaction ${data.transactionId}${reviewNote}`,
              },
            });

            if (!reconciliation.matched) {
              await tx.auditLog.create({
                data: {
                  tableName: 'payments',
                  recordId: paymentCode,
                  action: 'update',
                  changedFields: {
                    source: 'api.booking.payment.webhook.reconciliation',
                    issue: reconciliation.reason,
                    expectedAmountEgp: reconciliation.expectedAmountEgp,
                    gatewayAmount: reconciliation.gatewayAmount,
                    expectedCurrency: reconciliation.expectedCurrency,
                    gatewayCurrency: reconciliation.gatewayCurrency,
                    bookingRef: booking.bookingRef,
                  },
                  changedBy: 'system:kashier_webhook',
                },
              });
            }

            await tx.onlineBooking.update({
              where: { bookingRef: booking.bookingRef },
              data: {
                status: 'payment_completed',
                kashierOrderId: data.kashierOrderId,
                kashierTransactionId: data.transactionId,
                paymentCompletedAt: new Date(),
              },
            });

            await tx.auditLog.create({
              data: {
                tableName: 'online_bookings',
                recordId: booking.bookingRef,
                action: 'update',
                changedFields: {
                  source: 'api.booking.payment.webhook',
                  fields: ['status', 'kashierOrderId', 'kashierTransactionId', 'paymentCompletedAt'],
                },
                changedBy: 'system:kashier_webhook',
              },
            });

            await tx.patient.update({
              where: { id: patient.id },
              data: { status: 'active' },
            });

            await tx.auditLog.create({
              data: {
                tableName: 'patients',
                recordId: patient.id,
                action: 'update',
                changedFields: {
                  source: 'api.booking.payment.webhook',
                  fields: ['status'],
                },
                changedBy: 'system:kashier_webhook',
              },
            });
          });

          // ── Non-blocking WhatsApp confirmation ─────────────────────────────
          // We never block the webhook on Wapilot failure — Kashier retries
          // would create duplicate Invoices/Payments. Confirmation is
          // best-effort and we record `confirmationSentAt` to avoid resends.
          if (!booking.confirmationSentAt && isWapilotConfigured()) {
            try {
              const chatId = normalizeWhatsAppChatId(
                `${booking.countryCode}${booking.phoneNumber}`,
              );
              if (chatId) {
                const localeForMsg: 'en' | 'ar' = booking.locale === 'ar' ? 'ar' : 'en';
                const text = buildPaymentConfirmationMessage(
                  {
                    fullName: booking.fullName,
                    bookingRef: booking.bookingRef,
                    amountEgp: Number(booking.amountEgp),
                    currency: booking.currency,
                    discountEgp: Number(booking.discountEgp ?? 0),
                    promocode: booking.promocodeCode,
                  },
                  localeForMsg,
                );
                const result = await sendWapilotTextMessage({ chatId, text });
                if (result.ok) {
                  await prisma.onlineBooking.update({
                    where: { bookingRef: booking.bookingRef },
                    data: { confirmationSentAt: new Date() },
                  });
                  console.log(
                    '[Webhook] Confirmation sent to %s for %s',
                    maskWhatsAppChatId(chatId),
                    booking.bookingRef,
                  );
                } else {
                  console.error(
                    '[Webhook] Wapilot send failed for %s: status=%d',
                    booking.bookingRef,
                    result.status,
                  );
                }
              }
            } catch (err) {
              // Never let messaging crash the webhook
              console.error('[Webhook] Confirmation send threw for', booking.bookingRef, err);
            }
          }
          // ── Non-blocking Medplum sync + CarePlan ───────────────────────────
          // Mirror the patient into Medplum and, for paid package bookings,
          // open the matching program CarePlan. Never block the webhook on
          // Medplum — Kashier retries would duplicate Invoices/Payments.
          try {
            const medplumPatient = await prisma.patient.findFirst({
              // Tenant-scoped: never match a patient outside the booking's tenant.
              where: { phone: normalizedPhone, tenantId: booking.tenantId },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                code: true,
                fullName: true,
                phone: true,
                gender: true,
                dateOfBirth: true,
                nationalId: true,
                medplumPatientId: true,
              },
            });

            if (medplumPatient) {
              const synced = await upsertMedplumPatient({
                code: medplumPatient.code,
                fullName: medplumPatient.fullName,
                phone: medplumPatient.phone,
                gender: medplumPatient.gender,
                dateOfBirth: medplumPatient.dateOfBirth,
                nationalId: medplumPatient.nationalId,
                medplumPatientId: medplumPatient.medplumPatientId,
              });

              if (synced.id && synced.id !== medplumPatient.medplumPatientId) {
                await prisma.patient.update({
                  where: { id: medplumPatient.id },
                  data: { medplumPatientId: synced.id },
                });

                await prisma.auditLog.create({
                  data: {
                    tableName: 'patients',
                    recordId: medplumPatient.id,
                    action: 'update',
                    changedFields: {
                      source: 'api.booking.payment.webhook.medplum-link',
                      fields: ['medplumPatientId'],
                    },
                    changedBy: 'system:kashier_webhook',
                  },
                });
              }

              if (booking.visitType === 'package' && booking.packageType && synced.id) {
                await createProgramCarePlan({
                  medplumPatientId: synced.id,
                  program: booking.packageType as CareProgramCode,
                });

                await prisma.auditLog.create({
                  data: {
                    tableName: 'care_plans',
                    recordId: `${booking.bookingRef}:${synced.id}`,
                    action: 'create',
                    changedFields: {
                      source: 'api.booking.payment.webhook.medplum-careplan',
                      fields: ['program', 'status'],
                      program: booking.packageType,
                    },
                    changedBy: 'system:kashier_webhook',
                  },
                });
              }
            }
          } catch (err) {
            console.error('[Webhook] Medplum sync/CarePlan failed for', booking.bookingRef, err);
          }

          // ── Non-blocking portal-claim invite ───────────────────────────────
          // Now that payment is confirmed, invite the patient to claim their
          // portal account (Case ID + signup link via WhatsApp). Shared with the
          // InstaPay manual-confirm path; best-effort + idempotent; never throws.
          await sendPortalClaimInviteForBooking(booking.bookingRef);

          // Convert the paid booking into a draft, unassigned Visit for the
          // dispatch board. Best-effort + idempotent; never blocks the webhook.
          await createVisitFromBooking(booking.bookingRef);
        } else {
          await prisma.$transaction(async (tx) => {
            // Replay-safe (B12): only fail a booking that is still awaiting
            // payment. A stale/duplicate FAILED event must never regress an
            // already payment_completed booking or cancel its paid invoice —
            // reversals go through the `refund` event, not a late `pay` failure.
            const failed = await tx.onlineBooking.updateMany({
              where: {
                bookingRef: data.merchantOrderId,
                status: { in: ['pending', 'payment_pending'] },
              },
              data: { status: 'payment_failed' },
            });

            if (failed.count === 0) {
              console.warn(
                '[Webhook] Ignoring FAILED event for %s — booking not awaiting payment (%s)',
                data.merchantOrderId,
                booking.status,
              );
              return;
            }

            await tx.auditLog.create({
              data: {
                tableName: 'online_bookings',
                recordId: data.merchantOrderId,
                action: 'update',
                changedFields: {
                  source: 'api.booking.payment.webhook',
                  fields: ['status'],
                },
                changedBy: 'system:kashier_webhook',
              },
            });

            const cancelledInvoices = await tx.invoice.updateMany({
              where: { code: `INV_${data.merchantOrderId}`, status: { not: 'paid' } },
              data: { status: 'cancelled' },
            });

            if (cancelledInvoices.count > 0) {
              await tx.auditLog.create({
                data: {
                  tableName: 'invoices',
                  recordId: data.merchantOrderId,
                  action: 'update',
                  changedFields: {
                    source: 'api.booking.payment.webhook',
                    fields: ['status'],
                    count: cancelledInvoices.count,
                  },
                  changedBy: 'system:kashier_webhook',
                },
              });
            }
          });
        }
        break;
      }

      case 'refund': {
        await prisma.$transaction(async (tx) => {
          // Idempotent + replay-safe: only a currently payment_completed booking
          // can transition to refunded. A replayed refund webhook (or one for a
          // booking that was never paid / already refunded) matches zero rows and
          // is a no-op — so a captured, still-validly-signed refund event cannot
          // be replayed later to reverse a re-paid booking.
          const refunded = await tx.onlineBooking.updateMany({
            where: { bookingRef: data.merchantOrderId, status: 'payment_completed' },
            data: { status: 'refunded' },
          });

          if (refunded.count === 0) {
            console.warn(
              '[Webhook] Refund ignored — booking not in payment_completed for order:',
              data.merchantOrderId,
            );
            return;
          }

          await writeAuditLog(
            {
              tableName: 'online_bookings',
              recordId: data.merchantOrderId,
              action: 'update',
              changedFields: { source: 'api.booking.payment.webhook', fields: ['status'] },
              changedBy: 'system:kashier_webhook',
            },
            tx,
          );

          const cancelledInvoices = await tx.invoice.updateMany({
            where: { code: `INV_${data.merchantOrderId}` },
            data: { status: 'cancelled' },
          });

          if (cancelledInvoices.count > 0) {
            await writeAuditLog(
              {
                tableName: 'invoices',
                recordId: data.merchantOrderId,
                action: 'update',
                changedFields: {
                  source: 'api.booking.payment.webhook',
                  fields: ['status'],
                  count: cancelledInvoices.count,
                },
                changedBy: 'system:kashier_webhook',
              },
              tx,
            );
          }
        });
        console.log('[Webhook] Refund processed for order:', data.merchantOrderId);
        break;
      }

      default: {
        console.log('[Webhook] Unhandled event type:', event);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    // DB or other infra failure — return 500 so Kashier retries the webhook
    console.error('[Webhook] Processing error for order:', data.merchantOrderId, error);
    return NextResponse.json({ received: false, error: 'Processing failed' }, { status: 500 });
  }
}

/**
 * Verify Kashier HMAC-SHA256 signature using constant-time comparison.
 */
function verifyWebhookSignature(
  data: KashierWebhookData,
  apiKey: string,
  receivedSignature: string,
): boolean {
  try {
    const sortedKeys = [...data.signatureKeys].sort();
    const pairs = sortedKeys.map((key) => {
      const value = data[key as keyof KashierWebhookData];
      return `${key}=${encodeURIComponent(String(value ?? ''))}`;
    });
    const computed = crypto
      .createHmac('sha256', apiKey)
      .update(pairs.join('&'))
      .digest('hex');

    // Constant-time comparison to prevent timing attacks. Both buffers must
    // be the same length or timingSafeEqual throws.
    const computedBuf = Buffer.from(computed, 'hex');
    const receivedBuf = Buffer.from(receivedSignature, 'hex');
    if (computedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, receivedBuf);
  } catch {
    return false;
  }
}

interface KashierWebhookData {
  merchantOrderId: string;
  kashierOrderId: string;
  orderReference: string;
  transactionId: string;
  status: string;
  method: string;
  creationDate: string;
  amount: number;
  currency: string;
  transactionResponseCode: string;
  transactionResponseMessage?: { en: string; ar: string };
  signatureKeys: string[];
  [key: string]: unknown;
}
