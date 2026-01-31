'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { InstallPrompt } from '../components/InstallPrompt';

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
  work: '/icons/work.png',
  personal: '/icons/personal.png',
  health: '/icons/health.png',
  finance: '/icons/finance.png',
  home: '/icons/home.png',
  social: '/icons/social.png',
  learning: '/icons/learning.png',
  errands: '/icons/errands.png',
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

const priorityColors: Record<string, { bg: string; ring: string; cardBg: string; cardBgDark: string }> = {
  high: { bg: 'bg-red-50 dark:bg-red-900/30', ring: 'ring-red-400', cardBg: 'bg-red-50/60', cardBgDark: 'dark:bg-red-900/20' },
  medium: { bg: 'bg-amber-50 dark:bg-amber-900/30', ring: 'ring-amber-400', cardBg: 'bg-amber-50/60', cardBgDark: 'dark:bg-amber-900/20' },
  low: { bg: 'bg-green-50 dark:bg-green-900/30', ring: 'ring-green-400', cardBg: 'bg-green-50/60', cardBgDark: 'dark:bg-green-900/20' },
};

// Satisfying "ding" sound using Web Audio API
const playTaskCreatedSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    // Create a richer, more elegant chime with harmonics
    const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    
    // Elegant two-note chime (like a gentle notification)
    playTone(523.25, now, 0.4, 0.15);        // C5
    playTone(659.25, now + 0.08, 0.35, 0.12); // E5
    playTone(783.99, now + 0.16, 0.3, 0.08);  // G5 - subtle high harmonic
    
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
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Dark mode state
  const [darkMode, setDarkMode] = useState(false);
  
  // Stats visibility
  const [showStats, setShowStats] = useState(true);
  
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

  // Load dark mode preference
  useEffect(() => {
    const saved = localStorage.getItem('taskflow-darkmode');
    if (saved === 'true') {
      setDarkMode(true);
    }
  }, []);

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('taskflow-darkmode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('taskflow-darkmode', 'false');
    }
  }, [darkMode]);

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
      setError('Acceso al micrófono denegado. Por favor, permite el acceso e inténtalo de nuevo.');
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
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

    setProcessingStep('Transcribiendo audio...');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) throw new Error('Transcription failed');
      const { text } = await transcribeRes.json();
      setTranscript(text);

      setProcessingStep('Extrayendo tareas...');
      const extractRes = await fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!extractRes.ok) throw new Error('Task extraction failed');
      const { tasks: extracted } = await extractRes.json();

      if (extracted.length === 0) {
        setError('No se encontraron tareas. Intenta ser más específico.');
        setProcessing(false);
        setProcessingStep('');
        return;
      }

      setExtractedTasks(extracted);
      setShowExtracted(true);
      setProcessingStep('');
    } catch {
      setError('Error al procesar el audio. Inténtalo de nuevo.');
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
      setError('Error al guardar las tareas. Inténtalo de nuevo.');
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
    setShowCategoryDropdown(false);
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (editingTask) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [editingTask]);

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

    if (d.toDateString() === today.toDateString()) return 'Hoy';
    if (d.toDateString() === tomorrow.toDateString()) return 'Mañana';
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  // Calculate weekly stats
  const getWeeklyStats = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weekTasks = tasks.filter(t => new Date(t.created_at) >= startOfWeek);
    const weekCompleted = weekTasks.filter(t => t.completed).length;
    const weekTotal = weekTasks.length;
    
    // Dominant priority from pending tasks
    const priorityCount: Record<string, number> = { high: 0, medium: 0, low: 0 };
    pendingTasks.forEach(t => {
      const p = t.priority || 'medium';
      priorityCount[p]++;
    });
    const dominantPriority = Object.entries(priorityCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'medium';
    
    return { weekCompleted, weekTotal, dominantPriority };
  };
  
  const stats = getWeeklyStats();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col pb-8 transition-colors">
      {/* Header - minimal & seamless */}
      <header className="px-5 pt-4 pb-2 sticky top-0 z-40 bg-gradient-to-b from-gray-50 via-gray-50 to-transparent dark:from-gray-900 dark:via-gray-900 dark:to-transparent">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200 tracking-tight">
            taskflow
          </h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Sign out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full px-5 py-4">
        {/* Hero Record Button with Progress Ring */}
        <div className="flex flex-col items-center py-8 mb-4">
          {(() => {
            const progressColors = {
              high: { start: '#ef4444', end: '#f87171' },
              medium: { start: '#f59e0b', end: '#fbbf24' },
              low: { start: '#22c55e', end: '#4ade80' },
            };
            const colors = progressColors[stats.dominantPriority as keyof typeof progressColors] || progressColors.low;
            const progress = stats.weekTotal > 0 ? (stats.weekCompleted / stats.weekTotal) : 0;
            const showProgress = tasks.length > 0 && showStats;
            
            return (
              <div className="relative">
                {/* Progress ring around mic button */}
                {showProgress && (
                  <svg className="absolute inset-[-8px] w-[calc(100%+16px)] h-[calc(100%+16px)] -rotate-90" viewBox="0 0 100 100">
                    {/* Background track */}
                    <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-200/50 dark:text-gray-700/50" />
                    {/* Progress arc */}
                    <circle cx="50" cy="50" r="47" fill="none" stroke={`url(#micProgressGradient)`} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${progress * 295} 295`} className="transition-all duration-700 ease-out" />
                    <defs>
                      <linearGradient id="micProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={colors.start} />
                        <stop offset="100%" stopColor={colors.end} />
                      </linearGradient>
                    </defs>
                  </svg>
                )}
                {/* Mic button */}
                <button
                  onClick={startRecording}
                  disabled={processing}
                  className="relative w-24 h-24 rounded-full bg-white shadow-[0_8px_30px_rgba(34,197,94,0.4)] hover:shadow-[0_8px_40px_rgba(34,197,94,0.5)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 overflow-hidden"
                >
                  {!showProgress && <span className="absolute inset-[-4px] rounded-full border-2 border-green-300/50 animate-ping opacity-30" />}
                  <img 
                    src="/icons/mic-button.png" 
                    alt="Grabar" 
                    className="w-20 h-20 object-contain relative z-10"
                  />
                </button>
              </div>
            );
          })()}
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-3">Aquí cuando me necesites</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center justify-between shadow-sm">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-600 font-bold">×</button>
          </div>
        )}

        {/* Recording fullscreen - sleek minimal design */}
        {(recording || processing) && (
          <div className={`fixed inset-0 ${darkMode ? 'bg-gray-900' : 'bg-[#fafafa]'} z-50 flex flex-col`}>
            {/* Minimal header */}
            <div className="px-5 py-4 flex items-center">
              <button
                onClick={() => { stopRecording(); setProcessing(false); }}
                className={`w-10 h-10 rounded-full ${darkMode ? 'bg-gray-800/60' : 'bg-black/5'} flex items-center justify-center transition-colors hover:bg-black/10`}
              >
                <svg className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center px-8">
              {recording ? (
                <>
                  {/* Waveform - main visual element */}
                  <div className="flex items-center justify-center gap-[3px] h-24 mb-8">
                    {[...Array(40)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-green-500 rounded-full"
                        style={{
                          height: `${20 + Math.sin(i * 0.3) * 30 + Math.random() * 40}%`,
                          animation: `wave 0.5s ease-in-out infinite`,
                          animationDelay: `${i * 25}ms`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Timer */}
                  <p className={`text-3xl font-light ${darkMode ? 'text-white' : 'text-gray-900'} tabular-nums mb-8`}>
                    {formatTime(recordingTime)}
                  </p>

                  {/* Live transcription - only shows when there's text */}
                  {liveTranscript && (
                    <div className={`w-full max-w-md px-4 py-3 ${darkMode ? 'bg-gray-800/40' : 'bg-black/5'} rounded-2xl`}>
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-center text-sm`}>
                        {liveTranscript}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-6 border-[3px] border-green-500 border-t-transparent rounded-full animate-spin" />
                  <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{processingStep}</p>
                </>
              )}
            </div>

            {/* Stop button */}
            {recording && (
              <div className="px-8 pb-16">
                <div className="flex flex-col items-center">
                  <button
                    onClick={stopRecording}
                    className="w-20 h-20 rounded-full bg-green-500 shadow-[0_4px_20px_rgba(34,197,94,0.4)] flex items-center justify-center hover:bg-green-600 transition-all hover:scale-105 active:scale-95"
                  >
                    <div className="w-6 h-6 bg-white rounded-sm" />
                  </button>
                </div>
              </div>
            )}

            {/* CSS for wave animation */}
            <style jsx>{`
              @keyframes wave {
                0%, 100% { transform: scaleY(1); }
                50% { transform: scaleY(0.6); }
              }
            `}</style>
          </div>
        )}

        {/* Edit Modal */}
        {editingTask && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={closeEditModal}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl my-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Editar Tarea</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Título</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                  />
                </div>
                
                <div className="relative">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Categoría</label>
                  <button
                    type="button"
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all flex items-center gap-3 text-left"
                  >
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                      <CategoryIcon category={editCategory || 'personal'} size={32} />
                    </div>
                    <span className="flex-1">{(editCategory || 'personal').charAt(0).toUpperCase() + (editCategory || 'personal').slice(1)}</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showCategoryDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-xl z-10 overflow-hidden max-h-60 overflow-y-auto">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => { setEditCategory(cat); setShowCategoryDropdown(false); }}
                          className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors ${editCategory === cat ? 'bg-green-50 dark:bg-green-900/30' : ''}`}
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                            <CategoryIcon category={cat} size={32} />
                          </div>
                          <span className="text-gray-900 dark:text-white">{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                          {editCategory === cat && (
                            <svg className="w-4 h-4 text-green-500 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 block">Fecha límite</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveEditedTask}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-green-500 hover:bg-green-600 transition-all"
                >
                  Guardar
                </button>
                <button
                  onClick={closeEditModal}
                  className="px-6 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Extracted tasks confirmation */}
        {showExtracted && extractedTasks.length > 0 && (
          <div className="mb-6 p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100/50 dark:border-gray-700/50 shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] animate-fade-in">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              {extractedTasks.length} tarea{extractedTasks.length > 1 ? 's' : ''} encontrada{extractedTasks.length > 1 ? 's' : ''}
            </h3>
            {transcript && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4 italic">&ldquo;{transcript}&rdquo;</p>
            )}
            <ul className="space-y-3 mb-5">
              {extractedTasks.map((task, i) => (
                <li key={i} className={`p-4 rounded-xl ${priorityColors[task.priority].bg} flex items-center gap-4`}>
                  <div className={`w-12 h-12 rounded-full bg-white dark:bg-gray-700 ring-3 ${priorityColors[task.priority].ring} flex items-center justify-center shadow-sm overflow-hidden`}>
                    <CategoryIcon category={task.category} size={36} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {task.due_date ? formatDueDate(task.due_date) : 'Sin fecha'} • {task.category}
                    </p>
                  </div>
                  <button
                    onClick={() => removeExtractedTask(i)}
                    className="text-gray-300 dark:text-gray-500 hover:text-red-500 transition-colors p-1"
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
                Guardar Todo
              </button>
              <button
                onClick={() => { setShowExtracted(false); setExtractedTasks([]); }}
                className="px-6 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        {/* Hint de interacción */}
        {pendingTasks.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-3">
            Toca para editar • Desliza → completar • Desliza ← eliminar
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
                      className={`${colors.cardBg} ${colors.cardBgDark} rounded-2xl p-4 shadow-[0_2px_15px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_15px_rgba(0,0,0,0.3)] border border-gray-100/50 dark:border-gray-700/50 flex items-center gap-4 group hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-shadow cursor-pointer active:scale-[0.99] relative`}
                    >
                      {/* Category icon - tap to cycle priority */}
                      <button
                        onClick={(e) => { e.stopPropagation(); cyclePriority(task.id, priority); }}
                        className={`w-12 h-12 rounded-full bg-white/80 ring-2 ${colors.ring} flex items-center justify-center transition-all hover:scale-105 active:scale-95 overflow-hidden`}
                      >
                        <CategoryIcon category={task.category || 'errands'} size={36} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                        <p className="text-sm text-gray-400 dark:text-gray-400">
                          {task.due_date ? formatDueDate(task.due_date) : 'Sin fecha'}
                          {task.category && ` • ${task.category}`}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleTask(task.id, task.completed); }}
                        className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-600 hover:border-green-500 flex items-center justify-center transition-colors bg-white/50 dark:bg-gray-700/50"
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
              <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
                Completadas ({completedTasks.length})
              </h3>
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-4 mb-2 shadow-[0_2px_10px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] border border-gray-100/50 dark:border-gray-700/50 flex items-center gap-4 group hover:shadow-[0_2px_15px_rgba(0,0,0,0.08)] transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center opacity-50 overflow-hidden">
                    <CategoryIcon category={task.category || 'errands'} size={36} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-400 dark:text-gray-500 line-through truncate">{task.title}</p>
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
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Sin tareas aún</h3>
              <p className="text-gray-400 dark:text-gray-500">Toca el micrófono para añadir tu primera tarea</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Install prompt for PWA */}
      <InstallPrompt />
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
