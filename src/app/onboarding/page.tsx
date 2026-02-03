'use client';

import { useState, useEffect, useRef, TouchEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

// App's theme color
const THEME_COLOR = '#6b8f71';

// SVG Icons - Apple Style
const Icons = {
  lightbulb: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  note: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  list: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  thought: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  ),
  moon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ),
  walk: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  shower: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  ),
  bed: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  ),
  coffee: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513c0 1.135.845 2.098 1.976 2.192 1.327.11 2.669.166 4.024.166 1.355 0 2.697-.056 4.024-.166 1.131-.094 1.976-1.057 1.976-2.192v-2.513c0-1.135-.845-2.098-1.976-2.192A48.424 48.424 0 0012 8.25zm0 0V6.75" />
    </svg>
  ),
  run: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  sparkle: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  mic: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  ),
  bell: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
  arrow: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  ),
  back: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  ),
  x: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  checkSmall: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
};

const iconMap: Record<string, JSX.Element> = {
  ideas: Icons.lightbulb,
  tasks: Icons.check,
  notes: Icons.note,
  lists: Icons.list,
  thoughts: Icons.thought,
  dreams: Icons.moon,
  walking: Icons.walk,
  shower: Icons.shower,
  bed: Icons.bed,
  morning: Icons.coffee,
  exercise: Icons.run,
  random: Icons.sparkle,
};

interface ExtractedItem {
  title: string;
  category: string;
  type: 'task' | 'idea';
  priority: 'high' | 'medium' | 'low';
}

type StepType = 'welcome' | 'name-input' | 'multi-choice' | 'permission' | 'voice-capture' | 'processing' | 'preview' | 'complete';

interface OnboardingStep {
  id: string;
  panda: string;
  title: string;
  subtitle?: string;
  type: StepType;
  options?: { id: string; label: string }[];
  permissionType?: 'microphone' | 'notifications';
}

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    panda: '/panda/panda-wave.png',
    title: '¡Hola!',
    subtitle: 'Soy tu compañero para capturar ideas. Nunca más perderás una.',
    type: 'welcome',
  },
  {
    id: 'name',
    panda: '/panda/panda-neutral.png',
    title: '¿Cómo te llamas?',
    subtitle: 'Para que pueda dirigirme a ti',
    type: 'name-input',
  },
  {
    id: 'what-capture',
    panda: '/panda/panda-thinking.png',
    title: '¿Qué sueles capturar?',
    type: 'multi-choice',
    options: [
      { id: 'ideas', label: 'Ideas' },
      { id: 'tasks', label: 'Tareas' },
      { id: 'notes', label: 'Notas' },
      { id: 'lists', label: 'Listas' },
      { id: 'thoughts', label: 'Pensamientos' },
      { id: 'dreams', label: 'Sueños' },
    ],
  },
  {
    id: 'when-ideas',
    panda: '/panda/panda-thinking.png',
    title: '¿Cuándo te vienen ideas?',
    type: 'multi-choice',
    options: [
      { id: 'walking', label: 'Caminando' },
      { id: 'shower', label: 'Ducha' },
      { id: 'bed', label: 'Cama' },
      { id: 'morning', label: 'Mañana' },
      { id: 'exercise', label: 'Ejercicio' },
      { id: 'random', label: 'Random' },
    ],
  },
  {
    id: 'mic-permission',
    panda: '/panda/panda-excited.png',
    title: '¿Me dejas escucharte?',
    subtitle: 'Necesito el micrófono para capturar tu voz',
    type: 'permission',
    permissionType: 'microphone',
  },
  {
    id: 'voice-capture',
    panda: '/panda/panda-excited.png',
    title: '¿Qué tienes en mente?',
    subtitle: 'Cuéntame una idea, tarea, o lo que quieras',
    type: 'voice-capture',
  },
  {
    id: 'processing',
    panda: '/panda/panda-neutral.png',
    title: 'Analizando...',
    subtitle: 'Extrayendo tareas e ideas',
    type: 'processing',
  },
  {
    id: 'preview',
    panda: '/panda/panda-celebrate.png',
    title: '¡Mira lo que capturé!',
    type: 'preview',
  },
  {
    id: 'notifications',
    panda: '/panda/panda-wave-alt.png',
    title: '¿Te aviso?',
    subtitle: 'Te recordaré revisar tus ideas',
    type: 'permission',
    permissionType: 'notifications',
  },
  {
    id: 'complete',
    panda: '/panda/panda-celebrate.png',
    title: '¡Listo!',
    type: 'complete',
  },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [userName, setUserName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [permissionGranted, setPermissionGranted] = useState<Record<string, boolean>>({});
  
  // Extracted items
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Swipe handling
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // Check if already completed onboarding
  useEffect(() => {
    if (searchParams.get('reset') === 'true') {
      localStorage.removeItem('taskflow-onboarding-complete');
      localStorage.removeItem('taskflow-user-name');
      localStorage.removeItem('taskflow-onboarding-answers');
      router.replace('/onboarding');
      return;
    }
    const completed = localStorage.getItem('taskflow-onboarding-complete');
    if (completed) {
      router.push('/app');
    }
  }, [router, searchParams]);

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection('forward');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setDirection('backward');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  // Swipe handlers
  const handleTouchStart = (e: TouchEvent) => {
    if (step.type === 'processing' || step.type === 'voice-capture') return;
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isSwiping || step.type === 'processing' || step.type === 'voice-capture') return;
    touchEndX.current = e.touches[0].clientX;
    const diff = touchEndX.current - touchStartX.current;
    const maxOffset = 80;
    const resistance = 0.3;
    let offset = diff;
    if ((diff > 0 && currentStep === 0) || (diff < 0 && currentStep === STEPS.length - 1)) {
      offset = diff * resistance;
    }
    setSwipeOffset(Math.max(-maxOffset, Math.min(maxOffset, offset)));
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    const threshold = 50;
    const diff = touchEndX.current - touchStartX.current;
    
    if (diff > threshold && currentStep > 0 && canSwipeBack()) {
      goBack();
    } else if (diff < -threshold && canProceed() && currentStep < STEPS.length - 1) {
      if (step.type === 'complete') {
        saveItemsAndFinish();
      } else {
        goNext();
      }
    }
    setSwipeOffset(0);
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const canSwipeBack = () => {
    return step.type !== 'complete' && step.type !== 'preview' && step.type !== 'processing';
  };

  const handleMultiChoice = (stepId: string, optionId: string) => {
    const current = answers[stepId] || [];
    if (current.includes(optionId)) {
      setAnswers({ ...answers, [stepId]: current.filter(id => id !== optionId) });
    } else {
      setAnswers({ ...answers, [stepId]: [...current, optionId] });
    }
  };

  const handlePermission = async (type: 'microphone' | 'notifications') => {
    try {
      if (type === 'microphone') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissionGranted({ ...permissionGranted, microphone: true });
      } else if (type === 'notifications') {
        const result = await Notification.requestPermission();
        setPermissionGranted({ ...permissionGranted, notifications: result === 'granted' });
      }
    } catch (e) {
      console.error('Permission error:', e);
    }
  };

  // Voice recording
  const startRecording = async () => {
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
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        await processAudio();
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      setTranscript('');
      
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (e) {
      console.error('Recording error:', e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const processAudio = async () => {
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
    setCurrentStep(prev => prev + 1);
    
    const timeoutId = setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, 30000);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) throw new Error('Transcription failed');
      
      const transcribeData = await transcribeRes.json();
      const text = transcribeData?.text || '';
      setTranscript(text);

      if (!text?.trim()) {
        clearTimeout(timeoutId);
        setExtractedItems([]);
        setCurrentStep(prev => prev + 1);
        return;
      }

      const extractRes = await fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      clearTimeout(timeoutId);

      if (!extractRes.ok) {
        setExtractedItems([]);
        setCurrentStep(prev => prev + 1);
        return;
      }
      
      const extractData = await extractRes.json();
      const items: ExtractedItem[] = [
        ...(extractData?.tasks || []).map((t: any) => ({ ...t, type: 'task' as const })),
        ...(extractData?.ideas || []).map((i: any) => ({ ...i, type: 'idea' as const })),
      ];

      setExtractedItems(items);
      setCurrentStep(prev => prev + 1);
    } catch (e) {
      console.error('Processing error:', e);
      clearTimeout(timeoutId);
      setCurrentStep(prev => prev + 1);
    }
  };

  const saveItemsAndFinish = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && extractedItems.length > 0) {
      const rows = extractedItems.map(item => ({
        user_id: user.id,
        title: item.title,
        category: item.category,
        priority: item.priority,
        completed: false,
        type: item.type,
        voice_context: transcript,
      }));
      await supabase.from('tasks').insert(rows);
    }

    localStorage.setItem('taskflow-onboarding-complete', 'true');
    localStorage.setItem('taskflow-user-name', userName);
    localStorage.setItem('taskflow-onboarding-answers', JSON.stringify(answers));
    router.push('/app');
  };

  const removeExtractedItem = (index: number) => {
    setExtractedItems(items => items.filter((_, i) => i !== index));
  };

  const canProceed = () => {
    switch (step.type) {
      case 'welcome':
      case 'complete':
      case 'permission':
      case 'preview':
        return true;
      case 'name-input':
        return userName.trim().length > 0;
      case 'multi-choice':
        return (answers[step.id]?.length || 0) > 0;
      case 'voice-capture':
      case 'processing':
        return false;
      default:
        return true;
    }
  };

  // Render bottom input area based on step type
  const renderBottomInput = () => {
    switch (step.type) {
      case 'welcome':
        return (
          <button
            onClick={goNext}
            className="w-full h-14 rounded-2xl font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:opacity-90"
            style={{ backgroundColor: THEME_COLOR }}
          >
            Empezar
            {Icons.arrow}
          </button>
        );

      case 'name-input':
        return (
          <div className="flex gap-3">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Tu nombre"
              className="flex-1 px-5 h-14 text-lg bg-[var(--gray-1)] border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#6b8f71] transition-all"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && canProceed() && goNext()}
            />
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-all active:scale-95 ${
                canProceed() ? 'hover:opacity-90' : 'opacity-40'
              }`}
              style={{ backgroundColor: THEME_COLOR }}
            >
              {Icons.arrow}
            </button>
          </div>
        );

      case 'multi-choice':
        return (
          <button
            onClick={goNext}
            disabled={!canProceed()}
            className={`w-full h-14 rounded-2xl font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              canProceed() ? 'hover:opacity-90' : 'opacity-40'
            }`}
            style={{ backgroundColor: THEME_COLOR }}
          >
            Siguiente
            {Icons.arrow}
          </button>
        );

      case 'permission':
        return (
          <div className="space-y-3">
            <button
              onClick={() => handlePermission(step.permissionType!)}
              className={`w-full h-14 rounded-2xl flex items-center justify-between px-5 transition-all ${
                permissionGranted[step.permissionType!]
                  ? 'bg-[#6b8f7115] border-2 border-[#6b8f71]'
                  : 'bg-[var(--gray-1)] border-2 border-transparent'
              }`}
            >
              <span className="flex items-center gap-3 text-[var(--foreground)]">
                {step.permissionType === 'microphone' ? Icons.mic : Icons.bell}
                <span className="font-medium">
                  {step.permissionType === 'microphone' ? 'Permitir micrófono' : 'Activar notificaciones'}
                </span>
              </span>
              <div 
                className={`w-12 h-7 rounded-full transition-all duration-200 flex items-center ${
                  permissionGranted[step.permissionType!] ? 'justify-end' : 'justify-start'
                }`}
                style={{ backgroundColor: permissionGranted[step.permissionType!] ? THEME_COLOR : 'var(--gray-3)' }}
              >
                <div className="w-5 h-5 bg-white rounded-full shadow-md m-1" />
              </div>
            </button>
            <button
              onClick={goNext}
              className="w-full h-14 rounded-2xl font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:opacity-90"
              style={{ backgroundColor: THEME_COLOR }}
            >
              {permissionGranted[step.permissionType!] ? 'Continuar' : 'Omitir'}
              {Icons.arrow}
            </button>
          </div>
        );

      case 'voice-capture':
        return (
          <div className="relative">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 bg-[var(--gray-1)] border-2 border-dashed border-[var(--gray-3)] text-[var(--gray-5)] transition-all hover:border-[#6b8f71] hover:text-[#6b8f71]"
              >
                {Icons.mic}
                <span>Toca para hablar</span>
              </button>
            ) : (
              <div className="w-full h-14 rounded-2xl flex items-center gap-3 px-4 bg-[#1c1c1e]">
                <button
                  onClick={() => {
                    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
                    setIsRecording(false);
                  }}
                  className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                >
                  {Icons.x}
                </button>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 rounded-full bg-[#6b8f71]"
                        style={{ animation: `waveform 0.5s ease-in-out infinite`, animationDelay: `${i * 80}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-white/90 text-sm font-medium">Escuchando...</span>
                  <span className="text-white/50 text-xs ml-auto tabular-nums">{formatTime(recordingTime)}</span>
                </div>
                <button
                  onClick={stopRecording}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: THEME_COLOR }}
                >
                  {Icons.checkSmall}
                </button>
              </div>
            )}
          </div>
        );

      case 'processing':
        return (
          <div className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 bg-[var(--gray-1)]">
            <div className="w-5 h-5 border-2 border-[#6b8f71] border-t-transparent rounded-full animate-spin" />
            <span className="text-[var(--gray-5)]">Procesando...</span>
          </div>
        );

      case 'preview':
        return (
          <button
            onClick={goNext}
            className="w-full h-14 rounded-2xl font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:opacity-90"
            style={{ backgroundColor: THEME_COLOR }}
          >
            Continuar
            {Icons.arrow}
          </button>
        );

      case 'complete':
        return (
          <button
            onClick={saveItemsAndFinish}
            className="w-full h-14 rounded-2xl font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] hover:opacity-90"
            style={{ backgroundColor: THEME_COLOR }}
          >
            Ir a mi inbox
            {Icons.arrow}
          </button>
        );

      default:
        return null;
    }
  };

  // Render middle content based on step type
  const renderMiddleContent = () => {
    switch (step.type) {
      case 'multi-choice':
        return (
          <div className="flex flex-wrap justify-center gap-2 px-4">
            {step.options?.map((option) => {
              const isSelected = answers[step.id]?.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => handleMultiChoice(step.id, option.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isSelected
                      ? 'border-[#6b8f71] bg-[#6b8f7115] text-[#6b8f71]'
                      : 'border-[var(--gray-2)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--gray-3)]'
                  }`}
                >
                  <span className={isSelected ? 'text-[#6b8f71]' : 'text-[var(--gray-4)]'}>
                    {iconMap[option.id]}
                  </span>
                  <span className="font-medium text-sm">{option.label}</span>
                </button>
              );
            })}
          </div>
        );

      case 'preview':
        return (
          <div className="w-full max-w-sm space-y-2 px-4">
            {extractedItems.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-[var(--gray-5)]">No detecté tareas o ideas.</p>
                <p className="text-[var(--gray-4)] text-sm mt-1">Podrás agregar más en la app.</p>
              </div>
            ) : (
              extractedItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--background)] border border-[var(--gray-2)] shadow-sm"
                >
                  <span className="text-[var(--gray-4)]">
                    {item.type === 'idea' ? Icons.lightbulb : Icons.check}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--foreground)] text-sm truncate">{item.title}</p>
                    <p className="text-xs text-[var(--gray-4)]">{item.category}</p>
                  </div>
                  <button
                    onClick={() => removeExtractedItem(i)}
                    className="w-7 h-7 flex items-center justify-center text-[var(--gray-4)] hover:text-red-500 rounded-full transition-colors"
                  >
                    {Icons.x}
                  </button>
                </div>
              ))
            )}
          </div>
        );

      case 'complete':
        return (
          <div className="text-center">
            {userName && (
              <p className="text-lg text-[var(--gray-5)]">
                Bienvenido, <span className="font-semibold text-[#6b8f71]">{userName}</span>
              </p>
            )}
            {extractedItems.length > 0 && (
              <p className="text-[var(--gray-4)] text-sm mt-1">
                {extractedItems.length} {extractedItems.length === 1 ? 'item' : 'items'} esperándote
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className="min-h-screen bg-[var(--background)] flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bar */}
      <div className="h-0.5 bg-[var(--gray-2)]">
        <div 
          className="h-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%`, backgroundColor: THEME_COLOR }}
        />
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 pt-4 pb-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{
              backgroundColor: i <= currentStep ? THEME_COLOR : 'var(--gray-3)',
              opacity: i < currentStep ? 0.4 : 1,
            }}
          />
        ))}
      </div>

      {/* Back button */}
      {currentStep > 0 && canSwipeBack() && (
        <button
          onClick={goBack}
          className="absolute top-14 left-4 w-10 h-10 rounded-full flex items-center justify-center text-[var(--gray-4)] hover:text-[var(--foreground)] hover:bg-[var(--gray-1)] transition-all z-10"
        >
          {Icons.back}
        </button>
      )}

      {/* Main content area - Panda at top, content in middle */}
      <div 
        className={`flex-1 flex flex-col items-center pt-4 overflow-hidden transition-all ease-out ${
          isSwiping ? 'duration-0' : 'duration-300'
        } ${
          isAnimating
            ? direction === 'forward'
              ? '-translate-x-full opacity-0'
              : 'translate-x-full opacity-0'
            : ''
        }`}
        style={{ transform: isAnimating ? undefined : `translateX(${swipeOffset}px)` }}
      >
        {/* Panda - positioned at top */}
        <div className="relative w-28 h-28 mb-4">
          <div 
            className="absolute bottom-0 left-1/2 w-14 h-2.5 rounded-full bg-black/10 dark:bg-black/20 blur-sm"
            style={{ animation: 'shadowPulse 3s ease-in-out infinite', transform: 'translateX(-50%)' }}
          />
          <Image
            src={step.panda}
            alt="Panda"
            fill
            className="object-contain"
            style={{ animation: 'float 3s ease-in-out infinite', filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.12))' }}
            priority
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-[var(--foreground)] text-center tracking-tight px-4">
          {step.type === 'complete' && userName ? `¡Listo, ${userName}!` : step.title}
        </h1>

        {/* Subtitle */}
        {step.subtitle && (
          <p className="text-[var(--gray-4)] text-sm text-center mt-1.5 px-4 max-w-xs">
            {step.subtitle}
          </p>
        )}

        {/* Middle content area (chips, preview, etc) */}
        <div className="flex-1 flex items-center justify-center w-full py-6">
          {renderMiddleContent()}
        </div>
      </div>

      {/* Bottom input area - fixed at bottom */}
      <div className="p-5 pb-8 max-w-md mx-auto w-full">
        {renderBottomInput()}
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes shadowPulse {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.4; }
          50% { transform: translateX(-50%) scale(0.85); opacity: 0.25; }
        }
        @keyframes waveform {
          0%, 100% { height: 6px; }
          50% { height: 18px; }
        }
      `}</style>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6b8f71] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
