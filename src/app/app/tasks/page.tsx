'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceEditButton from '@/app/components/VoiceEditButton';
import Image from 'next/image';

// Dark mode hook
const useDarkMode = () => {
  const [darkMode, setDarkMode] = useState(false);
  
  useEffect(() => {
    const saved = localStorage.getItem('hansei-darkmode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggle = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('hansei-darkmode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return { darkMode, toggle };
};

const THEME_COLOR = '#6b8f71';
const DELETE_COLOR = '#8B2942'; // Burgundy red

interface Task {
  id: string;
  title: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  created_at: string;
  voice_context?: string;
  type?: string;
  completed?: boolean;
  parent_idea_id?: string;
  origin_idea_id?: string;
  origin_idea_title?: string; // Populated from join
  due_date?: string; // YYYY-MM-DD format
}

const Icons = {
  back: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  trash: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
};

// Idea type for origin tracking
interface Idea {
  id: string;
  title: string;
}

export default function TasksPage() {
  const { darkMode, toggle: toggleDarkMode } = useDarkMode();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]); // For origin labels
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [originFilter, setOriginFilter] = useState<string | null>(null); // null = all, 'independent' = no origin, or idea id
  
  // Voice edit state
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  
  // Voice recording for new task
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingNewTask, setIsRecordingNewTask] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Inline text edit
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  
  // Swipe state
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  
  // Long press for edit
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LONG_PRESS_DELAY = 500;
  
  // Scroll state for header transparency
  const [scrolled, setScrolled] = useState(false);
  
  // Streak state
  const [streak, setStreak] = useState(0);
  
  const router = useRouter();
  const supabase = createClient();

  // Calculate streak - consecutive days with at least one completed task
  const calculateStreak = useCallback((taskData: Task[]) => {
    const completedByDate = new Map<string, boolean>();
    
    // Group completed tasks by date
    taskData.forEach(task => {
      if (task.completed && task.due_date) {
        completedByDate.set(task.due_date, true);
      }
    });
    
    // Count consecutive days backwards from today
    let currentStreak = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) { // Max 1 year
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      if (completedByDate.has(dateStr)) {
        currentStreak++;
      } else if (i > 0) { // Allow today to be incomplete
        break;
      }
    }
    
    return currentStreak;
  }, []);

  const fetchTasks = useCallback(async () => {
    // Fetch tasks
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('type', 'task')
      .is('parent_idea_id', null)
      .order('created_at', { ascending: false });

    if (!taskError && taskData) {
      setTasks(taskData as Task[]);
      setStreak(calculateStreak(taskData as Task[]));
      
      // Fetch ideas for origin labels
      const originIds = [...new Set(taskData.filter(t => t.origin_idea_id).map(t => t.origin_idea_id))];
      if (originIds.length > 0) {
        const { data: ideaData } = await supabase
          .from('tasks')
          .select('id, title')
          .in('id', originIds);
        if (ideaData) {
          setIdeas(ideaData as Idea[]);
        }
      }
    }
  }, [supabase, calculateStreak]);

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

  // Track scroll for header transparency
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prefetch routes for instant navigation
  useEffect(() => {
    router.prefetch('/app');
    router.prefetch('/app/ideas');
  }, [router]);

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateTaskTitle = async (id: string, newTitle: string) => {
    await supabase.from('tasks').update({ title: newTitle }).eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, title: newTitle } : t));
  };

  // Voice edit handler
  const handleVoiceTranscript = async (text: string) => {
    if (!selectedTaskId) return;
    setIsProcessingVoice(true);
    
    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task) {
      setIsProcessingVoice(false);
      return;
    }

    try {
      // Use AI to edit the task based on voice input
      const editRes = await fetch('/api/voice-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editType: 'action-point',
          voiceInput: text,
          context: {
            ideaTitle: 'Tarea',
            stepTitle: task.title,
            stepIndex: 0,
            totalSteps: 1,
          },
        }),
      });
      
      if (editRes.ok) {
        const { result } = await editRes.json();
        const newTitle = result?.title || result?.new_step || text;
        await updateTaskTitle(selectedTaskId, newTitle);
      }
    } catch (e) {
      console.error('Voice edit error:', e);
    }

    setIsProcessingVoice(false);
    setSelectedTaskId(null);
  };

  // Swipe handlers (for complete/delete) + long press for edit
  const handleTouchStart = (e: React.TouchEvent, task: Task) => {
    if (inlineEditId) return;
    touchStartX.current = e.touches[0].clientX;
    setSwipingId(task.id);
    setSwipeOffset(0);
    handleLongPressStart(task);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingId || inlineEditId) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    setSwipeOffset(diff);
    // Cancel long press if user is swiping
    if (Math.abs(diff) > 10) {
      handleLongPressEnd();
    }
  };

  const handleTouchEnd = (task: Task) => {
    handleLongPressEnd();
    if (inlineEditId) return;
    
    const offset = swipeOffset;
    setSwipingId(null);
    setSwipeOffset(0);
    
    // Only trigger swipe actions if actually swiped
    if (Math.abs(offset) > 60) {
      if (offset > 60) {
        toggleTask(task.id);
      } else if (offset < -60) {
        deleteTask(task.id);
      }
    }
  };

  // Tap to select (show mic)
  const handleTaskTap = (task: Task) => {
    if (inlineEditId) return; // Don't change selection while editing
    if (selectedTaskId === task.id) {
      setSelectedTaskId(null);
    } else {
      setSelectedTaskId(task.id);
    }
  };

  // Long press handlers
  const handleLongPressStart = (task: Task) => {
    longPressTimerRef.current = setTimeout(() => {
      // Long press → inline edit
      setSwipingId(null);
      setSwipeOffset(0);
      setSelectedTaskId(null);
      setInlineEditId(task.id);
      setInlineEditValue(task.title);
      if (navigator.vibrate) navigator.vibrate(50);
    }, LONG_PRESS_DELAY);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const saveInlineEdit = async () => {
    if (!inlineEditId || !inlineEditValue.trim()) return;
    await updateTaskTitle(inlineEditId, inlineEditValue.trim());
    setInlineEditId(null);
    setInlineEditValue('');
  };

  const clearSelection = () => {
    setSelectedTaskId(null);
    setInlineEditId(null);
  };

  // Voice recording for NEW task
  const startRecordingForNewTask = async () => {
    try {
      let stream = streamRef.current;
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        await processNewTaskRecording();
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsRecordingNewTask(true);
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (e) {
      console.error('Recording error:', e);
    }
  };

  const stopRecordingNewTask = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    setIsRecording(false);
  };

  const processNewTaskRecording = async () => {
    if (!user) return;
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

    try {
      // 1. Transcribe audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!transcribeRes.ok) throw new Error('Transcription failed');
      
      const { text } = await transcribeRes.json();
      if (!text?.trim()) {
        setIsRecordingNewTask(false);
        return;
      }

      // 2. Extract and separate tasks using AI
      const extractRes = await fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!extractRes.ok) throw new Error('Extraction failed');
      
      const extractData = await extractRes.json();
      const extractedTasks = extractData.tasks || [];
      
      // If no tasks extracted, create one from the raw text
      if (extractedTasks.length === 0) {
        extractedTasks.push({
          title: text.trim(),
          category: 'personal',
          priority: 'high',
        });
      }

      // 3. Insert all extracted tasks with today's date (Foco del día)
      const todayDate = new Date().toISOString().split('T')[0];
      
      const tasksToInsert = extractedTasks.map((task: { title: string; category?: string; priority?: string }) => ({
        user_id: user.id,
        title: task.title,
        type: 'task',
        category: task.category || 'personal',
        priority: task.priority || 'high', // Default to high since recording from Tasks view
        completed: false,
        due_date: todayDate, // Foco del día
      }));

      const { data, error } = await supabase
        .from('tasks')
        .insert(tasksToInsert)
        .select();

      if (!error && data) {
        setTasks(prev => [...data, ...prev]);
      }
    } catch (e) {
      console.error('New task recording error:', e);
    }

    setIsRecordingNewTask(false);
  };

  // Helper to get idea title by id
  const getIdeaTitle = (ideaId: string) => ideas.find(i => i.id === ideaId)?.title || 'Idea';

  // Get unique origins for filter dropdown
  const uniqueOrigins = [...new Set(tasks.filter(t => t.origin_idea_id).map(t => t.origin_idea_id!))];

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Focus tasks: due today, not completed, max 3
  const focusTasks = tasks
    .filter(t => t.due_date === today && !t.completed)
    .slice(0, 3);
  
  const focusTaskIds = new Set(focusTasks.map(t => t.id));

  const filteredTasks = tasks.filter(t => {
    // Status filter
    if (filter === 'pending' && t.completed) return false;
    if (filter === 'completed' && !t.completed) return false;
    
    // Origin filter
    if (originFilter === 'independent' && t.origin_idea_id) return false;
    if (originFilter && originFilter !== 'independent' && t.origin_idea_id !== originFilter) return false;
    
    // Exclude focus tasks from main list (they show separately)
    if (filter === 'all' && focusTaskIds.has(t.id)) return false;
    
    return true;
  });

  const completedCount = tasks.filter(t => t.completed).length;
  const todayCount = tasks.filter(t => t.due_date === today && !t.completed).length;
  
  // Today's progress (for progress bar)
  const todayTotalTasks = tasks.filter(t => t.due_date === today).length;
  const todayCompletedTasks = tasks.filter(t => t.due_date === today && t.completed).length;
  const todayProgress = todayTotalTasks > 0 ? (todayCompletedTasks / todayTotalTasks) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#2d2d30] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6b8f71] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#2d2d30]" onClick={clearSelection}>
      {/* Header - more transparent when scrolled for seamless integration */}
      <header className={`sticky top-0 z-10 px-4 py-3 backdrop-blur-lg transition-all duration-300 ${
        scrolled 
          ? 'bg-white/30 dark:bg-[#2d2d30]/30 border-b border-gray-200/30 dark:border-gray-800/30' 
          : 'bg-white/80 dark:bg-[#2d2d30]/80 border-b border-gray-200 dark:border-gray-800'
      }`}>
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/app')}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {Icons.back}
            </button>
            <Image src="/icon-192-transparent.png" alt="Hansei" width={28} height={28} className="rounded-lg" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Tareas</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
              {completedCount}/{tasks.length}
            </span>
          </div>
          
          {/* Voice button for new task */}
          <div className="flex items-center gap-2">
            {isRecording && isRecordingNewTask && (
              <span className="text-xs text-[#6b8f71] font-medium animate-pulse">Grabando...</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isRecording && isRecordingNewTask) {
                  stopRecordingNewTask();
                } else {
                  startRecordingForNewTask();
                }
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95 relative bg-[#6b8f71]"
            >
              {isRecording && isRecordingNewTask && (
                <div className="absolute inset-0 rounded-full bg-[#6b8f71] animate-ping opacity-30" />
              )}
              <div className="relative w-5 h-5">
                <div className={`absolute inset-0 flex items-center justify-center transition-all ease-out ${isRecording && isRecordingNewTask ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} style={{ transitionDuration: '850ms' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className={`absolute inset-0 flex items-center justify-center transition-all ease-out ${isRecording && isRecordingNewTask ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-45'}`} style={{ transitionDuration: '850ms' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              </div>
            </button>
            
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-3 max-w-2xl mx-auto">
          {(['all', 'pending', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-[#6b8f71] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Completadas'}
            </button>
          ))}
        </div>
        
      </header>

      {/* Task list */}
      <main className="max-w-2xl mx-auto p-4 space-y-3 pb-20">
        {/* Streak badge */}
        {streak > 0 && filter === 'all' && (
          <div className="mb-4 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#6b8f71]/10 to-[#6b8f71]/5 border border-[#6b8f71]/20">
              <span className="text-lg">🔥</span>
              <span className="text-sm font-semibold text-[#6b8f71]">{streak} {streak === 1 ? 'día' : 'días'}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">racha</span>
            </div>
          </div>
        )}

        {/* Focus section - Today's top 3 */}
        {(focusTasks.length > 0 || todayTotalTasks > 0) && filter === 'all' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#6b8f71]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                </svg>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Foco de hoy</h2>
              </div>
              <span className="text-xs font-medium text-[#6b8f71]">
                {todayCompletedTasks}/{todayTotalTasks}
              </span>
            </div>
            
            {/* Progress bar */}
            {todayTotalTasks > 0 && (
              <div className="mb-3">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-[#6b8f71] to-[#8fb996] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${todayProgress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                {todayProgress === 100 && (
                  <p className="text-xs text-center text-[#6b8f71] mt-2 font-medium">
                    ✨ ¡Completaste todo tu foco de hoy!
                  </p>
                )}
                {todayProgress > 0 && todayProgress < 100 && (
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                    {todayTotalTasks - todayCompletedTasks === 1 
                      ? '¡Solo queda 1 tarea!' 
                      : `${todayTotalTasks - todayCompletedTasks} tareas restantes`}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              {focusTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => handleTaskTap(task)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    selectedTaskId === task.id
                      ? 'border-[#6b8f71] ring-2 ring-[#6b8f71]/30 bg-white dark:bg-[#2c2c2e]'
                      : 'border-[#6b8f71]/30 bg-[#6b8f71]/5 dark:bg-[#6b8f71]/10 hover:border-[#6b8f71]/50'
                  }`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                    className="w-6 h-6 rounded-full border-2 border-[#6b8f71] flex-shrink-0 flex items-center justify-center hover:bg-[#6b8f71] hover:text-white transition-all"
                  >
                    {task.completed && Icons.check}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#6b8f71]/20 text-[#6b8f71] font-medium">
                        HOY
                      </span>
                      {task.origin_idea_id && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                          De: {getIdeaTitle(task.origin_idea_id)}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedTaskId === task.id && (
                    <VoiceEditButton
                      onTranscript={handleVoiceTranscript}
                      size="md"
                      disabled={isProcessingVoice}
                    />
                  )}
                </div>
              ))}
            </div>
            {/* Separator */}
            <div className="mt-4 border-t border-gray-200 dark:border-gray-700" />
          </div>
        )}

        {/* Rest of tasks */}
        {filteredTasks.length > 0 && focusTasks.length > 0 && filter === 'all' && (
          <p className="text-xs text-[var(--gray-4)] mb-2">Todas las tareas</p>
        )}

        <AnimatePresence mode="popLayout">
          {filteredTasks.map(task => {
            const isSwiping = swipingId === task.id;
            const isSelected = selectedTaskId === task.id;
            const isInlineEditing = inlineEditId === task.id;
            const showComplete = isSwiping && swipeOffset > 30;
            const showDelete = isSwiping && swipeOffset < -30;

            return (
              <motion.div
                key={task.id}
                layout
                layoutId={task.id}
                initial={false}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ 
                  layout: { type: "tween", duration: 0.2, ease: "easeOut" },
                  opacity: { duration: 0.15 }
                }}
                className="relative overflow-hidden rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Swipe backgrounds */}
                {!isSelected && !isInlineEditing && (
                  <div className="absolute inset-0 flex">
                    {/* Complete background - matcha green */}
                    <div className={`flex-1 bg-[#c8d9cb] flex items-center pl-5 transition-opacity ${showComplete ? 'opacity-100' : 'opacity-0'}`}>
                      <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {/* Delete background - burgundy */}
                    <div className={`flex-1 flex items-center justify-end pr-5 transition-opacity ${showDelete ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: DELETE_COLOR }}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Card */}
                <div
                  style={{
                    transform: isSwiping && !isSelected ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                    transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
                  }}
                  onTouchStart={(e) => handleTouchStart(e, task)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(task)}
                  onClick={() => handleTaskTap(task)}
                  className={`relative p-4 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? 'border-[#6b8f71] ring-2 ring-[#6b8f71]/30 scale-[1.02] bg-white dark:bg-[#2c2c2e]'
                      : task.completed
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                        : 'bg-white dark:bg-[#2c2c2e] border-gray-200 dark:border-gray-700 active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                      className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
                      }`}
                    >
                      {task.completed && Icons.check}
                    </button>

                    <div className="flex-1 min-w-0">
                      {isInlineEditing ? (
                        <input
                          type="text"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveInlineEdit();
                            if (e.key === 'Escape') setInlineEditId(null);
                          }}
                          onBlur={saveInlineEdit}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="w-full text-sm bg-transparent border-b-2 border-[#6b8f71] outline-none text-gray-900 dark:text-white py-1"
                        />
                      ) : (
                        <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                          {task.title}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {task.category && !isInlineEditing && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            {task.category}
                          </span>
                        )}
                        {task.origin_idea_id && !isInlineEditing && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                            De: {getIdeaTitle(task.origin_idea_id)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Voice edit button when selected */}
                    {isSelected && (
                      <VoiceEditButton
                        onTranscript={handleVoiceTranscript}
                        size="md"
                        disabled={isProcessingVoice}
                      />
                    )}
                  </div>

{/* Hint removed - UI should be self-explanatory */}
                  
                  {isProcessingVoice && (
                    <p className="mt-2 text-xs text-[#6b8f71] flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-[#6b8f71] border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl mb-3 block">✓</span>
            <p className="text-gray-500 dark:text-gray-400">
              {filter === 'pending' ? 'No hay tareas pendientes' : filter === 'completed' ? 'No hay tareas completadas' : 'No hay tareas'}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Usa la vista principal para capturar tareas por voz
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
