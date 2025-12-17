import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useIsGuardianHolder } from './useIsGuardianHolder';

const MAX_DAILY_PLAYS = 4;
const COOLDOWN_SECONDS = 30;
const STORAGE_KEY = 'guardian_game_access';

interface AccessState {
  canPlay: boolean;
  reason: string;
  playsRemaining: number;
  cooldownSeconds: number;
}

function getDeviceId(): string {
  const stored = localStorage.getItem('device_game_id');
  if (stored) return stored;
  
  const id = `${navigator.userAgent.length}_${screen.width}_${screen.height}_${new Date().getTimezoneOffset()}_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem('device_game_id', id);
  return id;
}

export function useGameAccess() {
  const { address, isConnected } = useAccount();
  const { isHolder, isLoading: holderLoading } = useIsGuardianHolder();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const checkAccess = useCallback((): AccessState => {
    const deviceId = getDeviceId();
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(STORAGE_KEY);
    let data = { date: today, plays: 0, lastPlay: 0, deviceId };

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === today && parsed.deviceId === deviceId) {
          data = parsed;
        }
      } catch {}
    }

    const playsRemaining = MAX_DAILY_PLAYS - data.plays;
    const elapsed = (Date.now() - data.lastPlay) / 1000;
    const cooldownSeconds = Math.max(0, Math.ceil(COOLDOWN_SECONDS - elapsed));

    if (playsRemaining <= 0) {
      return { 
        canPlay: false, 
        reason: 'Daily limit reached (resets at midnight)', 
        playsRemaining: 0, 
        cooldownSeconds: 0 
      };
    }
    
    if (cooldownSeconds > 0) {
      setCooldown(cooldownSeconds);
      return { 
        canPlay: false, 
        reason: `Wait ${cooldownSeconds}s`, 
        playsRemaining, 
        cooldownSeconds 
      };
    }

    return { canPlay: true, reason: 'Ready to play!', playsRemaining, cooldownSeconds: 0 };
  }, []);

  const recordPlay = useCallback(() => {
    const deviceId = getDeviceId();
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(STORAGE_KEY);
    let data = { date: today, plays: 1, lastPlay: Date.now(), deviceId };

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === today && parsed.deviceId === deviceId) {
          data.plays = parsed.plays + 1;
        }
      } catch {}
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setCooldown(COOLDOWN_SECONDS);
  }, []);

  const startSession = useCallback(async (): Promise<boolean> => {
    const access = checkAccess();
    if (!access.canPlay) return false;
    recordPlay();
    return true;
  }, [checkAccess, recordPlay]);

  return {
    checkAccess,
    startSession,
    recordPlay,
    isHolder,
    isLoading: holderLoading,
    isConnected,
    cooldown,
    holderPerks: isHolder ? {
      extraLife: true,
      scoreMultiplier: 1.5,
      specialShip: true,
    } : null,
  };
}
