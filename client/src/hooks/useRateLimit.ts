import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseRateLimitOptions {
  minInterval?: number;
  message?: string;
}

export function useRateLimit(options: UseRateLimitOptions = {}) {
  const { minInterval = 2000, message = 'Please wait before trying again' } = options;
  const { toast } = useToast();
  const lastActionRef = useRef<number>(0);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    const elapsed = now - lastActionRef.current;
    
    if (elapsed < minInterval) {
      setIsRateLimited(true);
      toast({
        title: 'Too Fast',
        description: message,
        variant: 'destructive',
      });
      setTimeout(() => setIsRateLimited(false), minInterval - elapsed);
      return false;
    }
    
    lastActionRef.current = now;
    return true;
  }, [minInterval, message, toast]);

  const wrapAction = useCallback(<T extends (...args: any[]) => any>(action: T) => {
    return ((...args: Parameters<T>) => {
      if (!checkRateLimit()) return;
      return action(...args);
    }) as T;
  }, [checkRateLimit]);

  return { checkRateLimit, wrapAction, isRateLimited };
}
