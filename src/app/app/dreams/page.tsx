'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Dream {
  id: string;
  title: string;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
  created_at: string;
  voice_context?: string;
  type?: string;
  completed?: boolean;
}

const Icons = {
  back: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
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
};

export default function DreamsPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dreams, setDreams] = useState<Dream[]>([]);
  
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
    setSwipeOffset(Math.min(0, diff)); // Only allow left swipe
  };

  const handleTouchEnd = (dream: Dream) => {
    const offset = swipeOffset;
    setSwipingId(null);
    setSwipeOffset(0);
    
    if (offset < -60) {
      deleteDream(dream.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#1c1c1e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-[#1c1c1e] dark:to-[#1c1c1e]">
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/app')}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {Icons.back}
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Sueños</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              {dreams.length}
            </span>
          </div>
        </div>
      </header>

      {/* Dream list */}
      <main className="max-w-2xl mx-auto p-4 space-y-3">
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
                  <div className={`w-1/2 bg-red-600 flex items-center justify-end pr-5 transition-opacity ${showDelete ? 'opacity-100' : 'opacity-0'}`}>
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
                  className="relative p-4 rounded-2xl bg-white dark:bg-[#2c2c2e] border-2 border-purple-200 dark:border-purple-800/50 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                      {Icons.star}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {dream.title}
                      </p>
                      {dream.voice_context && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                          "{dream.voice_context}"
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {dream.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                            {dream.category}
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
            <div className="text-gray-300 dark:text-gray-600 mb-4">
              {Icons.moon}
            </div>
            <p className="text-gray-500 dark:text-gray-400">Aún no tienes sueños</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Captura tus aspiraciones con "Algún día quiero..."
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
