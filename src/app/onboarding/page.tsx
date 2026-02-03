'use client';

import { useState, useEffect, useRef, TouchEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

// App's theme color (sage green from layout.tsx viewport)
const THEME_COLOR = '#6b8f71';
const THEME_COLOR_DARK = '#5a7d60';
const THEME_COLOR_LIGHT = '#6b8f7120';

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
  options?: { id: string; icon: string; label: string; description?: string }[];
  permissionType?: 'microphone' | 'notifications';
}

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    panda: '/panda/panda-wave.png',
    title: '¡Hola! 👋',
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
    subtitle: 'Selecciona todas las que apliquen',
    type: 'multi-choice',
    options: [
      { id: 'ideas', icon: '💡', label: 'Ideas', description: 'Proyectos y conceptos' },
      { id: 'tasks', icon: '✅', label: 'Tareas', description: 'Cosas por hacer' },
      { id: 'notes', icon: '📝', label: 'Notas', description: 'Apuntes rápidos' },
      { id: 'lists', icon: '📋', label: 'Listas', description: 'Compras, packing...' },
      { id: 'thoughts', icon: '💭', label: 'Pensamientos', description: 'Reflexiones' },
      { id: 'dreams', icon: '🌙', label: 'Sueños', description: 'Lo que soñaste' },
    ],
  },
  {
    id: 'when-ideas',
    panda: '/panda/panda-thinking.png',
    title: '¿Cuándo te vienen ideas?',
    subtitle: 'Te ayudaremos a capturarlas',
    type: 'multi-choice',
    options: [
      { id: 'walking', icon: '🚶', label: 'Caminando' },
      { id: 'shower', icon: '🚿', label: 'En la ducha' },
      { id: 'bed', icon: '🛏️', label: 'Antes de dormir' },
      { id: 'morning', icon: '☕', label: 'Por la mañana' },
      { id: 'exercise', icon: '🏃', label: 'Ejercicio' },
      { id: 'random', icon: '✨', label: 'Random' },
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
    subtitle: 'Esto entendí de tu mensaje',
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
    subtitle: 'Tu inbox te espera',
    type: 'complete',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [userName, setUserName] = useState('');
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [permissionGranted, setPermissionGranted] = useState<Record<string, boolean>>({});
  
  // Extracted items
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
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

  // Check if already completed onboarding (allow ?reset=true to force restart)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'true') {
      localStorage.removeItem('taskflow-onboarding-complete');
      localStorage.removeItem('taskflow-user-name');
      localStorage.removeItem('taskflow-onboarding-answers');
      // Clean URL
      window.history.replaceState({}, '', '/onboarding');
      return;
    }
    const completed = localStorage.getItem('taskflow-onboarding-complete');
    if (completed) {
      router.push('/app');
    }
  }, [router]);

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection('forward');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 250);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setDirection('backward');
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 250);
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
    // Limit swipe offset with resistance at edges
    const maxOffset = 100;
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
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
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
      setIsExpanded(true);
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

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setIsExpanded(false);
    setTranscript('');
    setRecordingTime(0);
    chunksRef.current = [];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const processAudio = async () => {
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
    
    // Move to processing step immediately
    setIsExpanded(false);
    setCurrentStep(prev => prev + 1); // Direct step change, no animation delay
    setIsProcessing(true);
    
    // Timeout safety - auto-advance after 30 seconds if stuck
    const timeoutId = setTimeout(() => {
      console.log('Processing timeout - auto advancing');
      setIsProcessing(false);
      setCurrentStep(prev => prev + 1);
    }, 30000);
    
    try {
      // Transcribe
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeRes.ok) {
        console.error('Transcription failed:', transcribeRes.status);
        throw new Error('Transcription failed');
      }
      
      const transcribeData = await transcribeRes.json();
      const text = transcribeData?.text || '';
      setTranscript(text);

      if (!text || !text.trim()) {
        clearTimeout(timeoutId);
        setExtractedItems([]);
        setIsProcessing(false);
        setCurrentStep(prev => prev + 1);
        return;
      }

      // Extract tasks and ideas
      const extractRes = await fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      clearTimeout(timeoutId);

      if (!extractRes.ok) {
        console.error('Extraction failed:', extractRes.status);
        setExtractedItems([]);
        setIsProcessing(false);
        setCurrentStep(prev => prev + 1);
        return;
      }
      
      const extractData = await extractRes.json();
      const tasks = extractData?.tasks || [];
      const ideas = extractData?.ideas || [];

      const items: ExtractedItem[] = [
        ...tasks.map((t: any) => ({ ...t, type: 'task' as const })),
        ...ideas.map((i: any) => ({ ...i, type: 'idea' as const })),
      ];

      setExtractedItems(items);
      setIsProcessing(false);
      setCurrentStep(prev => prev + 1);
    } catch (e) {
      console.error('Processing error:', e);
      clearTimeout(timeoutId);
      setIsProcessing(false);
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
        return true;
      case 'name-input':
        return userName.trim().length > 0;
      case 'multi-choice':
        return (answers[step.id]?.length || 0) > 0;
      case 'voice-capture':
        return false;
      case 'processing':
        return false;
      case 'preview':
        return true;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (step.type) {
      case 'name-input':
        return (
          <div className="w-full max-w-sm">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full px-6 py-4 text-xl text-center bg-[var(--gray-1)] dark:bg-[var(--gray-1)] border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#6b8f71] transition-all"
              autoFocus
            />
          </div>
        );

      case 'multi-choice':
        return (
          <div className="w-full grid grid-cols-2 gap-2">
            {step.options?.map((option, i) => {
              const isSelected = answers[step.id]?.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => handleMultiChoice(step.id, option.id)}
                  className={`p-3 rounded-2xl border transition-all duration-200 text-left no-select ${
                    isSelected
                      ? 'border-[#6b8f71] bg-[#6b8f7115] shadow-apple-hover'
                      : 'border-[var(--gray-2)] dark:border-[var(--gray-2)] hover:border-[var(--gray-3)] bg-[var(--background)]'
                  }`}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <span className="text-xl block mb-0.5">{option.icon}</span>
                  <span className="font-medium text-[var(--foreground)] text-sm block">{option.label}</span>
                  {option.description && (
                    <span className="text-xs text-[var(--gray-4)]">{option.description}</span>
                  )}
                </button>
              );
            })}
          </div>
        );

      case 'permission':
        return (
          <button
            onClick={() => handlePermission(step.permissionType!)}
            className={`w-full max-w-sm p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between no-select ${
              permissionGranted[step.permissionType!]
                ? 'border-[#6b8f71] bg-[#6b8f7115]'
                : 'border-[var(--gray-2)] bg-[var(--background)]'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl">
                {step.permissionType === 'microphone' ? '🎤' : '🔔'}
              </span>
              <span className="font-medium text-[var(--foreground)]">
                {step.permissionType === 'microphone' ? 'Permitir micrófono' : 'Notificaciones'}
              </span>
            </span>
            <div 
              className={`w-12 h-7 rounded-full transition-all duration-200 flex items-center ${
                permissionGranted[step.permissionType!] ? 'justify-end' : 'justify-start'
              }`}
              style={{ 
                backgroundColor: permissionGranted[step.permissionType!] ? THEME_COLOR : 'var(--gray-2)'
              }}
            >
              <div className="w-5 h-5 bg-white rounded-full shadow-apple m-1" />
            </div>
          </button>
        );

      case 'voice-capture':
        return (
          <div className="w-full max-w-sm">
            <div className="relative h-14">
              {/* Normal state */}
              <div 
                className={`absolute inset-0 flex items-center gap-3 px-4 rounded-full border border-[var(--gray-2)] bg-[var(--background)] transition-all duration-300 ${
                  isExpanded ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'
                }`}
              >
                <span className="text-[var(--gray-4)] flex-1 text-sm">Toca para grabar...</span>
                <button
                  onClick={startRecording}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: THEME_COLOR }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              </div>

              {/* Expanded recording state */}
              <div 
                className={`absolute inset-0 flex items-center transition-all duration-300 ${
                  isExpanded 
                    ? 'opacity-100 scale-100' 
                    : 'opacity-0 scale-95 pointer-events-none'
                }`}
              >
                <div className="flex-1 flex items-center gap-2 px-3 h-full rounded-full bg-[#1c1c1e] dark:bg-[#000000]">
                  {/* Cancel */}
                  <button
                    onClick={cancelRecording}
                    className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Waveform */}
                  <div className="flex-1 flex items-center gap-2 px-2">
                    {isRecording && (
                      <div className="flex items-center gap-0.5">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className="w-0.5 rounded-full bg-[#6b8f71]"
                            style={{
                              animation: `waveform 0.5s ease-in-out infinite`,
                              animationDelay: `${i * 80}ms`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <span className="text-white/90 text-sm font-medium">
                      {isRecording ? 'Escuchando...' : 'Procesando...'}
                    </span>
                    <span className="text-white/50 text-xs ml-auto tabular-nums">
                      {formatTime(recordingTime)}
                    </span>
                  </div>

                  {/* Confirm */}
                  <button
                    onClick={stopRecording}
                    disabled={!isRecording}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    style={{ backgroundColor: THEME_COLOR }}
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <p className="text-center text-[var(--gray-4)] text-xs mt-4">
              Habla naturalmente, como si le contaras a un amigo
            </p>
          </div>
        );

      case 'processing':
        return (
          <div className="w-full max-w-sm flex flex-col items-center">
            {/* Minimal spinner */}
            <div className="relative w-16 h-16 mb-6">
              <div 
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ backgroundColor: THEME_COLOR }}
              />
              <div 
                className="absolute inset-0 rounded-full border-2 border-[var(--gray-2)] border-t-[#6b8f71] animate-spin"
              />
            </div>
            
            {transcript && (
              <div className="w-full p-4 rounded-2xl bg-[var(--gray-1)] border border-[var(--gray-2)]">
                <p className="text-xs text-[var(--gray-4)] mb-1">Escuché:</p>
                <p className="text-[var(--foreground)] text-sm">{transcript}</p>
              </div>
            )}
          </div>
        );

      case 'preview':
        return (
          <div className="w-full max-w-sm">
            {extractedItems.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-[var(--gray-5)]">No detecté tareas o ideas.</p>
                <p className="text-[var(--gray-4)] text-sm mt-1">Podrás agregar más en la app.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {extractedItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--background)] border border-[var(--gray-2)] shadow-apple animate-fade-in"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <span className="text-lg">
                      {item.type === 'idea' ? '💡' : '✅'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--foreground)] text-sm truncate">{item.title}</p>
                      <p className="text-xs text-[var(--gray-4)]">{item.category}</p>
                    </div>
                    <button
                      onClick={() => removeExtractedItem(i)}
                      className="w-7 h-7 flex items-center justify-center text-[var(--gray-4)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'complete':
        const itemCount = extractedItems.length;
        return (
          <div className="text-center">
            {userName && (
              <p className="text-lg text-[var(--gray-5)]">
                Bienvenido, <span className="font-semibold text-[#6b8f71]">{userName}</span>
              </p>
            )}
            {itemCount > 0 && (
              <p className="text-[var(--gray-4)] text-sm mt-1">
                {itemCount} {itemCount === 1 ? 'item' : 'items'} esperándote
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Progress bar - minimal */}
      <div className="h-0.5 bg-[var(--gray-2)]">
        <div 
          className="h-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%`, backgroundColor: THEME_COLOR }}
        />
      </div>

      {/* Progress dots - Apple style */}
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

      {/* Main content */}
      <div 
        className="flex-1 flex flex-col items-center px-5 overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`w-full max-w-md flex flex-col items-center transition-all ease-out ${
            isSwiping ? 'duration-0' : 'duration-300'
          } ${
            isAnimating
              ? direction === 'forward'
                ? '-translate-x-full opacity-0'
                : 'translate-x-full opacity-0'
              : ''
          }`}
          style={{
            transform: isAnimating 
              ? undefined 
              : `translateX(${swipeOffset}px)`,
          }}
        >
          {/* Panda with premium shadow effect */}
          <div className="relative w-32 h-32 mb-4">
            {/* Animated shadow underneath */}
            <div 
              className="absolute bottom-0 left-1/2 w-16 h-3 rounded-full bg-black/10 dark:bg-black/20 blur-sm"
              style={{ 
                animation: 'shadowPulse 3s ease-in-out infinite',
                transform: 'translateX(-50%)',
              }}
            />
            <Image
              src={step.panda}
              alt="Panda"
              fill
              className="object-contain drop-shadow-lg"
              style={{ 
                animation: 'float 3s ease-in-out infinite',
                filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.15))',
              }}
              priority
            />
          </div>

          {/* Title - Apple typography */}
          <h1 className="text-xl font-semibold text-[var(--foreground)] text-center tracking-tight">
            {step.type === 'complete' && userName 
              ? `¡Listo, ${userName}!`
              : step.title
            }
          </h1>

          {/* Subtitle */}
          {step.subtitle && step.type !== 'complete' && (
            <p className="text-[var(--gray-4)] text-sm text-center mt-1 mb-5">
              {step.subtitle}
            </p>
          )}

          {step.type === 'complete' && (
            <div className="mb-5" />
          )}

          {/* Content */}
          <div className="w-full flex justify-center">
            {renderStepContent()}
          </div>
        </div>
      </div>

      {/* Bottom nav - Apple style */}
      {step.type !== 'processing' && (
        <div className="p-5 pb-8 flex gap-3 max-w-md mx-auto w-full">
          {currentStep > 0 && step.type !== 'complete' && step.type !== 'preview' && (
            <button
              onClick={goBack}
              className="w-11 h-11 rounded-full border border-[var(--gray-2)] flex items-center justify-center text-[var(--gray-4)] hover:border-[var(--gray-3)] hover:text-[var(--gray-5)] transition-all active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          {step.type !== 'voice-capture' && (
            <button
              onClick={step.type === 'complete' ? saveItemsAndFinish : goNext}
              disabled={!canProceed()}
              className={`flex-1 h-11 rounded-full font-medium text-white text-sm transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                canProceed() ? 'hover:opacity-90' : 'opacity-40 cursor-not-allowed'
              }`}
              style={{ backgroundColor: THEME_COLOR }}
            >
              {step.type === 'complete' ? (
                'Ir a mi inbox →'
              ) : step.type === 'welcome' ? (
                'Empezar'
              ) : step.type === 'preview' ? (
                'Continuar'
              ) : (
                <>
                  Siguiente
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        
        @keyframes shadowPulse {
          0%, 100% { 
            transform: translateX(-50%) scale(1);
            opacity: 0.4;
          }
          50% { 
            transform: translateX(-50%) scale(0.85);
            opacity: 0.25;
          }
        }
        
        @keyframes waveform {
          0%, 100% { height: 6px; }
          50% { height: 18px; }
        }
      `}</style>
    </div>
  );
}
