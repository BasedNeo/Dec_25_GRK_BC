import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Button lock - prevents double-click transactions
 * Uses refs for synchronous locking (state updates are async and can miss rapid clicks)
 */
interface ButtonLockResult {
  isLocked: boolean;
  withLock: <T>(fn: () => Promise<T>) => Promise<T | null>;
}

export function useButtonLock(cooldownMs = 2000): ButtonLockResult {
  const [isLocked, setIsLocked] = useState(false);
  const lockedRef = useRef(false);
  const lastClickRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const withLock = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      const now = Date.now();
      
      if (now - lastClickRef.current < cooldownMs) {
        return null;
      }

      if (lockedRef.current) {
        return null;
      }

      lockedRef.current = true;
      lastClickRef.current = now;
      setIsLocked(true);

      try {
        const result = await fn();
        return result;
      } finally {
        if (timeoutRef.current) {
          window.clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = window.setTimeout(() => {
          lockedRef.current = false;
          setIsLocked(false);
        }, cooldownMs);
      }
    },
    [cooldownMs]
  );

  return { isLocked, withLock };
}
