'use client';

import { motion } from 'framer-motion';

interface BambooGrowthProps {
  /** Progress from 0 to 1 (0% to 100% tasks completed) */
  progress: number;
  /** Size in pixels */
  size?: number;
  /** Mirror the bamboo (for right side) */
  mirror?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Animated bamboo that grows based on task completion progress.
 * Matches the flat design style of the Hansei panda mascot.
 */
export function BambooGrowth({ 
  progress, 
  size = 120, 
  mirror = false,
  className = '' 
}: BambooGrowthProps) {
  // Map progress (0-1) to visible segments (1-5)
  // 0% = just sprout, 100% = full bamboo
  const segmentsToShow = Math.min(5, Math.max(1, Math.ceil(progress * 5)));
  
  // Colors matching the panda's palette
  const stemLight = '#8fbc8f';  // Light green stem
  const stemDark = '#6b8f71';   // Dark green (matches theme)
  const leafDark = '#4a6b52';   // Dark leaves
  const leafLight = '#6b8f71';  // Light leaves
  const soil = '#5d4e37';       // Soil brown
  
  return (
    <motion.svg
      viewBox="0 0 50 120"
      width={size * 0.42}
      height={size}
      className={className}
      style={{ 
        transform: mirror ? 'scaleX(-1)' : 'none',
        overflow: 'visible'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Soil mound */}
      <ellipse 
        cx="25" 
        cy="115" 
        rx="15" 
        ry="5" 
        fill={soil}
      />
      
      {/* Segment 1: Sprout (always visible) */}
      <motion.g
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{ transformOrigin: '25px 110px' }}
      >
        <rect x="22" y="95" width="6" height="20" rx="2" fill={stemLight} />
        {/* Sprout leaves */}
        <path 
          d="M25 95 Q20 88 22 82 Q25 88 28 82 Q30 88 25 95" 
          fill={leafLight}
        />
      </motion.g>
      
      {/* Segment 2 */}
      <motion.g
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ 
          scaleY: segmentsToShow >= 2 ? 1 : 0, 
          opacity: segmentsToShow >= 2 ? 1 : 0 
        }}
        transition={{ duration: 0.4, delay: 0.2, type: 'spring', stiffness: 200 }}
        style={{ transformOrigin: '25px 95px' }}
      >
        <rect x="22" y="70" width="6" height="25" rx="2" fill={stemLight} />
        {/* Node ring */}
        <rect x="21" y="93" width="8" height="2" rx="1" fill={stemDark} />
        {/* Small leaf right */}
        <path 
          d="M28 80 Q38 75 35 68 Q32 73 28 80" 
          fill={leafDark}
        />
      </motion.g>
      
      {/* Segment 3 */}
      <motion.g
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ 
          scaleY: segmentsToShow >= 3 ? 1 : 0, 
          opacity: segmentsToShow >= 3 ? 1 : 0 
        }}
        transition={{ duration: 0.4, delay: 0.3, type: 'spring', stiffness: 200 }}
        style={{ transformOrigin: '25px 70px' }}
      >
        <rect x="22" y="45" width="6" height="25" rx="2" fill={stemLight} />
        {/* Node ring */}
        <rect x="21" y="68" width="8" height="2" rx="1" fill={stemDark} />
        {/* Leaf left */}
        <path 
          d="M22 55 Q12 50 15 42 Q18 48 22 55" 
          fill={leafDark}
        />
        {/* Small leaf right */}
        <path 
          d="M28 50 Q36 46 34 40 Q31 44 28 50" 
          fill={leafLight}
        />
      </motion.g>
      
      {/* Segment 4 */}
      <motion.g
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ 
          scaleY: segmentsToShow >= 4 ? 1 : 0, 
          opacity: segmentsToShow >= 4 ? 1 : 0 
        }}
        transition={{ duration: 0.4, delay: 0.4, type: 'spring', stiffness: 200 }}
        style={{ transformOrigin: '25px 45px' }}
      >
        <rect x="22" y="22" width="6" height="23" rx="2" fill={stemLight} />
        {/* Node ring */}
        <rect x="21" y="43" width="8" height="2" rx="1" fill={stemDark} />
        {/* Leaf right */}
        <path 
          d="M28 32 Q42 25 38 16 Q34 22 28 32" 
          fill={leafDark}
        />
        {/* Leaf left */}
        <path 
          d="M22 28 Q10 22 14 14 Q17 20 22 28" 
          fill={leafLight}
        />
      </motion.g>
      
      {/* Segment 5: Full growth */}
      <motion.g
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ 
          scaleY: segmentsToShow >= 5 ? 1 : 0, 
          opacity: segmentsToShow >= 5 ? 1 : 0 
        }}
        transition={{ duration: 0.4, delay: 0.5, type: 'spring', stiffness: 200 }}
        style={{ transformOrigin: '25px 22px' }}
      >
        <rect x="22" y="5" width="6" height="17" rx="2" fill={stemLight} />
        {/* Node ring */}
        <rect x="21" y="20" width="8" height="2" rx="1" fill={stemDark} />
        {/* Top leaves cluster */}
        <path 
          d="M25 5 Q20 -5 22 -12 Q25 -3 28 -12 Q30 -5 25 5" 
          fill={leafLight}
        />
        <path 
          d="M22 8 Q8 0 12 -10 Q16 -2 22 8" 
          fill={leafDark}
        />
        <path 
          d="M28 8 Q42 0 38 -10 Q34 -2 28 8" 
          fill={leafDark}
        />
      </motion.g>
    </motion.svg>
  );
}

export default BambooGrowth;
