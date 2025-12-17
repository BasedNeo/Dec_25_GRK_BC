import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useIsGuardianHolder } from './useIsGuardianHolder';

const MAX_DAILY_PLAYS = 9999; // TESTING: unlimited plays
const COOLDOWN_SECONDS = 0; // TESTING: no cooldown
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

function getAccessData() {
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
  return data;
}

export function useGameAccess() {
  const { isConnected } = useAccount();
  const { isHolder, isLoading: holderLoading } = useIsGuardianHolder();
  const [cooldown, setCooldown] = useState(() => {
    const data = getAccessData();
    const elapsed = (Date.now() - data.lastPlay) / 1000;
    return Math.max(0, Math.ceil(COOLDOWN_SECONDS - elapsed));
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(c => {
        const next = Math.max(0, c - 1);
        if (next === 0) setRefreshKey(k => k + 1);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown > 0]);

  const access = useMemo((): AccessState => {
    const data = getAccessData();
    const playsRemaining = MAX_DAILY_PLAYS - data.plays;
    
    if (playsRemaining <= 0) {
      return { 
        canPlay: false, 
        reason: 'Daily limit reached (resets at midnight)', 
        playsRemaining: 0, 
        cooldownSeconds: 0 
      };
    }
    
    if (cooldown > 0) {
      return { 
        canPlay: false, 
        reason: `Wait ${cooldown}s`, 
        playsRemaining, 
        cooldownSeconds: cooldown 
      };
    }

    return { canPlay: true, reason: 'Ready to play!', playsRemaining, cooldownSeconds: 0 };
  }, [cooldown, refreshKey]);

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

  return {
    access,
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
