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
    console.log('[Push] Supported:', supported, 'VAPID key:', VAPID_PUBLIC_KEY ? 'present' : 'MISSING');
    if (!supported) return false;

    const permission = await Notification.requestPermission();
    console.log('[Push] Permission:', permission);
    if (permission !== 'granted') return false;

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] SW ready:', registration.scope);

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    console.log('[Push] Existing subscription:', !!subscription);

    // If no subscription, create one
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisuallyIndicatesInterest: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
      console.log('[Push] New subscription created');
    }

    // Save to Supabase via API route
    const subJSON = subscription.toJSON();
    console.log('[Push] Saving subscription, endpoint:', subJSON.endpoint?.substring(0, 50));

    // Get auth token for the API route
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[Push] Auth session:', session ? 'present' : 'MISSING');

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ subscription: subJSON }),
    });

    const result = await res.json();
    console.log('[Push] Save result:', result);

    return result.success === true;
  } catch (error) {
    console.error('[Push] Subscription error:', error);
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
