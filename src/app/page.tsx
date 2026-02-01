'use client';

import { useState } from 'react';
import Link from 'next/link';
import VideoShowcase from './components/VideoShowcase';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch {
      // Handle error silently
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8] selection:bg-[#3d5a45]/40">
      
      {/* Subtle grain texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")'}} />

      {/* Nav */}
      <nav className="relative z-10 px-8 py-6 flex items-center justify-between max-w-5xl mx-auto w-full">
        <span className="text-lg font-medium tracking-wide text-[#c8c8c8]">
          taskflow
        </span>
        <Link 
          href="/login"
          className="text-sm text-[#888] hover:text-[#c8c8c8] transition-colors duration-300"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center px-8 pt-24 pb-32 text-center">
        <div className="max-w-2xl mx-auto">
          
          {/* Headline */}
          <h1 className="text-[2.75rem] sm:text-[3.5rem] md:text-[4rem] font-light leading-[1.1] mb-8 tracking-[-0.02em] text-[#f0f0f0]">
            De idea fugaz
            <br />
            <span className="text-[#6b8f71]">a acción real.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-[#777] mb-14 max-w-md mx-auto leading-relaxed font-light">
            Captura tus pensamientos en 2 segundos. AI los convierte en el plan de acción para hacerlos realidad.
          </p>

          {/* CTA */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto mb-6">
              <input
                type="email"
                placeholder="your best email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-5 py-3.5 rounded-lg border border-[#222] bg-[#111] text-[#e8e8e8] placeholder-[#555] focus:border-[#3d5a45] focus:outline-none transition-colors duration-300 text-sm"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3.5 rounded-lg bg-[#3d5a45] hover:bg-[#4a6b52] text-[#e8e8e8] text-sm font-medium transition-all duration-300 disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? '...' : 'Join 56 others'}
              </button>
            </form>
          ) : (
            <div className="mb-6 px-5 py-3.5 rounded-lg border border-[#3d5a45]/30 text-[#6b8f71] text-sm">
              You're on the list.
            </div>
          )}

          <p className="text-xs text-[#555]">
            Beta spots limited · No card required
          </p>

          {/* Testimonial */}
          <div className="mt-12 max-w-md mx-auto">
            <p className="text-[#666] text-sm italic leading-relaxed">
              "Ayer capturé 12 ideas en mi paseo matutino. Antes de Taskflow, habría olvidado 11."
            </p>
            <p className="text-[#555] text-xs mt-3">— Usuario beta</p>
          </div>
        </div>
      </section>

      {/* Video Showcase */}
      <section className="relative z-10 px-8 pb-28">
        <div className="max-w-md mx-auto">
          <VideoShowcase />
        </div>
      </section>

      {/* Visual divider */}
      <div className="max-w-5xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[#222] to-transparent" />
      </div>

      {/* How it works */}
      <section className="relative z-10 px-8 py-28">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs uppercase tracking-[0.2em] text-[#555] text-center mb-20">
            How it works
          </p>
          
          <div className="grid md:grid-cols-3 gap-16 md:gap-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-6 rounded-full border border-[#2a2a2a] flex items-center justify-center">
                <span className="text-[#6b8f71] text-sm font-light">01</span>
              </div>
              <h3 className="text-sm font-medium mb-3 text-[#c8c8c8]">Captura</h3>
              <p className="text-[#666] text-sm leading-relaxed">Un tap, di todo lo que tengas en mente.</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-6 rounded-full border border-[#2a2a2a] flex items-center justify-center">
                <span className="text-[#6b8f71] text-sm font-light">02</span>
              </div>
              <h3 className="text-sm font-medium mb-3 text-[#c8c8c8]">Procesa</h3>
              <p className="text-[#666] text-sm leading-relaxed">AI separa tareas de ideas y crea tu plan de acción.</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-6 rounded-full border border-[#2a2a2a] flex items-center justify-center">
                <span className="text-[#6b8f71] text-sm font-light">03</span>
              </div>
              <h3 className="text-sm font-medium mb-3 text-[#c8c8c8]">Ejecuta</h3>
              <p className="text-[#666] text-sm leading-relaxed">Tus ideas convertidas en acciones concretas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual divider */}
      <div className="max-w-5xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[#222] to-transparent" />
      </div>

      {/* Problem statement */}
      <section className="relative z-10 px-8 py-28">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-[#666] text-lg leading-relaxed mb-8 font-light">
            Las ideas llegan en los peores momentos — caminando, en la ducha, medio dormido. 
            Cuando encuentras una app, ya se fueron.
          </p>
          <p className="text-[#777] text-base mb-2 font-light">
            Una idea sin ejecución es solo un sueño que olvidaste.
          </p>
          <p className="text-[#888] text-sm">
            Tiempo de captura: <span className="text-[#6b8f71]">2 segundos</span>
          </p>
        </div>
      </section>

      {/* Visual divider */}
      <div className="max-w-5xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[#222] to-transparent" />
      </div>

      {/* Audience */}
      <section className="relative z-10 px-8 py-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-[#444]">
            <span className="hover:text-[#666] transition-colors duration-300 cursor-default">Founders</span>
            <span className="text-[#333]">·</span>
            <span className="hover:text-[#666] transition-colors duration-300 cursor-default">Creators</span>
            <span className="text-[#333]">·</span>
            <span className="hover:text-[#666] transition-colors duration-300 cursor-default">Overthinkers</span>
            <span className="text-[#333]">·</span>
            <span className="hover:text-[#666] transition-colors duration-300 cursor-default">ADHD minds</span>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-8 py-28">
        <div className="max-w-sm mx-auto text-center">
          <h2 className="text-2xl font-light mb-10 text-[#c8c8c8]">
            Deja de perder ideas.<br/>Empieza a ejecutarlas.
          </h2>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="your best email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3.5 rounded-lg border border-[#222] bg-[#111] text-[#e8e8e8] placeholder-[#555] focus:border-[#3d5a45] focus:outline-none transition-colors duration-300 text-sm text-center"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3.5 rounded-lg bg-[#3d5a45] hover:bg-[#4a6b52] text-[#e8e8e8] text-sm font-medium transition-all duration-300 disabled:opacity-50"
              >
                {loading ? '...' : 'Get early access →'}
              </button>
            </form>
          ) : (
            <div className="px-5 py-3.5 rounded-lg border border-[#3d5a45]/30 text-[#6b8f71] text-sm">
              You're in.
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-8 border-t border-[#181818]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#444]">
          <span>© 2026 taskflow</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#666] transition-colors duration-300">Privacy</a>
            <a href="#" className="hover:text-[#666] transition-colors duration-300">Terms</a>
            <a href="https://x.com/RamonPrietoX" target="_blank" rel="noopener noreferrer" className="hover:text-[#666] transition-colors duration-300">Twitter</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
