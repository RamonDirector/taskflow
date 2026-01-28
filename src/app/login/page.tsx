'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/app');
      router.refresh();
    }
  };

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
          Welcome back
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8 text-sm">
          Sign in to your account
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
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
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-medium text-white bg-orange-600 hover:bg-orange-700 active:bg-orange-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-orange-600 dark:text-orange-500 hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
