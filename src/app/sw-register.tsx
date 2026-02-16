'use client';

import { useEffect, useState } from 'react';
import { getTranslations, getLocale } from '@/lib/i18n';

export function ServiceWorkerRegistration() {
  const [showUpdate, setShowUpdate] = useState(false);
  const locale = getLocale();
  const t = getTranslations(locale);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);

        // Check for updates every 30 minutes
        setInterval(() => registration.update(), 30 * 60 * 1000);

        // Listen for new service worker waiting
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available — show update banner
              setShowUpdate(true);
            }
          });
        });
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });

    // If a new SW takes control, reload the page
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    setShowUpdate(false);
    navigator.serviceWorker.ready.then((registration) => {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    });
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex justify-center animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-[#2c2c2e] border-2 border-[#6b8f71] shadow-lg max-w-sm w-full">
        <svg className="w-5 h-5 text-[#6b8f71] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
        <p className="text-sm text-gray-900 dark:text-white flex-1">
          {locale === 'es' ? 'Nueva versión disponible' : 'New version available'}
        </p>
        <button
          onClick={handleUpdate}
          className="px-3 py-1.5 text-xs font-medium text-white bg-[#6b8f71] rounded-full hover:bg-[#5a7d60] transition-colors"
        >
          {locale === 'es' ? 'Actualizar' : 'Update'}
        </button>
      </div>
    </div>
  );
}
