'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { type Locale, getTranslations, getLocale, setLocale } from '@/lib/i18n';

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

const FeatureIcons: Record<string, JSX.Element> = {
  mic: (
    <svg className="w-10 h-10" fill="none" stroke="#6b8f71" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  ),
  clock: (
    <svg className="w-10 h-10" fill="none" stroke="#6b8f71" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  lightbulb: (
    <svg className="w-10 h-10" fill="none" stroke="#6b8f71" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  growth: (
    <svg className="w-10 h-10" fill="none" stroke="#6b8f71" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
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
  isFeature?: boolean;
  featureIcon?: string;
  differentiator?: string;
}

function getSteps(locale: Locale): OnboardingStep[] {
  const t = getTranslations(locale);
  return [
    {
      id: 'welcome',
      panda: '/panda/new-wave.png',
      title: t.onboarding.welcome_title,
      subtitle: t.onboarding.welcome_subtitle,
    },
    {
      id: 'language',
      panda: '/panda/new-neutral.png',
      title: t.onboarding.language_title,
      subtitle: t.onboarding.language_subtitle,
    },
    {
      id: 'name',
      panda: '/panda/new-neutral.png',
      title: t.onboarding.name_title,
    },
    {
      id: 'feature-voice',
      panda: '/panda/new-happy.png',
      title: t.onboarding.feature_voice_title,
      subtitle: t.onboarding.feature_voice_desc,
      differentiator: t.onboarding.feature_voice_diff,
      isFeature: true,
      featureIcon: 'mic',
    },
    {
      id: 'feature-reminders',
      panda: '/panda/new-pointing.png',
      title: t.onboarding.feature_reminders_title,
      subtitle: t.onboarding.feature_reminders_desc,
      differentiator: t.onboarding.feature_reminders_diff,
      isFeature: true,
      featureIcon: 'clock',
    },
    {
      id: 'feature-actions',
      panda: '/panda/new-thinking.png',
      title: t.onboarding.feature_actions_title,
      subtitle: t.onboarding.feature_actions_desc,
      differentiator: t.onboarding.feature_actions_diff,
      isFeature: true,
      featureIcon: 'lightbulb',
    },
    {
      id: 'feature-growth',
      panda: '/panda/new-celebrate.png',
      title: t.onboarding.feature_growth_title,
      subtitle: t.onboarding.feature_growth_desc,
      differentiator: t.onboarding.feature_growth_diff,
      isFeature: true,
      featureIcon: 'growth',
    },
    {
      id: 'what-capture',
      panda: '/panda/new-thinking.png',
      title: t.onboarding.what_capture_title,
      contextOptions: [...t.onboarding.what_capture_options],
    },
    {
      id: 'when-ideas',
      panda: '/panda/new-thinking.png',
      title: t.onboarding.when_ideas_title,
      contextOptions: [...t.onboarding.when_ideas_options],
    },
    {
      id: 'notifications',
      panda: '/panda/new-pointing.png',
      title: t.notifications.title,
      subtitle: t.notifications.subtitle,
      skipVoice: true,
    },
    {
      id: 'complete',
      panda: '/panda/new-celebrate.png',
      title: t.onboarding.complete_title,
    },
  ];
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [locale, setLocaleState] = useState<Locale>('en');
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

  const t = getTranslations(locale);
  const steps = getSteps(locale);
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Load saved locale on mount
  useEffect(() => {
    setLocaleState(getLocale());
  }, []);

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

  const streamRef = useRef<MediaStream | null>(null);
  
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleSelectLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    setLocaleState(newLocale);
    // Auto-advance after selecting language
    setTimeout(() => goNext(), 150);
  };

  const goNext = () => {
    if (currentStep < steps.length - 1) {
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
    
    if (step.id === 'first-capture') {
      setCurrentStep(currentStep + 1);
      
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
        
        setCurrentStep(currentStep + 1);
      } catch (e) {
        console.error('Processing error:', e);
        setCurrentStep(currentStep + 1);
      }
    } else {
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
      setCurrentStep(currentStep + 1);
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
          setCurrentStep(currentStep + 1);
        })
        .catch(() => setCurrentStep(currentStep + 1));
    } else {
      goNext();
    }
  };

  const saveAndFinish = async () => {
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

  const showVoiceButton = step.id !== 'processing' && step.id !== 'complete' && step.id !== 'welcome' && step.id !== 'language' && step.id !== 'notifications' && !step.isFeature;
  const showInputBar = step.id !== 'processing' && step.id !== 'complete' && step.id !== 'welcome' && step.id !== 'language' && step.id !== 'notifications' && !step.isFeature;

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Progress bar */}
      <div className="h-0.5 bg-[var(--gray-2)]">
        <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: THEME_COLOR }} />
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 pt-4">
        {steps.map((_, i) => (
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
          <div 
            className="absolute inset-0 rounded-full bg-[#6b8f71]/50 blur-2xl scale-150"
            style={{ animation: 'auraPulse 3s ease-in-out infinite' }}
          />
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
        <h1 className="text-2xl font-semibold text-[var(--foreground)] text-center mb-1 tracking-tight">
          {step.id === 'complete' && userName 
            ? t.onboarding.complete_title_name.replace('{name}', userName) 
            : step.title}
        </h1>

        {/* Feature icon or growth visualization */}
        {step.id === 'feature-growth' ? (
          <div className="w-full max-w-[280px] h-[160px] rounded-2xl overflow-hidden mb-4 relative bg-gradient-to-b from-[#f0f7f1] to-[#e8f0e9] dark:from-[#1a2e1c] dark:to-[#162818]">
            <svg viewBox="0 0 280 160" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
              <defs>
                <linearGradient id="obHill1" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8fb396" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#6b8f71" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="obHill2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#7da383" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#5a7d60" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="obHill3" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6b8f71" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#4a6b50" stopOpacity="0.85" />
                </linearGradient>
              </defs>
              {/* Hills */}
              <path d="M0,90 Q40,50 80,65 T160,50 T240,70 T280,55 L280,160 L0,160 Z" fill="url(#obHill3)" />
              <path d="M0,105 Q60,65 110,85 T200,70 T280,80 L280,160 L0,160 Z" fill="url(#obHill2)" />
              <path d="M0,120 Q45,90 90,110 T180,95 T260,115 T280,100 L280,160 L0,160 Z" fill="url(#obHill1)" />
              {/* Bamboo stalks */}
              <line x1="70" y1="160" x2="70" y2="60" stroke="#5a7d60" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
              <line x1="72" y1="80" x2="85" y2="68" stroke="#5a7d60" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
              <ellipse cx="88" cy="65" rx="8" ry="4" fill="#6b8f71" opacity="0.6" />
              <line x1="200" y1="160" x2="200" y2="70" stroke="#5a7d60" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
              <line x1="198" y1="90" x2="185" y2="78" stroke="#5a7d60" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
              <ellipse cx="182" cy="75" rx="7" ry="3.5" fill="#6b8f71" opacity="0.5" />
              {/* Sakura flowers */}
              <g transform="translate(45, 115)">
                <path d="M0,8 Q-1,4 0,0" stroke="#8b7355" strokeWidth="1.5" fill="none" />
                <ellipse cx="0" cy="-5" rx="2" ry="3.5" fill="#fce7f3" />
                <ellipse cx="3.5" cy="-1.5" rx="2" ry="3.5" fill="#fbcfe8" transform="rotate(72, 3.5, -1.5)" />
                <ellipse cx="2" cy="2.5" rx="2" ry="3.5" fill="#fce7f3" transform="rotate(144, 2, 2.5)" />
                <ellipse cx="-2" cy="2.5" rx="2" ry="3.5" fill="#fbcfe8" transform="rotate(-144, -2, 2.5)" />
                <ellipse cx="-3.5" cy="-1.5" rx="2" ry="3.5" fill="#fce7f3" transform="rotate(-72, -3.5, -1.5)" />
                <circle cx="0" cy="0" r="1.5" fill="#f9a8d4" />
              </g>
              <g transform="translate(140, 100)">
                <path d="M0,10 Q2,5 0,0" stroke="#8b7355" strokeWidth="1.5" fill="none" />
                <ellipse cx="0" cy="-6" rx="2.5" ry="4" fill="#fbcfe8" />
                <ellipse cx="4" cy="-2" rx="2.5" ry="4" fill="#f9a8d4" transform="rotate(72, 4, -2)" />
                <ellipse cx="2.5" cy="3" rx="2.5" ry="4" fill="#fbcfe8" transform="rotate(144, 2.5, 3)" />
                <ellipse cx="-2.5" cy="3" rx="2.5" ry="4" fill="#f9a8d4" transform="rotate(-144, -2.5, 3)" />
                <ellipse cx="-4" cy="-2" rx="2.5" ry="4" fill="#fbcfe8" transform="rotate(-72, -4, -2)" />
                <circle cx="0" cy="0" r="2" fill="#ec4899" />
              </g>
              <g transform="translate(235, 108)">
                <path d="M0,8 Q-1,4 0,0" stroke="#8b7355" strokeWidth="1.5" fill="none" />
                <ellipse cx="0" cy="-5" rx="2" ry="3.5" fill="#fff1f2" />
                <ellipse cx="3.5" cy="-1.5" rx="2" ry="3.5" fill="#ffe4e6" transform="rotate(72, 3.5, -1.5)" />
                <ellipse cx="2" cy="2.5" rx="2" ry="3.5" fill="#fff1f2" transform="rotate(144, 2, 2.5)" />
                <ellipse cx="-2" cy="2.5" rx="2" ry="3.5" fill="#ffe4e6" transform="rotate(-144, -2, 2.5)" />
                <ellipse cx="-3.5" cy="-1.5" rx="2" ry="3.5" fill="#fff1f2" transform="rotate(-72, -3.5, -1.5)" />
                <circle cx="0" cy="0" r="1.5" fill="#fda4af" />
              </g>
            </svg>
          </div>
        ) : step.isFeature && step.featureIcon ? (
          <div className="w-16 h-16 rounded-2xl bg-[#6b8f71]/10 flex items-center justify-center mb-4">
            {FeatureIcons[step.featureIcon]}
          </div>
        ) : null}

        {/* Subtitle */}
        {step.subtitle && (
          <p className="text-[var(--gray-4)] text-sm text-center mb-3 max-w-[280px] leading-relaxed">{step.subtitle}</p>
        )}

        {/* Differentiator */}
        {step.differentiator && (
          <p className="text-[var(--gray-3)] text-xs text-center italic">{step.differentiator}</p>
        )}

      </div>

      {/* Bottom section - ALWAYS visible */}
      <div className="p-5 pb-8 space-y-4">
        {/* Language selector */}
        {step.id === 'language' && (
          <div className="flex flex-col gap-3 mb-4 px-2">
            <button
              onClick={() => handleSelectLocale('en')}
              className={`w-full h-16 rounded-2xl text-base font-medium transition-all duration-200 border-2 flex items-center justify-center gap-3
                ${locale === 'en' 
                  ? 'bg-[#6b8f71]/15 border-[#6b8f71] text-[#6b8f71]' 
                  : 'bg-[var(--gray-1)] border-[var(--gray-2)] text-[var(--foreground)] hover:border-[#6b8f71]/50'
                }
              `}
            >
              <span className="text-xl">🇬🇧</span> English
            </button>
            <button
              onClick={() => handleSelectLocale('es')}
              className={`w-full h-16 rounded-2xl text-base font-medium transition-all duration-200 border-2 flex items-center justify-center gap-3
                ${locale === 'es' 
                  ? 'bg-[#6b8f71]/15 border-[#6b8f71] text-[#6b8f71]' 
                  : 'bg-[var(--gray-1)] border-[var(--gray-2)] text-[var(--foreground)] hover:border-[#6b8f71]/50'
                }
              `}
            >
              <span className="text-xl">🇪🇸</span> Español
            </button>
          </div>
        )}

        {/* Context options - floating pills */}
        {step.contextOptions && (
          <div className="flex flex-wrap justify-center gap-3 mb-4 px-2">
            {step.contextOptions.map(option => (
              <button
                key={option}
                onClick={() => handleOptionToggle(option)}
                className={`
                  px-4 py-2.5 rounded-2xl text-sm font-medium
                  transition-all duration-200 ease-out
                  border-2 backdrop-blur-sm
                  hover:scale-105 hover:-translate-y-0.5
                  active:scale-95
                  ${isOptionSelected(option)
                    ? 'bg-[#6b8f71]/15 border-[#6b8f71] text-[#6b8f71] shadow-md shadow-[#6b8f71]/20'
                    : 'bg-[var(--gray-1)] border-[var(--gray-2)] text-[var(--gray-5)] hover:border-[#6b8f71]/50 hover:text-[var(--foreground)] hover:shadow-sm'
                  }
                `}
                style={{
                  animationDelay: `${step.contextOptions!.indexOf(option) * 50}ms`,
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* Input bar */}
        {showInputBar && (
          <div className="relative">
            <div 
              className="flex items-center gap-2 h-14 px-4 rounded-full border bg-[var(--gray-1)] border-[var(--gray-2)] relative overflow-hidden"
            >
              <div 
                className="absolute inset-0 bg-[#2d2d30] rounded-full transition-all"
                style={{ 
                  clipPath: isRecording 
                    ? 'circle(150% at calc(100% - 24px) 50%)' 
                    : 'circle(0% at calc(100% - 24px) 50%)',
                  transitionDuration: '700ms',
                  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
              <div className={`relative z-10 transition-all duration-300 ${isRecording ? 'w-10 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                <button 
                  onClick={cancelRecording} 
                  className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white rounded-full hover:bg-white/10"
                >
                  {Icons.x}
                </button>
              </div>

              <div className="flex-1 flex items-center gap-2 relative z-10">
                {!isRecording ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={step.id === 'name' ? (inputText || userName) : inputText}
                    onChange={(e) => step.id === 'name' ? (setInputText(e.target.value), setUserName(e.target.value)) : setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                    placeholder={
                      step.id === 'name' ? t.onboarding.name_placeholder :
                      step.contextOptions ? t.onboarding.write_here :
                      t.onboarding.write_here
                    }
                    className="flex-1 bg-transparent text-[var(--foreground)] placeholder:text-[var(--gray-4)] focus:outline-none font-medium tracking-tight"
                  />
                ) : (
                  <>
                    <div className="flex-1 flex items-center">
                      <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 500 }}>
                        {t.onboarding.listening}
                      </span>
                      <span className="dots" style={{ color: '#ffffff' }}>
                        <span>.</span><span>.</span><span>.</span>
                      </span>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }} className="tabular-nums">{formatTime(recordingTime)}</span>
                  </>
                )}
              </div>

              {showVoiceButton && (
                <button
                  onClick={() => {
                    const hasText = inputText.trim().length > 0 || (step.id === 'name' && userName.trim().length > 0);
                    if (isRecording) {
                      stopRecording();
                    } else if (hasText) {
                      handleTextSubmit();
                    } else {
                      startRecording();
                    }
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95 relative z-10"
                  style={{ backgroundColor: THEME_COLOR }}
                >
                  <div 
                    className={`absolute transition-all ease-out ${(isRecording || inputText.trim().length > 0 || (step.id === 'name' && userName.trim().length > 0)) ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}
                    style={{ transitionDuration: '300ms' }}
                  >
                    {Icons.mic}
                  </div>
                  <div 
                    className={`absolute transition-all ease-out ${(isRecording || inputText.trim().length > 0 || (step.id === 'name' && userName.trim().length > 0)) ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-45'}`}
                    style={{ transitionDuration: '300ms' }}
                  >
                    {Icons.check}
                  </div>
                </button>
              )}
            </div>
            
            <p className={`text-center text-xs mt-3 transition-all duration-300 ${isRecording ? 'text-white/50' : 'text-[var(--gray-4)]'}`}>
              {t.onboarding.speak_naturally}
            </p>
          </div>
        )}

        {/* Feature screen buttons */}
        {step.isFeature && (
          <div className="space-y-3 w-full">
            <button
              onClick={goNext}
              className="w-full h-14 rounded-full font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ backgroundColor: THEME_COLOR }}
            >
              {t.onboarding.next_button} {Icons.arrow}
            </button>
            <button
              onClick={() => {
                // Skip to what-capture step
                const whatCaptureIndex = steps.findIndex(s => s.id === 'what-capture');
                if (whatCaptureIndex >= 0) {
                  setDirection('forward');
                  setIsAnimating(true);
                  setTimeout(() => {
                    setCurrentStep(whatCaptureIndex);
                    setIsAnimating(false);
                  }, 200);
                }
              }}
              className="w-full h-12 rounded-full font-medium text-[var(--gray-4)] flex items-center justify-center transition-all active:scale-[0.98]"
            >
              {t.onboarding.feature_skip}
            </button>
          </div>
        )}

        {/* Welcome button */}
        {step.id === 'notifications' && (
          <div className="space-y-3 w-full">
            <button
              onClick={async () => {
                const { subscribeToPush } = await import('@/lib/push');
                await subscribeToPush();
                goNext();
              }}
              className="w-full h-14 rounded-full font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ backgroundColor: THEME_COLOR }}
            >
              {t.notifications.accept}
            </button>
            <button
              onClick={goNext}
              className="w-full h-12 rounded-full font-medium text-[var(--gray-5)] flex items-center justify-center transition-all active:scale-[0.98]"
            >
              {t.notifications.skip}
            </button>
          </div>
        )}

        {step.id === 'welcome' && (
          <button
            onClick={goNext}
            className="w-full h-14 rounded-full font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ backgroundColor: THEME_COLOR }}
          >
            {t.onboarding.start_button} {Icons.arrow}
          </button>
        )}

        {/* Complete section: Kai guide + button */}
        {step.id === 'complete' && (
          <>
            {/* Kai post-onboarding guide bubble */}
            <div className="rounded-2xl border border-[#6b8f71]/30 bg-[#6b8f71]/8 p-4 mb-4">
              <p className="text-sm font-medium text-[var(--foreground)] mb-1.5">{t.kai_guide.title}</p>
              <p className="text-sm text-[var(--gray-5)] leading-relaxed">{t.kai_guide.message}</p>
            </div>

            <button
              onClick={saveAndFinish}
              className="w-full h-14 rounded-full font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ backgroundColor: THEME_COLOR }}
            >
              {t.kai_guide.cta} {Icons.arrow}
            </button>
          </>
        )}

        {/* Next button for selection steps */}
        {step.contextOptions && (selectedOptions[step.id]?.length || 0) > 0 && !isRecording && (
          <button
            onClick={goNext}
            className="w-full h-12 rounded-full font-medium text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ backgroundColor: THEME_COLOR }}
          >
            {t.onboarding.next_button} {Icons.arrow}
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
