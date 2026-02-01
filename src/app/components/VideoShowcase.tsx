'use client';

import { useRef, useState, useEffect } from 'react';

export default function VideoShowcase() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set playback rate immediately
    video.playbackRate = 1.25;

    const handleCanPlay = () => {
      setIsReady(true);
      video.playbackRate = 1.25;
    };

    video.addEventListener('canplaythrough', handleCanPlay);
    
    // If already ready
    if (video.readyState >= 3) {
      setIsReady(true);
    }

    return () => video.removeEventListener('canplaythrough', handleCanPlay);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting && videoRef.current && isReady) {
          videoRef.current.play().catch(() => {});
        } else if (!entry.isIntersecting && videoRef.current) {
          videoRef.current.pause();
        }
      },
      { threshold: 0.3 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isReady]);

  return (
    <div 
      ref={containerRef}
      className={`
        relative transition-all duration-1000 ease-out
        ${isVisible && isReady ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
    >
      {/* Phone frame */}
      <div className="relative mx-auto w-[220px] sm:w-[260px]">
        
        {/* Ambient glow */}
        <div className="absolute -inset-8 bg-[#3d5a45]/10 blur-3xl rounded-full opacity-40" />
        
        {/* Phone bezel */}
        <div className="relative bg-[#1a1a1a] rounded-[2.5rem] p-2.5 shadow-2xl shadow-black/50">
          
          {/* Screen */}
          <div className="relative bg-black rounded-[2rem] overflow-hidden">
            
            {/* Video */}
            <video
              ref={videoRef}
              src="/demo.mp4"
              className="w-full aspect-[9/19.5] object-cover"
              preload="auto"
              loop
              muted
              playsInline
              autoPlay
            />
          </div>
          
          {/* Home indicator */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/15 rounded-full" />
        </div>
      </div>

      {/* Caption */}
      <p className="text-center text-xs text-[#444] mt-6">
        2 seconds to capture any thought
      </p>
    </div>
  );
}
