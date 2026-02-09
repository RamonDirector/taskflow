'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Introduce tu email');
      return;
    }

    setError('');
    setEmailLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setEmailLoading(false);
    } else {
      setMagicLinkSent(true);
      setEmailLoading(false);
    }
  };

  // Success state after magic link sent
  if (magicLinkSent) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#f8faf8] via-white to-[#f0f5f0] flex flex-col">
        <section className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
          <div className="w-full max-w-sm text-center">
            {/* Email icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#6b8f71]/10 flex items-center justify-center">
              <svg className="w-10 h-10 text-[#6b8f71]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-semibold mb-3 text-gray-900">
              Revisa tu email
            </h1>
            
            <p className="text-gray-500 text-sm mb-2">
              Hemos enviado un enlace mágico a
            </p>
            <p className="text-[#6b8f71] font-medium mb-8">
              {email}
            </p>
            
            <p className="text-gray-400 text-xs mb-8">
              Haz clic en el enlace del email para entrar.<br />
              Puede tardar unos segundos en llegar.
            </p>

            <button
              onClick={() => {
                setMagicLinkSent(false);
                setEmail('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Usar otro método
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f8faf8] via-white to-[#f0f5f0] flex flex-col">
      
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/icon-192-transparent.png"
            alt="Hansei"
            width={32}
            height={32}
            className="rounded-xl"
          />
          <span className="text-lg font-medium text-gray-800">hansei</span>
        </Link>
        <Link 
          href="/"
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Volver
        </Link>
      </nav>

      {/* Login Card */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="w-full max-w-sm">
          
          {/* Headline */}
          <h1 className="text-3xl font-semibold leading-tight mb-2 text-gray-900 text-center">
            Bienvenido
          </h1>
          
          <p className="text-center text-gray-500 mb-8 text-sm">
            Entra para continuar
          </p>

          {/* Google Sign-In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading || emailLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-medium text-gray-700 bg-white border border-gray-200 hover:border-[#6b8f71] hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-[#6b8f71] rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            <span className="text-sm">{loading ? 'Entrando...' : 'Continuar con Google'}</span>
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">o</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Magic Link Form */}
          <form onSubmit={handleMagicLink} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={loading || emailLoading}
              className="w-full px-4 py-4 rounded-2xl bg-white border border-gray-200 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b8f71]/20 focus:border-[#6b8f71] transition-all text-sm disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || emailLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-medium text-white bg-[#6b8f71] hover:bg-[#5a7d60] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#6b8f71]/25"
            >
              {emailLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              )}
              <span className="text-sm">{emailLoading ? 'Enviando...' : 'Continuar con Email'}</span>
            </button>
          </form>

          {error && (
            <p className="text-red-500 text-sm text-center mt-6">{error}</p>
          )}

          <p className="text-center text-xs text-gray-400 leading-relaxed mt-8">
            Al entrar, aceptas que Hansei<br />acceda a tu micrófono para captura de voz.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-4">
        <div className="text-center text-xs text-gray-400">
          <span>© 2025 hansei</span>
        </div>
      </footer>
    </main>
  );
}
