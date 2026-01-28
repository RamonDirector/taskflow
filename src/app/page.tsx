'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'exists'>('idle');
  const [count, setCount] = useState<number | null>(50);

  useEffect(() => {
    fetch('/api/waitlist')
      .then(res => res.json())
      .then(data => setCount(data.count))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus(data.message === 'Already registered' ? 'exists' : 'success');
        setCount(data.count);
        if (data.message !== 'Already registered') setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-[#09090b] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/40 mb-8">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-sm font-medium text-orange-700 dark:text-orange-400">Coming Soon</span>
        </div>

        {/* Logo */}
        <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-8">
          <span className="text-orange-600 dark:text-orange-500">⚡</span> Taskflow
        </h2>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center text-gray-900 dark:text-white tracking-tight leading-[1.1] max-w-2xl mb-6">
          Stop losing tasks.
          <br />
          <span className="text-orange-600 dark:text-orange-500">Just say them.</span>
        </h1>

        {/* Sub */}
        <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 text-center max-w-lg mb-12 leading-relaxed">
          You think 10 tasks a day but only write down 6.
          <br />
          Taskflow captures your voice and turns it into organized action.
        </p>

        {/* Form */}
        <div className="w-full max-w-md mb-4">
          {status === 'success' ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">You&apos;re in! 🎉</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">We&apos;ll notify you when Taskflow launches.</p>
            </div>
          ) : status === 'exists' ? (
            <div className="text-center py-6">
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Already on the list! 👋</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">You&apos;re already signed up. We&apos;ll be in touch.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="flex-1 px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#1a1a1e] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-6 py-3 rounded-lg font-medium text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {status === 'loading' ? '...' : 'Join Waitlist'}
              </button>
            </form>
          )}

          {status === 'error' && (
            <p className="text-red-500 text-sm text-center mt-3">Something went wrong. Try again.</p>
          )}
        </div>

        {/* Count */}
        {count !== null && count > 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-600">
            {count} {count === 1 ? 'person' : 'people'} already waiting
          </p>
        )}

        {/* Features */}
        <div className="grid sm:grid-cols-3 gap-6 sm:gap-10 mt-20 max-w-2xl w-full">
          {[
            { emoji: '🎙️', title: 'Speak', desc: 'Say your tasks naturally, anytime' },
            { emoji: '🧠', title: 'Organize', desc: 'AI prioritizes and categorizes' },
            { emoji: '⚡', title: 'Execute', desc: 'Focus timer to get things done' },
          ].map((f, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-gray-100 dark:border-gray-800/50">
        <p className="text-sm text-gray-400 dark:text-gray-600">
          Built by{' '}
          <a href="https://x.com/RamonPrietoX" target="_blank" rel="noopener noreferrer"
            className="text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500 transition-colors">
            @RamonPrietoX
          </a>
        </p>
      </footer>
    </main>
  );
}
