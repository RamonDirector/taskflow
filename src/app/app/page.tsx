'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export default function AppDashboard() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [transcript, setTranscript] = useState('');
  const [extractedTasks, setExtractedTasks] = useState<string[]>([]);
  const [showExtracted, setShowExtracted] = useState(false);
  const [error, setError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data);
    }
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      await fetchTasks();
      setLoading(false);
    };
    init();
  }, [supabase, router, fetchTasks]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const startRecording = async () => {
    setError('');
    setTranscript('');
    setExtractedTasks([]);
    setShowExtracted(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        processAudio();
      };

      mediaRecorder.start(250);
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      setError('Microphone access denied. Please allow microphone access and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const processAudio = async () => {
    setProcessing(true);
    setProcessingStep('Transcribing audio...');

    try {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      // Step 1: Transcribe
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) throw new Error('Transcription failed');
      const { text } = await transcribeRes.json();
      setTranscript(text);

      // Step 2: Extract tasks
      setProcessingStep('Extracting tasks...');
      const extractRes = await fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!extractRes.ok) throw new Error('Task extraction failed');
      const { tasks: extracted } = await extractRes.json();

      if (extracted.length === 0) {
        setError('No actionable tasks found. Try being more specific.');
        setProcessing(false);
        setProcessingStep('');
        return;
      }

      setExtractedTasks(extracted);
      setShowExtracted(true);
      setProcessingStep('');
    } catch {
      setError('Failed to process audio. Please try again.');
    }
    setProcessing(false);
  };

  const saveTasks = async (tasksToSave: string[]) => {
    if (!user) return;

    const rows = tasksToSave.map((title) => ({
      user_id: user.id,
      title,
      completed: false,
    }));

    const { error } = await supabase.from('tasks').insert(rows);

    if (error) {
      setError('Failed to save tasks. Please try again.');
      return;
    }

    setShowExtracted(false);
    setExtractedTasks([]);
    setTranscript('');
    await fetchTasks();
  };

  const toggleTask = async (id: string, completed: boolean) => {
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !completed })
      .eq('id', id);

    if (!error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
      );
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);

    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const removeExtractedTask = (index: number) => {
    setExtractedTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-[#09090b] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <main className="min-h-screen bg-white dark:bg-[#09090b]">
      {/* Header */}
      <header className="border-b border-gray-100 dark:border-gray-800/50 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
            <span className="text-orange-600 dark:text-orange-500">⚡</span> Taskflow
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-600 hidden sm:inline">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 pb-32">
        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 text-sm">
            {error}
            <button
              onClick={() => setError('')}
              className="ml-2 text-red-500 hover:text-red-700 font-medium"
            >
              ×
            </button>
          </div>
        )}

        {/* Processing indicator */}
        {processing && (
          <div className="mb-6 text-center">
            <div className="w-8 h-8 mx-auto mb-2 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{processingStep}</p>
          </div>
        )}

        {/* Extracted tasks confirmation */}
        {showExtracted && extractedTasks.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40">
            <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-1">
              Extracted {extractedTasks.length} task{extractedTasks.length > 1 ? 's' : ''}
            </h3>
            {transcript && (
              <p className="text-xs text-orange-600/70 dark:text-orange-400/50 mb-3 italic">
                &quot;{transcript}&quot;
              </p>
            )}
            <ul className="space-y-2 mb-4">
              {extractedTasks.map((task, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                  <span className="w-5 h-5 rounded-full bg-orange-200 dark:bg-orange-800/40 flex items-center justify-center text-xs font-medium text-orange-700 dark:text-orange-300">
                    {i + 1}
                  </span>
                  <span className="flex-1">{task}</span>
                  <button
                    onClick={() => removeExtractedTask(i)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <button
                onClick={() => saveTasks(extractedTasks)}
                className="flex-1 py-2 rounded-lg font-medium text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 transition-all text-sm"
              >
                Save All
              </button>
              <button
                onClick={() => {
                  setShowExtracted(false);
                  setExtractedTasks([]);
                }}
                className="px-4 py-2 rounded-lg font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Task list */}
        <div className="space-y-6">
          {/* Pending tasks */}
          {pendingTasks.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600 mb-3">
                Tasks ({pendingTasks.length})
              </h2>
              <ul className="space-y-1">
                {pendingTasks.map((task) => (
                  <li
                    key={task.id}
                    className="group flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <button
                      onClick={() => toggleTask(task.id, task.completed)}
                      className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:border-orange-500 dark:hover:border-orange-500 transition-colors flex-shrink-0"
                    />
                    <span className="flex-1 text-sm text-gray-900 dark:text-white">{task.title}</span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600 mb-3">
                Completed ({completedTasks.length})
              </h2>
              <ul className="space-y-1">
                {completedTasks.map((task) => (
                  <li
                    key={task.id}
                    className="group flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <button
                      onClick={() => toggleTask(task.id, task.completed)}
                      className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0"
                    >
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <span className="flex-1 text-sm text-gray-400 dark:text-gray-500 line-through">
                      {task.title}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Empty state */}
          {tasks.length === 0 && !processing && !showExtracted && (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">🎙️</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No tasks yet
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Tap the record button and say your tasks
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating record button */}
      <div className="fixed bottom-0 left-0 right-0 pb-8 pt-4 bg-gradient-to-t from-white dark:from-[#09090b] via-white/80 dark:via-[#09090b]/80 to-transparent pointer-events-none">
        <div className="flex flex-col items-center pointer-events-auto">
          {recording && (
            <div className="mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {formatTime(recordingTime)}
              </span>
            </div>
          )}
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={processing}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              recording
                ? 'bg-red-500 hover:bg-red-600 active:bg-red-700 scale-110 animate-pulse'
                : 'bg-orange-600 hover:bg-orange-700 active:bg-orange-800 hover:scale-105'
            }`}
          >
            {recording ? (
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-600 mt-2">
            {recording ? 'Tap to stop' : processing ? 'Processing...' : 'Tap to record'}
          </span>
        </div>
      </div>
    </main>
  );
}
