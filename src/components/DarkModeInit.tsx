'use client';

import { useEffect } from 'react';

/**
 * Initializes dark mode from localStorage on all /app/* pages.
 * Without this, only the home page would apply the 'dark' class.
 */
export function DarkModeInit() {
  useEffect(() => {
    const saved = localStorage.getItem('hansei-darkmode');
    if (saved === 'true') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return null;
}
