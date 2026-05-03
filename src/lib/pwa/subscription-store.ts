export type AppLocale = 'en' | 'ar';

export type StoredPushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  locale: AppLocale;
  createdAt: string;
  updatedAt: string;
};

type SubscriptionStore = Map<string, StoredPushSubscription>;

type GlobalWithStore = typeof globalThis & {
  __aneesPushStore?: SubscriptionStore;
};

const globalWithStore = globalThis as GlobalWithStore;

const store = globalWithStore.__aneesPushStore ?? new Map<string, StoredPushSubscription>();

if (!globalWithStore.__aneesPushStore) {
  globalWithStore.__aneesPushStore = store;
}

export function upsertSubscription(
  subscription: Pick<StoredPushSubscription, 'endpoint' | 'keys' | 'locale'>
): Promise<StoredPushSubscription> {
  const existing = store.get(subscription.endpoint);
  const now = new Date().toISOString();

  const normalized: StoredPushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    locale: subscription.locale,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  store.set(subscription.endpoint, normalized);

  return Promise.resolve(normalized);
}

export async function removeSubscription(endpoint: string) {
  return store.delete(endpoint);
}

export async function listSubscriptions(locale?: AppLocale) {
  const values = Array.from(store.values());

  if (!locale) {
    return values;
  }
  return values.filter((subscription) => subscription.locale === locale);
}

export async function countSubscriptions(locale?: AppLocale) {
  const subscriptions = await listSubscriptions(locale);
  return subscriptions.length;
}
