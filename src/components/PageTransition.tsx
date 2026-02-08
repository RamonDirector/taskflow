'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

// Page order for determining slide direction
const pageOrder = ['/app', '/app/ideas', '/app/tasks', '/app/dreams'];

function getPageIndex(path: string): number {
  const index = pageOrder.indexOf(path);
  return index >= 0 ? index : 0;
}

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const prevPathRef = useRef(pathname);
  const directionRef = useRef(1); // 1 = right, -1 = left

  useEffect(() => {
    const prevIndex = getPageIndex(prevPathRef.current);
    const currentIndex = getPageIndex(pathname);
    directionRef.current = currentIndex >= prevIndex ? 1 : -1;
    prevPathRef.current = pathname;
  }, [pathname]);

  const direction = directionRef.current;

  return (
    <motion.div
      key={pathname}
      initial={{ x: direction * 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction * -100, opacity: 0 }}
      transition={{ 
        type: 'tween',
        duration: 0.2,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
