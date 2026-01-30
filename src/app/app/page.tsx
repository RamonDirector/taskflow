'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  category?: string;
  due_date?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface ExtractedTask {
  title: string;
  category: string;
  due_date: string | null;
  priority: 'high' | 'medium' | 'low';
}

const categoryIcons: Record<string, string> = {
  work: '💼',
  personal: '👤',
  health: '💪',
  finance: '💰',
  home: '🏠',
  social: '👥',
  learning: '📚',
  errands: '📋',
};

const priorityRingColors: Record<string, string> = {
  high: 'ring-red-400',
  medium: 'ring-amber-400',
  low: 'ring-green-400',
};

const priorityBgColors: Record<string, string> = {
  high: 'bg-red-50',
  medium: 'bg-amber-50',
  low: 'bg-green-50',
};

// Satisfying "ding" sound using Web Audio API
const playTaskCreatedSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1320, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {
    // Silently fail if audio is not supported
  }
};

// Confetti burst for completing tasks
const fireConfetti = () => {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#22c55e', '#4ade80', '#86efac', '#bbf7d0'],
  });
};

export default function AppDashboard() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [transcript, setTranscript] = useState('');
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [showExtracted, setShowExtracted] = useState(false);
  const [error, setError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) throw new Error('Transcription failed');
      const { text } = await transcribeRes.json();
      setTranscript(text);

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

  const saveTasks = async (tasksToSave: ExtractedTask[]) => {
    if (!user) return;

    const rows = tasksToSave.map((task) => ({
      user_id: user.id,
      title: task.title,
      category: task.category,
      due_date: task.due_date,
      priority: task.priority,
      completed: false,
    }));

    const { error } = await supabase.from('tasks').insert(rows);

    if (error) {
      setError('Failed to save tasks. Please try again.');
      return;
    }

    playTaskCreatedSound();
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
      if (!completed) {
        fireConfetti();
      }
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

  const formatDueDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const filteredTasks = tasks.filter(t => 
    priorityFilter === 'all' || t.priority === priorityFilter
  );
  const pendingTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col pb-24">
      {/* Header */}
      <header className="bg-white px-5 py-4 shadow-sm sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              <span className="text-green-500">⚡</span> Taskflow
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Voice-powered tasks</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full px-5 py-4">
        {/* Priority Filter Pills */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm font-medium text-gray-500">Priority</span>
          <div className="flex gap-2">
            {(['all', 'low', 'medium', 'high'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setPriorityFilter(level)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  priorityFilter === level
                    ? level === 'high' 
                      ? 'bg-red-500 text-white shadow-md'
                      : level === 'medium'
                      ? 'bg-amber-500 text-white shadow-md'
                      : level === 'low'
                      ? 'bg-green-500 text-white shadow-md'
                      : 'bg-gray-800 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-600 font-bold">×</button>
          </div>
        )}

        {/* Recording overlay */}
        {(recording || processing) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-sm mx-4">
              {recording ? (
                <>
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-50" />
                    <button
                      onClick={stopRecording}
                      className="relative w-24 h-24 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-2xl font-mono font-bold text-gray-900 mb-1">{formatTime(recordingTime)}</p>
                  <p className="text-gray-500">Tap to stop recording</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-600 font-medium">{processingStep}</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Extracted tasks confirmation */}
        {showExtracted && extractedTasks.length > 0 && (
          <div className="mb-6 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm animate-fade-in">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Found {extractedTasks.length} task{extractedTasks.length > 1 ? 's' : ''}
            </h3>
            {transcript && (
              <p className="text-sm text-gray-400 mb-4 italic">&ldquo;{transcript}&rdquo;</p>
            )}
            <ul className="space-y-3 mb-5">
              {extractedTasks.map((task, i) => (
                <li key={i} className={`p-4 rounded-xl ${priorityBgColors[task.priority]} flex items-center gap-4`}>
                  <div className={`w-12 h-12 rounded-full bg-white ring-3 ${priorityRingColors[task.priority]} flex items-center justify-center text-xl shadow-sm`}>
                    {categoryIcons[task.category] || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-500">
                      {task.due_date ? formatDueDate(task.due_date) : 'No date'} • {task.category}
                    </p>
                  </div>
                  <button
                    onClick={() => removeExtractedTask(i)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button
                onClick={() => saveTasks(extractedTasks)}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-600 active:bg-green-700 transition-all shadow-md"
              >
                Save All
              </button>
              <button
                onClick={() => { setShowExtracted(false); setExtractedTasks([]); }}
                className="px-6 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Task list */}
        <div className="space-y-3">
          {pendingTasks.length > 0 && (
            <>
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 group hover:shadow-md transition-shadow"
                >
                  <div className={`w-12 h-12 rounded-full bg-gray-50 ring-3 ${priorityRingColors[task.priority || 'medium']} flex items-center justify-center text-xl`}>
                    {categoryIcons[task.category || 'errands'] || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-sm text-gray-400">
                      {task.due_date ? formatDueDate(task.due_date) : 'No date'}
                      {task.category && ` • ${task.category}`}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => toggleTask(task.id, task.completed)}
                    className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-green-500 flex items-center justify-center transition-colors"
                  >
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
                Completed ({completedTasks.length})
              </h3>
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white/60 rounded-2xl p-4 mb-2 border border-gray-100 flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl opacity-50">
                    {categoryIcons[task.category || 'errands'] || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-400 line-through truncate">{task.title}</p>
                  </div>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => toggleTask(task.id, task.completed)}
                    className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {tasks.length === 0 && !processing && !showExtracted && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No tasks yet</h3>
              <p className="text-gray-400">Tap the mic button to add your first task</p>
            </div>
          )}

          {filteredTasks.length === 0 && tasks.length > 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No {priorityFilter} priority tasks</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-30">
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={processing}
          className={`w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-all disabled:opacity-50 ${
            recording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-green-500 hover:bg-green-600 hover:scale-105'
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
      </div>
    </main>
  );
}
