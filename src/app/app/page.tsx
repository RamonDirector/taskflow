'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { StreakBadge, MilestoneToast } from '@/components/StreakBadge';
import { calculateStreak, getMilestones, getNewlyAchievedMilestones, type StreakData, type MilestoneData } from '@/lib/gamification/streak';

const THEME_COLOR = '#6b8f71';

// SVG Icons
const Icons = {
  mic: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  ),
  x: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
  lightbulb: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  checkCircle: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  moon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ),
  // Bottom nav icons
  home: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  tasks: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ideas: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  dreams: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ),
};

// Type styles
const typeConfig = {
  task: {
    icon: Icons.checkCircle,
    label: 'Tarea',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    panda: '/panda/new-celebrate.png',
  },
  idea: {
    icon: Icons.lightbulb,
    label: 'Idea',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    panda: '/panda/new-celebrate.png',
  },
  dream: {
    icon: Icons.moon,
    label: 'Sueño',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    panda: '/panda/new-thinking.png',
  },
};

interface CapturedItem {
  title: string;
  type: 'task' | 'idea' | 'dream';
  category: string;
  priority: 'high' | 'medium' | 'low';
  due_date?: string; // ISO date string
}

// Deadline options
const deadlineOptions = [
  { id: 'today', label: 'Hoy', days: 0 },
  { id: 'tomorrow', label: 'Mañana', days: 1 },
  { id: 'week', label: 'Esta semana', days: 7 },
  { id: 'none', label: 'Sin fecha', days: null },
];

export default function PandaHub() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  
  // Panda state
  const [pandaImage, setPandaImage] = useState('/panda/new-wave.png');
  const [pandaMessage, setPandaMessage] = useState('');
  
  // Daily affirmation state
  const [dailyAffirmation, setDailyAffirmation] = useState('');
  
  // Input state
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Captured items (for confirmation)
  const [capturedItems, setCapturedItems] = useState<CapturedItem[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedDeadline, setSelectedDeadline] = useState('today'); // Default to today
  
  // Dark mode
  const [darkMode, setDarkMode] = useState(false);
  const [themeTransition, setThemeTransition] = useState(false);
  const themeToggleRef = useRef<HTMLButtonElement>(null);
  
  // New items indicator for bottom nav
  const [hasNew, setHasNew] = useState({ ideas: false, tasks: false, dreams: false });
  
  // Input focus state
  const [inputFocused, setInputFocused] = useState(false);
  
  // Gamification state
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [showMilestone, setShowMilestone] = useState<MilestoneData | null>(null);
  const [achievedMilestones, setAchievedMilestones] = useState<string[]>([]);
  
  // Nav visibility (hide on scroll down)
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const router = useRouter();
  const supabase = createClient();

  // Initialize
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      const onboardingComplete = localStorage.getItem('taskflow-onboarding-complete');
      if (!onboardingComplete) {
        router.push('/onboarding');
        return;
      }
      
      setUser(user);
      const name = localStorage.getItem('taskflow-user-name') || '';
      setUserName(name);
      setLoading(false);
      
      // Generate both affirmations
      generateDailyAffirmation(user.id, name);
      generateAffirmation(user.id, name);
      
      // Load gamification data
      loadStreakData(user.id);
    };
    init();
  }, [supabase, router]);

  // Generate daily motivational affirmation
  const generateDailyAffirmation = async (userId: string, name: string) => {
    try {
      const now = new Date();
      
      // Fetch basic stats for context
      const [tasksRes, ideasRes] = await Promise.all([
        supabase.from('tasks').select('id, completed').eq('user_id', userId).eq('type', 'task'),
        supabase.from('tasks').select('id').eq('user_id', userId).eq('type', 'idea'),
      ]);

      const tasks = tasksRes.data || [];
      const ideas = ideasRes.data || [];
      const completedToday = tasks.filter(t => t.completed).length;

      const response = await fetch('/api/daily-affirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            userName: name,
            currentHour: now.getHours(),
            dayOfWeek: now.getDay(),
            totalTasks: tasks.length,
            totalIdeas: ideas.length,
            completedToday,
          },
        }),
      });

      if (response.ok) {
        const { affirmation } = await response.json();
        setDailyAffirmation(affirmation);
      }
    } catch (error) {
      console.error('Daily affirmation error:', error);
      setDailyAffirmation('El camino se hace al andar.');
    }
  };

  // Generate AI-powered contextual affirmation
  const generateAffirmation = async (userId: string, name: string) => {
    try {
      // Fetch user stats
      const today = new Date().toISOString().split('T')[0];
      
      const [ideasRes, tasksRes, completedTodayRes] = await Promise.all([
        supabase.from('tasks').select('id, title, created_at').eq('user_id', userId).eq('type', 'idea'),
        supabase.from('tasks').select('id, title, completed, created_at').eq('user_id', userId).eq('type', 'task'),
        supabase.from('tasks').select('id').eq('user_id', userId).eq('type', 'task').eq('completed', true).gte('created_at', today),
      ]);

      const ideas = ideasRes.data || [];
      const tasks = tasksRes.data || [];
      const completedToday = completedTodayRes.data?.length || 0;

      // Calculate streak (simplified)
      const completedTasks = tasks.filter(t => t.completed);
      let streak = 0;
      if (completedTasks.length > 0) {
        const dates = new Set(completedTasks.map(t => t.created_at?.split('T')[0]));
        const todayDate = new Date();
        for (let i = 0; i < 365; i++) {
          const checkDate = new Date(todayDate);
          checkDate.setDate(todayDate.getDate() - i);
          const dateStr = checkDate.toISOString().split('T')[0];
          if (dates.has(dateStr)) {
            streak++;
          } else if (i > 0) break;
        }
      }

      // Determine last action
      let lastAction = null;
      let lastItemTitle = null;
      
      if (ideas.length === 1) lastAction = 'first_idea';
      else if (completedTasks.length === 1) lastAction = 'first_task';
      else if (completedToday > 0) lastAction = 'task_completed';
      else if (ideas.length > 0) {
        const latestIdea = ideas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        lastAction = 'idea_created';
        lastItemTitle = latestIdea?.title;
      }

      // Call affirmation API
      const response = await fetch('/api/affirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: {
            userName: name,
            totalIdeas: ideas.length,
            totalTasks: tasks.length,
            completedToday,
            streak,
            lastAction,
            lastItemTitle,
          },
        }),
      });

      if (response.ok) {
        const { affirmation } = await response.json();
        setPandaMessage(affirmation);
      } else {
        setPandaMessage('¿Qué tienes en mente?');
      }
    } catch (error) {
      console.error('Affirmation error:', error);
      setPandaMessage('¿Qué tienes en mente?');
    }
  };

  // Load gamification data (streak + milestones)
  const loadStreakData = async (userId: string) => {
    try {
      const streak = await calculateStreak(supabase, userId);
      setStreakData(streak);
      
      // Check for milestones
      const milestones = await getMilestones(supabase, userId, streak);
      const previouslyAchieved = JSON.parse(localStorage.getItem('hansei-achieved-milestones') || '[]');
      const newMilestones = getNewlyAchievedMilestones(milestones, previouslyAchieved);
      
      if (newMilestones.length > 0) {
        // Show first new milestone
        setShowMilestone(newMilestones[0]);
        // Save all achieved
        const allAchieved = milestones.filter(m => m.achieved).map(m => m.id);
        localStorage.setItem('hansei-achieved-milestones', JSON.stringify(allAchieved));
        setAchievedMilestones(allAchieved);
        
        // Auto-hide after 4 seconds
        setTimeout(() => setShowMilestone(null), 4000);
      }
    } catch (error) {
      console.error('Streak calculation error:', error);
    }
  };

  // Load dark mode
  useEffect(() => {
    const saved = localStorage.getItem('hansei-darkmode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Prefetch routes for instant navigation
  useEffect(() => {
    router.prefetch('/app/ideas');
    router.prefetch('/app/tasks');
    router.prefetch('/app/dreams');
  }, [router]);

  // Cleanup
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Hide nav on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY.current;
      const scrollingUp = currentScrollY < lastScrollY.current;
      
      // Only trigger if scrolled more than 10px
      if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
        if (scrollingDown && currentScrollY > 50) {
          setNavVisible(false);
        } else if (scrollingUp) {
          setNavVisible(true);
        }
        lastScrollY.current = currentScrollY;
      }
      
      // Always show at top
      if (currentScrollY < 10) {
        setNavVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // Recording functions
  const startRecording = async () => {
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
        if (timerRef.current) clearInterval(timerRef.current);
        await processVoiceInput();
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      setPandaImage('/panda/new-neutral.png');
      setPandaMessage('Te escucho...');
      
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e) {
      console.error('Recording error:', e);
      setPandaMessage('No pude acceder al micrófono');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
    chunksRef.current = [];
    setPandaImage('/panda/new-wave.png');
    setPandaMessage('¿Qué tienes en mente?');
  };

  // Process voice input
  const processVoiceInput = async () => {
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
    await processInput(audioBlob, null);
  };

  // Process text input
  const handleTextSubmit = async () => {
    if (!inputText.trim()) return;
    await processInput(null, inputText.trim());
    setInputText('');
  };

  // Unified processing
  const processInput = async (audioBlob: Blob | null, text: string | null) => {
    setIsProcessing(true);
    setPandaImage('/panda/new-thinking.png');
    setPandaMessage('Déjame pensar...');

    try {
      let transcribedText = text;

      // Transcribe if audio
      if (audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
        if (!transcribeRes.ok) throw new Error('Transcription failed');
        
        const data = await transcribeRes.json();
        transcribedText = data.text;
      }

      if (!transcribedText?.trim()) {
        setPandaImage('/panda/new-wave.png');
        setPandaMessage('No te escuché, ¿puedes repetir?');
        setIsProcessing(false);
        return;
      }

      // Check for navigation commands
      const lowerText = transcribedText.toLowerCase();
      if (lowerText.includes('ir a') || lowerText.includes('muéstrame') || lowerText.includes('abrir')) {
        if (lowerText.includes('idea') || lowerText.includes('ideas')) {
          setPandaMessage('¡Vamos al Idea Board!');
          router.push('/app/ideas');
          return;
        }
        if (lowerText.includes('tarea') || lowerText.includes('tareas')) {
          setPandaMessage('¡Vamos a tus tareas!');
          router.push('/app/tasks');
          return;
        }
        if (lowerText.includes('sueño') || lowerText.includes('sueños')) {
          setPandaMessage('¡Vamos a tus sueños!');
          router.push('/app/dreams');
          return;
        }
      }

      // Extract and classify
      const extractRes = await fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcribedText }),
      });

      if (!extractRes.ok) throw new Error('Extraction failed');
      
      const extractData = await extractRes.json();
      
      // Combine tasks and ideas, classify dreams based on keywords
      const items: CapturedItem[] = [];
      
      // Check if it's a dream (aspirational language)
      const dreamKeywords = ['algún día', 'sueño', 'quiero ser', 'me gustaría', 'ojalá', 'en el futuro', 'cuando sea'];
      const isDream = dreamKeywords.some(k => lowerText.includes(k));
      
      if (isDream) {
        items.push({
          title: transcribedText,
          type: 'dream',
          category: 'personal',
          priority: 'medium',
        });
      } else {
        // Add tasks
        if (extractData.tasks) {
          items.push(...extractData.tasks.map((t: any) => ({ ...t, type: 'task' as const })));
        }
        // Add ideas
        if (extractData.ideas) {
          items.push(...extractData.ideas.map((i: any) => ({ ...i, type: 'idea' as const })));
        }
      }

      if (items.length === 0) {
        // Default to idea if nothing extracted
        items.push({
          title: transcribedText,
          type: 'idea',
          category: 'personal',
          priority: 'medium',
        });
      }

      setCapturedItems(items);
      
      // Update panda based on what was captured
      const primaryType = items[0].type;
      const config = typeConfig[primaryType];
      setPandaImage(config.panda);
      setPandaMessage(items.length === 1 ? '¡Listo! ¿Esto querías decir?' : '¡Listo! Esto es lo que capté:');
      setShowConfirmation(true);

    } catch (e) {
      console.error('Processing error:', e);
      setPandaImage('/panda/new-neutral.png');
      setPandaMessage('Hubo un error, ¿intentamos de nuevo?');
    }

    setIsProcessing(false);
  };

  // Save captured items
  const saveItems = async () => {
    if (!user || capturedItems.length === 0) return;

    // Calculate due date based on selection
    const getDueDate = () => {
      const option = deadlineOptions.find(o => o.id === selectedDeadline);
      if (!option || option.days === null) return null;
      const date = new Date();
      date.setDate(date.getDate() + option.days);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    };

    const dueDate = getDueDate();

    const rows = capturedItems.map(item => ({
      user_id: user.id,
      title: item.title,
      category: item.category,
      priority: item.priority,
      completed: false,
      type: item.type === 'dream' ? 'dream' : item.type,
      due_date: item.type === 'task' ? dueDate : null, // Only tasks get due dates
    }));

    await supabase.from('tasks').insert(rows);

    // Mark new items for nav indicators
    const newIndicators = { ideas: false, tasks: false, dreams: false };
    capturedItems.forEach(item => {
      if (item.type === 'idea') newIndicators.ideas = true;
      else if (item.type === 'task') newIndicators.tasks = true;
      else if (item.type === 'dream') newIndicators.dreams = true;
    });
    setHasNew(prev => ({
      ideas: prev.ideas || newIndicators.ideas,
      tasks: prev.tasks || newIndicators.tasks,
      dreams: prev.dreams || newIndicators.dreams,
    }));

    // Reset
    setCapturedItems([]);
    setShowConfirmation(false);
    setSelectedDeadline('today'); // Reset to default
    setPandaImage('/panda/new-celebrate.png');
    setPandaMessage('¡Guardado! ¿Algo más?');
    // Panda stays in celebration mode until user navigates away and returns
  };

  // Discard captured items
  const discardItems = () => {
    setCapturedItems([]);
    setShowConfirmation(false);
    setEditingIndex(null);
    setSelectedDeadline('today'); // Reset to default
    setPandaImage('/panda/new-wave.png');
    setPandaMessage('¿Qué tienes en mente?');
  };

  // Remove single item
  const removeItem = (index: number) => {
    const newItems = capturedItems.filter((_, i) => i !== index);
    if (newItems.length === 0) {
      discardItems();
    } else {
      setCapturedItems(newItems);
    }
  };

  // Start editing item
  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditText(capturedItems[index].title);
  };

  // Save edited item
  const saveEdit = () => {
    if (editingIndex === null || !editText.trim()) return;
    const newItems = [...capturedItems];
    newItems[editingIndex] = { ...newItems[editingIndex], title: editText.trim() };
    setCapturedItems(newItems);
    setEditingIndex(null);
    setEditText('');
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6b8f71] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[var(--background)] flex flex-col overflow-hidden fixed inset-0">
      {/* Header with logo */}
      <header className="fixed top-0 left-0 right-0 z-10 px-4 py-3 bg-[var(--background)]/80 backdrop-blur-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/icon-192-transparent.png"
              alt="Hansei"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-sm font-medium text-[var(--foreground)]">hansei</span>
            {/* Streak badge */}
            {streakData && streakData.currentStreak > 0 && (
              <StreakBadge streak={streakData.currentStreak} compact />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Sign out button */}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                localStorage.removeItem('taskflow-onboarding-complete');
                localStorage.removeItem('taskflow-user-name');
                router.push('/login');
              }}
              className="p-2 bg-transparent transition-opacity hover:opacity-70"
              title="Cerrar sesión"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            </button>

            {/* Dark mode toggle */}
            <button
              ref={themeToggleRef}
              onClick={async (e) => {
              if (themeTransition) return;
              
              const newMode = !darkMode;
              const x = e.clientX;
              const y = e.clientY;
              const endRadius = Math.hypot(
                Math.max(x, window.innerWidth - x),
                Math.max(y, window.innerHeight - y)
              );
              
              // Check if View Transitions API is supported
              if (document.startViewTransition) {
                // Mark direction for CSS
                document.documentElement.dataset.themeTransition = newMode ? 'to-dark' : 'to-light';
                
                const transition = document.startViewTransition(() => {
                  setDarkMode(newMode);
                  localStorage.setItem('hansei-darkmode', String(newMode));
                  if (newMode) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                });
                
                transition.ready.then(() => {
                  document.documentElement.animate(
                    {
                      clipPath: [
                        `circle(0px at ${x}px ${y}px)`,
                        `circle(${endRadius}px at ${x}px ${y}px)`,
                      ],
                    },
                    {
                      duration: 800,
                      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
                      pseudoElement: '::view-transition-new(root)',
                    }
                  );
                });
                
                transition.finished.then(() => {
                  delete document.documentElement.dataset.themeTransition;
                });
              } else {
                // Fallback for browsers without View Transitions
                setThemeTransition(true);
                setTimeout(() => {
                  setDarkMode(newMode);
                  localStorage.setItem('hansei-darkmode', String(newMode));
                  if (newMode) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  setThemeTransition(false);
                }, 500);
              }
            }}
            className="p-2 bg-transparent transition-opacity hover:opacity-70"
          >
            {/* Sun icon - shown in dark mode */}
            <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 ${darkMode ? 'block' : 'hidden'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
            {/* Moon icon - shown in light mode */}
            <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 ${darkMode ? 'hidden' : 'block'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          </button>
          </div>
        </div>
      </header>
      
      {/* Theme transition overlay - expands to paint new theme */}
      <div
        className="fixed inset-0 pointer-events-none z-[100]"
        style={{
          backgroundColor: darkMode ? '#f5f5f5' : '#1a1a1a', // Color of NEW theme (opposite of current)
          clipPath: themeTransition 
            ? 'circle(150% at calc(100% - 28px) 28px)' 
            : 'circle(0% at calc(100% - 28px) 28px)',
          transition: 'clip-path 500ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
      
      {/* Main content */}
      <div className={`flex-1 flex flex-col items-center px-6 pt-16 transition-all duration-300 ${inputFocused ? 'justify-start pb-4' : 'justify-center pb-32'}`}>
        {/* Daily Affirmation - above panda */}
        {!showConfirmation && !inputFocused && dailyAffirmation && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="mb-8 max-w-xs text-center"
          >
            {/* Decorative line */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#6b8f71]/40" />
              <svg className="w-4 h-4 text-[#6b8f71]/60" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z"/>
              </svg>
              <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-[#6b8f71]/40" />
            </div>
            
            {/* Affirmation text */}
            <motion.p
              key={dailyAffirmation}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-sm font-medium text-[var(--foreground)]/80 italic leading-relaxed"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {dailyAffirmation}
            </motion.p>
          </motion.div>
        )}

        {/* Panda with matcha aura - animates to top when sheet opens */}
        {!showConfirmation && (
        <motion.div 
          layoutId="panda-mascot"
          className="relative overflow-visible"
          animate={{ 
            scale: isProcessing ? 0.95 : 1,
            width: inputFocused ? 80 : 160,
            height: inputFocused ? 80 : 160,
            marginBottom: inputFocused ? 8 : 24,
            marginTop: inputFocused ? 8 : 0,
          }}
          transition={{ type: 'spring', damping: 30, stiffness: 200 }}
          style={{ willChange: 'transform' }}
        >
          {/* Matcha aura glow */}
          <div 
            className="absolute inset-0 rounded-full blur-2xl scale-150"
            style={{ 
              backgroundColor: `${THEME_COLOR}50`,
              animation: 'auraPulse 3s ease-in-out infinite' 
            }}
          />
          {/* Shadow */}
          <div 
            className="absolute bottom-0 left-1/2 w-20 h-4 rounded-full bg-black/10 blur-sm -translate-x-1/2"
            style={{ animation: 'shadowPulse 3s ease-in-out infinite' }}
          />
          <Image
            src={pandaImage}
            alt="Panda"
            fill
            className="object-contain relative z-10"
            style={{ 
              animation: isProcessing ? 'none' : 'float 3s ease-in-out infinite', 
              filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.12))' 
            }}
            priority
          />
        </motion.div>
        )}

        {/* Panda message - hidden when sheet is open */}
        {!showConfirmation && (
        <motion.p 
          className="text-xl font-medium text-[var(--foreground)] text-center mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          key={pandaMessage}
        >
          {pandaMessage}
        </motion.p>
        )}

        {/* Greeting */}
        {!showConfirmation && !isRecording && !isProcessing && !inputFocused && userName && (
          <p className="text-[var(--gray-4)] text-sm">Hola, {userName}</p>
        )}
      </div>

      {/* Bottom Sheet for confirmation */}
      <AnimatePresence>
        {showConfirmation && capturedItems.length > 0 && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={discardItems}
            />
            
            {/* Floating Panda above sheet */}
            <motion.div
              layoutId="panda-mascot"
              className="fixed left-1/2 -translate-x-1/2 z-[55]"
              style={{ bottom: 'calc(70vh - 30px)' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
            >
              <div className="relative w-24 h-24">
                <Image
                  src={pandaImage}
                  alt="Panda"
                  fill
                  className="object-contain"
                  style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.25))' }}
                />
              </div>
            </motion.div>
            
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  discardItems();
                }
              }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--background)] rounded-t-3xl shadow-2xl max-h-[70vh] flex flex-col"
              style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-[var(--gray-3)]" />
              </div>

              {/* Sheet content */}
              <div className="flex-1 overflow-y-auto px-5 pb-4">
                {/* Items */}
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {capturedItems.map((item, i) => {
                      const config = typeConfig[item.type];
                      const isEditing = editingIndex === i;
                      
                      return (
                        <motion.div
                          key={`${item.title}-${i}`}
                          layout
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
                          drag="x"
                          dragConstraints={{ left: 0, right: 0 }}
                          dragElastic={{ left: 0.5, right: 0 }}
                          onDragEnd={(_, info) => {
                            if (info.offset.x < -80) {
                              removeItem(i);
                            }
                          }}
                          className="relative touch-pan-y"
                        >
                          {isEditing ? (
                            <div className={`flex flex-col gap-2 p-3 rounded-xl ${config.bg} border border-[var(--gray-2)]`}>
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit();
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                autoFocus
                                className="w-full bg-transparent text-sm font-medium text-[var(--foreground)] focus:outline-none"
                              />
                              <div className="flex gap-2 justify-end">
                                <button onClick={cancelEdit} className="px-3 py-1 text-xs text-[var(--gray-4)]">
                                  Cancelar
                                </button>
                                <button onClick={saveEdit} className="px-3 py-1 text-xs text-white rounded-full" style={{ backgroundColor: THEME_COLOR }}>
                                  OK
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={() => startEditing(i)}
                              className={`flex items-center gap-3 p-3 rounded-xl ${config.bg} border border-[var(--gray-2)] cursor-pointer active:scale-[0.98] transition-transform`}
                            >
                              <span className={config.color}>{config.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--foreground)] line-clamp-1">{item.title}</p>
                                <p className="text-[10px] text-[var(--gray-4)]">{config.label}</p>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Hint */}
                <p className="text-[10px] text-center text-[var(--gray-4)] mt-2 mb-3">
                  Desliza ← eliminar · Toca editar · Arrastra ↓ descartar
                </p>

                {/* Deadline picker */}
                {capturedItems.some(item => item.type === 'task') && (
                  <div className="mb-4">
                    <p className="text-xs text-[var(--gray-4)] mb-2">¿Para cuándo?</p>
                    <div className="flex gap-2">
                      {deadlineOptions.map(option => (
                        <button
                          key={option.id}
                          onClick={() => setSelectedDeadline(option.id)}
                          className={`flex-1 py-2 px-2 rounded-xl text-xs font-medium transition-all ${
                            selectedDeadline === option.id
                              ? 'bg-[#6b8f71] text-white'
                              : 'bg-[var(--gray-1)] text-[var(--gray-5)]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons - always at bottom of sheet */}
              <div className="px-5 pb-4 pt-2 border-t border-[var(--gray-2)] bg-[var(--background)]">
                <div className="flex gap-3">
                  <button
                    onClick={discardItems}
                    className="flex-1 h-12 rounded-full border border-[var(--gray-3)] text-[var(--gray-5)] text-sm font-medium active:scale-[0.98]"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={saveItems}
                    className="flex-1 h-12 rounded-full text-white text-sm font-medium active:scale-[0.98]"
                    style={{ backgroundColor: THEME_COLOR }}
                  >
                    Guardar ({capturedItems.length})
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Input bar - fixed at bottom */}
      {!showConfirmation && (
        <div className="fixed bottom-20 left-0 right-0 px-6 pb-4">
          <div 
            className="flex items-center gap-2 h-14 px-4 rounded-full border bg-[var(--gray-1)] border-[var(--gray-2)] relative overflow-hidden shadow-lg"
          >
            {/* Overlay when recording - matcha green in dark mode for contrast */}
            <div 
              className="absolute inset-0 bg-[#2d2d30] dark:bg-[#3d5a45] rounded-full transition-all"
              style={{ 
                clipPath: isRecording 
                  ? 'circle(150% at calc(100% - 36px) 50%)' 
                  : 'circle(0% at calc(100% - 36px) 50%)',
                transitionDuration: '700ms',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            />
            
            {/* Cancel button */}
            <div className={`relative z-10 transition-all duration-300 ${isRecording ? 'w-10 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
              <button 
                onClick={cancelRecording} 
                className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white rounded-full hover:bg-white/10"
              >
                {Icons.x}
              </button>
            </div>

            {/* Input / Recording content */}
            <div className="flex-1 flex items-center gap-2 relative z-10">
              {!isRecording ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder="Escribe o habla..."
                  disabled={isProcessing}
                  className="flex-1 bg-transparent text-[var(--foreground)] placeholder:text-[var(--gray-4)] focus:outline-none font-medium tracking-tight disabled:opacity-50"
                />
              ) : (
                <>
                  <div className="flex-1 flex items-center">
                    <span className="text-white text-sm font-medium">Escuchando</span>
                    <span className="dots text-white">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                  </div>
                  <span className="text-white/50 text-xs tabular-nums">{formatTime(recordingTime)}</span>
                </>
              )}
            </div>

            {/* Mic/Check button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95 relative z-10 disabled:opacity-50"
              style={{ backgroundColor: THEME_COLOR }}
            >
              <div className={`absolute transition-all ease-out ${isRecording ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} style={{ transitionDuration: '850ms' }}>
                {Icons.mic}
              </div>
              <div className={`absolute transition-all ease-out ${isRecording ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-45'}`} style={{ transitionDuration: '850ms' }}>
                {Icons.check}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Hide on scroll */}
      <nav 
        className={`fixed bottom-0 left-0 right-0 h-16 bg-[var(--background)] border-t border-[var(--gray-2)] flex items-center justify-around px-6 safe-area-pb transition-transform duration-300 ${
          navVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <button 
          className="flex flex-col items-center gap-1 text-[#6b8f71]"
        >
          <span className="w-6 h-6">{Icons.home}</span>
          <span className="text-[10px] font-medium">Home</span>
        </button>
        <button 
          onClick={() => {
            setHasNew(prev => ({ ...prev, ideas: false }));
            router.push('/app/ideas');
          }}
          className="flex flex-col items-center gap-1 text-[var(--gray-4)] hover:text-[var(--foreground)] transition-colors relative"
        >
          <span className="w-6 h-6 relative">
            {Icons.ideas}
            {hasNew.ideas && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#6b8f71]" />
            )}
          </span>
          <span className="text-[10px] font-medium">Ideas</span>
        </button>
        <button 
          onClick={() => {
            setHasNew(prev => ({ ...prev, tasks: false }));
            router.push('/app/tasks');
          }}
          className="flex flex-col items-center gap-1 text-[var(--gray-4)] hover:text-[var(--foreground)] transition-colors relative"
        >
          <span className="w-6 h-6 relative">
            {Icons.tasks}
            {hasNew.tasks && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#6b8f71]" />
            )}
          </span>
          <span className="text-[10px] font-medium">Tasks</span>
        </button>
        <button 
          onClick={() => {
            setHasNew(prev => ({ ...prev, dreams: false }));
            router.push('/app/dreams');
          }}
          className="flex flex-col items-center gap-1 text-[var(--gray-4)] hover:text-[var(--foreground)] transition-colors relative"
        >
          <span className="w-6 h-6 relative">
            {Icons.dreams}
            {hasNew.dreams && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#6b8f71]" />
            )}
          </span>
          <span className="text-[10px] font-medium">Dreams</span>
        </button>
      </nav>

      {/* Milestone Toast */}
      {showMilestone && (
        <MilestoneToast
          title={showMilestone.title}
          description={showMilestone.description}
          icon={showMilestone.icon}
          onClose={() => setShowMilestone(null)}
        />
      )}

      {/* Animations */}
      <style jsx global>{`
        /* View Transitions for theme toggle */
        ::view-transition-old(root),
        ::view-transition-new(root) {
          animation: none;
          mix-blend-mode: normal;
        }
        /* New theme always expands on top */
        ::view-transition-old(root) {
          z-index: 1;
        }
        ::view-transition-new(root) {
          z-index: 9999;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes shadowPulse {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.4; }
          50% { transform: translateX(-50%) scale(0.85); opacity: 0.25; }
        }
        @keyframes auraPulse {
          0%, 100% { opacity: 0.4; transform: scale(1.4); }
          50% { opacity: 0.6; transform: scale(1.6); }
        }
        @keyframes dotFade {
          0%, 20% { opacity: 0; }
          40%, 100% { opacity: 1; }
        }
        .dots span {
          opacity: 0;
          animation: dotFade 1.4s infinite;
        }
        .dots span:nth-child(1) { animation-delay: 0s; }
        .dots span:nth-child(2) { animation-delay: 0.2s; }
        .dots span:nth-child(3) { animation-delay: 0.4s; }
        .safe-area-pb {
          padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
