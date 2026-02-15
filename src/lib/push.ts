import { createClient } from '@/lib/supabase/client';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/**
 * Convert VAPID key from base64 to Uint8Array for the Push API
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if push notifications are supported and permission status
 */
export function getPushStatus(): {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
} {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return { supported: false, permission: 'unsupported' };
  }
  return { supported: true, permission: Notification.permission };
}

/**
 * Request notification permission and subscribe to push
 * Returns true if successfully subscribed
 */
export async function subscribeToPush(): Promise<boolean> {
  try {
    const { supported } = getPushStatus();
    if (!supported) return false;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // If no subscription, create one
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisuallyIndicatesInterest: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    // Save to Supabase
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const subJSON = subscription.toJSON();

    await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint: subJSON.endpoint!,
        p256dh: subJSON.keys!.p256dh!,
        auth_key: subJSON.keys!.auth!,
        device_name: getDeviceName(),
        active: true,
      },
      { onConflict: 'user_id,endpoint' }
    );

    return true;
  } catch (error) {
    console.error('Push subscription error:', error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      // Deactivate in Supabase
      const supabase = createClient();
      const subJSON = subscription.toJSON();
      await supabase
        .from('push_subscriptions')
        .update({ active: false })
        .eq('endpoint', subJSON.endpoint!);
    }

    return true;
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return false;
  }
}

/**
 * Check if user is currently subscribed to push
 */
export async function isSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/**
 * Simple device name detection
 */
function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  return 'Unknown';
}
