'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface StreakBadgeProps {
  streak: number;
  compact?: boolean;
}

export function StreakBadge({ streak, compact = false }: StreakBadgeProps) {
  if (streak === 0) return null;

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#6b8f71]/10"
      >
        <svg className="w-3.5 h-3.5 text-[#6b8f71]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        </svg>
        <span className="text-xs font-semibold text-[#6b8f71]">{streak}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 15, stiffness: 300 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6b8f71]/10 border border-[#6b8f71]/20"
    >
      {/* Flame icon */}
      <div className="relative">
        <svg className="w-4 h-4 text-[#6b8f71]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        </svg>
        {/* Glow effect for streaks > 7 */}
        {streak >= 7 && (
          <div className="absolute inset-0 bg-[#6b8f71] rounded-full blur-md opacity-30 animate-pulse" />
        )}
      </div>
      
      {/* Streak count */}
      <span className="text-sm font-semibold text-[#6b8f71]">{streak}</span>
      
      {/* Days text */}
      <span className="text-xs text-[#6b8f71]/70">
        {streak === 1 ? 'día' : 'días'}
      </span>
    </motion.div>
  );
}

interface MilestoneToastProps {
  title: string;
  description: string;
  icon: string;
  onClose: () => void;
}

export function MilestoneToast({ title, description, icon, onClose }: MilestoneToastProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-sm"
      >
        <div className="bg-[var(--background)] border border-[#6b8f71]/30 rounded-2xl p-4 shadow-xl shadow-[#6b8f71]/10">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="w-10 h-10 rounded-full bg-[#6b8f71]/15 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#6b8f71]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
              <p className="text-xs text-[var(--gray-4)] mt-0.5">{description}</p>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-[var(--gray-2)] transition-colors"
            >
              <svg className="w-4 h-4 text-[var(--gray-4)]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Confetti effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  y: 0, 
                  x: Math.random() * 100, 
                  scale: 0,
                  rotate: 0 
                }}
                animate={{ 
                  y: [0, -20, 60], 
                  scale: [0, 1, 0],
                  rotate: [0, 180, 360],
                  opacity: [0, 1, 0]
                }}
                transition={{ 
                  duration: 1.5, 
                  delay: i * 0.1,
                  ease: 'easeOut'
                }}
                className="absolute top-1/2 w-2 h-2 rounded-full"
                style={{ 
                  backgroundColor: i % 2 === 0 ? '#6b8f71' : '#a3c4a8',
                  left: `${10 + i * 15}%`
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
