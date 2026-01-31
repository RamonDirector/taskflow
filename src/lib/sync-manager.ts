/**
 * Sync Manager - Handles background sync when online
 * Processes pending recordings and tasks
 */

import {
  getPendingRecordings,
  getPendingTasks,
  updateRecording,
  updatePendingTask,
  deleteRecording,
  deletePendingTask,
  isOnline,
  onOnlineStatusChange,
} from './offline-store';

const MAX_RETRIES = 3;
let isSyncing = false;
let syncListeners: ((status: SyncStatus) => void)[] = [];

export interface SyncStatus {
  isSyncing: boolean;
  pendingRecordings: number;
  pendingTasks: number;
  lastSyncAt: number | null;
  error: string | null;
}

let currentStatus: SyncStatus = {
  isSyncing: false,
  pendingRecordings: 0,
  pendingTasks: 0,
  lastSyncAt: null,
  error: null,
};

function updateStatus(updates: Partial<SyncStatus>) {
  currentStatus = { ...currentStatus, ...updates };
  syncListeners.forEach(listener => listener(currentStatus));
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter(l => l !== callback);
  };
}

/**
 * Transcribe audio using Web Speech API (offline fallback)
 */
async function transcribeOffline(audioBlob: Blob): Promise<string | null> {
  // Web Speech API doesn't work with blobs directly
  // This is a placeholder - in reality, we'd need to re-record with SpeechRecognition
  // For now, return null to indicate offline transcription not available
  console.log('Offline transcription not available for pre-recorded audio');
  return null;
}

/**
 * Transcribe audio using server API (online)
 */
async function transcribeOnline(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.status}`);
  }

  const data = await response.json();
  return data.text;
}

/**
 * Extract tasks from transcript using server API
 */
async function extractTasks(transcript: string): Promise<any[]> {
  const response = await fetch('/api/extract-tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });

  if (!response.ok) {
    throw new Error(`Task extraction failed: ${response.status}`);
  }

  const data = await response.json();
  return data.tasks;
}

/**
 * Save task to Supabase
 */
async function saveTaskToServer(task: any, userId: string): Promise<any> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...task, user_id: userId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save task: ${response.status}`);
  }

  return response.json();
}

/**
 * Process a single pending recording
 */
async function processRecording(recording: any): Promise<void> {
  try {
    updateRecording(recording.id, { status: 'transcribing' });

    // Try online transcription first
    const transcript = await transcribeOnline(recording.audioBlob);
    
    updateRecording(recording.id, { 
      status: 'syncing',
      transcript,
    });

    // Extract tasks
    const tasks = await extractTasks(transcript);
    
    updateRecording(recording.id, { 
      extractedTasks: tasks,
    });

    // Save tasks (this will be handled separately if user confirms)
    // For auto-save mode, we'd save here
    
    // Mark as complete and delete
    await deleteRecording(recording.id);
    
  } catch (error) {
    console.error('Error processing recording:', error);
    const retries = (recording.retries || 0) + 1;
    
    if (retries >= MAX_RETRIES) {
      await updateRecording(recording.id, { status: 'failed', retries });
    } else {
      await updateRecording(recording.id, { status: 'pending', retries });
    }
    
    throw error;
  }
}

/**
 * Process a single pending task
 */
async function processPendingTask(pendingTask: any, userId: string): Promise<void> {
  try {
    await updatePendingTask(pendingTask.id, { status: 'syncing' });
    
    await saveTaskToServer(pendingTask.task, userId);
    
    await deletePendingTask(pendingTask.id);
    
  } catch (error) {
    console.error('Error syncing task:', error);
    const retries = (pendingTask.retries || 0) + 1;
    
    if (retries >= MAX_RETRIES) {
      await updatePendingTask(pendingTask.id, { status: 'failed', retries });
    } else {
      await updatePendingTask(pendingTask.id, { status: 'pending', retries });
    }
    
    throw error;
  }
}

/**
 * Main sync function - processes all pending items
 */
export async function syncAll(userId?: string): Promise<void> {
  if (isSyncing || !isOnline()) {
    return;
  }

  isSyncing = true;
  updateStatus({ isSyncing: true, error: null });

  try {
    // Get pending items
    const pendingRecordings = await getPendingRecordings();
    const pendingTasks = await getPendingTasks();

    updateStatus({
      pendingRecordings: pendingRecordings.length,
      pendingTasks: pendingTasks.length,
    });

    // Process recordings
    for (const recording of pendingRecordings) {
      try {
        await processRecording(recording);
        updateStatus({
          pendingRecordings: (currentStatus.pendingRecordings || 1) - 1,
        });
      } catch (error) {
        console.error('Failed to process recording:', recording.id);
      }
    }

    // Process tasks (only if we have userId)
    if (userId) {
      for (const task of pendingTasks) {
        try {
          await processPendingTask(task, userId);
          updateStatus({
            pendingTasks: (currentStatus.pendingTasks || 1) - 1,
          });
        } catch (error) {
          console.error('Failed to sync task:', task.id);
        }
      }
    }

    updateStatus({
      lastSyncAt: Date.now(),
    });

  } catch (error) {
    updateStatus({
      error: error instanceof Error ? error.message : 'Sync failed',
    });
  } finally {
    isSyncing = false;
    updateStatus({ isSyncing: false });
  }
}

/**
 * Initialize sync manager - auto-sync when coming online
 */
export function initSyncManager(getUserId: () => string | null): () => void {
  // Sync when coming back online
  const unsubscribe = onOnlineStatusChange((online) => {
    if (online) {
      const userId = getUserId();
      if (userId) {
        syncAll(userId);
      }
    }
  });

  // Initial sync if online
  if (isOnline()) {
    const userId = getUserId();
    if (userId) {
      setTimeout(() => syncAll(userId), 1000);
    }
  }

  return unsubscribe;
}

/**
 * Request background sync (for service worker)
 */
export async function requestBackgroundSync(): Promise<void> {
  if ('serviceWorker' in navigator && 'sync' in (window as any).registration) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('sync-recordings');
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }
}
