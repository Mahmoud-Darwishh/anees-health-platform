'use server';

import type { StaffRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getStaffUser } from '@/lib/auth/rbac';
import { ensurePushConfigured, sendPushToSubscription } from '@/lib/pwa/push';
import { listSubscriptions, removeSubscription } from '@/lib/pwa/subscription-store';
import type { AppLocale } from '@/lib/pwa/subscription-store';
import type { PushBroadcastActionState } from './state';

const NOTIFICATION_ADMIN_ROLES: StaffRole[] = ['superadmin', 'admin'];
const DEAD_SUBSCRIPTION_STATUSES = new Set([404, 410]);

function valueOf(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeLocale(value: string): 'all' | AppLocale {
  if (value === 'ar') return 'ar';
  if (value === 'en') return 'en';
  return 'all';
}

function normalizeUrl(value: string) {
  if (!value) return '/en';
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

function statusCodeFrom(error: unknown): number | null {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    return typeof statusCode === 'number' ? statusCode : null;
  }
  return null;
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes('push_subscriptions') || error.message.includes('PushSubscription')) {
      return 'Push notification storage is not ready. Run the latest database migrations, then try again.';
    }

    if (error.message.includes('VAPID') || error.message.includes('Push notifications are not configured')) {
      return 'Push is not configured on this server. Add the VAPID environment variables, then redeploy.';
    }
  }

  return 'Notification sending failed before delivery. Please try again or share this with engineering.';
}

export async function sendPushBroadcastAction(
  _previousState: PushBroadcastActionState,
  formData: FormData
): Promise<PushBroadcastActionState> {
  const fields = {
    title: valueOf(formData, 'title'),
    body: valueOf(formData, 'body'),
    url: valueOf(formData, 'url'),
    locale: normalizeLocale(valueOf(formData, 'locale')),
  };

  try {
    const user = await getStaffUser(NOTIFICATION_ADMIN_ROLES);

    if (!user) {
      return {
        status: 'error',
        message: 'You do not have permission to send app notifications.',
        fields,
      };
    }

    if (fields.title.length < 3 || fields.title.length > 80) {
      return {
        status: 'error',
        message: 'Use a title between 3 and 80 characters.',
        fields,
      };
    }

    if (fields.body.length < 5 || fields.body.length > 180) {
      return {
        status: 'error',
        message: 'Use a message between 5 and 180 characters.',
        fields,
      };
    }

    const url = normalizeUrl(fields.url);
    if (!url) {
      return {
        status: 'error',
        message: 'Use an internal path only, for example /en/portal or /ar/booking.',
        fields,
      };
    }

    if (!ensurePushConfigured()) {
      return {
        status: 'error',
        message: 'Push is not configured. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.',
        fields,
      };
    }

    const targetLocale = fields.locale === 'all' ? undefined : fields.locale;
    const targets = await listSubscriptions(targetLocale);

    if (targets.length === 0) {
      return {
        status: 'warning',
        message: 'No subscribed devices matched this audience yet.',
        requested: 0,
        sent: 0,
        failed: 0,
        fields: { ...fields, url },
      };
    }

    let sent = 0;
    let failed = 0;
    let pruned = 0;

    await Promise.all(
      targets.map(async (subscription) => {
        try {
          await sendPushToSubscription(
            {
              endpoint: subscription.endpoint,
              keys: subscription.keys,
            },
            {
              title: fields.title,
              body: fields.body,
              url,
            }
          );
          sent += 1;
        } catch (error) {
          failed += 1;
          const statusCode = statusCodeFrom(error);
          if (statusCode && DEAD_SUBSCRIPTION_STATUSES.has(statusCode)) {
            await removeSubscription(subscription.endpoint);
            pruned += 1;
          }
        }
      })
    );

    revalidatePath('/admin/notifications');

    return {
      status: sent > 0 ? 'success' : 'warning',
      message:
        sent > 0
          ? `Sent ${sent} of ${targets.length} subscribed devices.${pruned ? ` Removed ${pruned} expired subscriptions.` : ''}`
          : `No devices accepted this notification. ${pruned ? `Removed ${pruned} expired subscriptions.` : 'Check VAPID/browser subscription status.'}`,
      requested: targets.length,
      sent,
      failed,
      fields: { ...fields, url },
    };
  } catch (error) {
    console.error('[Admin Push Broadcast Error]', error);
    return {
      status: 'error',
      message: safeErrorMessage(error),
      fields,
    };
  }
}
