'use client';

import { useState } from 'react';
import Link from 'next/link';

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
    <main className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-green-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <img src="/icons/mic-button.png" alt="taskflow" className="w-8 h-8" />
          <span className="text-xl font-semibold tracking-tight">taskflow</span>
        </div>
        <Link 
          href="/login"
          className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-16 pb-24 text-center">
        <div className="max-w-3xl mx-auto">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-10 backdrop-blur-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Voice-first task capture
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.1] mb-8 tracking-tight">
            Ideas disappear.
            <br />
            <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent">
              Catch them first.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-gray-400 mb-12 max-w-xl mx-auto leading-relaxed font-light">
            Speak your thoughts. We turn them into organized, prioritized tasks — in seconds.
          </p>

          {/* CTA */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-6 py-4 rounded-2xl border border-gray-700/50 bg-gray-800/50 text-white placeholder-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 outline-none transition-all backdrop-blur-sm"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? '...' : 'Get early access'}
              </button>
            </form>
          ) : (
            <div className="mb-6 px-6 py-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 font-medium backdrop-blur-sm">
              ✓ You're on the list. We'll be in touch soon.
            </div>
          )}

          <p className="text-sm text-gray-500">
            Free while in beta • No credit card required
          </p>
        </div>
      </section>

      {/* App Preview / Mockup */}
      <section className="relative z-10 px-6 pb-24">
        <div className="max-w-md mx-auto">
          <div className="relative p-1 rounded-[2rem] bg-gradient-to-b from-gray-700/50 to-gray-800/50 shadow-2xl shadow-black/50">
            <div className="bg-gray-900 rounded-[1.75rem] p-6 pb-8">
              {/* Mock app header */}
              <div className="flex items-center justify-between mb-8">
                <span className="text-sm font-medium text-gray-400">taskflow</span>
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gray-800" />
                  <div className="w-6 h-6 rounded-lg bg-gray-800" />
                </div>
              </div>
              
              {/* Mic button */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                  <div className="relative w-24 h-24 rounded-full bg-white shadow-lg shadow-green-500/30 flex items-center justify-center">
                    <img src="/icons/mic-button.png" alt="Record" className="w-20 h-20" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-4">Aquí cuando me necesites</p>
              </div>

              {/* Sample tasks */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center overflow-hidden">
                    <img src="/icons/health.png" alt="health" className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Ir al gimnasio</p>
                    <p className="text-xs text-gray-500">Hoy • health</p>
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-gray-600" />
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700/50 opacity-60">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center overflow-hidden">
                    <img src="/icons/work.png" alt="work" className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-400 line-through">Enviar propuesta</p>
                    <p className="text-xs text-gray-600">Ayer • work</p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 px-6 py-24 border-t border-gray-800/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            How it works
          </h2>
          <p className="text-gray-400 text-center mb-16 max-w-lg mx-auto">
            From thought to task in 2 seconds
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-3xl bg-gradient-to-b from-gray-800/30 to-transparent border border-gray-800/50">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center shadow-lg shadow-green-500/10">
                <img src="/icons/mic-button.png" alt="Speak" className="w-14 h-14" />
              </div>
              <h3 className="font-semibold text-lg mb-3">1. Speak</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Tap and talk. Brain dump everything — we'll sort it out.</p>
            </div>
            
            <div className="text-center p-8 rounded-3xl bg-gradient-to-b from-gray-800/30 to-transparent border border-gray-800/50">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center shadow-lg shadow-green-500/10">
                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-3">2. Organize</h3>
              <p className="text-gray-400 text-sm leading-relaxed">AI extracts tasks, assigns categories, sets priorities.</p>
            </div>
            
            <div className="text-center p-8 rounded-3xl bg-gradient-to-b from-gray-800/30 to-transparent border border-gray-800/50">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center shadow-lg shadow-green-500/10">
                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-3">3. Done</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Your tasks are ready. Swipe to complete, feel the satisfaction.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pain point */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-8">
            Your best ideas come at the worst times.
          </h2>
          <p className="text-gray-400 text-xl leading-relaxed mb-10">
            Walking. Showering. Falling asleep.
            <br />
            By the time you open a notes app, it's gone.
            <br /><br />
            <span className="text-white font-medium">Taskflow is faster than forgetting.</span>
          </p>
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Average capture time: 2.3 seconds
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="relative z-10 px-6 py-16 border-t border-b border-gray-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-500 text-sm uppercase tracking-wider mb-8">
            Built for people who think faster than they type
          </p>
          <div className="flex flex-wrap justify-center gap-6 sm:gap-12">
            <span className="text-2xl sm:text-3xl font-bold text-gray-600 hover:text-gray-400 transition-colors cursor-default">Founders</span>
            <span className="text-2xl sm:text-3xl font-bold text-gray-600 hover:text-gray-400 transition-colors cursor-default">Creators</span>
            <span className="text-2xl sm:text-3xl font-bold text-gray-600 hover:text-gray-400 transition-colors cursor-default">ADHD brains</span>
            <span className="text-2xl sm:text-3xl font-bold text-gray-600 hover:text-gray-400 transition-colors cursor-default">Overthinkers</span>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-8">
            Stop losing ideas.
          </h2>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-6 py-4 rounded-2xl border border-gray-700/50 bg-gray-800/50 text-white placeholder-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 outline-none transition-all backdrop-blur-sm"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-semibold transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? '...' : 'Join waitlist'}
              </button>
            </form>
          ) : (
            <div className="px-6 py-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 font-medium">
              ✓ You're in!
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-gray-800/50">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <span>© 2026 taskflow</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Terms</a>
            <a href="https://x.com/RamonPrietoX" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
