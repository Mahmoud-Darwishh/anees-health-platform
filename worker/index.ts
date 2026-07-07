type PushEventLike = Event & {
  data?: {
    json: () => Record<string, unknown>;
    text: () => string;
  };
  waitUntil: (promise: Promise<unknown>) => void;
};

type NotificationEventLike = Event & {
  notification: Notification & {
    data?: {
      url?: string;
    };
  };
  waitUntil: (promise: Promise<unknown>) => void;
};

type ServiceWorkerClientLike = {
  url: string;
  navigate: (url: string) => Promise<unknown>;
  focus: () => Promise<unknown>;
};

type AneesNotificationOptions = NotificationOptions & {
  actions?: Array<{
    action: string;
    title: string;
  }>;
};

type PushSubscriptionLike = {
  endpoint: string;
  toJSON: () => Record<string, unknown>;
  options?: {
    applicationServerKey?: ArrayBuffer | null;
  };
};

type PushSubscriptionChangeEventLike = Event & {
  oldSubscription?: PushSubscriptionLike | null;
  newSubscription?: PushSubscriptionLike | null;
  waitUntil: (promise: Promise<unknown>) => void;
};

type ExtendableEventLike = Event & {
  waitUntil: (promise: Promise<unknown>) => void;
};

type ExtendableMessageEventLike = Event & {
  data?: { type?: string } | null;
};

type ServiceWorkerGlobalLike = typeof globalThis & {
  registration: {
    showNotification: (title: string, options: NotificationOptions) => Promise<void>;
    pushManager: {
      getSubscription: () => Promise<PushSubscriptionLike | null>;
      subscribe: (options: {
        userVisibleOnly: boolean;
        applicationServerKey: ArrayBuffer | Uint8Array;
      }) => Promise<PushSubscriptionLike>;
    };
  };
  clients: {
    matchAll: (options: { type: 'window'; includeUncontrolled: boolean }) => Promise<ServiceWorkerClientLike[]>;
    openWindow: (url: string) => Promise<unknown>;
    claim: () => Promise<void>;
  };
  location: {
    origin: string;
  };
  skipWaiting: () => Promise<void>;
};

const sw = self as unknown as ServiceWorkerGlobalLike;

function base64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// Best-effort re-sync of a live push subscription to the server, so the saved
// subscriber list never silently drifts from the browser's actual state.
async function syncSubscriptionToServer(subscription: PushSubscriptionLike): Promise<void> {
  try {
    await fetch('/api/pwa/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });
  } catch {
    // Network hiccups are non-fatal; the next app load re-syncs.
  }
}

// Browsers can rotate or invalidate a push subscription at any time (key
// rotation, storage pressure, etc.). When that happens the old endpoint stops
// receiving pushes. We resubscribe with the same VAPID key and re-register the
// fresh subscription so the user keeps receiving Anees alerts without reopening
// the app. This is the single biggest cause of "lost" subscribers.
async function handleSubscriptionChange(event: PushSubscriptionChangeEventLike): Promise<void> {
  try {
    let applicationServerKey: ArrayBuffer | Uint8Array | null =
      event.oldSubscription?.options?.applicationServerKey ?? null;

    if (!applicationServerKey) {
      const response = await fetch('/api/pwa/public-key');
      const result = (await response.json()) as { publicKey?: string };
      if (result.publicKey) {
        applicationServerKey = base64ToUint8Array(result.publicKey);
      }
    }

    if (!applicationServerKey) {
      return;
    }

    const nextSubscription =
      event.newSubscription ??
      (await sw.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      }));

    await syncSubscriptionToServer(nextSubscription);
  } catch {
    // Swallow — a failed resubscribe must never crash the worker.
  }
}

self.addEventListener('push', (event: Event) => {
  const pushEvent = event as PushEventLike;
  const fallback = {
    title: 'Anees Health',
    body: 'You have a new healthcare update.',
    url: '/en',
  };

  let payload = fallback;

  if (pushEvent.data) {
    try {
      payload = { ...fallback, ...pushEvent.data.json() };
    } catch {
      payload = {
        ...fallback,
        body: pushEvent.data.text() || fallback.body,
      };
    }
  }

  const notificationOptions: AneesNotificationOptions = {
    body: payload.body,
    icon: '/assets/img/anees-app-icon-192.png',
    badge: '/assets/img/fav.png',
    tag: 'anees-health-update',
    actions: [
      {
        action: 'open',
        title: 'Open Anees',
      },
    ],
    data: {
      url: payload.url || '/en',
    },
  };

  pushEvent.waitUntil(
    sw.registration.showNotification(payload.title, notificationOptions)
  );
});

self.addEventListener('notificationclick', (event: Event) => {
  const notificationEvent = event as NotificationEventLike;
  notificationEvent.notification.close();

  const targetUrl = notificationEvent.notification.data?.url || '/en';

  notificationEvent.waitUntil(
    sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const matchingClient = clients.find((client) => client.url.includes(sw.location.origin));

      if (matchingClient) {
        matchingClient.navigate(targetUrl);
        return matchingClient.focus();
      }

      return sw.clients.openWindow(targetUrl);
    })
  );
});

// Keep the saved subscriber alive across browser-initiated key rotations.
self.addEventListener('pushsubscriptionchange', (event: Event) => {
  const changeEvent = event as PushSubscriptionChangeEventLike;
  changeEvent.waitUntil(handleSubscriptionChange(changeEvent));
});

// Let the "Apply update" control in the app activate a freshly installed worker
// on demand instead of waiting for every tab to close.
self.addEventListener('message', (event: Event) => {
  const messageEvent = event as ExtendableMessageEventLike;
  if (messageEvent.data?.type === 'SKIP_WAITING') {
    sw.skipWaiting();
  }
});

// Take control of open pages as soon as the new worker activates so update
// hand-offs are immediate and the subscription re-sync path runs promptly.
self.addEventListener('activate', (event: Event) => {
  (event as ExtendableEventLike).waitUntil(sw.clients.claim());
});
