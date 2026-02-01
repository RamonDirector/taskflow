'use client';

import { useState, useRef, useEffect } from 'react';

type DemoState = 'idle' | 'recording' | 'processing' | 'done';

export default function VoiceDemo() {
  const [state, setState] = useState<DemoState>('idle');
  const [transcript, setTranscript] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      setError('');
      setTranscript('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        
        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setState('recording');
      setSeconds(0);
      
      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);

    } catch {
      setError('Microphone access required');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
      setState('processing');
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (res.ok && data.text) {
        setTranscript(data.text);
        setState('done');
      } else {
        throw new Error(data.error || 'Transcription failed');
      }
    } catch {
      setError('Something went wrong');
      setState('idle');
    }
  };

  const reset = () => {
    setState('idle');
    setTranscript('');
    setSeconds(0);
    setError('');
  };

  const formatTime = (s: number) => `0:${s.toString().padStart(2, '0')}`;

  return (
    <div className="relative">
      {/* Main container */}
      <div className="relative overflow-hidden rounded-2xl border border-[#1a1a1a] bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a]">
        
        {/* Subtle glow effect when recording */}
        {state === 'recording' && (
          <div className="absolute inset-0 bg-[#3d5a45]/5 animate-pulse" />
        )}
        
        <div className="relative px-8 py-12 flex flex-col items-center">
          
          {/* Status indicator */}
          <div className="flex items-center gap-2 mb-8">
            {state === 'recording' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#6b8f71] animate-pulse" />
                <span className="text-xs uppercase tracking-[0.15em] text-[#6b8f71]">Listening</span>
              </>
            )}
            {state === 'processing' && (
              <span className="text-xs uppercase tracking-[0.15em] text-[#555]">Processing...</span>
            )}
            {state === 'idle' && (
              <span className="text-xs uppercase tracking-[0.15em] text-[#444]">Try it yourself</span>
            )}
            {state === 'done' && (
              <span className="text-xs uppercase tracking-[0.15em] text-[#6b8f71]">Captured</span>
            )}
          </div>

          {/* Main button */}
          <button
            onClick={state === 'idle' ? startRecording : state === 'recording' ? stopRecording : reset}
            disabled={state === 'processing'}
            className={`
              relative w-20 h-20 rounded-full transition-all duration-500 ease-out
              flex items-center justify-center
              ${state === 'idle' ? 'bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#3d5a45]/50 hover:scale-105' : ''}
              ${state === 'recording' ? 'bg-[#3d5a45] scale-110 shadow-lg shadow-[#3d5a45]/20' : ''}
              ${state === 'processing' ? 'bg-[#1a1a1a] border border-[#2a2a2a] cursor-wait' : ''}
              ${state === 'done' ? 'bg-[#1a1a1a] hover:bg-[#222] border border-[#3d5a45]/30' : ''}
              disabled:opacity-50
            `}
          >
            {/* Idle - Microphone icon */}
            {state === 'idle' && (
              <svg className="w-7 h-7 text-[#6b8f71]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            )}
            
            {/* Recording - Sound waves animation */}
            {state === 'recording' && (
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-white/90 rounded-full animate-pulse"
                    style={{
                      height: `${12 + Math.random() * 16}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.5s'
                    }}
                  />
                ))}
              </div>
            )}
            
            {/* Processing - Spinner */}
            {state === 'processing' && (
              <svg className="w-6 h-6 text-[#555] animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
            
            {/* Done - Checkmark */}
            {state === 'done' && (
              <svg className="w-7 h-7 text-[#6b8f71]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
            )}
          </button>

          {/* Timer */}
          {state === 'recording' && (
            <p className="mt-6 text-2xl font-light text-[#c8c8c8] tabular-nums">
              {formatTime(seconds)}
            </p>
          )}

          {/* Instruction text */}
          {state === 'idle' && (
            <p className="mt-6 text-sm text-[#555]">Tap to speak a task</p>
          )}
          {state === 'recording' && (
            <p className="mt-3 text-sm text-[#555]">Tap to finish</p>
          )}

          {/* Transcript result */}
          {transcript && (
            <div className="mt-8 w-full max-w-sm">
              <div className="p-5 rounded-xl bg-[#111] border border-[#1f1f1f]">
                <p className="text-xs uppercase tracking-[0.15em] text-[#444] mb-3">Your task</p>
                <p className="text-[#e8e8e8] leading-relaxed">{transcript}</p>
              </div>
              <button
                onClick={reset}
                className="mt-4 w-full py-2.5 text-sm text-[#555] hover:text-[#888] transition-colors duration-300"
              >
                Try again
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="mt-6 text-sm text-red-400/80">{error}</p>
          )}
        </div>
      </div>

      {/* Caption */}
      <p className="text-center text-xs text-[#444] mt-4">
        Powered by AI · Works in any language
      </p>
    </div>
  );
}
