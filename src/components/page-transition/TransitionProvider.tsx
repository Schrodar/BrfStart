'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

// One knob for the whole system. 250–500ms reads as premium; higher = slower
// perceived navigation (the fade-out blocks the push by this long).
export const TRANSITION_MS = 300;

type TransitionContextValue = {
  isTransitioning: boolean;
  startTransition: (callback: () => void) => void;
  endTransition: () => void;
};

// Default = null so a consumer rendered OUTSIDE the provider crashes loudly
// instead of becoming a silent no-op.
const TransitionContext = createContext<TransitionContextValue | null>(null);

export function useTransition(): TransitionContextValue {
  const ctx = useContext(TransitionContext);
  if (!ctx) {
    throw new Error('useTransition must be used within a TransitionProvider');
  }
  return ctx;
}

export function TransitionProvider({ children }: { children: ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endTransition = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  const startTransition = useCallback((callback: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsTransitioning(true);
    timerRef.current = setTimeout(() => {
      callback();
      timerRef.current = null;
    }, TRANSITION_MS);
  }, []);

  return (
    <TransitionContext.Provider
      value={{ isTransitioning, startTransition, endTransition }}
    >
      {children}
    </TransitionContext.Provider>
  );
}
