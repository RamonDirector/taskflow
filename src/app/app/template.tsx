'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useRef, useEffect, useState } from 'react';

// Page order for determining slide direction
const pageOrder = ['/app', '/app/ideas', '/app/tasks', '/app/dreams'];

function getPageIndex(path: string): number {
  const index = pageOrder.indexOf(path);
  return index >= 0 ? index : 0;
}

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [direction, setDirection] = useState(0);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    const prevIndex = getPageIndex(prevPathRef.current);
    const currentIndex = getPageIndex(pathname);
    
    if (prevPathRef.current !== pathname) {
      setDirection(currentIndex > prevIndex ? 1 : -1);
    }
    
    prevPathRef.current = pathname;
  }, [pathname]);

  return (
    <motion.div
      key={pathname}
      initial={{ x: direction * 50, opacity: 0.8 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ 
        type: 'tween',
        duration: 0.15,
        ease: [0.25, 0.1, 0.25, 1]
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}
