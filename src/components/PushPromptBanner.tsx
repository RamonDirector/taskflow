'use client';

import { useState, useEffect } from 'react';
import { getPushStatus, subscribeToPush, isSubscribed } from '@/lib/push';
import { useLocale } from '@/lib/i18n';
import { PixelBubble } from '@/components/PixelBubble';

const PROMPTED_KEY = 'hansei-push-prompted';

export function PushPromptBanner() {
  const { t } = useLocale();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const checkPush = async () => {
      const alreadyPrompted = localStorage.getItem(PROMPTED_KEY);
      const { supported, permission } = getPushStatus();
      
      if (!supported || permission === 'denied') return;

      // If permission already granted, silently subscribe (no banner needed)
      if (permission === 'granted') {
        const subscribed = await isSubscribed();
        if (!subscribed) {
          await subscribeToPush();
        }
        return;
      }

      // Permission is 'default' — show banner if not yet prompted
      if (alreadyPrompted) return;
      setTimeout(() => setShow(true), 3000);
    };
    checkPush();
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(PROMPTED_KEY, 'true');
    setShow(false);
  };

  const accept = async () => {
    localStorage.setItem(PROMPTED_KEY, 'true');
    await subscribeToPush();
    setShow(false);
  };

  return (
    <div className="px-4 mb-4">
      <div className="rounded-2xl border border-[#6b8f71]/20 bg-[#6b8f71]/5 p-4">
        <p className="text-sm text-[var(--foreground)] mb-3">
          {t.notifications.subtitle}
        </p>
        <div className="flex gap-2">
          <button
            onClick={accept}
            className="flex-1 h-10 rounded-full text-white text-sm font-medium transition-all active:scale-[0.98]"
            style={{ backgroundColor: '#6b8f71' }}
          >
            {t.notifications.accept}
          </button>
          <button
            onClick={dismiss}
            className="px-4 h-10 rounded-full text-sm text-[var(--gray-4)] transition-all active:scale-[0.98]"
          >
            {t.notifications.skip}
          </button>
        </div>
      </div>
    </div>
  );
}
