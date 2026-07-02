import 'server-only';

import type { StaffRole } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/utils/app-logger';
import {
  isWapilotConfigured,
  normalizeWhatsAppChatId,
  maskWhatsAppChatId,
  sendWapilotTextMessage,
} from '@/lib/auth/wapilot';
import { listSubscriptionsForUser, removeSubscription } from '@/lib/pwa/subscription-store';
import { sendPushToSubscription } from '@/lib/pwa/push';

/**
 * Per-user notification service (Notifications v1).
 *
 * A single seam every clinical / ops event calls when something matters to a
 * human: assignment → clinician push + WhatsApp, "on the way" → family WhatsApp,
 * no-show risk → ops push. Transport today is web-push (per-user) + Wapilot
 * WhatsApp; FCM/APNs slot in behind the same functions when the mobile app
 * ships. Everything here is best-effort and NEVER throws into the caller — a
 * failed notification must never roll back the clinical/financial write that
 * triggered it.
 *
 * PHI rule: notification bodies are intentionally terse and reference-only
 * (visit code, first name at most). Never put clinical content, full addresses,
 * or payment details in a push/WhatsApp payload — these leave our trust
 * boundary. Callers are responsible for keeping `title`/`body` PHI-light.
 */

export type NotificationChannel = 'push' | 'whatsapp';

export type NotificationResult = {
  push: { attempted: number; delivered: number; pruned: number };
  whatsapp: { attempted: boolean; delivered: boolean };
};

const EMPTY_RESULT: NotificationResult = {
  push: { attempted: 0, delivered: 0, pruned: 0 },
  whatsapp: { attempted: false, delivered: false },
};

// web-push status codes that mean the endpoint is permanently gone.
const DEAD_SUBSCRIPTION_STATUSES = new Set([404, 410]);

function extractStatusCode(error: unknown): number | null {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const code = (error as { statusCode?: unknown }).statusCode;
    if (typeof code === 'number') return code;
  }
  return null;
}

/**
 * Deliver a push notification to every device a specific user has registered.
 * Dead endpoints (404/410) are pruned so the store self-heals.
 */
export async function pushToUser(
  userId: string,
  payload: { title: string; body: string; url: string }
): Promise<NotificationResult['push']> {
  const result = { attempted: 0, delivered: 0, pruned: 0 };
  let subscriptions;
  try {
    subscriptions = await listSubscriptionsForUser(userId);
  } catch {
    logger.error('[notifications] failed to load subscriptions', { userId });
    return result;
  }

  for (const sub of subscriptions) {
    result.attempted += 1;
    try {
      await sendPushToSubscription(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      );
      result.delivered += 1;
    } catch (error) {
      const status = extractStatusCode(error);
      if (status && DEAD_SUBSCRIPTION_STATUSES.has(status)) {
        await removeSubscription(sub.endpoint);
        result.pruned += 1;
      } else {
        // Do not log the endpoint (it is a capability URL) or payload (may hint PHI).
        logger.warn('[notifications] push delivery failed', { userId, status });
      }
    }
  }

  return result;
}

/** Resolve the User.id that owns a given Staff record, if any. */
async function resolveUserIdForStaff(staffId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { staffId },
    select: { id: true },
  });
  return user?.id ?? null;
}

/** Resolve the User.id that owns a given Patient record, if any. */
async function resolveUserIdForPatient(patientId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { patientId },
    select: { id: true },
  });
  return user?.id ?? null;
}

/**
 * Send a WhatsApp text to a raw phone number (best-effort). The number is
 * normalised to a Wapilot chat id; masked in logs so we never record a full
 * PHI-bearing phone number.
 */
export async function sendWhatsAppToPhone(
  phone: string | null | undefined,
  text: string
): Promise<boolean> {
  if (!phone || !text.trim()) return false;
  if (!isWapilotConfigured()) {
    logger.warn('[notifications] wapilot not configured; skipping WhatsApp');
    return false;
  }

  const chatId = normalizeWhatsAppChatId(phone);
  if (!chatId) {
    logger.warn('[notifications] unresolvable WhatsApp number; skipping');
    return false;
  }

  try {
    const res = await sendWapilotTextMessage({ chatId, text });
    if (!res.ok) {
      logger.warn('[notifications] WhatsApp send rejected', {
        status: res.status,
        chat: maskWhatsAppChatId(chatId),
      });
    }
    return res.ok;
  } catch {
    logger.warn('[notifications] WhatsApp send threw', {
      chat: maskWhatsAppChatId(chatId),
    });
    return false;
  }
}

export type NotifyTarget =
  | { userId: string }
  | { staffId: string }
  | { patientId: string };

export type NotifyOptions = {
  title: string;
  body: string;
  /** Deep link opened when the notification is tapped. Defaults to '/'. */
  url?: string;
  /** Also send this text over WhatsApp to the given number. */
  whatsappPhone?: string | null;
  /** WhatsApp text; falls back to `${title} — ${body}` when omitted. */
  whatsappText?: string;
  /** Which channels to attempt. Defaults to ['push']. */
  channels?: NotificationChannel[];
};

/**
 * The one function events call. Resolves the target to a User, fans the push
 * out to their devices, and optionally sends a WhatsApp. Never throws.
 */
export async function notify(
  target: NotifyTarget,
  options: NotifyOptions
): Promise<NotificationResult> {
  const channels = options.channels ?? ['push'];
  const result: NotificationResult = {
    push: { attempted: 0, delivered: 0, pruned: 0 },
    whatsapp: { attempted: false, delivered: false },
  };

  try {
    if (channels.includes('push')) {
      let userId: string | null = null;
      if ('userId' in target) userId = target.userId;
      else if ('staffId' in target) userId = await resolveUserIdForStaff(target.staffId);
      else if ('patientId' in target) userId = await resolveUserIdForPatient(target.patientId);

      if (userId) {
        result.push = await pushToUser(userId, {
          title: options.title,
          body: options.body,
          url: options.url ?? '/',
        });
      }
    }

    if (channels.includes('whatsapp') && options.whatsappPhone) {
      result.whatsapp.attempted = true;
      result.whatsapp.delivered = await sendWhatsAppToPhone(
        options.whatsappPhone,
        options.whatsappText ?? `${options.title} — ${options.body}`
      );
    }
  } catch {
    logger.error('[notifications] notify failed', {
      target: Object.keys(target)[0],
    });
    return EMPTY_RESULT;
  }

  return result;
}

/**
 * Fan a push out to every active staff member holding one of the given roles in
 * a tenant — used by the ops watchdog to alert the dispatch desk. Best-effort;
 * de-duplicates by resolved User.id and never throws. Returns how many staff
 * users were reached with at least one delivered push.
 */
export async function notifyStaffByRoles(
  tenantId: string,
  roles: StaffRole[],
  payload: { title: string; body: string; url?: string }
): Promise<{ targeted: number; delivered: number }> {
  const summary = { targeted: 0, delivered: 0 };
  try {
    const users = await prisma.user.findMany({
      where: {
        staff: { is: { tenantId, status: 'active', role: { in: roles } } },
      },
      select: { id: true },
    });

    for (const user of users) {
      summary.targeted += 1;
      const push = await pushToUser(user.id, {
        title: payload.title,
        body: payload.body,
        url: payload.url ?? '/admin/ops',
      });
      if (push.delivered > 0) summary.delivered += 1;
    }
  } catch {
    logger.error('[notifications] notifyStaffByRoles failed', { tenantId });
  }
  return summary;
}
