import { useState, useCallback } from 'react';

/**
 * Button lock - prevents double-click transactions
 */
export function useButtonLock(cooldownMs = 2000) {
  const [isLocked, setIsLocked] = useState(false);
  const [lastClick, setLastClick] = useState(0);

  const withLock = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      const now = Date.now();
      
      if (now - lastClick < cooldownMs) {
        return null;
      }

      if (isLocked) {
        return null;
      }

      setIsLocked(true);
      setLastClick(now);

      try {
        const result = await fn();
        return result;
      } finally {
        setTimeout(() => setIsLocked(false), cooldownMs);
      }
    },
    [isLocked, lastClick, cooldownMs]
  );

  return { isLocked, withLock };
}
