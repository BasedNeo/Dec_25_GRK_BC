import { useState, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useIsGuardianHolder } from './useIsGuardianHolder';

const MAX_DAILY_PLAYS = 10;
const COOLDOWN_SECONDS = 30;
const STORAGE_KEY = 'guardian_game_access';

interface AccessState {
  canPlay: boolean;
  reason: string;
  playsRemaining: number;
  cooldownSeconds: number;
}

export function useGameAccess() {
  const { address, isConnected } = useAccount();
  const { isHolder, isLoading: holderLoading } = useIsGuardianHolder();
  const { signMessageAsync } = useSignMessage();
  const [sessionActive, setSessionActive] = useState(false);

  const checkAccess = useCallback((): AccessState => {
    if (!isConnected) return { canPlay: false, reason: 'Connect wallet', playsRemaining: 0, cooldownSeconds: 0 };
    if (!isHolder) return { canPlay: false, reason: 'Own a Guardian NFT to play', playsRemaining: 0, cooldownSeconds: 0 };

    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(STORAGE_KEY);
    let data = { date: today, plays: 0, lastPlay: 0, wallet: address?.toLowerCase() };

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === today && parsed.wallet === address?.toLowerCase()) {
          data = parsed;
        }
      } catch {}
    }

    const playsRemaining = MAX_DAILY_PLAYS - data.plays;
    const elapsed = (Date.now() - data.lastPlay) / 1000;
    const cooldownSeconds = Math.max(0, Math.ceil(COOLDOWN_SECONDS - elapsed));

    if (playsRemaining <= 0) return { canPlay: false, reason: 'Daily limit reached (resets at midnight)', playsRemaining: 0, cooldownSeconds: 0 };
    if (cooldownSeconds > 0) return { canPlay: false, reason: `Wait ${cooldownSeconds}s`, playsRemaining, cooldownSeconds };

    return { canPlay: true, reason: 'Ready', playsRemaining, cooldownSeconds: 0 };
  }, [isConnected, isHolder, address]);

  const startSession = useCallback(async (): Promise<boolean> => {
    if (!address) return false;
    
    try {
      const message = `Start Guardian Defender\nWallet: ${address}\nTime: ${Date.now()}`;
      await signMessageAsync({ message });
      setSessionActive(true);
      return true;
    } catch {
      return false;
    }
  }, [address, signMessageAsync]);

  const recordPlay = useCallback(() => {
    if (!address) return;
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(STORAGE_KEY);
    let data = { date: today, plays: 1, lastPlay: Date.now(), wallet: address.toLowerCase() };

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === today && parsed.wallet === address.toLowerCase()) {
          data.plays = parsed.plays + 1;
        }
      } catch {}
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [address]);

  return {
    checkAccess,
    startSession,
    recordPlay,
    sessionActive,
    isHolder,
    isLoading: holderLoading,
    isConnected,
  };
}
