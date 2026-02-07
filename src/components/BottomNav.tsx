'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const Icons = {
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
    { id: 'home', icon: Icons.home, label: 'Home', path: '/app' },
    { id: 'ideas', icon: Icons.ideas, label: 'Ideas', path: '/app/ideas' },
    { id: 'tasks', icon: Icons.tasks, label: 'Tasks', path: '/app/tasks' },
    { id: 'dreams', icon: Icons.dreams, label: 'Dreams', path: '/app/dreams' },
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
              {item.icon}
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
