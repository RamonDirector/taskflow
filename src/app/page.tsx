'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Autoplay video when loaded
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked, user will need to interact
      });
    }
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden bg-gradient-to-br from-[#f8faf8] via-white to-[#f0f5f0] flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 lg:px-20">
        <div className="flex items-center gap-2">
          <Image
            src="/icon-192-transparent.png"
            alt="Hansei"
            width={36}
            height={36}
            className="rounded-xl"
          />
          <span className="text-lg font-medium text-gray-800">hansei</span>
        </div>
        <Link
          href="/login"
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Iniciar sesión
        </Link>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 px-6 md:px-12 lg:px-20 pb-8">
        
        {/* Left side - Text */}
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left max-w-lg">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6b8f71]/10 border border-[#6b8f71]/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#6b8f71] animate-pulse" />
            <span className="text-xs font-medium text-[#6b8f71]">Beta disponible</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-gray-900 leading-[1.1] tracking-tight mb-4">
            Captura ideas
            <br />
            <span className="text-[#6b8f71]">en 3 segundos</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-500 mb-8 max-w-md">
            Habla. La IA organiza tus ideas, tareas y sueños. Tú solo ejecutas.
          </p>

          {/* Features mini */}
          <div className="flex flex-wrap gap-4 mb-8 justify-center lg:justify-start">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-5 h-5 text-[#6b8f71]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Voz a texto
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-5 h-5 text-[#6b8f71]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Clasifica automático
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-5 h-5 text-[#6b8f71]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Planes de acción
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#6b8f71] hover:bg-[#5a7d60] text-white font-medium rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#6b8f71]/25"
          >
            Empezar gratis
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>

          <p className="text-xs text-gray-400 mt-4">
            Sin tarjeta de crédito · Gratis para siempre
          </p>
        </div>

        {/* Right side - Phone mockup with video */}
        <div className="flex-1 flex items-center justify-center max-w-sm lg:max-w-md">
          <div className="relative">
            {/* Phone frame */}
            <div className="relative w-[280px] md:w-[320px] lg:w-[340px] aspect-[9/19.5] bg-gray-900 rounded-[3rem] p-2 shadow-2xl shadow-gray-900/20">
              {/* Screen */}
              <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-gray-900 rounded-b-2xl z-10" />
                
                {/* Video */}
                <video
                  ref={videoRef}
                  src="/landing/demo.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  poster="/landing/home.jpg"
                />
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute -left-16 top-1/4 hidden lg:block">
              <div className="bg-white rounded-2xl shadow-xl p-3 flex items-center gap-3 animate-float">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-800">Idea guardada</p>
                  <p className="text-[10px] text-gray-400">hace 2 seg</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-12 bottom-1/3 hidden lg:block">
              <div className="bg-white rounded-2xl shadow-xl p-3 flex items-center gap-3 animate-float-delayed">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-800">Tarea creada</p>
                  <p className="text-[10px] text-gray-400">Para hoy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float 3s ease-in-out infinite;
          animation-delay: 1.5s;
        }
      `}</style>
    </main>
  );
}
