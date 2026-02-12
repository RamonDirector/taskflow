'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface PixelBubbleProps {
  message: string;
  className?: string;
  tailPosition?: 'center' | 'left' | 'right';
  animate?: boolean;
}

/**
 * Render basic markdown: **bold**, \n line breaks.
 * Returns array of React elements.
 */
function renderSimpleMarkdown(text: string): React.ReactNode[] {
  // Split by newlines first
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) elements.push(<br key={`br-${lineIdx}`} />);
    
    // Parse **bold** within each line
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    parts.forEach((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        elements.push(
          <strong key={`${lineIdx}-${partIdx}`} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      } else if (part) {
        elements.push(part);
      }
    });
  });
  
  return elements;
}

/**
 * Pixel art speech bubble for Kai's messages.
 * Uses CSS box-shadow technique for crisp pixel borders that scale perfectly.
 */
export function PixelBubble({ message, className = '', tailPosition = 'center', animate = true }: PixelBubbleProps) {
  if (!message) return null;

  const px = 2; // pixel size
  const color = '#5a7d5f'; // darker matcha for border

  // Pixel border using box-shadow (each "shadow" = one pixel block)
  const pixelBorder = `
    ${px}px 0 0 0 ${color},
    ${-px}px 0 0 0 ${color},
    0 ${px}px 0 0 ${color},
    0 ${-px}px 0 0 ${color},
    ${px * 2}px 0 0 0 ${color},
    ${-px * 2}px 0 0 0 ${color},
    0 ${px * 2}px 0 0 ${color},
    0 ${-px * 2}px 0 0 ${color}
  `;

  const tailLeft = tailPosition === 'left' ? '25%' : tailPosition === 'right' ? '75%' : '50%';

  const Wrapper = animate ? motion.div : 'div';
  const wrapperProps = animate ? {
    initial: { opacity: 0, y: 8, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.3, ease: 'easeOut' },
  } : {};

  return (
    <Wrapper {...(wrapperProps as Record<string, unknown>)} className={`relative inline-block ${className}`}>
      {/* Main bubble */}
      <div
        className="relative px-4 py-3 bg-[#f0f7f1] dark:bg-[#2a3a2c]"
        style={{
          // Pixel corners via clip-path
          clipPath: `polygon(
            ${px * 3}px 0,
            calc(100% - ${px * 3}px) 0,
            calc(100% - ${px * 3}px) ${px}px,
            calc(100% - ${px}px) ${px}px,
            calc(100% - ${px}px) ${px * 3}px,
            100% ${px * 3}px,
            100% calc(100% - ${px * 3}px),
            calc(100% - ${px}px) calc(100% - ${px * 3}px),
            calc(100% - ${px}px) calc(100% - ${px}px),
            calc(100% - ${px * 3}px) calc(100% - ${px}px),
            calc(100% - ${px * 3}px) 100%,
            ${px * 3}px 100%,
            ${px * 3}px calc(100% - ${px}px),
            ${px}px calc(100% - ${px}px),
            ${px}px calc(100% - ${px * 3}px),
            0 calc(100% - ${px * 3}px),
            0 ${px * 3}px,
            ${px}px ${px * 3}px,
            ${px}px ${px}px,
            ${px * 3}px ${px}px
          )`,
          imageRendering: 'pixelated',
        }}
      >
        {/* Inner pixel border */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath: `polygon(
              ${px * 3}px 0,
              calc(100% - ${px * 3}px) 0,
              calc(100% - ${px * 3}px) ${px}px,
              calc(100% - ${px}px) ${px}px,
              calc(100% - ${px}px) ${px * 3}px,
              100% ${px * 3}px,
              100% calc(100% - ${px * 3}px),
              calc(100% - ${px}px) calc(100% - ${px * 3}px),
              calc(100% - ${px}px) calc(100% - ${px}px),
              calc(100% - ${px * 3}px) calc(100% - ${px}px),
              calc(100% - ${px * 3}px) 100%,
              ${px * 3}px 100%,
              ${px * 3}px calc(100% - ${px}px),
              ${px}px calc(100% - ${px}px),
              ${px}px calc(100% - ${px * 3}px),
              0 calc(100% - ${px * 3}px),
              0 ${px * 3}px,
              ${px}px ${px * 3}px,
              ${px}px ${px}px,
              ${px * 3}px ${px}px
            )`,
            border: `${px}px solid ${color}`,
          }}
        />
        <div className="text-sm text-gray-800 dark:text-gray-200 text-left leading-relaxed relative z-10 max-h-[200px] overflow-y-auto scrollbar-hide">
          {renderSimpleMarkdown(message)}
        </div>
      </div>

      {/* Pixel tail pointing down to Kai */}
      <div className="relative w-full h-3" style={{ left: 0 }}>
        {/* Tail pixels */}
        <div
          className="absolute"
          style={{
            left: `calc(${tailLeft} - ${px * 3}px)`,
            top: 0,
            width: px * 6,
            height: px,
            backgroundColor: color,
          }}
        />
        <div
          className="absolute"
          style={{
            left: `calc(${tailLeft} - ${px * 2}px)`,
            top: px,
            width: px * 4,
            height: px,
            backgroundColor: '#f0f7f1',
            boxShadow: `${-px}px 0 0 0 ${color}, ${px * 4}px 0 0 0 ${color}`,
          }}
        />
        <div
          className="absolute"
          style={{
            left: `calc(${tailLeft} - ${px}px)`,
            top: px * 2,
            width: px * 2,
            height: px,
            backgroundColor: '#f0f7f1',
            boxShadow: `${-px}px 0 0 0 ${color}, ${px * 2}px 0 0 0 ${color}`,
          }}
        />
        <div
          className="absolute"
          style={{
            left: tailLeft,
            top: px * 3,
            width: px,
            height: px,
            backgroundColor: color,
          }}
        />
      </div>
    </Wrapper>
  );
}
