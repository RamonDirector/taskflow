'use client';

import { useState, useEffect, useRef, TouchEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

const THEME_COLOR = '#6b8f71';

// SVG Icons - Apple Style
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
  arrow: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  ),
  lightbulb: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  checkCircle: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

interface ExtractedItem {
  title: string;
  category: string;
  type: 'task' | 'idea';
  priority: 'high' | 'medium' | 'low';
}

interface OnboardingStep {
  id: string;
  panda: string;
  title: string;
  subtitle?: string;
  contextOptions?: string[];
  skipVoice?: boolean;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    panda: '/panda/panda-wave.png',
    title: '¡Hola!',
    subtitle: 'Soy tu compañero para capturar ideas',
  },
  {
    id: 'name',
    panda: '/panda/panda-neutral.png',
    title: '¿Cómo te llamas?',
  },
  {
    id: 'what-capture',
    panda: '/panda/panda-thinking.png',
    title: '¿Qué sueles capturar?',
    contextOptions: ['Ideas', 'Tareas', 'Notas', 'Listas', 'Pensamientos', 'Sueños'],
  },
  {
    id: 'when-ideas',
    panda: '/panda/panda-thinking.png',
    title: '¿Cuándo te vienen ideas?',
    contextOptions: ['Caminando', 'Ducha', 'Cama', 'Mañana', 'Ejercicio', 'Random'],
  },
  {
    id: 'first-capture',
    panda: '/panda/panda-excited.png',
    title: '¿Qué tienes en mente?',
    subtitle: 'Cuéntame una idea o tarea',
  },
  {
    id: 'processing',
    panda: '/panda/panda-neutral.png',
    title: 'Analizando...',
  },
  {
    id: 'preview',
    panda: '/panda/panda-celebrate.png',
    title: '¡Mira lo que capturé!',
  },
  {
    id: 'complete',
    panda: '/panda/panda-celebrate.png',
    title: '¡Listo!',
  },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [userName, setUserName] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  
  // Voice/text input
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  
  // Extracted items
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // Check onboarding status
  useEffect(() => {
    if (searchParams.get('reset') === 'true') {
      localStorage.removeItem('taskflow-onboarding-complete');
      localStorage.removeItem('taskflow-user-name');
      localStorage.removeItem('taskflow-onboarding-answers');
      router.replace('/onboarding');
      return;
    }
    const completed = localStorage.getItem('taskflow-onboarding-complete');
    if (completed) router.push('/app');
  }, [router, searchParams]);

  // Request mic permission once on mount (so browser remembers it)
  const streamRef = useRef<MediaStream | null>(null);
  
  useEffect(() => {
    // Pre-request microphone permission on mount
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        streamRef.current = stream;
        setMicPermission(true);
      })
      .catch(() => setMicPermission(false));
    
    return () => {
      // Cleanup on unmount
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection('forward');
      setIsAnimating(true);
      setInputText('');
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
      setInputText('');
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 200);
    }
  };

  const handleOptionToggle = (option: string) => {
    const current = selectedOptions[step.id] || [];
    if (current.includes(option)) {
      setSelectedOptions({ ...selectedOptions, [step.id]: current.filter(o => o !== option) });
    } else {
      setSelectedOptions({ ...selectedOptions, [step.id]: [...current, option] });
    }
  };

  const isOptionSelected = (option: string) => {
    return selectedOptions[step.id]?.includes(option) || false;
  };

  // Voice recording
  const startRecording = async () => {
    try {
      // Reuse existing stream or create new one
      let stream = streamRef.current;
      if (!stream || !stream.active) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }
      setMicPermission(true);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        // Don't stop the stream tracks - keep permission alive
        if (timerRef.current) clearInterval(timerRef.current);
        await processVoiceInput();
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e) {
      console.error('Recording error:', e);
      setMicPermission(false);
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
  };

  const processVoiceInput = async () => {
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
    
    // If it's the capture step, go to processing
    if (step.id === 'first-capture') {
      setCurrentStep(currentStep + 1); // Go to processing
      
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
        if (!transcribeRes.ok) throw new Error('Transcription failed');
        
        const { text } = await transcribeRes.json();
        setTranscript(text || '');
        
        if (text?.trim()) {
          const extractRes = await fetch('/api/extract-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
          });
          
          if (extractRes.ok) {
            const data = await extractRes.json();
            setExtractedItems([
              ...(data.tasks || []).map((t: any) => ({ ...t, type: 'task' })),
              ...(data.ideas || []).map((i: any) => ({ ...i, type: 'idea' })),
            ]);
          }
        }
        
        setCurrentStep(currentStep + 2); // Go to preview
      } catch (e) {
        console.error('Processing error:', e);
        setCurrentStep(currentStep + 2); // Go to preview anyway
      }
    } else {
      // For other steps, transcribe and use as text input
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
        if (res.ok) {
          const { text } = await res.json();
          if (text) {
            if (step.id === 'name') {
              setUserName(text.trim());
            } else if (step.contextOptions) {
              // Try to match spoken words to options
              const lowerText = text.toLowerCase();
              step.contextOptions.forEach(opt => {
                if (lowerText.includes(opt.toLowerCase())) {
                  handleOptionToggle(opt);
                }
              });
            }
            goNext();
          }
        }
      } catch (e) {
        console.error('Transcription error:', e);
      }
    }
  };

  const handleTextSubmit = () => {
    if (!inputText.trim()) return;
    
    if (step.id === 'name') {
      setUserName(inputText.trim());
      goNext();
    } else if (step.id === 'first-capture') {
      // Process text input for capture
      setCurrentStep(currentStep + 1); // Go to processing
      setTranscript(inputText);
      
      fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      })
        .then(res => res.json())
        .then(data => {
          setExtractedItems([
            ...(data.tasks || []).map((t: any) => ({ ...t, type: 'task' })),
            ...(data.ideas || []).map((i: any) => ({ ...i, type: 'idea' })),
          ]);
          setCurrentStep(currentStep + 2);
        })
        .catch(() => setCurrentStep(currentStep + 2));
    } else {
      goNext();
    }
  };

  const saveAndFinish = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user && extractedItems.length > 0) {
      await supabase.from('tasks').insert(
        extractedItems.map(item => ({
          user_id: user.id,
          title: item.title,
          category: item.category,
          priority: item.priority,
          completed: false,
          type: item.type,
          voice_context: transcript,
        }))
      );
    }

    localStorage.setItem('taskflow-onboarding-complete', 'true');
    localStorage.setItem('taskflow-user-name', userName);
    localStorage.setItem('taskflow-onboarding-answers', JSON.stringify(selectedOptions));
    router.push('/app');
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const canProceed = () => {
    if (step.id === 'name') return userName.trim().length > 0 || inputText.trim().length > 0;
    if (step.contextOptions) return (selectedOptions[step.id]?.length || 0) > 0;
    if (step.id === 'processing') return false;
    return true;
  };

  const getPlaceholder = () => {
    if (step.id === 'name') return 'Escribe tu nombre...';
    if (step.id === 'first-capture') return 'Escribe o habla...';
    if (step.contextOptions) return 'O dilo con tu voz...';
    return 'Escribe algo...';
  };

  const showVoiceButton = step.id !== 'processing' && step.id !== 'preview' && step.id !== 'complete';

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Progress bar */}
      <div className="h-0.5 bg-[var(--gray-2)]">
        <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: THEME_COLOR }} />
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 pt-4">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= currentStep ? THEME_COLOR : 'var(--gray-3)', opacity: i < currentStep ? 0.4 : 1 }}
          />
        ))}
      </div>

      {/* Main content */}
      <div 
        className={`flex-1 flex flex-col items-center justify-center px-6 transition-all duration-200 ${
          isAnimating ? (direction === 'forward' ? '-translate-x-8 opacity-0' : 'translate-x-8 opacity-0') : ''
        }`}
      >
        {/* Panda with matcha aura */}
        <div className="relative w-32 h-32 mb-6">
          {/* Matcha aura glow */}
          <div 
            className="absolute inset-0 rounded-full bg-[#6b8f71]/20 blur-xl scale-110"
            style={{ animation: 'auraPulse 3s ease-in-out infinite' }}
          />
          {/* Shadow */}
          <div 
            className="absolute bottom-0 left-1/2 w-16 h-3 rounded-full bg-black/10 blur-sm -translate-x-1/2"
            style={{ animation: 'shadowPulse 3s ease-in-out infinite' }}
          />
          <Image
            src={step.panda}
            alt="Panda"
            fill
            className="object-contain relative z-10"
            style={{ animation: 'float 3s ease-in-out infinite', filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.12))' }}
            priority
          />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-[var(--foreground)] text-center mb-1">
          {step.id === 'complete' && userName ? `¡Listo, ${userName}!` : step.title}
        </h1>

        {/* Subtitle */}
        {step.subtitle && (
          <p className="text-[var(--gray-4)] text-sm text-center mb-4">{step.subtitle}</p>
        )}

        {/* Preview items */}
        {step.id === 'preview' && (
          <div className="w-full max-w-sm space-y-2 mt-4">
            {extractedItems.length === 0 ? (
              <p className="text-center text-[var(--gray-4)]">No detecté tareas o ideas</p>
            ) : (
              extractedItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--gray-1)]">
                  <span className="text-[var(--gray-4)]">{item.type === 'idea' ? Icons.lightbulb : Icons.checkCircle}</span>
                  <span className="flex-1 text-sm text-[var(--foreground)] truncate">{item.title}</span>
                  <button onClick={() => setExtractedItems(items => items.filter((_, j) => j !== i))} className="text-[var(--gray-4)] hover:text-red-500">
                    {Icons.x}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Complete info */}
        {step.id === 'complete' && extractedItems.length > 0 && (
          <p className="text-[var(--gray-4)] text-sm">{extractedItems.length} items esperándote</p>
        )}
      </div>

      {/* Bottom section - ALWAYS visible */}
      <div className="p-5 pb-8 space-y-4">
        {/* Context options - horizontal, no boxes */}
        {step.contextOptions && (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-2">
            {step.contextOptions.map(option => (
              <button
                key={option}
                onClick={() => handleOptionToggle(option)}
                className={`text-sm font-medium transition-all ${
                  isOptionSelected(option)
                    ? 'text-[#6b8f71]'
                    : 'text-[var(--gray-4)] hover:text-[var(--foreground)]'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* Input bar - voice first with smooth transition */}
        {step.id !== 'processing' && step.id !== 'preview' && step.id !== 'complete' && step.id !== 'welcome' && (
          <div className="relative">
            <div 
              className="flex items-center gap-2 h-14 px-4 rounded-full border bg-[var(--gray-1)] border-[var(--gray-2)] relative overflow-hidden"
            >
              {/* Black overlay that expands from the mic button */}
              <div 
                className="absolute inset-0 bg-[#1c1c1e] rounded-full transition-all"
                style={{ 
                  clipPath: isRecording 
                    ? 'circle(150% at calc(100% - 24px) 50%)' 
                    : 'circle(0% at calc(100% - 24px) 50%)',
                  transitionDuration: '700ms',
                  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
              {/* Cancel button - only when recording */}
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
                    value={step.id === 'name' ? (inputText || userName) : inputText}
                    onChange={(e) => step.id === 'name' ? (setInputText(e.target.value), setUserName(e.target.value)) : setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                    placeholder="Toca para grabar..."
                    className="flex-1 bg-transparent text-[var(--foreground)] placeholder:text-[var(--gray-4)] focus:outline-none"
                  />
                ) : (
                  <>
                    <div className="flex-1 flex items-center">
                      <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500 }}>
                        Escuchando
                      </span>
                      <span className="dots" style={{ color: '#ffffff' }}>
                        <span>.</span><span>.</span><span>.</span>
                      </span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }} className="tabular-nums">{formatTime(recordingTime)}</span>
                  </>
                )}
              </div>

              {/* Mic/Check button with fade + subtle rotation */}
              {showVoiceButton && (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95 relative z-10"
                  style={{ backgroundColor: THEME_COLOR }}
                >
                  {/* Mic icon - fades out */}
                  <div 
                    className={`absolute transition-all ease-out ${isRecording ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}
                    style={{ transitionDuration: '850ms' }}
                  >
                    {Icons.mic}
                  </div>
                  {/* Check icon - fades in with subtle rotation */}
                  <div 
                    className={`absolute transition-all ease-out ${isRecording ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-45'}`}
                    style={{ transitionDuration: '850ms' }}
                  >
                    {Icons.check}
                  </div>
                </button>
              )}
            </div>
            
            {/* Helper text */}
            <p className={`text-center text-xs mt-3 transition-all duration-300 ${isRecording ? 'text-white/50' : 'text-[var(--gray-4)]'}`}>
              Habla naturalmente, como si le contaras a un amigo
            </p>
          </div>
        )}

        {/* Welcome button */}
        {step.id === 'welcome' && (
          <button
            onClick={goNext}
            className="w-full h-14 rounded-full font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ backgroundColor: THEME_COLOR }}
          >
            Empezar {Icons.arrow}
          </button>
        )}

        {/* Processing state */}
        {step.id === 'processing' && (
          <div className="w-full h-14 rounded-full flex items-center justify-center gap-3 bg-[var(--gray-1)]">
            <div className="w-5 h-5 border-2 border-[#6b8f71] border-t-transparent rounded-full animate-spin" />
            <span className="text-[var(--gray-5)]">Procesando...</span>
          </div>
        )}

        {/* Preview/Complete button */}
        {(step.id === 'preview' || step.id === 'complete') && (
          <button
            onClick={step.id === 'complete' ? saveAndFinish : goNext}
            className="w-full h-14 rounded-full font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ backgroundColor: THEME_COLOR }}
          >
            {step.id === 'complete' ? 'Ir a mi inbox' : 'Continuar'} {Icons.arrow}
          </button>
        )}

        {/* Next button for selection steps */}
        {step.contextOptions && (selectedOptions[step.id]?.length || 0) > 0 && !isRecording && (
          <button
            onClick={goNext}
            className="w-full h-12 rounded-full font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ backgroundColor: THEME_COLOR }}
          >
            Siguiente {Icons.arrow}
          </button>
        )}
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
        @keyframes auraPulse {
          0%, 100% { opacity: 0.3; transform: scale(1.1); }
          50% { opacity: 0.5; transform: scale(1.2); }
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
