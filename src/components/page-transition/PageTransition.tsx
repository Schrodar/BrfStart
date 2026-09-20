'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useTransition, TRANSITION_MS } from './TransitionProvider';

export function PageTransition({ children }: { children: ReactNode }) {
  const { isTransitioning, endTransition } = useTransition();
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      endTransition();
    }
  }, [pathname, endTransition]);

  return (
    <div
      style={{
        opacity: isTransitioning ? 0 : 1,
        transition: `opacity ${TRANSITION_MS}ms ease-in-out`,
        willChange: 'opacity',
      }}
    >
      {children}
    </div>
  );
}
