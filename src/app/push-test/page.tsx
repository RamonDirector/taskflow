'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

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

export default function PushTestPage() {
  const [logs, setLogs] = useState<string[]>([]);

  const log = (msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const testPush = async () => {
    setLogs([]);

    // Step 1: Check support
    log(`Notification in window: ${'Notification' in window}`);
    log(`serviceWorker in navigator: ${'serviceWorker' in navigator}`);
    log(`VAPID key: ${VAPID_PUBLIC_KEY ? VAPID_PUBLIC_KEY.substring(0, 15) + '...' : 'EMPTY!'}`);

    if (!('Notification' in window)) { log('FAIL: No Notification API'); return; }
    if (!('serviceWorker' in navigator)) { log('FAIL: No Service Worker'); return; }

    // Step 2: Permission
    log(`Current permission: ${Notification.permission}`);
    const perm = await Notification.requestPermission();
    log(`After request: ${perm}`);
    if (perm !== 'granted') { log('FAIL: Permission not granted'); return; }

    // Step 3: Service Worker
    try {
      const reg = await navigator.serviceWorker.ready;
      log(`SW ready: ${reg.scope}`);
      log(`SW state: ${reg.active?.state}`);
    } catch (e: any) {
      log(`SW error: ${e.message}`);
      return;
    }

    // Step 4: Push subscription
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      log(`Existing subscription: ${!!sub}`);

      if (!sub) {
        log('Creating new subscription...');
        sub = await reg.pushManager.subscribe({
          userVisuallyIndicatesInterest: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        log('Subscription created!');
      }

      const subJSON = sub.toJSON();
      log(`Endpoint: ${subJSON.endpoint?.substring(0, 60)}...`);
      log(`Has p256dh: ${!!subJSON.keys?.p256dh}`);
      log(`Has auth: ${!!subJSON.keys?.auth}`);

      // Step 5: Get auth session
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      log(`Auth session: ${session ? 'present' : 'MISSING'}`);
      if (!session) { log('FAIL: No auth session — are you logged in?'); return; }

      // Step 6: Save via API
      log('Calling /api/push/subscribe...');
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ subscription: subJSON }),
      });

      const result = await res.json();
      log(`API response (${res.status}): ${JSON.stringify(result)}`);

      if (result.success) {
        log('SUCCESS! Push subscription saved.');
      } else {
        log(`FAIL: ${result.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      log(`Error: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 14 }}>
      <h1>Push Notification Test</h1>
      <button
        onClick={testPush}
        style={{ padding: '12px 24px', fontSize: 16, background: '#6b8f71', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
      >
        Run Push Test
      </button>
      <div style={{ marginTop: 20, whiteSpace: 'pre-wrap' }}>
        {logs.map((l, i) => (
          <div key={i} style={{ padding: '2px 0', color: l.includes('FAIL') ? 'red' : l.includes('SUCCESS') ? 'green' : 'inherit' }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}
