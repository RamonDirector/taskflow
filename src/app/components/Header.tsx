'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  badge?: string;
  badgeColor?: 'amber' | 'emerald' | 'indigo';
  rightContent?: React.ReactNode;
}

export default function Header({ 
  title, 
  showBack = false, 
  badge,
  badgeColor = 'amber',
  rightContent 
}: HeaderProps) {
  const [darkMode, setDarkMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('hansei-darkmode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('hansei-darkmode', String(newMode));
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const badgeColors = {
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-10 px-4 py-3 bg-[var(--background)]/80 backdrop-blur-lg border-b border-transparent dark:border-gray-800/50">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={() => router.push('/app')}
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}
          <Image
            src="/icon-192-transparent.png"
            alt="Hansei"
            width={28}
            height={28}
            className="rounded-lg"
          />
          {title ? (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
          ) : (
            <span className="text-sm font-medium text-[var(--foreground)]">hansei</span>
          )}
          {badge && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColors[badgeColor]}`}>
              {badge}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {rightContent}
          
          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 bg-transparent transition-opacity hover:opacity-70"
          >
            {/* Sun icon - shown in dark mode */}
            <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 ${darkMode ? 'block' : 'hidden'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
            {/* Moon icon - shown in light mode */}
            <svg className={`w-5 h-5 text-gray-500 dark:text-gray-400 ${darkMode ? 'hidden' : 'block'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
