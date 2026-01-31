/**
 * Offline Store - IndexedDB for local storage
 * Handles recordings, pending tasks, and sync queue
 */

const DB_NAME = 'taskflow-offline';
const DB_VERSION = 1;

interface PendingRecording {
  id: string;
  audioBlob: Blob;
  timestamp: number;
  status: 'pending' | 'transcribing' | 'syncing' | 'failed';
  transcript?: string;
  extractedTasks?: any[];
  retries: number;
}

interface PendingTask {
  id: string;
  tempId: string;
  task: {
    title: string;
    category: string;
    priority: string;
    due_date?: string;
  };
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retries: number;
}

let db: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Store for pending recordings (audio blobs waiting for transcription/sync)
      if (!database.objectStoreNames.contains('recordings')) {
        const recordingsStore = database.createObjectStore('recordings', { keyPath: 'id' });
        recordingsStore.createIndex('status', 'status', { unique: false });
        recordingsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Store for pending tasks (waiting to sync to Supabase)
      if (!database.objectStoreNames.contains('tasks')) {
        const tasksStore = database.createObjectStore('tasks', { keyPath: 'id' });
        tasksStore.createIndex('status', 'status', { unique: false });
        tasksStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Store for offline settings/state
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

// ============ RECORDINGS ============

export async function saveRecording(audioBlob: Blob): Promise<string> {
  const database = await initDB();
  const id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const recording: PendingRecording = {
    id,
    audioBlob,
    timestamp: Date.now(),
    status: 'pending',
    retries: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = database.transaction('recordings', 'readwrite');
    const store = tx.objectStore('recordings');
    const request = store.add(recording);
    
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getRecording(id: string): Promise<PendingRecording | null> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('recordings', 'readonly');
    const store = tx.objectStore('recordings');
    const request = store.get(id);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function updateRecording(id: string, updates: Partial<PendingRecording>): Promise<void> {
  const database = await initDB();
  const recording = await getRecording(id);
  if (!recording) throw new Error('Recording not found');

  return new Promise((resolve, reject) => {
    const tx = database.transaction('recordings', 'readwrite');
    const store = tx.objectStore('recordings');
    const request = store.put({ ...recording, ...updates });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteRecording(id: string): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('recordings', 'readwrite');
    const store = tx.objectStore('recordings');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingRecordings(): Promise<PendingRecording[]> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('recordings', 'readonly');
    const store = tx.objectStore('recordings');
    const index = store.index('status');
    const request = index.getAll('pending');
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============ TASKS ============

export async function savePendingTask(task: PendingTask['task']): Promise<string> {
  const database = await initDB();
  const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const tempId = `temp_${Date.now()}`;
  
  const pendingTask: PendingTask = {
    id,
    tempId,
    task,
    timestamp: Date.now(),
    status: 'pending',
    retries: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = database.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const request = store.add(pendingTask);
    
    request.onsuccess = () => resolve(tempId);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingTasks(): Promise<PendingTask[]> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('tasks', 'readonly');
    const store = tx.objectStore('tasks');
    const index = store.index('status');
    const request = index.getAll('pending');
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function updatePendingTask(id: string, updates: Partial<PendingTask>): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const task = getRequest.result;
      if (!task) {
        reject(new Error('Task not found'));
        return;
      }
      const putRequest = store.put({ ...task, ...updates });
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function deletePendingTask(id: string): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============ SYNC STATUS ============

export async function getAllPendingCount(): Promise<{ recordings: number; tasks: number }> {
  const recordings = await getPendingRecordings();
  const tasks = await getPendingTasks();
  return {
    recordings: recordings.length,
    tasks: tasks.length,
  };
}

// ============ UTILITY ============

export function isOnline(): boolean {
  return navigator.onLine;
}

export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
