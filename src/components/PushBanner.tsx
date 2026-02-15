'use client';

import { useState, useEffect } from 'react';
import { getPushStatus, subscribeToPush } from '@/lib/push';
import { useLocale } from '@/lib/i18n';

export function PushBanner() {
  const { t } = useLocale();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('hansei-push-dismissed');
    if (dismissed) return;

    const { supported, permission } = getPushStatus();
    if (supported && permission === 'default') {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const handleEnable = async () => {
    setLoading(true);
    await subscribeToPush();
    setShow(false);
    setLoading(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('hansei-push-dismissed', Date.now().toString());
    setShow(false);
  };

  return (
    <div className="mx-4 mb-4 p-4 rounded-2xl border border-[#6b8f71]/30 bg-[#6b8f71]/5 dark:bg-[#6b8f71]/10">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-[#6b8f71] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--foreground)]">{t.push.enable_title}</p>
          <p className="text-xs text-[var(--gray-4)] mt-0.5">{t.push.enable_subtitle}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="px-4 py-2 rounded-full text-xs font-medium text-white bg-[#6b8f71] transition-all active:scale-95 disabled:opacity-50"
            >
              {t.push.enable_button}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 rounded-full text-xs font-medium text-[var(--gray-4)] transition-all active:scale-95"
            >
              {t.push.dismiss}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
