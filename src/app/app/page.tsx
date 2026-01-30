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
  work: '/icons/work.svg',
  personal: '/icons/personal.svg',
  health: '/icons/health.svg',
  finance: '/icons/finance.svg',
  home: '/icons/home.svg',
  social: '/icons/social.svg',
  learning: '/icons/learning.svg',
  errands: '/icons/errands.svg',
};

const categoryEmojis: Record<string, string> = {
  work: '💼',
  personal: '👤',
  health: '💪',
  finance: '💰',
  home: '🏠',
  social: '👥',
  learning: '📚',
  errands: '📋',
};

// Icon component for category
const CategoryIcon = ({ category, size = 32 }: { category: string; size?: number }) => (
  <img 
    src={categoryIcons[category] || categoryIcons.errands} 
    alt={category}
    width={size}
    height={size}
    className="object-contain"
  />
);

const categories = ['work', 'personal', 'health', 'finance', 'home', 'social', 'learning', 'errands'];

const priorityColors: Record<string, { bg: string; ring: string; cardBg: string }> = {
  high: { bg: 'bg-red-50', ring: 'ring-red-400', cardBg: 'bg-red-50/60' },
  medium: { bg: 'bg-amber-50', ring: 'ring-amber-400', cardBg: 'bg-amber-50/60' },
  low: { bg: 'bg-green-50', ring: 'ring-green-400', cardBg: 'bg-green-50/60' },
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
  const [liveTranscript, setLiveTranscript] = useState('');
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [showExtracted, setShowExtracted] = useState(false);
  const [error, setError] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  
  // Edit modal state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  
  // Swipe state
  const [swipingTaskId, setSwipingTaskId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
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

  // Start live transcription
  const startLiveTranscription = () => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES'; // Default to Spanish, will auto-detect

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      
      setLiveTranscript(final || interim);
    };

    recognition.onerror = () => {
      // Silently handle errors
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      // Already started or not supported
    }
  };

  const stopLiveTranscription = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const startRecording = async () => {
    setError('');
    setTranscript('');
    setLiveTranscript('');
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
        stopLiveTranscription();
        processAudio();
      };

      mediaRecorder.start(250);
      setRecording(true);
      setRecordingTime(0);
      startLiveTranscription();
      
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
    setLiveTranscript('');
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

  // Cycle priority: high (red) → medium (yellow) → low (green) → high
  const cyclePriority = async (id: string, currentPriority: string) => {
    const cycle: Record<string, 'high' | 'medium' | 'low'> = {
      high: 'medium',
      medium: 'low',
      low: 'high',
    };
    const newPriority = cycle[currentPriority] || 'high';

    const { error } = await supabase
      .from('tasks')
      .update({ priority: newPriority })
      .eq('id', id);

    if (!error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, priority: newPriority } : t))
      );
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // Edit task functions
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditCategory(task.category || 'personal');
    setEditDueDate(task.due_date || '');
  };

  const closeEditModal = () => {
    setEditingTask(null);
    setEditTitle('');
    setEditCategory('');
    setEditDueDate('');
  };

  const saveEditedTask = async () => {
    if (!editingTask) return;

    const { error } = await supabase
      .from('tasks')
      .update({
        title: editTitle,
        category: editCategory,
        due_date: editDueDate || null,
      })
      .eq('id', editingTask.id);

    if (!error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTask.id
            ? { ...t, title: editTitle, category: editCategory, due_date: editDueDate || undefined }
            : t
        )
      );
      closeEditModal();
    }
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent, taskId: string) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipingTaskId(taskId);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingTaskId) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    setSwipeOffset(diff);
  };

  const handleTouchEnd = (task: Task) => {
    if (swipeOffset > 100) {
      // Swipe right - complete
      toggleTask(task.id, task.completed);
    } else if (swipeOffset < -100) {
      // Swipe left - delete
      deleteTask(task.id);
    }
    setSwipingTaskId(null);
    setSwipeOffset(0);
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

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col pb-8">
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
        {/* Hero Record Button */}
        <div className="flex flex-col items-center py-8 mb-4">
          <button
            onClick={startRecording}
            disabled={processing}
            className="relative w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 shadow-[0_8px_30px_rgba(34,197,94,0.4)] hover:shadow-[0_8px_40px_rgba(34,197,94,0.5)] flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50"
          >
            <span className="absolute inset-[-4px] rounded-full border-2 border-green-300/50 animate-ping opacity-30" />
            <svg className="w-9 h-9 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <p className="text-sm text-gray-400 mt-3">Tap to record your tasks</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center justify-between shadow-sm">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-600 font-bold">×</button>
          </div>
        )}

        {/* Recording fullscreen */}
        {(recording || processing) && (
          <div className="fixed inset-0 bg-[#f5f5f0] z-50 flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between">
              <button
                onClick={() => { stopRecording(); setProcessing(false); }}
                className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="text-center">
                <h2 className="font-semibold text-gray-900">Create New Task</h2>
                <p className="text-xs text-gray-400">Let AI handle the details</p>
              </div>
              <div className="w-10" />
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center px-8">
              {recording ? (
                <>
                  <p className="text-green-600 text-lg mb-2">I&apos;m here 🎧</p>
                  <h1 className="text-3xl font-bold text-gray-900 text-center mb-8 leading-tight">
                    Tell me what&apos;s on<br />your mind...
                  </h1>

                  {/* Live transcription */}
                  <div className="w-full max-w-sm min-h-[80px] mb-8 p-4 bg-white/50 rounded-2xl">
                    <p className="text-gray-600 text-center">
                      {liveTranscript || (
                        <span className="text-gray-400">
                          {recordingTime > 5 
                            ? "Take your time, I'm listening... 💭" 
                            : recordingTime > 2 
                            ? "I'm with you... 🎙️" 
                            : "Go ahead, I'm all ears... 👂"}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Waveform visualization */}
                  <div className="flex items-end justify-center gap-1 h-20 mb-12">
                    {[...Array(30)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-green-400 rounded-full animate-pulse"
                        style={{
                          height: `${Math.random() * 60 + 20}%`,
                          animationDelay: `${i * 50}ms`,
                          animationDuration: '300ms',
                        }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 mx-auto mb-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xl font-medium text-gray-700">{processingStep}</p>
                  <p className="text-gray-400 mt-2">This won&apos;t take long...</p>
                </>
              )}
            </div>

            {/* Stop button */}
            {recording && (
              <div className="px-8 pb-12">
                <div className="flex flex-col items-center">
                  <button
                    onClick={stopRecording}
                    className="w-16 h-16 rounded-full bg-green-500 shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors hover:scale-105 active:scale-95"
                  >
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </button>
                  <p className="text-center text-gray-400 text-sm mt-4">Tap to finish • {formatTime(recordingTime)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Edit Modal */}
        {editingTask && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Task</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all bg-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {categoryEmojis[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 mb-1 block">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveEditedTask}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-600 transition-all"
                >
                  Save
                </button>
                <button
                  onClick={closeEditModal}
                  className="px-6 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Extracted tasks confirmation */}
        {showExtracted && extractedTasks.length > 0 && (
          <div className="mb-6 p-5 rounded-2xl bg-white border border-gray-100/50 shadow-[0_4px_20px_rgba(0,0,0,0.1)] animate-fade-in">
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              Found {extractedTasks.length} task{extractedTasks.length > 1 ? 's' : ''}
            </h3>
            {transcript && (
              <p className="text-sm text-gray-400 mb-4 italic">&ldquo;{transcript}&rdquo;</p>
            )}
            <ul className="space-y-3 mb-5">
              {extractedTasks.map((task, i) => (
                <li key={i} className={`p-4 rounded-xl ${priorityColors[task.priority].bg} flex items-center gap-4`}>
                  <div className={`w-12 h-12 rounded-full bg-white ring-3 ${priorityColors[task.priority].ring} flex items-center justify-center shadow-sm overflow-hidden`}>
                    <CategoryIcon category={task.category} size={36} />
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

        {/* Swipe hint */}
        {pendingTasks.length > 0 && (
          <p className="text-xs text-gray-400 text-center mb-3">
            Swipe right to complete • Swipe left to delete • Tap to edit
          </p>
        )}

        {/* Task list */}
        <div className="space-y-3">
          {pendingTasks.length > 0 && (
            <>
              {pendingTasks.map((task) => {
                const priority = task.priority || 'medium';
                const colors = priorityColors[priority];
                const isBeingSwiped = swipingTaskId === task.id;
                const showComplete = swipeOffset > 50;
                const showDelete = swipeOffset < -50;
                
                return (
                  <div
                    key={task.id}
                    className="relative overflow-hidden rounded-2xl"
                  >
                    {/* Swipe backgrounds */}
                    <div className="absolute inset-0 flex">
                      <div className={`flex-1 bg-green-500 flex items-center pl-6 transition-opacity ${showComplete ? 'opacity-100' : 'opacity-0'}`}>
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className={`flex-1 bg-red-500 flex items-center justify-end pr-6 transition-opacity ${showDelete ? 'opacity-100' : 'opacity-0'}`}>
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Task card */}
                    <div
                      onTouchStart={(e) => handleTouchStart(e, task.id)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={() => handleTouchEnd(task)}
                      onClick={() => !isBeingSwiped && openEditModal(task)}
                      style={{
                        transform: isBeingSwiped ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                        transition: isBeingSwiped ? 'none' : 'transform 0.3s ease-out',
                      }}
                      className={`${colors.cardBg} rounded-2xl p-4 shadow-[0_2px_15px_rgba(0,0,0,0.08)] border border-gray-100/50 flex items-center gap-4 group hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-shadow cursor-pointer active:scale-[0.99] relative`}
                    >
                      {/* Category icon - tap to cycle priority */}
                      <button
                        onClick={(e) => { e.stopPropagation(); cyclePriority(task.id, priority); }}
                        className={`w-12 h-12 rounded-full bg-white/80 ring-2 ${colors.ring} flex items-center justify-center transition-all hover:scale-105 active:scale-95 overflow-hidden`}
                      >
                        <CategoryIcon category={task.category || 'errands'} size={36} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{task.title}</p>
                        <p className="text-sm text-gray-400">
                          {task.due_date ? formatDueDate(task.due_date) : 'No date'}
                          {task.category && ` • ${task.category}`}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleTask(task.id, task.completed); }}
                        className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-green-500 flex items-center justify-center transition-colors bg-white/50"
                      >
                      </button>
                    </div>
                  </div>
                );
              })}
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
                  className="bg-white/80 rounded-2xl p-4 mb-2 shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100/50 flex items-center gap-4 group hover:shadow-[0_2px_15px_rgba(0,0,0,0.08)] transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center opacity-50 overflow-hidden">
                    <CategoryIcon category={task.category || 'errands'} size={36} />
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
        </div>
      </div>
    </main>
  );
}

// Add TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
