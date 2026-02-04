'use client';

import { useState, useRef, useEffect } from 'react';

const THEME_COLOR = '#6b8f71';

const Icons = {
  mic: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  ),
};

interface VoiceEditButtonProps {
  onTranscript: (text: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export default function VoiceEditButton({ 
  onTranscript, 
  size = 'md',
  className = '',
  disabled = false 
}: VoiceEditButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

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
        await processRecording();
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
      
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (e) {
      console.error('Recording error:', e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    setIsRecording(false);
  };

  const processRecording = async () => {
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Transcription failed');
      
      const { text } = await res.json();
      if (text?.trim()) {
        onTranscript(text.trim());
      }
    } catch (e) {
      console.error('Transcription error:', e);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-105 active:scale-95 relative disabled:opacity-50`}
        style={{ backgroundColor: isRecording ? THEME_COLOR : THEME_COLOR }}
      >
        {/* Pulsing ring when recording */}
        {isRecording && (
          <div 
            className="absolute inset-0 rounded-full bg-[#6b8f71] animate-ping opacity-30"
          />
        )}
        
        {/* Mic icon - fades out and scales down when recording */}
        <div 
          className={`absolute transition-all ease-out ${isRecording ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} 
          style={{ transitionDuration: '850ms' }}
        >
          {Icons.mic}
        </div>
        
        {/* Check icon - fades in and rotates when recording */}
        <div 
          className={`absolute transition-all ease-out ${isRecording ? 'opacity-100 rotate-0' : 'opacity-0 -rotate-45'}`} 
          style={{ transitionDuration: '850ms' }}
        >
          {Icons.check}
        </div>
      </button>
      
      {/* Recording time indicator */}
      {isRecording && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-gray-500 tabular-nums">{formatTime(recordingTime)}</span>
        </div>
      )}
    </div>
  );
}
