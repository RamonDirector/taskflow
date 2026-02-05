'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

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
    panda: '/panda/panda-neutral.png',
  },
  idea: {
    icon: Icons.lightbulb,
    label: 'Idea',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    panda: '/panda/panda-excited.png',
  },
  dream: {
    icon: Icons.moon,
    label: 'Sueño',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    panda: '/panda/panda-thinking.png',
  },
};

interface CapturedItem {
  title: string;
  type: 'task' | 'idea' | 'dream';
  category: string;
  priority: 'high' | 'medium' | 'low';
}

export default function PandaHub() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  
  // Panda state
  const [pandaImage, setPandaImage] = useState('/panda/panda-wave.png');
  const [pandaMessage, setPandaMessage] = useState('');
  
  // Input state
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Captured items (for confirmation)
  const [capturedItems, setCapturedItems] = useState<CapturedItem[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Dark mode
  const [darkMode, setDarkMode] = useState(false);
  
  // New items indicator for bottom nav
  const [hasNew, setHasNew] = useState({ ideas: false, tasks: false, dreams: false });
  
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
      setUserName(localStorage.getItem('taskflow-user-name') || '');
      setLoading(false);
      
      // Welcome message
      setPandaMessage('¿Qué tienes en mente?');
    };
    init();
  }, [supabase, router]);

  // Load dark mode
  useEffect(() => {
    const saved = localStorage.getItem('hansei-darkmode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
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
      setPandaImage('/panda/panda-neutral.png');
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
    setPandaImage('/panda/panda-wave.png');
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
    setPandaImage('/panda/panda-thinking.png');
    setPandaMessage('Procesando...');

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
        setPandaImage('/panda/panda-wave.png');
        setPandaMessage('No te escuché, ¿puedes repetir?');
        setIsProcessing(false);
        return;
      }

      // Check for navigation commands
      const lowerText = transcribedText.toLowerCase();
      if (lowerText.includes('ir a') || lowerText.includes('muéstrame') || lowerText.includes('abrir')) {
        if (lowerText.includes('idea') || lowerText.includes('ideas')) {
          setPandaMessage('¡Vamos al Idea Board!');
          setTimeout(() => router.push('/app/ideas'), 500);
          return;
        }
        if (lowerText.includes('tarea') || lowerText.includes('tareas')) {
          setPandaMessage('¡Vamos a tus tareas!');
          setTimeout(() => router.push('/app/tasks'), 500);
          return;
        }
        if (lowerText.includes('sueño') || lowerText.includes('sueños')) {
          setPandaMessage('¡Vamos a tus sueños!');
          setTimeout(() => router.push('/app/dreams'), 500);
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
      setPandaMessage(`¡${config.label} capturada!`);
      setShowConfirmation(true);

    } catch (e) {
      console.error('Processing error:', e);
      setPandaImage('/panda/panda-neutral.png');
      setPandaMessage('Hubo un error, ¿intentamos de nuevo?');
    }

    setIsProcessing(false);
  };

  // Save captured items
  const saveItems = async () => {
    if (!user || capturedItems.length === 0) return;

    const rows = capturedItems.map(item => ({
      user_id: user.id,
      title: item.title,
      category: item.category,
      priority: item.priority,
      completed: false,
      type: item.type === 'dream' ? 'dream' : item.type,
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
    setPandaImage('/panda/panda-celebrate.png');
    setPandaMessage('¡Guardado! ¿Algo más?');
    
    setTimeout(() => {
      setPandaImage('/panda/panda-wave.png');
      setPandaMessage('¿Qué tienes en mente?');
    }, 2000);
  };

  // Discard captured items
  const discardItems = () => {
    setCapturedItems([]);
    setShowConfirmation(false);
    setPandaImage('/panda/panda-wave.png');
    setPandaMessage('¿Qué tienes en mente?');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6b8f71] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[var(--background)] flex flex-col overflow-hidden">
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
          </div>
          
          {/* Dark mode toggle */}
          <button
            onClick={() => {
              const newMode = !darkMode;
              setDarkMode(newMode);
              localStorage.setItem('hansei-darkmode', String(newMode));
              if (newMode) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            }}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {darkMode ? (
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32 pt-16">
        {/* Panda with matcha aura */}
        <motion.div 
          className="relative w-40 h-40 mb-6"
          animate={{ scale: isProcessing ? 0.95 : 1 }}
          transition={{ duration: 0.3 }}
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

        {/* Panda message */}
        <motion.p 
          className="text-xl font-medium text-[var(--foreground)] text-center mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          key={pandaMessage}
        >
          {pandaMessage}
        </motion.p>

        {/* Greeting */}
        {!showConfirmation && !isRecording && !isProcessing && userName && (
          <p className="text-[var(--gray-4)] text-sm">Hola, {userName}</p>
        )}

        {/* Confirmation card */}
        <AnimatePresence>
          {showConfirmation && capturedItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="w-full max-w-sm mt-6 space-y-3"
            >
              {capturedItems.map((item, i) => {
                const config = typeConfig[item.type];
                return (
                  <div 
                    key={i}
                    className={`flex items-center gap-3 p-4 rounded-2xl ${config.bg} border border-[var(--gray-2)]`}
                  >
                    <span className={config.color}>{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] line-clamp-2">{item.title}</p>
                      <p className="text-xs text-[var(--gray-4)] mt-0.5">{config.label} · {item.category}</p>
                    </div>
                  </div>
                );
              })}

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={discardItems}
                  className="flex-1 h-12 rounded-full border border-[var(--gray-3)] text-[var(--gray-5)] font-medium transition-all active:scale-[0.98]"
                >
                  Descartar
                </button>
                <button
                  onClick={saveItems}
                  className="flex-1 h-12 rounded-full text-white font-medium transition-all active:scale-[0.98]"
                  style={{ backgroundColor: THEME_COLOR }}
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input bar - fixed at bottom */}
      {!showConfirmation && (
        <div className="fixed bottom-20 left-0 right-0 px-6 pb-4">
          <div 
            className="flex items-center gap-2 h-14 px-4 rounded-full border bg-[var(--gray-1)] border-[var(--gray-2)] relative overflow-hidden shadow-lg"
          >
            {/* Black overlay when recording */}
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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--background)] border-t border-[var(--gray-2)] flex items-center justify-around px-6 safe-area-pb">
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
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#6b8f71]" />
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
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#6b8f71]" />
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
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#6b8f71]" />
            )}
          </span>
          <span className="text-[10px] font-medium">Dreams</span>
        </button>
      </nav>

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
        .safe-area-pb {
          padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}
