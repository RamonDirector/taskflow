'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface Dream {
  id: string;
  title: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  created_at: string;
  voice_context?: string;
  type?: string;
  completed?: boolean;
  interpretation?: string;
}

const THEME_COLOR = '#6b8f71';
const DELETE_COLOR = '#8B2942';
const DREAM_COLOR = '#7c3aed'; // Purple for dreams

const Icons = {
  back: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  star: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
  trash: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  moon: (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ),
  moonSmall: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ),
  sparkles: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  ),
};

export default function DreamsPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dreams, setDreams] = useState<Dream[]>([]);
  
  // Drawer state
  const [selectedDream, setSelectedDream] = useState<Dream | null>(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  
  // Voice recording for new dream
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingNewDream, setIsRecordingNewDream] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Swipe state
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  
  const router = useRouter();
  const supabase = createClient();

  const fetchDreams = useCallback(async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('type', 'dream')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDreams(data as Dream[]);
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
      await fetchDreams();
      setLoading(false);
    };
    init();
  }, [supabase, router, fetchDreams]);

  const deleteDream = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setDreams(prev => prev.filter(d => d.id !== id));
    if (selectedDream?.id === id) setSelectedDream(null);
  };

  const interpretDream = async () => {
    if (!selectedDream) return;
    setIsInterpreting(true);

    try {
      const res = await fetch('/api/interpret-dream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dream: selectedDream.title,
          voiceContext: selectedDream.voice_context,
        }),
      });

      if (!res.ok) throw new Error('Failed to interpret');
      const { interpretation } = await res.json();

      // Save interpretation to DB
      await supabase
        .from('tasks')
        .update({ interpretation })
        .eq('id', selectedDream.id);

      // Update local state
      setDreams(prev => prev.map(d => 
        d.id === selectedDream.id ? { ...d, interpretation } : d
      ));
      setSelectedDream(prev => prev ? { ...prev, interpretation } : null);
    } catch (e) {
      console.error('Interpretation error:', e);
    }

    setIsInterpreting(false);
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipingId(id);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingId) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    setSwipeOffset(Math.min(0, diff));
  };

  const handleTouchEnd = (dream: Dream) => {
    const offset = swipeOffset;
    setSwipingId(null);
    setSwipeOffset(0);
    
    if (offset < -60) {
      deleteDream(dream.id);
    }
  };

  const openDrawer = (dream: Dream) => {
    setSelectedDream(dream);
  };

  const closeDrawer = () => {
    setSelectedDream(null);
  };

  // Voice recording for NEW dream
  const startRecordingForNewDream = async () => {
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
        await processNewDreamRecording();
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsRecordingNewDream(true);
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (e) {
      console.error('Recording error:', e);
    }
  };

  const stopRecordingNewDream = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    setIsRecording(false);
  };

  const processNewDreamRecording = async () => {
    if (!user) return;
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const transcribeRes = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!transcribeRes.ok) throw new Error('Transcription failed');
      
      const { text } = await transcribeRes.json();
      if (text?.trim()) {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title: text.trim(),
            voice_context: text.trim(),
            type: 'dream',
            category: 'personal',
            priority: 'medium',
            completed: false,
          })
          .select()
          .single();

        if (!error && data) {
          setDreams(prev => [data, ...prev]);
        }
      }
    } catch (e) {
      console.error('New dream recording error:', e);
    }

    setIsRecordingNewDream(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#262628] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-[#262628] dark:to-[#262628]">
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 bg-white/80 dark:bg-[#262628]/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/app')}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {Icons.back}
            </button>
            <Image src="/icon-192-transparent.png" alt="Hansei" width={28} height={28} className="rounded-lg" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Sueños</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              {dreams.length}
            </span>
          </div>
          
          {/* Voice button for new dream */}
          <div className="flex items-center gap-2">
            {isRecording && isRecordingNewDream && (
              <span className="text-xs text-purple-600 font-medium animate-pulse">Grabando...</span>
            )}
            <button
              onClick={() => {
                if (isRecording && isRecordingNewDream) {
                  stopRecordingNewDream();
                } else {
                  startRecordingForNewDream();
                }
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95 relative bg-purple-600"
            >
              {isRecording && isRecordingNewDream && (
                <div className="absolute inset-0 rounded-full bg-purple-600 animate-ping opacity-30" />
              )}
              <div className="relative w-5 h-5">
                <div className={`absolute inset-0 flex items-center justify-center transition-all ease-out ${isRecording && isRecordingNewDream ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} style={{ transitionDuration: '850ms' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div className={`absolute inset-0 flex items-center justify-center transition-all ease-out ${isRecording && isRecordingNewDream ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-45'}`} style={{ transitionDuration: '850ms' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Dream list */}
      <main className="max-w-2xl mx-auto p-4 space-y-3 pb-20">
        <AnimatePresence>
          {dreams.map(dream => {
            const isSwiping = swipingId === dream.id;
            const showDelete = isSwiping && swipeOffset < -30;

            return (
              <motion.div
                key={dream.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="relative overflow-hidden rounded-2xl"
              >
                {/* Swipe background */}
                <div className="absolute inset-0 flex justify-end">
                  <div className={`w-1/2 flex items-center justify-end pr-5 transition-opacity ${showDelete ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: DELETE_COLOR }}>
                    {Icons.trash}
                  </div>
                </div>

                {/* Card */}
                <div
                  style={{
                    transform: isSwiping ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                    transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
                  }}
                  onTouchStart={(e) => handleTouchStart(e, dream.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(dream)}
                  onClick={() => openDrawer(dream)}
                  className="relative p-4 rounded-2xl bg-white dark:bg-[#2c2c2e] border-2 border-purple-200 dark:border-purple-800/50 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                      {Icons.moonSmall}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {dream.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {dream.interpretation && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500 text-white">
                            ✨ Interpretado
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {new Date(dream.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {dreams.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-300 dark:text-gray-600 mb-4 flex justify-center">
              {Icons.moon}
            </div>
            <p className="text-gray-500 dark:text-gray-400">Aún no tienes sueños</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Captura tus sueños con "Soñé que..."
            </p>
          </div>
        )}
      </main>

      {/* Dream Detail Drawer */}
      <AnimatePresence>
        {selectedDream && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={closeDrawer}
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 right-0 bottom-0 z-50 max-h-[85vh] bg-white dark:bg-[#262628] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              </div>

              {/* Drawer Header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-purple-500">{Icons.moonSmall}</span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Sueño</span>
                </div>
                <button
                  onClick={closeDrawer}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {Icons.x}
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Dream title */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedDream.title}
                  </h2>
                  {selectedDream.voice_context && selectedDream.voice_context !== selectedDream.title && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 italic">
                      "{selectedDream.voice_context}"
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(selectedDream.created_at).toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>

                {/* Interpret Button - only show if not yet interpreted */}
                {!selectedDream.interpretation && (
                  <button
                    onClick={interpretDream}
                    disabled={isInterpreting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 text-white font-medium transition-all hover:shadow-lg disabled:opacity-50"
                  >
                    {isInterpreting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Interpretando...
                      </>
                    ) : (
                      <>
                        {Icons.sparkles}
                        Interpretar sueño
                      </>
                    )}
                  </button>
                )}

                {/* Interpretation */}
                {selectedDream.interpretation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-purple-500">{Icons.sparkles}</span>
                      <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Interpretación</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {selectedDream.interpretation}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => deleteDream(selectedDream.id)}
                  className="w-full px-4 py-2 rounded-xl text-[#8B2942] hover:bg-[#8B2942]/10 text-sm font-medium transition-colors"
                >
                  Eliminar sueño
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
