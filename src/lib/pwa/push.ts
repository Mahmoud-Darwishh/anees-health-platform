import webpush from 'web-push';

type WebPushPayload = {
  title: string;
  body: string;
  url: string;
};

let isConfigured = false;

function getPushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  return {
    publicKey,
    privateKey,
    subject,
  };
}

export function getPublicVapidKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
}

export function ensurePushConfigured() {
  if (isConfigured) {
    return true;
  }

  const { publicKey, privateKey, subject } = getPushConfig();

  if (!publicKey || !privateKey || !subject) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  isConfigured = true;
  return true;
}

export async function sendPushToSubscription(
  subscription: webpush.PushSubscription,
  payload: WebPushPayload
) {
  if (!ensurePushConfigured()) {
    throw new Error('Push notifications are not configured on the server');
  }

  return webpush.sendNotification(subscription, JSON.stringify(payload));
}
