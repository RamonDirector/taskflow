'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  initDB, 
  saveRecording, 
  savePendingTask, 
  isOnline as checkOnline,
  onOnlineStatusChange,
  getAllPendingCount,
} from '@/lib/offline-store';
import { 
  syncAll, 
  getSyncStatus, 
  onSyncStatusChange,
  SyncStatus,
  initSyncManager,
} from '@/lib/sync-manager';

export function useOffline(userId: string | null) {
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  const [isReady, setIsReady] = useState(false);

  // Initialize on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await initDB();
        if (mounted) {
          setIsOnline(checkOnline());
          setIsReady(true);
        }
      } catch (error) {
        console.error('Failed to initialize offline store:', error);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Listen to online status changes
  useEffect(() => {
    const unsubscribe = onOnlineStatusChange(setIsOnline);
    return unsubscribe;
  }, []);

  // Listen to sync status changes
  useEffect(() => {
    const unsubscribe = onSyncStatusChange(setSyncStatus);
    return unsubscribe;
  }, []);

  // Initialize sync manager
  useEffect(() => {
    if (!isReady) return;
    
    const unsubscribe = initSyncManager(() => userId);
    return unsubscribe;
  }, [isReady, userId]);

  // Save recording locally
  const saveRecordingOffline = useCallback(async (audioBlob: Blob): Promise<string> => {
    return saveRecording(audioBlob);
  }, []);

  // Save task locally (for offline use)
  const saveTaskOffline = useCallback(async (task: {
    title: string;
    category: string;
    priority: string;
    due_date?: string;
  }): Promise<string> => {
    return savePendingTask(task);
  }, []);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (userId) {
      await syncAll(userId);
    }
  }, [userId]);

  // Get pending counts
  const getPendingCounts = useCallback(async () => {
    return getAllPendingCount();
  }, []);

  return {
    isOnline,
    isReady,
    syncStatus,
    saveRecordingOffline,
    saveTaskOffline,
    triggerSync,
    getPendingCounts,
  };
}

export default useOffline;
