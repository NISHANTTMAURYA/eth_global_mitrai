import webpush from 'web-push';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const keyFile = path.join(
  process.env.MITRAI_DATA_DIR || path.join(process.cwd(), '.data'),
  'push-vapid.json',
);
export function pushKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  if (!existsSync(keyFile)) {
    try {
      writeFileSync(keyFile, JSON.stringify(webpush.generateVAPIDKeys()), {
        mode: 0o600,
        flag: 'wx',
      });
    } catch (error) {
      if (!existsSync(keyFile)) throw error;
    }
  }
  return JSON.parse(readFileSync(keyFile, 'utf8')) as { publicKey: string; privateKey: string };
}
export function allowedPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint),
      h = url.hostname;
    return (
      url.protocol === 'https:' &&
      !url.port &&
      (h === 'fcm.googleapis.com' ||
        h.endsWith('.push.services.mozilla.com') ||
        h === 'web.push.apple.com' ||
        h.endsWith('.notify.windows.com'))
    );
  } catch {
    return false;
  }
}
export async function sendPush(subscription: webpush.PushSubscription, payload: string) {
  await webpush.sendNotification(subscription, payload, {
    TTL: 3600,
    timeout: 15000,
    vapidDetails: {
      ...pushKeys(),
      subject: process.env.VAPID_SUBJECT || 'mailto:notifications@mitrai.local',
    },
  });
}
