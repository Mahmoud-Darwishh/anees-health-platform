'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import type { Locale } from '@/i18n/request';

type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
};

type UsePwaManagerOptions = {
  persistDismissedInstallPrompt?: boolean;
  dismissStorageKey?: string;
};

const DEFAULT_DISMISS_KEY = 'anees-pwa-dismissed';

function base64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function isStandaloneMode() {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isSecurePwaContext() {
  if (typeof window === 'undefined') {
    return false;
  }

  const host = window.location.hostname;
  return window.isSecureContext || host === 'localhost' || host === '127.0.0.1';
}

export function usePwaManager(options?: UsePwaManagerOptions) {
  const locale = useLocale() as Locale;
  const dismissStorageKey = options?.dismissStorageKey ?? DEFAULT_DISMISS_KEY;
  const shouldPersistDismiss = options?.persistDismissedInstallPrompt ?? false;

  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  });
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandaloneMode());
  const [dismissedInstallPrompt, setDismissedInstallPrompt] = useState<boolean>(() => {
    if (!shouldPersistDismiss || typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(dismissStorageKey) === '1';
  });
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof Notification === 'undefined') {
      return 'default';
    }

    return Notification.permission;
  });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const checkSubscription = useCallback(async (swRegistration: ServiceWorkerRegistration) => {
    const subscription = await swRegistration.pushManager.getSubscription();
    setIsSubscribed(Boolean(subscription));
    return subscription;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const supported = 'serviceWorker' in navigator && 'PushManager' in window;

    if (!supported) {
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const onControllerChange = () => {
      window.location.reload();
    };

    let isMounted = true;

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker.ready
      .then(async (swRegistration) => {
        if (!isMounted) {
          return;
        }

        setRegistration(swRegistration);
        setHasUpdate(Boolean(swRegistration.waiting));

        swRegistration.addEventListener('updatefound', () => {
          const worker = swRegistration.installing;
          if (!worker) {
            return;
          }

          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              setHasUpdate(true);
            }
          });
        });

        await checkSubscription(swRegistration);
      })
      .catch((error) => {
        console.error('[PWA] Failed to access service worker readiness', error);
      });

    return () => {
      isMounted = false;
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, [checkSubscription]);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      return false;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    return choice.outcome === 'accepted';
  }, [deferredPrompt]);

  const dismissInstallPrompt = useCallback(() => {
    if (shouldPersistDismiss && typeof window !== 'undefined') {
      window.localStorage.setItem(dismissStorageKey, '1');
    }
    setDismissedInstallPrompt(true);
  }, [dismissStorageKey, shouldPersistDismiss]);

  const resetInstallPromptDismissal = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(dismissStorageKey);
    }
    setDismissedInstallPrompt(false);
  }, [dismissStorageKey]);

  const enableNotifications = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      setStatusMessage('This browser does not support web push notifications.');
      return false;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatusMessage('This browser cannot receive Anees app notifications.');
      return false;
    }

    if (!isSecurePwaContext()) {
      setStatusMessage('Open Anees over HTTPS before enabling notifications.');
      return false;
    }

    if (Notification.permission === 'denied') {
      setStatusMessage('Notifications are blocked. Enable them from iPhone Settings, then reopen Anees.');
      return false;
    }

    // Keep the native permission prompt directly tied to the user's tap. On iOS,
    // awaiting the service worker before this call can lose the user gesture.
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission !== 'granted') {
      setStatusMessage('Notifications were not allowed on this device.');
      return false;
    }

    const swRegistration = registration ?? (await navigator.serviceWorker.ready.catch(() => null));

    if (!swRegistration) {
      setStatusMessage('Anees is still preparing app notifications. Reopen the app and try once more.');
      return false;
    }

    setRegistration(swRegistration);

    const existingSubscription = await swRegistration.pushManager.getSubscription();
    let subscription = existingSubscription;

    if (!subscription) {
      const publicKeyResponse = await fetch('/api/pwa/public-key');
      const publicKeyResult = (await publicKeyResponse.json()) as {
        success?: boolean;
        publicKey?: string;
      };

      if (!publicKeyResponse.ok || !publicKeyResult.publicKey) {
        setStatusMessage('Could not get push notification key from the server.');
        return false;
      }

      try {
        subscription = await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(publicKeyResult.publicKey),
        });
      } catch (error) {
        console.error('[PWA] Failed to create push subscription', error);
        setStatusMessage('Could not create a notification subscription on this device.');
        return false;
      }
    }

    const subscriptionPayload = subscription.toJSON();

    const subscribeResponse = await fetch('/api/pwa/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locale,
        subscription: subscriptionPayload,
      }),
    });

    if (!subscribeResponse.ok) {
      setStatusMessage('Could not save push subscription.');
      return false;
    }

    setIsSubscribed(true);
    setStatusMessage('Notifications enabled successfully.');
    return true;
  }, [locale, registration]);

  const disableNotifications = useCallback(async () => {
    const swRegistration = registration ?? (await navigator.serviceWorker.ready.catch(() => null));

    if (!swRegistration) {
      setStatusMessage('Anees app notifications are not ready on this device.');
      return false;
    }

    setRegistration(swRegistration);

    const subscription = await swRegistration.pushManager.getSubscription();

    if (!subscription) {
      setIsSubscribed(false);
      return true;
    }

    await fetch('/api/pwa/subscriptions', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    await subscription.unsubscribe();
    setIsSubscribed(false);
    setStatusMessage('Notifications disabled.');
    return true;
  }, [registration]);

  const applyAppUpdate = useCallback(() => {
    if (!registration?.waiting) {
      return;
    }

    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }, [registration]);

  const clearCaches = useCallback(async () => {
    if (typeof window === 'undefined' || !('caches' in window)) {
      setStatusMessage('Cache API is not available in this browser.');
      return false;
    }

    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
    setStatusMessage('Cached data has been cleared.');
    return true;
  }, []);

  const refreshStatus = useCallback(async () => {
    setIsInstalled(isStandaloneMode());

    if (registration) {
      await checkSubscription(registration);
      await registration.update();
      setHasUpdate(Boolean(registration.waiting));
    }

    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission);
    }
  }, [checkSubscription, registration]);

  const canInstall = useMemo(() => Boolean(deferredPrompt), [deferredPrompt]);

  return {
    isSupported,
    isInstalled,
    canInstall,
    hasUpdate,
    dismissedInstallPrompt,
    notificationPermission,
    isSubscribed,
    statusMessage,
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? '1.1.0',
    installApp,
    dismissInstallPrompt,
    resetInstallPromptDismissal,
    enableNotifications,
    disableNotifications,
    applyAppUpdate,
    clearCaches,
    refreshStatus,
    setStatusMessage,
  };
}
