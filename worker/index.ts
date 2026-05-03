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

type ServiceWorkerGlobalLike = typeof globalThis & {
  registration: {
    showNotification: (title: string, options: NotificationOptions) => Promise<void>;
  };
  clients: {
    matchAll: (options: { type: 'window'; includeUncontrolled: boolean }) => Promise<ServiceWorkerClientLike[]>;
    openWindow: (url: string) => Promise<unknown>;
  };
  location: {
    origin: string;
  };
};

const sw = self as unknown as ServiceWorkerGlobalLike;

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

  pushEvent.waitUntil(
    sw.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/assets/img/fav.png',
      badge: '/assets/img/fav.png',
      data: {
        url: payload.url || '/en',
      },
    })
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
