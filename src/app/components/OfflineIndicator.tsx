'use client';

import { useState, useEffect } from 'react';
import { isOnline, onOnlineStatusChange, getAllPendingCount } from '@/lib/offline-store';
import { getSyncStatus, onSyncStatusChange, SyncStatus } from '@/lib/sync-manager';
import { getLocale } from '@/lib/i18n';

const offlineText = {
  en: {
    offline: 'Offline — Recordings will be saved locally',
    syncing: (n: number) => `Syncing ${n} pending item${n !== 1 ? 's' : ''}...`,
    pending: (n: number) => `${n} item${n !== 1 ? 's' : ''} pending sync`,
    connected: 'Connected! Everything synced',
  },
  es: {
    offline: 'Sin conexión — Las grabaciones se guardarán localmente',
    syncing: (n: number) => `Sincronizando ${n} pendiente${n !== 1 ? 's' : ''}...`,
    pending: (n: number) => `${n} elemento${n !== 1 ? 's' : ''} pendiente${n !== 1 ? 's' : ''} de sincronizar`,
    connected: '¡Conectado! Todo sincronizado',
  },
};

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [pendingCount, setPendingCount] = useState({ recordings: 0, tasks: 0 });
  const [showBanner, setShowBanner] = useState(false);

  const txt = offlineText[getLocale()];

  useEffect(() => {
    setOnline(isOnline());
    
    const unsubOnline = onOnlineStatusChange((status) => {
      setOnline(status);
      if (!status) {
        setShowBanner(true);
      }
    });

    const unsubSync = onSyncStatusChange(setSyncStatus);

    // Check pending count periodically
    const checkPending = async () => {
      try {
        const counts = await getAllPendingCount();
        setPendingCount(counts);
      } catch (e) {
        // IndexedDB might not be ready yet
      }
    };
    
    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      unsubOnline();
      unsubSync();
      clearInterval(interval);
    };
  }, []);

  // Auto-hide banner after coming back online and syncing
  useEffect(() => {
    if (online && !syncStatus?.isSyncing && pendingCount.recordings === 0 && pendingCount.tasks === 0) {
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [online, syncStatus?.isSyncing, pendingCount]);

  const totalPending = pendingCount.recordings + pendingCount.tasks;

  // Don't show anything if online and nothing pending
  if (online && totalPending === 0 && !showBanner) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
      showBanner || !online || totalPending > 0 ? 'translate-y-0' : '-translate-y-full'
    }`}>
      {/* Offline Banner */}
      {!online && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656m-7.072 7.072a9 9 0 010-12.728m3.536 3.536a4 4 0 010 5.656" 
            />
          </svg>
          {txt.offline}
        </div>
      )}

      {/* Syncing Banner */}
      {online && syncStatus?.isSyncing && (
        <div className="bg-blue-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
            />
          </svg>
          {txt.syncing(totalPending)}
        </div>
      )}

      {/* Pending Items Banner (online but has pending) */}
      {online && !syncStatus?.isSyncing && totalPending > 0 && (
        <div className="bg-green-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          {txt.pending(totalPending)}
        </div>
      )}

      {/* Back Online Banner */}
      {online && showBanner && totalPending === 0 && !syncStatus?.isSyncing && (
        <div className="bg-green-500 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {txt.connected}
        </div>
      )}
    </div>
  );
}

export default OfflineIndicator;
