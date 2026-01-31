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
    <main className="min-h-screen bg-[#fafafa] dark:bg-gray-950 flex flex-col">
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <span className="text-xl font-semibold text-gray-900 dark:text-white tracking-tight">
          taskflow
        </span>
        <Link 
          href="/login"
          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            2 seconds to capture
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight mb-6">
            Ideas disappear.<br/>
            <span className="text-green-500">Catch them first.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 mb-10 max-w-lg mx-auto leading-relaxed">
            One tap. Speak. Done.<br/>
            Your thoughts become tasks before you forget them.
          </p>

          {/* CTA */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-8">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all text-center sm:text-left"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 disabled:opacity-50"
              >
                {loading ? '...' : 'Get early access'}
              </button>
            </form>
          ) : (
            <div className="mb-8 px-6 py-4 rounded-2xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium">
              ✓ You're on the list. We'll be in touch soon.
            </div>
          )}

          <p className="text-sm text-gray-400 dark:text-gray-500">
            Free while in beta. No credit card required.
          </p>
        </div>
      </section>

      {/* How it works - Ultra simple */}
      <section className="px-6 py-20 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-16">
            Capture in 2 seconds. Really.
          </h2>
          
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-3xl">👆</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tap</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">One button. No menus, no typing, no thinking.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-3xl">🎤</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Speak</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Brain dump everything. We'll sort it out.</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Done</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Tasks organized, prioritized, ready to check off.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pain point */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Your best ideas come at the worst times.
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed mb-8">
            Walking. Showering. Falling asleep.<br/>
            By the time you open a notes app, it's gone.<br/><br/>
            Taskflow is faster than forgetting.
          </p>
          <div className="inline-flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Average capture time: 2.3 seconds
          </div>
        </div>
      </section>

      {/* Social proof placeholder */}
      <section className="px-6 py-16 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm uppercase tracking-wide mb-4">
            Built for people who think faster than they type
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-gray-300 dark:text-gray-600">
            <span className="text-2xl font-bold">Founders</span>
            <span className="text-2xl font-bold">Creators</span>
            <span className="text-2xl font-bold">ADHD brains</span>
            <span className="text-2xl font-bold">Overthinkers</span>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Stop losing ideas.
          </h2>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all text-center sm:text-left"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 rounded-2xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold transition-all shadow-lg shadow-green-500/25 hover:shadow-green-500/40 disabled:opacity-50"
              >
                {loading ? '...' : 'Join waitlist'}
              </button>
            </form>
          ) : (
            <div className="px-6 py-4 rounded-2xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium">
              ✓ You're in!
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400 dark:text-gray-500">
          <span>© 2026 taskflow</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Terms</a>
            <a href="https://x.com/RamonPrietoX" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
