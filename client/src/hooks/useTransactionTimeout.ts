import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseTransactionTimeoutOptions {
  timeoutMs?: number;
  onTimeout?: () => void;
}

export function useTransactionTimeout(
  isConfirming: boolean,
  options: UseTransactionTimeoutOptions = {}
) {
  const { timeoutMs = 60000, onTimeout } = options;
  const { toast } = useToast();
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isConfirming && !startTimeRef.current) {
      startTimeRef.current = Date.now();
      setHasTimedOut(false);

      timeoutRef.current = setTimeout(() => {
        if (startTimeRef.current && Date.now() - startTimeRef.current >= timeoutMs) {
          setHasTimedOut(true);
          toast({
            title: "Transaction Taking Long",
            description: "Your transaction is still pending. Check the block explorer for status.",
            className: "bg-yellow-500/10 border-yellow-500 text-yellow-400",
          });
          onTimeout?.();
        }
      }, timeoutMs);
    }

    if (!isConfirming) {
      startTimeRef.current = null;
      setHasTimedOut(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isConfirming, timeoutMs, toast, onTimeout]);

  return {
    hasTimedOut,
    elapsedTime: startTimeRef.current ? Date.now() - startTimeRef.current : 0,
  };
}
