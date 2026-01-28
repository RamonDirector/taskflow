'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (data.user && !data.session) {
      // Email confirmation required
      setSuccess(true);
      setLoading(false);
    } else {
      // Auto-confirmed (if email confirm is off in Supabase)
      router.push('/app');
      router.refresh();
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-white dark:bg-[#09090b] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            We&apos;ve sent a confirmation link to <strong className="text-gray-900 dark:text-white">{email}</strong>
          </p>
          <Link href="/login" className="text-orange-600 dark:text-orange-500 hover:underline font-medium text-sm">
            Back to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-[#09090b] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="block text-center mb-8">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
            <span className="text-orange-600 dark:text-orange-500">⚡</span> Taskflow
          </h2>
        </Link>

        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
          Create your account
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8 text-sm">
          Start capturing tasks with your voice
        </p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#1a1a1e] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#1a1a1e] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-medium text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-orange-600 dark:text-orange-500 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
