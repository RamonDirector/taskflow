'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { StreakBadge, MilestoneToast } from '@/components/StreakBadge';
import { BottomNav } from '@/components/BottomNav';
import { BambooGrowth } from '@/components/BambooGrowth';
import { calculateStreak, getMilestones, getNewlyAchievedMilestones, type StreakData, type MilestoneData } from '@/lib/gamification/streak';
import { haptic } from '@/lib/haptics';
import { logActivity } from '@/lib/activity';
import { PixelBubble } from '@/components/PixelBubble';

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
  due_date?: string;
  context?: string;
  _fromIdeaTitle?: string; // Track which idea generated this task (for linking)
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
  
  // Easter egg — tap on Kai
  const kaiTapCountRef = useRef(0);
  const kaiTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const KAI_TAP_PHRASES = [
    { message: '¿Qué? Estoy pensando', image: '/panda/new-thinking.png' },
    { message: 'No me toques que pierdo la concentración', image: '/panda/new-annoyed.png' },
    { message: '¿Necesitas algo o solo me molestas?', image: '/panda/new-shrug.png' },
    { message: 'Estaba meditando...', image: '/panda/new-sleeping.png' },
    { message: 'Oye, que tengo sentimientos', image: '/panda/new-annoyed.png' },
    { message: 'Vale, ya estoy aquí. Dime', image: '/panda/new-pointing.png' },
    { message: 'Zzz... ah, perdona. ¿Decías?', image: '/panda/new-sleeping.png' },
    { message: '¿Hm?', image: '/panda/new-thinking.png' },
  ];
  
  const KAI_MULTI_TAP_PHRASES = [
    { message: '¿En serio? ¿No tienes tareas que hacer?', image: '/panda/new-annoyed.png' },
    { message: 'Esto cuenta como procrastinar', image: '/panda/new-pointing.png' },
    { message: 'Para. De. Tocarme.', image: '/panda/new-annoyed.png' },
    { message: 'Voy a empezar a cobrar por toque', image: '/panda/new-shrug.png' },
  ];
  
  const handleKaiTap = () => {
    if (isRecording || isProcessing || showConfirmation) return;
    
    kaiTapCountRef.current += 1;
    const count = kaiTapCountRef.current;
    
    // Reset counter after 2s of no taps
    if (kaiTapTimerRef.current) clearTimeout(kaiTapTimerRef.current);
    kaiTapTimerRef.current = setTimeout(() => { kaiTapCountRef.current = 0; }, 2000);
    
    // Pick phrase based on tap count
    const pool = count >= 3 ? KAI_MULTI_TAP_PHRASES : KAI_TAP_PHRASES;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    
    setPandaImage(pick.image);
    setPandaMessage(pick.message);
    haptic.light();
  };
  
  // Daily affirmation state
  const [dailyAffirmation, setDailyAffirmation] = useState('El camino se hace al andar.');
  
  // Input state
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Brain Dump state
  const [isBrainDump, setIsBrainDump] = useState(false);
  const [brainDumpLocked, setBrainDumpLocked] = useState(false); // locked recording (hands-free)
  const [brainDumpPaused, setBrainDumpPaused] = useState(false);
  const [brainDumpPoseIndex, setBrainDumpPoseIndex] = useState(0);
  const brainDumpTriggeredRef = useRef(false);
  const micTouchStartY = useRef<number | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0); // 0 to 1
  const SWIPE_THRESHOLD = 60; // px to trigger brain dump lock
  
  // Captured items (for confirmation)
  const [capturedItems, setCapturedItems] = useState<CapturedItem[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // Action plan state
  const [actionPlans, setActionPlans] = useState<Record<number, { loading: boolean; points: { title: string; time_estimate: string; category: string }[] }>>({});
  const [expandedPlans, setExpandedPlans] = useState<Set<number>>(new Set());
  
  // Connections between items
  const [connections, setConnections] = useState<{ from: number; to: number; reason: string }[]>([]);
  const [editText, setEditText] = useState('');
  const [selectedDeadline, setSelectedDeadline] = useState('today'); // Default to today
  const [originalVoiceContext, setOriginalVoiceContext] = useState<string | null>(null); // Store original voice input
  
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
  
  // Bamboo growth progress (0-1 based on today's completed tasks)
  const [bambooProgress, setBambooProgress] = useState(0);
  
  // App visibility (pause animations when minimized to prevent glitches)
  const [appVisible, setAppVisible] = useState(true);
  
  useEffect(() => {
    const handleVisibility = () => setAppVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

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
      
      // Check for stale items (proactive suggestions)
      checkStaleItems(user.id);
      
      // Load gamification data
      loadStreakData(user.id);
      loadBambooProgress(user.id);
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

  // Proactive suggestions - check for stale/forgotten items
  const [staleSuggestion, setStaleSuggestion] = useState<{ title: string; id: string; days: number; type: string } | null>(null);

  const checkStaleItems = async (userId: string) => {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      // Find incomplete tasks older than 3 days
      const { data: staleTasks } = await supabase
        .from('tasks')
        .select('id, title, type, created_at')
        .eq('user_id', userId)
        .eq('completed', false)
        .in('type', ['task', 'idea'])
        .lt('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: true })
        .limit(1);
      
      if (staleTasks && staleTasks.length > 0) {
        const stale = staleTasks[0];
        const daysOld = Math.floor((Date.now() - new Date(stale.created_at).getTime()) / (1000 * 60 * 60 * 24));
        setStaleSuggestion({ title: stale.title, id: stale.id, days: daysOld, type: stale.type });
      }
    } catch (e) {
      console.error('Stale check error:', e);
    }
  };

  const dismissStaleSuggestion = () => setStaleSuggestion(null);

  const completeStaleItem = async () => {
    if (!staleSuggestion) return;
    await supabase.from('tasks').update({ completed: true }).eq('id', staleSuggestion.id);
    haptic.medium();
    setStaleSuggestion(null);
  };

  const deleteStaleItem = async () => {
    if (!staleSuggestion) return;
    await supabase.from('tasks').delete().eq('id', staleSuggestion.id);
    haptic.light();
    setStaleSuggestion(null);
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

  // Load bamboo progress (today's completed tasks / daily goal)
  const loadBambooProgress = async (userId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's tasks (created today or due today)
      const { data: todayTasks } = await supabase
        .from('tasks')
        .select('id, completed')
        .eq('user_id', userId)
        .eq('type', 'task')
        .or(`created_at.gte.${today},due_date.eq.${today}`);
      
      if (todayTasks && todayTasks.length > 0) {
        const completed = todayTasks.filter(t => t.completed).length;
        const progress = completed / todayTasks.length;
        setBambooProgress(progress);
      } else {
        // No tasks today - show minimal sprout
        setBambooProgress(0);
      }
    } catch (error) {
      console.error('Bamboo progress error:', error);
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

  // Kai pose rotation during brain dump locked recording
  const brainDumpPoses = [
    { image: '/panda/new-neutral.png', message: 'Te escucho...' },
    { image: '/panda/new-thinking.png', message: 'Sigue, sigue...' },
    { image: '/panda/new-neutral.png', message: 'Tómate tu tiempo' },
    { image: '/panda/new-celebrate.png', message: 'Cada idea cuenta' },
  ];

  useEffect(() => {
    if (!brainDumpLocked || brainDumpPaused) return;
    const interval = setInterval(() => {
      setBrainDumpPoseIndex(i => {
        const next = (i + 1) % brainDumpPoses.length;
        setPandaImage(brainDumpPoses[next].image);
        setPandaMessage(brainDumpPoses[next].message);
        return next;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [brainDumpLocked, brainDumpPaused]);

  // Brain dump swipe-up-to-lock handlers
  const handleMicTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (isProcessing || isRecording) return;
    brainDumpTriggeredRef.current = false;
    micTouchStartY.current = e.touches[0].clientY;
    setSwipeProgress(0);
    startRecording();
  };

  const handleMicTouchMove = (e: React.TouchEvent) => {
    if (!isRecording || brainDumpTriggeredRef.current || micTouchStartY.current === null) return;
    const deltaY = micTouchStartY.current - e.touches[0].clientY;
    const progress = Math.min(1, Math.max(0, deltaY / SWIPE_THRESHOLD));
    setSwipeProgress(progress);
    
    if (deltaY >= SWIPE_THRESHOLD) {
      brainDumpTriggeredRef.current = true;
      haptic.strong();
      setSwipeProgress(0);
      setIsBrainDump(true);
      setBrainDumpLocked(true);
      setBrainDumpPaused(false);
      setBrainDumpPoseIndex(0);
      setPandaImage('/panda/new-neutral.png');
      setPandaMessage('Te escucho...');
      micTouchStartY.current = null;
    }
  };

  const handleMicTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    micTouchStartY.current = null;
    setSwipeProgress(0);
    
    if (brainDumpTriggeredRef.current) {
      return; // Recording continues in locked mode
    }
    
    if (isRecording) stopRecording();
  };

  const handleMicMouseDown = () => {
    if (isProcessing || isRecording) return;
    brainDumpTriggeredRef.current = false;
    setSwipeProgress(0);
    startRecording();
  };

  const handleMicMouseUp = () => {
    setSwipeProgress(0);
    if (brainDumpTriggeredRef.current) return;
    if (isRecording) stopRecording();
  };

  // Brain dump locked controls
  const toggleBrainDumpPause = () => {
    if (!mediaRecorderRef.current) return;
    if (brainDumpPaused) {
      mediaRecorderRef.current.resume();
      setBrainDumpPaused(false);
      haptic.light();
    } else {
      mediaRecorderRef.current.pause();
      setBrainDumpPaused(true);
      haptic.light();
    }
  };

  const stopBrainDump = () => {
    setBrainDumpLocked(false);
    setBrainDumpPaused(false);
    setIsBrainDump(true); // Keep flag so review sheet knows it was brain dump
    stopRecording();
  };

  const cancelBrainDump = () => {
    setBrainDumpLocked(false);
    setBrainDumpPaused(false);
    setIsBrainDump(false);
    cancelRecording();
  };

  // Recording functions
  const startRecording = async () => {
    haptic.medium();
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
    haptic.medium();
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
    const text = inputText.trim();
    setInputText('');
    
    // Try Kai conversation first
    try {
      setPandaImage('/panda/new-thinking.png');
      setPandaMessage('Déjame pensar...');
      
      const { data: { session } } = await supabase.auth.getSession();
      const kaiRes = await fetch('/api/kai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, userId: user?.id, accessToken: session?.access_token }),
      });
      
      const kaiData = await kaiRes.json();
      console.log('Kai response:', kaiRes.status, kaiData);
      
      if (kaiRes.ok && kaiData.type === 'conversation') {
        // Kai handled it
        setPandaMessage(kaiData.message);
        setPandaImage(kaiData.pose || '/panda/new-wave.png');
        
        // If Kai created/completed/deleted tasks, refresh
        if (kaiData.actions?.length > 0) {
          loadBambooProgress(user!.id);
        }
        return;
      }
      
      if (!kaiRes.ok) {
        console.error('Kai API error:', kaiData);
      }
      // type === 'brain_dump' or error → fall through to normal flow
    } catch (e) {
      console.error('Kai chat error:', e);
      // Fall through to brain dump
    }
    
    await processInput(null, text);
  };

  // Unified processing
  const processInput = async (audioBlob: Blob | null, text: string | null) => {
    setIsProcessing(true);
    setPandaImage('/panda/new-thinking.png');
    setPandaMessage('Déjame pensar...');

    try {
      // Single call to process-voice: transcribes + detects intent + classifies
      const formData = new FormData();
      if (audioBlob) {
        formData.append('audio', audioBlob, 'recording.webm');
      }
      if (text) {
        formData.append('text', text);
      }

      const res = await fetch('/api/process-voice', { method: 'POST', body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('Process error:', res.status, errData);
        throw new Error(errData?.details || errData?.error || `Processing failed (${res.status})`);
      }

      const extractData = await res.json();
      const transcribedText = extractData.transcription || text || '';
      
      // If Gemini detected conversation intent → send to Kai (Sonnet)
      if (extractData.intent === 'conversation') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const kaiRes = await fetch('/api/kai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: transcribedText, userId: user?.id, accessToken: session?.access_token }),
          });
          
          if (kaiRes.ok) {
            const kaiData = await kaiRes.json();
            if (kaiData.type === 'conversation') {
              setPandaMessage(kaiData.message);
              setPandaImage(kaiData.pose || '/panda/new-wave.png');
              if (kaiData.actions?.length > 0) loadBambooProgress(user!.id);
              setIsProcessing(false);
              return;
            }
          }
        } catch (e) {
          console.error('Kai chat error:', e);
        }
      }

      if (!transcribedText?.trim() && (!extractData.items || extractData.items.length === 0)) {
        setPandaImage('/panda/new-wave.png');
        setPandaMessage('No te escuché, ¿puedes repetir?');
        setIsProcessing(false);
        return;
      }

      // Store original voice context
      setOriginalVoiceContext(transcribedText.trim());

      // Build items from response
      const items: CapturedItem[] = [];
      
      if (extractData.items && extractData.items.length > 0) {
        items.push(...extractData.items.map((item: any) => ({
          title: item.title,
          type: item.type === 'dream' ? 'dream' : item.type === 'idea' ? 'idea' : 'task',
          category: item.category || 'personal',
          priority: item.priority || 'medium',
          context: item.context || null,
        })));
      }

      if (items.length === 0) {
        items.push({
          title: transcribedText,
          type: 'idea',
          category: 'personal',
          priority: 'medium',
          context: transcribedText.length > 50 ? transcribedText : undefined,
        });
      }
      
      // Capture connections
      if (extractData.connections && extractData.connections.length > 0) {
        setConnections(extractData.connections);
      } else {
        setConnections([]);
      }

      // If single item and no context, use transcription as context
      if (items.length === 1 && !items[0].context && transcribedText !== items[0].title) {
        items[0].context = transcribedText;
      }

      setCapturedItems(items);
      
      // Update panda based on what was captured
      const primaryType = items[0].type;
      const config = typeConfig[primaryType];
      setPandaImage(config.panda);
      setPandaMessage(items.length === 1 ? '¡Listo! ¿Esto querías decir?' : '¡Listo! Esto es lo que capté:');
      setShowConfirmation(true);

    } catch (e: any) {
      console.error('Processing error:', e);
      setPandaImage('/panda/new-neutral.png');
      const msg = e?.message || '';
      if (msg.includes('API key') || msg.includes('401')) {
        setPandaMessage('Error de API key. Revisa la configuración.');
      } else if (msg.includes('429') || msg.includes('Límite')) {
        setPandaMessage('Límite de uso alcanzado. Inténtalo más tarde.');
      } else {
        setPandaMessage('Hubo un error, ¿intentamos de nuevo?');
      }
    }

    setIsProcessing(false);
  };

  // Save captured items
  const saveItems = async () => {
    haptic.strong();
    
    // Save any pending edit before saving all items
    let itemsToSave = [...capturedItems];
    if (editingIndex !== null && editText.trim()) {
      itemsToSave[editingIndex] = { ...itemsToSave[editingIndex], title: editText.trim() };
      setEditingIndex(null);
      setEditText('');
    }
    
    if (!user || itemsToSave.length === 0) return;

    // Calculate due date based on selection
    const getDueDate = () => {
      const option = deadlineOptions.find(o => o.id === selectedDeadline);
      if (!option || option.days === null) return null;
      const date = new Date();
      date.setDate(date.getDate() + option.days);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    };

    const dueDate = getDueDate();

    // Separate ideas (and non-linked items) from linked tasks
    const linkedTasks = itemsToSave.filter(item => item._fromIdeaTitle);
    const nonLinkedItems = itemsToSave.filter(item => !item._fromIdeaTitle);
    
    // 1. Insert non-linked items first (ideas, standalone tasks, dreams)
    if (nonLinkedItems.length > 0) {
      const rows = nonLinkedItems.map(item => ({
        user_id: user.id,
        title: item.title,
        category: item.category,
        priority: item.priority,
        completed: false,
        type: item.type === 'dream' ? 'dream' : item.type,
        due_date: item.type === 'task' ? dueDate : null,
        voice_context: item.type === 'idea' ? originalVoiceContext : null,
      }));
      await supabase.from('tasks').insert(rows);
    }
    
    // 2. If there are linked tasks, find their parent idea IDs and insert with parent_idea_id
    if (linkedTasks.length > 0) {
      // Get the IDs of ideas we just inserted (by title match)
      const ideaTitles = [...new Set(linkedTasks.map(t => t._fromIdeaTitle!))];
      const { data: insertedIdeas } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('user_id', user.id)
        .eq('type', 'idea')
        .in('title', ideaTitles)
        .order('created_at', { ascending: false })
        .limit(ideaTitles.length);
      
      // Build title → id map
      const ideaIdMap: Record<string, string> = {};
      if (insertedIdeas) {
        for (const idea of insertedIdeas) {
          if (!ideaIdMap[idea.title]) ideaIdMap[idea.title] = idea.id;
        }
      }
      
      const linkedRows = linkedTasks.map(item => ({
        user_id: user.id,
        title: item.title,
        category: item.category,
        priority: item.priority,
        completed: false,
        type: 'task',
        due_date: dueDate,
        parent_idea_id: ideaIdMap[item._fromIdeaTitle!] || null,
      }));
      await supabase.from('tasks').insert(linkedRows);
    }

    // Log activity for brain dump
    if (user) {
      logActivity({ supabase, userId: user.id, action: 'brain_dump', metadata: {
        itemCount: itemsToSave.length,
        types: { tasks: itemsToSave.filter(i => i.type === 'task').length, ideas: itemsToSave.filter(i => i.type === 'idea').length, dreams: itemsToSave.filter(i => i.type === 'dream').length },
      }});
    }

    // Mark new items for nav indicators
    const newIndicators = { ideas: false, tasks: false, dreams: false };
    itemsToSave.forEach(item => {
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
    setIsBrainDump(false);
    setSelectedDeadline('today'); // Reset to default
    setOriginalVoiceContext(null); // Clear voice context
    setPandaImage('/panda/new-celebrate.png');
    setPandaMessage('¡Guardado! ¿Algo más?');
    
    // Update bamboo progress (new tasks added = more to complete)
    loadBambooProgress(user.id);
  };

  // Discard captured items
  const discardItems = () => {
    setCapturedItems([]);
    setShowConfirmation(false);
    setIsBrainDump(false);
    setEditingIndex(null);
    setSelectedDeadline('today');
    setOriginalVoiceContext(null);
    setBatchMode(false);
    setBatchSelected(new Set());
    setActionPlans({});
    setExpandedPlans(new Set());
    setConnections([]);
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

  // Cycle item type: task → idea → dream → task
  const cycleItemType = (index: number) => {
    haptic.light();
    const typeOrder: ('task' | 'idea' | 'dream')[] = ['task', 'idea', 'dream'];
    const newItems = [...capturedItems];
    const currentIdx = typeOrder.indexOf(newItems[index].type);
    newItems[index] = { ...newItems[index], type: typeOrder[(currentIdx + 1) % 3] };
    setCapturedItems(newItems);
  };

  // Batch selection
  const [batchSelected, setBatchSelected] = useState<Set<number>>(new Set());
  const [batchMode, setBatchMode] = useState(false);

  const toggleBatchSelect = (index: number) => {
    const newSet = new Set(batchSelected);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setBatchSelected(newSet);
    if (newSet.size === 0) setBatchMode(false);
  };

  const batchDelete = () => {
    const newItems = capturedItems.filter((_, i) => !batchSelected.has(i));
    if (newItems.length === 0) {
      discardItems();
    } else {
      setCapturedItems(newItems);
    }
    setBatchSelected(new Set());
    setBatchMode(false);
  };

  const batchReclassify = (type: 'task' | 'idea' | 'dream') => {
    const newItems = capturedItems.map((item, i) => 
      batchSelected.has(i) ? { ...item, type } : item
    );
    setCapturedItems(newItems);
    setBatchSelected(new Set());
    setBatchMode(false);
    haptic.medium();
  };

  // Generate action plan for an idea
  const generateActionPlan = async (index: number) => {
    const item = capturedItems[index];
    if (!item || item.type !== 'idea') return;
    
    haptic.light();
    setActionPlans(prev => ({ ...prev, [index]: { loading: true, points: [] } }));
    setExpandedPlans(prev => new Set(prev).add(index));
    
    try {
      const res = await fetch('/api/action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: item.title, voiceContext: item.context }),
      });
      
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setActionPlans(prev => ({ ...prev, [index]: { loading: false, points: data.action_points || [] } }));
      if (user) logActivity({ supabase, userId: user.id, action: 'action_plan_generated', entityType: 'idea', metadata: { ideaTitle: item.title, steps: (data.action_points || []).length } });
    } catch (e) {
      console.error('Action plan error:', e);
      setActionPlans(prev => ({ ...prev, [index]: { loading: false, points: [] } }));
    }
  };

  // Add action plan steps as tasks (linked to parent idea)
  const addActionPlanAsTasks = (index: number) => {
    const plan = actionPlans[index];
    const parentIdea = capturedItems[index];
    if (!plan || plan.points.length === 0 || !parentIdea) return;
    
    haptic.medium();
    const newTasks: CapturedItem[] = plan.points.map(point => ({
      title: point.title,
      type: 'task',
      category: point.category || parentIdea.category || 'personal',
      priority: 'medium',
      _fromIdeaTitle: parentIdea.title, // Link to parent idea
    }));
    
    // Insert tasks right after the idea
    const newItems = [...capturedItems];
    newItems.splice(index + 1, 0, ...newTasks);
    setCapturedItems(newItems);
    
    // Clean up plan state
    setExpandedPlans(prev => { const s = new Set(prev); s.delete(index); return s; });
    setActionPlans(prev => { const p = { ...prev }; delete p[index]; return p; });
  };

  // Render a single captured item (shared between flat and grouped views)
  const renderItem = (item: CapturedItem, i: number) => {
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
            onClick={() => { if (batchMode) toggleBatchSelect(i); }}
            onDoubleClick={() => { if (!batchMode) startEditing(i); }}
            onContextMenu={(e) => { e.preventDefault(); setBatchMode(true); toggleBatchSelect(i); }}
            className={`flex items-start gap-3 p-3 rounded-xl ${config.bg} border ${batchSelected.has(i) ? 'border-[#6b8f71] ring-1 ring-[#6b8f71]/30' : 'border-[var(--gray-2)]'} cursor-pointer active:scale-[0.98] transition-all`}
          >
            {/* Batch checkbox or type icon (tappable to cycle) */}
            {batchMode ? (
              <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-colors ${batchSelected.has(i) ? 'bg-[#6b8f71] border-[#6b8f71]' : 'border-[var(--gray-3)]'}`}>
                {batchSelected.has(i) && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
            ) : (
              <button 
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); cycleItemType(i); }}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                className={`${config.color} mt-0.5 p-1.5 -m-1.5 active:scale-90 transition-transform rounded-lg`}
                title="Cambiar tipo"
              >
                {config.icon}
              </button>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)]">{item.title}</p>
              {item.context && (
                <p className="text-xs text-[var(--gray-4)] mt-1 line-clamp-2 italic">"{item.context}"</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] ${config.color} font-medium`}>{config.label}</span>
                {item.category && item.category !== 'personal' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--gray-2)] text-[var(--gray-4)]">{item.category}</span>
                )}
                {/* Action plan button for ideas */}
                {item.type === 'idea' && !batchMode && !actionPlans[i]?.points.length && (
                  <button
                    onClick={(e) => { e.stopPropagation(); generateActionPlan(i); }}
                    disabled={actionPlans[i]?.loading}
                    className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors"
                    style={{ 
                      backgroundColor: `${THEME_COLOR}15`,
                      color: THEME_COLOR,
                    }}
                  >
                    {actionPlans[i]?.loading ? (
                      <span className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 border border-[#6b8f71] border-t-transparent rounded-full animate-spin" />
                        Generando...
                      </span>
                    ) : (
                      'Plan de acción'
                    )}
                  </button>
                )}
              </div>
              
              {/* Action plan steps */}
              <AnimatePresence>
                {expandedPlans.has(i) && actionPlans[i] && !actionPlans[i].loading && actionPlans[i].points.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 pt-2 border-t border-[var(--gray-2)]"
                  >
                    <div className="space-y-1.5">
                      {actionPlans[i].points.map((point, pi) => (
                        <div key={pi} className="flex items-start gap-2">
                          <span className="text-[10px] text-[var(--gray-4)] mt-0.5 tabular-nums w-3 text-right">{pi + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[var(--foreground)]">{point.title}</p>
                            <span className="text-[9px] text-[var(--gray-4)]">{point.time_estimate}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); addActionPlanAsTasks(i); }}
                      className="mt-2 w-full h-8 rounded-full text-[11px] font-medium text-white active:scale-[0.98] transition-transform"
                      style={{ backgroundColor: THEME_COLOR }}
                    >
                      Añadir como tareas ({actionPlans[i].points.length})
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>
    );
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
      
      {/* Matcha Hills - Ground for bamboo */}
      {!showConfirmation && (
        <div className="fixed bottom-16 left-0 right-0 z-[5] pointer-events-none" style={{ height: '38vh' }}>
          <svg 
            viewBox="0 0 400 200" 
            className="w-full h-full"
            preserveAspectRatio="xMidYMax slice"
          >
            <defs>
              <linearGradient id="hillGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8fb396" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#6b8f71" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="hillGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7da383" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#5a7d60" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="hillGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6b8f71" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#4a6b50" stopOpacity="0.85" />
              </linearGradient>
            </defs>
            {/* Back hill - lighter, more distant */}
            <path 
              d="M0,100 Q50,50 100,70 T200,55 T300,75 T400,60 L400,200 L0,200 Z" 
              fill="url(#hillGradient3)"
            />
            {/* Middle hill */}
            <path 
              d="M0,120 Q80,70 150,95 T280,75 T400,90 L400,200 L0,200 Z" 
              fill="url(#hillGradient2)"
            />
            {/* Front hill - darker, closer */}
            <path 
              d="M0,140 Q60,100 120,125 T240,110 T360,130 T400,115 L400,200 L0,200 Z" 
              fill="url(#hillGradient1)"
            />
            
            {/* Sakura flowers - Japanese cherry blossom style */}
            {/* First sakura - appears at 10% progress */}
            {bambooProgress >= 0.1 && (
              <g transform="translate(55, 145)" style={{ animation: 'flowerPop 0.5s ease-out' }}>
                <path d="M0,8 Q-1,4 0,0" stroke="#8b7355" strokeWidth="1.5" fill="none" />
                {/* 5 petal sakura */}
                <ellipse cx="0" cy="-6" rx="2.5" ry="4" fill="#fce7f3" />
                <ellipse cx="4" cy="-2" rx="2.5" ry="4" fill="#fbcfe8" transform="rotate(72, 4, -2)" />
                <ellipse cx="2.5" cy="3" rx="2.5" ry="4" fill="#fce7f3" transform="rotate(144, 2.5, 3)" />
                <ellipse cx="-2.5" cy="3" rx="2.5" ry="4" fill="#fbcfe8" transform="rotate(-144, -2.5, 3)" />
                <ellipse cx="-4" cy="-2" rx="2.5" ry="4" fill="#fce7f3" transform="rotate(-72, -4, -2)" />
                <circle cx="0" cy="0" r="2" fill="#f9a8d4" />
              </g>
            )}
            {/* Second sakura - appears at 25% */}
            {bambooProgress >= 0.25 && (
              <g transform="translate(340, 120)" style={{ animation: 'flowerPop 0.5s ease-out' }}>
                <path d="M0,10 Q2,5 0,0" stroke="#8b7355" strokeWidth="1.5" fill="none" />
                {/* 5 petal sakura - slightly pinker */}
                <ellipse cx="0" cy="-7" rx="3" ry="5" fill="#fbcfe8" />
                <ellipse cx="5" cy="-2" rx="3" ry="5" fill="#f9a8d4" transform="rotate(72, 5, -2)" />
                <ellipse cx="3" cy="4" rx="3" ry="5" fill="#fbcfe8" transform="rotate(144, 3, 4)" />
                <ellipse cx="-3" cy="4" rx="3" ry="5" fill="#f9a8d4" transform="rotate(-144, -3, 4)" />
                <ellipse cx="-5" cy="-2" rx="3" ry="5" fill="#fbcfe8" transform="rotate(-72, -5, -2)" />
                <circle cx="0" cy="0" r="2.5" fill="#ec4899" />
              </g>
            )}
            {/* Third sakura - appears at 40% */}
            {bambooProgress >= 0.4 && (
              <g transform="translate(130, 130)" style={{ animation: 'flowerPop 0.5s ease-out' }}>
                <path d="M0,12 Q-2,6 0,0" stroke="#8b7355" strokeWidth="2" fill="none" />
                <ellipse cx="-4" cy="8" rx="3" ry="2" fill="#6b8f71" opacity="0.6" />
                {/* White sakura */}
                <ellipse cx="0" cy="-7" rx="3" ry="5" fill="#fff1f2" />
                <ellipse cx="5" cy="-2" rx="3" ry="5" fill="#ffe4e6" transform="rotate(72, 5, -2)" />
                <ellipse cx="3" cy="4" rx="3" ry="5" fill="#fff1f2" transform="rotate(144, 3, 4)" />
                <ellipse cx="-3" cy="4" rx="3" ry="5" fill="#ffe4e6" transform="rotate(-144, -3, 4)" />
                <ellipse cx="-5" cy="-2" rx="3" ry="5" fill="#fff1f2" transform="rotate(-72, -5, -2)" />
                <circle cx="0" cy="0" r="2.5" fill="#fda4af" />
              </g>
            )}
            {/* Fourth sakura - appears at 60% */}
            {bambooProgress >= 0.6 && (
              <g transform="translate(280, 115)" style={{ animation: 'flowerPop 0.5s ease-out' }}>
                <path d="M0,10 Q1,5 0,0" stroke="#8b7355" strokeWidth="1.5" fill="none" />
                {/* Pale pink sakura */}
                <ellipse cx="0" cy="-6" rx="2.5" ry="4" fill="#fdf2f8" />
                <ellipse cx="4" cy="-2" rx="2.5" ry="4" fill="#fce7f3" transform="rotate(72, 4, -2)" />
                <ellipse cx="2.5" cy="3" rx="2.5" ry="4" fill="#fdf2f8" transform="rotate(144, 2.5, 3)" />
                <ellipse cx="-2.5" cy="3" rx="2.5" ry="4" fill="#fce7f3" transform="rotate(-144, -2.5, 3)" />
                <ellipse cx="-4" cy="-2" rx="2.5" ry="4" fill="#fdf2f8" transform="rotate(-72, -4, -2)" />
                <circle cx="0" cy="0" r="2" fill="#f472b6" />
              </g>
            )}
            {/* Fifth sakura - appears at 80% */}
            {bambooProgress >= 0.8 && (
              <g transform="translate(90, 125)" style={{ animation: 'flowerPop 0.5s ease-out' }}>
                <path d="M0,12 Q-1,6 0,0" stroke="#8b7355" strokeWidth="2" fill="none" />
                <ellipse cx="-3" cy="9" rx="3" ry="2" fill="#6b8f71" opacity="0.6" />
                {/* Deep pink sakura */}
                <ellipse cx="0" cy="-7" rx="3" ry="5" fill="#fbcfe8" />
                <ellipse cx="5" cy="-2" rx="3" ry="5" fill="#f9a8d4" transform="rotate(72, 5, -2)" />
                <ellipse cx="3" cy="4" rx="3" ry="5" fill="#fbcfe8" transform="rotate(144, 3, 4)" />
                <ellipse cx="-3" cy="4" rx="3" ry="5" fill="#f9a8d4" transform="rotate(-144, -3, 4)" />
                <ellipse cx="-5" cy="-2" rx="3" ry="5" fill="#fbcfe8" transform="rotate(-72, -5, -2)" />
                <circle cx="0" cy="0" r="2.5" fill="#db2777" />
              </g>
            )}
            {/* Sixth sakura - appears at 100% - full bloom */}
            {bambooProgress >= 1 && (
              <g transform="translate(200, 105)" style={{ animation: 'flowerPop 0.5s ease-out' }}>
                <path d="M0,15 Q-2,8 0,0" stroke="#8b7355" strokeWidth="2.5" fill="none" />
                <ellipse cx="-4" cy="11" rx="4" ry="2.5" fill="#6b8f71" opacity="0.7" />
                <ellipse cx="4" cy="13" rx="3" ry="2" fill="#7da383" opacity="0.6" />
                {/* Large celebratory sakura */}
                <ellipse cx="0" cy="-9" rx="4" ry="7" fill="#fce7f3" />
                <ellipse cx="7" cy="-3" rx="4" ry="7" fill="#fbcfe8" transform="rotate(72, 7, -3)" />
                <ellipse cx="4" cy="6" rx="4" ry="7" fill="#fce7f3" transform="rotate(144, 4, 6)" />
                <ellipse cx="-4" cy="6" rx="4" ry="7" fill="#fbcfe8" transform="rotate(-144, -4, 6)" />
                <ellipse cx="-7" cy="-3" rx="4" ry="7" fill="#fce7f3" transform="rotate(-72, -7, -3)" />
                <circle cx="0" cy="0" r="3.5" fill="#ec4899" />
                <circle cx="0" cy="0" r="2" fill="#fcd34d" />
              </g>
            )}
          </svg>
        </div>
      )}

      {/* Bamboo Growth - Left side (grows first) */}
      {!showConfirmation && (
        <div 
          className="fixed left-3 z-10 pointer-events-none"
          style={{ 
            top: '55%',
            transform: 'translateY(-20%)',
          }}
        >
          <BambooGrowth 
            progress={Math.min(1, bambooProgress * 2)} 
            size={160}
          />
        </div>
      )}
      
      {/* Bamboo Growth - Right side (only shows after left is complete at 50%+) */}
      {!showConfirmation && bambooProgress > 0.5 && (
        <div 
          className="fixed right-3 z-10 pointer-events-none"
          style={{ 
            top: '62%',
            transform: 'translateY(-20%)',
          }}
        >
          <BambooGrowth 
            progress={(bambooProgress - 0.5) * 2} 
            size={160}
            mirror
          />
        </div>
      )}
      
      {/* Main content */}
      <div className={`flex-1 flex flex-col items-center justify-center px-6 transition-all duration-300 relative ${inputFocused ? 'pt-16 pb-4' : 'pt-16 pb-72'}`}>
        
        {/* Daily Affirmation - fixed at top below header */}
        {!showConfirmation && !inputFocused && dailyAffirmation && (
          <div className="fixed top-20 left-0 right-0 px-6 z-10">
            <div className="max-w-sm mx-auto text-center">
              {/* Decorative line */}
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#6b8f71]/40" />
                <svg className="w-4 h-4 text-[#6b8f71]/60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z"/>
                </svg>
                <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-[#6b8f71]/40" />
              </div>
              
              {/* Affirmation text */}
              <p className="text-base font-medium text-[var(--foreground)] leading-snug tracking-tight">
                {dailyAffirmation}
              </p>
            </div>
          </div>
        )}

        {/* Panda - animates to top when sheet opens */}
        {!showConfirmation && (
        <motion.div 
          layoutId="panda-mascot"
          className="relative overflow-visible cursor-pointer"
          onClick={handleKaiTap}
          whileTap={{ scale: 0.9 }}
          animate={{ 
            scale: isProcessing ? 0.95 : 1,
            width: inputFocused ? 80 : 160,
            height: inputFocused ? 80 : 160,
            marginBottom: inputFocused ? 8 : 8,
            marginTop: inputFocused ? 8 : 40,
          }}
          transition={{ type: 'spring', damping: 30, stiffness: 200 }}
          style={{ 
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
          }}
        >
          {/* Matcha aura glow */}
          <div 
            className="absolute inset-0 rounded-full blur-2xl scale-150"
            style={{ 
              backgroundColor: `${THEME_COLOR}50`,
              animation: appVisible ? 'auraPulse 3s ease-in-out infinite' : 'none',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
            }}
          />
          {/* Shadow */}
          <div 
            className="absolute bottom-0 left-1/2 w-20 h-4 rounded-full bg-black/10 blur-sm -translate-x-1/2"
            style={{ 
              animation: appVisible ? 'shadowPulse 3s ease-in-out infinite' : 'none',
              backfaceVisibility: 'hidden',
            }}
          />
          <Image
            src={pandaImage}
            alt="Panda"
            fill
            className="object-contain relative z-10"
            style={{ 
              animation: (!appVisible || isProcessing) ? 'none' : 'float 3s ease-in-out infinite', 
              filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.12))',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)',
            }}
            priority
          />
        </motion.div>
        )}

        {/* Kai's pixel speech bubble - hidden when sheet is open or during loading states */}
        {!showConfirmation && pandaMessage && !['Déjame pensar...', 'Te escucho...', '¿Qué tienes en mente?'].includes(pandaMessage) && (
          <div className="mb-2 max-w-xs mx-auto" key={pandaMessage}>
            <PixelBubble message={pandaMessage} />
          </div>
        )}

        {/* Proactive suggestion - removed, Kai handles this conversationally now */}
        <AnimatePresence>
        </AnimatePresence>
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
            />
            
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
              className={`fixed bottom-0 left-0 right-0 z-50 bg-[var(--background)] rounded-t-3xl shadow-2xl flex flex-col ${isBrainDump ? 'max-h-[90vh]' : 'max-h-[70vh]'}`}
              style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}
            >
              {/* Handle + Kai */}
              <div className="relative pt-3 pb-2">
                <div className="flex justify-center">
                  <div className="w-10 h-1 rounded-full bg-[var(--gray-3)]" />
                </div>
                {/* Kai - top right corner */}
                <motion.div
                  layoutId="panda-mascot"
                  className="absolute -top-6 right-4"
                  transition={{ type: 'spring', damping: 30, stiffness: 200 }}
                >
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-[var(--gray-1)] border-2 border-[var(--background)] shadow-lg">
                    <Image
                      src={pandaImage}
                      alt="Kai"
                      fill
                      className="object-cover"
                    />
                  </div>
                </motion.div>
              </div>

              {/* Sheet content */}
              <div className="flex-1 overflow-y-auto px-5 pb-4">
                {/* Brain dump summary header */}
                {isBrainDump && (() => {
                  const taskCount = capturedItems.filter(i => i.type === 'task').length;
                  const ideaCount = capturedItems.filter(i => i.type === 'idea').length;
                  const dreamCount = capturedItems.filter(i => i.type === 'dream').length;
                  const parts = [];
                  if (taskCount > 0) parts.push(`${taskCount} tarea${taskCount > 1 ? 's' : ''}`);
                  if (ideaCount > 0) parts.push(`${ideaCount} idea${ideaCount > 1 ? 's' : ''}`);
                  if (dreamCount > 0) parts.push(`${dreamCount} sueño${dreamCount > 1 ? 's' : ''}`);
                  return (
                    <p className="text-sm font-medium text-[var(--foreground)] mb-4">
                      Capté {parts.join(', ')}
                    </p>
                  );
                })()}

                {/* Items - grouped by type in brain dump, flat otherwise */}
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                  {capturedItems.map((item, i) => renderItem(item, i))}
                </AnimatePresence>
                </div>
                {/* (moved item rendering to renderItem function) */}

                {/* Hint */}
                <p className="text-[10px] text-center text-[var(--gray-4)] mt-2 mb-3">
                  Toca icono = cambiar tipo · Doble tap = editar · Mantén = seleccionar
                </p>

                {/* Connections between items */}
                {connections.length > 0 && (
                  <div className="mt-3 mb-3 pt-3 border-t border-[var(--gray-2)]">
                    <p className="text-[10px] text-[var(--gray-4)] mb-2 font-medium uppercase tracking-wider">Conexiones</p>
                    <div className="space-y-2">
                      {connections.map((conn, ci) => {
                        const fromItem = capturedItems[conn.from];
                        const toItem = capturedItems[conn.to];
                        if (!fromItem || !toItem) return null;
                        const fromConfig = typeConfig[fromItem.type];
                        const toConfig = typeConfig[toItem.type];
                        return (
                          <div key={ci} className="p-2 rounded-lg bg-[var(--gray-1)]">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className={`${fromConfig.color} flex-shrink-0`} style={{ transform: 'scale(0.7)' }}>{fromConfig.icon}</span>
                              <span className="text-[11px] text-[var(--foreground)] font-medium truncate">{fromItem.title}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mb-1.5 pl-1">
                              <svg className="w-3 h-3 text-[var(--gray-4)] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.44a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364L17.03 8.688" />
                              </svg>
                              <span className={`${toConfig.color} flex-shrink-0`} style={{ transform: 'scale(0.7)' }}>{toConfig.icon}</span>
                              <span className="text-[11px] text-[var(--foreground)] font-medium truncate">{toItem.title}</span>
                            </div>
                            <p className="text-[9px] text-[var(--gray-4)] italic pl-1">{conn.reason}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

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
                <AnimatePresence mode="wait">
                  {batchMode && batchSelected.size > 0 ? (
                    /* Batch action bar */
                    <motion.div
                      key="batch"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="space-y-2"
                    >
                      <p className="text-xs text-[var(--gray-4)] text-center">{batchSelected.size} seleccionados</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => batchReclassify('task')}
                          className="flex-1 h-10 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 active:scale-[0.98]"
                        >
                          Tareas
                        </button>
                        <button
                          onClick={() => batchReclassify('idea')}
                          className="flex-1 h-10 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 active:scale-[0.98]"
                        >
                          Ideas
                        </button>
                        <button
                          onClick={() => batchReclassify('dream')}
                          className="flex-1 h-10 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-600 active:scale-[0.98]"
                        >
                          Sueños
                        </button>
                        <button
                          onClick={batchDelete}
                          className="h-10 w-10 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 active:scale-[0.98]"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                      <button
                        onClick={() => { setBatchMode(false); setBatchSelected(new Set()); }}
                        className="w-full text-xs text-[var(--gray-4)] py-1"
                      >
                        Cancelar selección
                      </button>
                    </motion.div>
                  ) : (
                    /* Normal action buttons */
                    <motion.div key="normal" className="flex gap-3">
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Input bar - fixed at bottom */}
      {!showConfirmation && (
        <div className="fixed bottom-20 left-0 right-0 px-6 pb-4 z-20">
          {brainDumpLocked ? (
            /* === BRAIN DUMP LOCKED STATE === */
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-3 h-14 px-4 rounded-full border border-[var(--gray-2)] relative shadow-lg"
              style={{ backgroundColor: 'var(--gray-1)' }}
            >
              {/* Delete / Cancel */}
              <button
                onClick={cancelBrainDump}
                className="w-10 h-10 flex items-center justify-center rounded-full text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>

              {/* Timer + wave bars */}
              <div className="flex-1 flex items-center gap-3">
                <span className={`text-sm font-medium tabular-nums ${brainDumpPaused ? 'text-[var(--gray-4)]' : 'text-[var(--foreground)]'}`}>
                  {formatTime(recordingTime)}
                </span>
                {/* Mini wave bars */}
                <div className="flex items-center gap-[3px] h-6 flex-1">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-full"
                      style={{
                        backgroundColor: THEME_COLOR,
                        opacity: brainDumpPaused ? 0.3 : 0.4 + Math.random() * 0.4,
                        height: brainDumpPaused ? '4px' : undefined,
                        animation: brainDumpPaused ? 'none' : `brainDumpBar ${0.6 + (i % 4) * 0.2}s ease-in-out ${i * 0.05}s infinite alternate`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Pause / Resume */}
              <button
                onClick={toggleBrainDumpPause}
                className="w-10 h-10 flex items-center justify-center rounded-full text-[var(--foreground)] hover:bg-[var(--gray-2)] transition-colors"
              >
                {brainDumpPaused ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5.14v14l11-7-11-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                )}
              </button>

              {/* Stop / Send - mic with glow */}
              <button
                onClick={stopBrainDump}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white relative active:scale-95 transition-transform"
                style={{ backgroundColor: THEME_COLOR }}
              >
                {/* Glow ring */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    boxShadow: brainDumpPaused ? 'none' : `0 0 12px 3px ${THEME_COLOR}60, 0 0 24px 6px ${THEME_COLOR}30`,
                    animation: brainDumpPaused ? 'none' : 'micGlow 2s ease-in-out infinite',
                  }}
                />
                <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                </svg>
              </button>
            </motion.div>
          ) : (
            /* === NORMAL INPUT BAR === */
            <div 
              className="flex items-center gap-2 h-14 px-4 rounded-full border bg-[var(--gray-1)] border-[var(--gray-2)] relative shadow-lg"
            >
              {/* Clip only the recording overlay */}
              <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
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
              </div>
              
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

              {/* Mic button with swipe-up lock for Brain Dump */}
              <div 
                className="relative z-10"
                onTouchStart={inputText.trim() ? undefined : handleMicTouchStart}
                onTouchMove={inputText.trim() ? undefined : handleMicTouchMove}
                onTouchEnd={inputText.trim() ? undefined : handleMicTouchEnd}
                onClick={inputText.trim() ? handleTextSubmit : undefined}
                style={{ touchAction: inputText.trim() ? 'auto' : 'none' }}
              >
                {/* Lock track - appears above mic when recording */}
                <AnimatePresence>
                  {isRecording && !brainDumpTriggeredRef.current && (
                    <motion.div
                      initial={{ opacity: 0, scaleY: 0 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      exit={{ opacity: 0, scaleY: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center origin-bottom"
                    >
                      {/* Lock icon */}
                      <motion.div
                        animate={{ 
                          y: swipeProgress > 0 ? -swipeProgress * 8 : 0,
                          scale: 0.8 + swipeProgress * 0.2,
                        }}
                        className="w-9 h-9 rounded-full flex items-center justify-center mb-1 transition-colors duration-150"
                        style={{ backgroundColor: swipeProgress >= 0.85 ? THEME_COLOR : 'var(--gray-3)' }}
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          {swipeProgress >= 0.85 ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          )}
                        </svg>
                      </motion.div>
                      {/* Track line */}
                      <div className="w-[2px] h-10 rounded-full bg-[var(--gray-3)] relative overflow-hidden">
                        <motion.div
                          className="absolute bottom-0 left-0 right-0 rounded-full"
                          animate={{ height: `${swipeProgress * 100}%` }}
                          style={{ backgroundColor: THEME_COLOR }}
                        />
                      </div>
                      {/* Chevron up hint */}
                      <svg className="w-4 h-4 text-[var(--gray-4)] mt-0.5 animate-bounce" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Mic / Send button — transforms to checkmark when text is entered */}
                <button
                  onMouseDown={inputText.trim() ? undefined : handleMicMouseDown}
                  onMouseUp={inputText.trim() ? undefined : handleMicMouseUp}
                  onMouseLeave={() => {
                    setSwipeProgress(0);
                    if (isRecording && !brainDumpTriggeredRef.current) stopRecording();
                  }}
                  onClick={inputText.trim() ? handleTextSubmit : undefined}
                  disabled={isProcessing}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95 relative disabled:opacity-50 select-none"
                  style={{ backgroundColor: THEME_COLOR }}
                >
                  <div className={`absolute transition-all ease-out ${isRecording || inputText.trim() ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} style={{ transitionDuration: '850ms' }}>
                    {Icons.mic}
                  </div>
                  <div className={`absolute transition-all ease-out ${isRecording || inputText.trim() ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-45'}`} style={{ transitionDuration: '850ms' }}>
                    {Icons.check}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav 
        hasNew={hasNew}
        onClearNew={(type) => setHasNew(prev => ({ ...prev, [type]: false }))}
      />

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
        @keyframes brainDumpBar {
          0% { height: 4px; }
          100% { height: 20px; }
        }
        @keyframes micGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes flowerPop {
          0% { opacity: 0; transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
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
