'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { haptic } from '@/lib/haptics';

// Outline icons (inactive state)
const IconsOutline = {
  home: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  ideas: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  tasks: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  dreams: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ),
};

// Filled icons (active/selected state)
const IconsFilled = {
  home: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
      <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
    </svg>
  ),
  ideas: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .75a8.25 8.25 0 00-4.135 15.39c.686.398 1.115 1.008 1.134 1.623a.75.75 0 00.577.706c.352.083.71.148 1.074.195.323.041.6-.218.6-.544v-4.661a6.714 6.714 0 01-.937-.171.75.75 0 11.374-1.453 5.261 5.261 0 002.626 0 .75.75 0 11.374 1.452 6.712 6.712 0 01-.937.172v4.66c0 .327.277.586.6.545.364-.047.722-.112 1.074-.195a.75.75 0 00.577-.706c.02-.615.448-1.225 1.134-1.623A8.25 8.25 0 0012 .75z" />
      <path fillRule="evenodd" d="M9.013 19.9a.75.75 0 01.877-.597 11.319 11.319 0 004.22 0 .75.75 0 11.28 1.473 12.819 12.819 0 01-4.78 0 .75.75 0 01-.597-.876zM9.754 22.344a.75.75 0 01.824-.668 13.682 13.682 0 002.844 0 .75.75 0 11.156 1.492 15.156 15.156 0 01-3.156 0 .75.75 0 01-.668-.824z" clipRule="evenodd" />
    </svg>
  ),
  tasks: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  ),
  dreams: (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
    </svg>
  ),
};

interface BottomNavProps {
  hasNew?: { ideas?: boolean; tasks?: boolean; dreams?: boolean };
  onClearNew?: (type: 'ideas' | 'tasks' | 'dreams') => void;
}

export function BottomNav({ hasNew = {}, onClearNew }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down' | null>(null);
  const scrollCount = useRef(0);

  // Determine active tab
  const activeTab = pathname === '/app' ? 'home' 
    : pathname.includes('/ideas') ? 'ideas'
    : pathname.includes('/tasks') ? 'tasks'
    : pathname.includes('/dreams') ? 'dreams'
    : 'home';

  // Hide nav on scroll down, show on scroll up (X-style: reacts on 2nd consecutive scroll)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;
      
      // Only react if scroll delta is significant enough (reduces jitter)
      if (Math.abs(delta) < 5) return;
      
      const direction = delta > 0 ? 'down' : 'up';
      
      // Count consecutive scrolls in same direction
      if (direction === scrollDirection.current) {
        scrollCount.current += 1;
      } else {
        scrollDirection.current = direction;
        scrollCount.current = 1;
      }
      
      // Only change nav state on 2nd consecutive scroll
      if (scrollCount.current >= 2) {
        if (direction === 'down' && currentScrollY > 20) {
          setNavVisible(false);
        } else if (direction === 'up') {
          setNavVisible(true);
        }
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home', iconOutline: IconsOutline.home, iconFilled: IconsFilled.home, label: 'Home', path: '/app' },
    { id: 'ideas', iconOutline: IconsOutline.ideas, iconFilled: IconsFilled.ideas, label: 'Ideas', path: '/app/ideas' },
    { id: 'tasks', iconOutline: IconsOutline.tasks, iconFilled: IconsFilled.tasks, label: 'Tasks', path: '/app/tasks' },
    { id: 'dreams', iconOutline: IconsOutline.dreams, iconFilled: IconsFilled.dreams, label: 'Dreams', path: '/app/dreams' },
  ];

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 h-16 bg-[var(--background)] border-t border-[var(--gray-2)] flex items-center justify-around px-6 z-50 transition-transform duration-150 ease-out ${
        navVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {navItems.map(item => {
        const isActive = activeTab === item.id;
        const hasNewIndicator = hasNew[item.id as keyof typeof hasNew];
        
        return (
          <button
            key={item.id}
            onClick={() => {
              haptic.light();
              if (item.id !== 'home' && onClearNew) {
                onClearNew(item.id as 'ideas' | 'tasks' | 'dreams');
              }
              router.push(item.path);
            }}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive ? 'text-[#6b8f71]' : 'text-[var(--gray-4)] hover:text-[var(--foreground)]'
            }`}
          >
            <span className="w-6 h-6 relative">
              {isActive ? item.iconFilled : item.iconOutline}
              {hasNewIndicator && !isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#6b8f71]" />
              )}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
