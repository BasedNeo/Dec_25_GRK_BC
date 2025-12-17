import { useEffect, useRef } from 'react';
import { TimerManager } from '@/lib/timerManager';

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  const timerIdRef = useRef<number | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const tick = () => savedCallback.current();
    
    timerIdRef.current = TimerManager.setInterval(tick, delay);

    return () => {
      if (timerIdRef.current !== null) {
        TimerManager.clear(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [delay]);
}

export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  const timerIdRef = useRef<number | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const tick = () => savedCallback.current();
    
    timerIdRef.current = TimerManager.setTimeout(tick, delay);

    return () => {
      if (timerIdRef.current !== null) {
        TimerManager.clear(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [delay]);
}
