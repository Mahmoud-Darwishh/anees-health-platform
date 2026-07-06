import { prisma } from '@/lib/db/prisma';

export type AppLocale = 'en' | 'ar';

export type StoredPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  locale: AppLocale;
  createdAt: string;
  updatedAt: string;
};

const subscriptionSelect = {
  endpoint: true,
  p256dh: true,
  auth: true,
  locale: true,
  createdAt: true,
  updatedAt: true,
} as const;

type SelectedPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  locale: AppLocale | string;
  createdAt: Date;
  updatedAt: Date;
};

function toStoredSubscription(record: SelectedPushSubscription): StoredPushSubscription {
  return {
    endpoint: record.endpoint,
    keys: { p256dh: record.p256dh, auth: record.auth },
    locale: record.locale as AppLocale,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function upsertSubscription(
  subscription: Pick<StoredPushSubscription, 'endpoint' | 'keys' | 'locale'> & {
    userId?: string | null;
  }
): Promise<StoredPushSubscription> {
  // Only overwrite userId when a value is supplied, so a re-subscribe from an
  // anonymous context never unlinks an already-owned subscription.
  const ownerPatch = subscription.userId ? { userId: subscription.userId } : {};

  const record = await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      locale: subscription.locale,
      ...ownerPatch,
    },
    create: {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      locale: subscription.locale,
      ...ownerPatch,
    },
    select: subscriptionSelect,
  });

  return toStoredSubscription(record);
}

/** All subscriptions owned by a specific authenticated user. */
export async function listSubscriptionsForUser(
  userId: string
): Promise<StoredPushSubscription[]> {
  const records = await prisma.pushSubscription.findMany({
    where: { userId },
    select: subscriptionSelect,
  });
  return records.map(toStoredSubscription);
}

export async function removeSubscription(endpoint: string) {
  await prisma.pushSubscription.delete({ where: { endpoint } }).catch(() => null);
}

export async function listSubscriptions(locale?: AppLocale): Promise<StoredPushSubscription[]> {
  const records = await prisma.pushSubscription.findMany({
    where: locale ? { locale } : undefined,
    select: subscriptionSelect,
  });

  return records.map(toStoredSubscription);
}

export async function countSubscriptions(locale?: AppLocale): Promise<number> {
  return prisma.pushSubscription.count({
    where: locale ? { locale } : undefined,
  });
}
