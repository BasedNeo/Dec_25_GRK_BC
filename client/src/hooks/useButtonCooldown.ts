import { useState, useCallback, useRef } from 'react';

interface UseCooldownOptions {
  cooldownMs?: number;
}

export function useButtonCooldown(options: UseCooldownOptions = {}) {
  const { cooldownMs = 5000 } = options;
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCooldown = useCallback(() => {
    setIsCoolingDown(true);
    setRemainingTime(Math.ceil(cooldownMs / 1000));

    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = setTimeout(() => {
      setIsCoolingDown(false);
      setRemainingTime(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }, cooldownMs);
  }, [cooldownMs]);

  const wrapAction = useCallback(<T extends (...args: any[]) => any>(action: T) => {
    return ((...args: Parameters<T>) => {
      if (isCoolingDown) return;
      startCooldown();
      return action(...args);
    }) as T;
  }, [isCoolingDown, startCooldown]);

  return {
    isCoolingDown,
    remainingTime,
    startCooldown,
    wrapAction,
  };
}

const actionCooldowns = new Map<string, number>();
const GLOBAL_COOLDOWN_MS = 5000;

export function isActionOnCooldown(actionId: string): boolean {
  const lastAction = actionCooldowns.get(actionId);
  if (!lastAction) return false;
  return Date.now() - lastAction < GLOBAL_COOLDOWN_MS;
}

export function markActionUsed(actionId: string): void {
  actionCooldowns.set(actionId, Date.now());
}

export function getRemainingCooldown(actionId: string): number {
  const lastAction = actionCooldowns.get(actionId);
  if (!lastAction) return 0;
  const remaining = GLOBAL_COOLDOWN_MS - (Date.now() - lastAction);
  return Math.max(0, Math.ceil(remaining / 1000));
}
