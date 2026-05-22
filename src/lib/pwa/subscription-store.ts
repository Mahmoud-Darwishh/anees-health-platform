import { prisma } from '@/lib/db/prisma';

export type AppLocale = 'en' | 'ar';

export type StoredPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  locale: AppLocale;
  createdAt: string;
  updatedAt: string;
};

export async function upsertSubscription(
  subscription: Pick<StoredPushSubscription, 'endpoint' | 'keys' | 'locale'>
): Promise<StoredPushSubscription> {
  const record = await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      locale: subscription.locale,
    },
    create: {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      locale: subscription.locale,
    },
  });

  return {
    endpoint: record.endpoint,
    keys: { p256dh: record.p256dh, auth: record.auth },
    locale: record.locale as AppLocale,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function removeSubscription(endpoint: string) {
  await prisma.pushSubscription.delete({ where: { endpoint } }).catch(() => null);
}

export async function listSubscriptions(locale?: AppLocale): Promise<StoredPushSubscription[]> {
  const records = await prisma.pushSubscription.findMany({
    where: locale ? { locale } : undefined,
  });

  return records.map((r) => ({
    endpoint: r.endpoint,
    keys: { p256dh: r.p256dh, auth: r.auth },
    locale: r.locale as AppLocale,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function countSubscriptions(locale?: AppLocale): Promise<number> {
  return prisma.pushSubscription.count({
    where: locale ? { locale } : undefined,
  });
}
