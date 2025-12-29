import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useWebSocket } from './useWebSocket';

export interface GamePointsBalance {
  game: string;
  earned: number;
  vested: number;
  dailyEarned: number;
  dailyCap: number;
}

export interface PointsSummary {
  totalEarned: number;
  totalVested: number;
  brainXLocked: number;
  brainXUnlocked: number;
  dailyEarnedTotal: number;
  globalDailyCap: number;
  vestingProgress: number;
  vestingEndDate: string | null;
  games: GamePointsBalance[];
}

interface EarnPointsResult {
  success: boolean;
  earned: number;
  dailyTotal: number;
  dailyCap: number;
  globalDailyTotal: number;
  capped: boolean;
  totalEarned: number;
  vestedBrainX: number;
  brainXProgress: number;
}

export type GameType = 'riddle-quest' | 'creature-command' | 'retro-defender' | 'infinity-race' | 'guardian-defense';

const POINTS_CONFIG: Record<GameType, { dailyCap: number; actions: Record<string, number> }> = {
  'riddle-quest': { dailyCap: 500, actions: { riddle: 10, challenge: 50 } },
  'creature-command': { dailyCap: 500, actions: { wave: 10, lairs: 50 } },
  'retro-defender': { dailyCap: 200, actions: { pad: 20, task: 50 } },
  'infinity-race': { dailyCap: 500, actions: { race_win: 50, race_partial: 10, brainx_award: 100 } },
  'guardian-defense': { dailyCap: 500, actions: { wave: 10, lairs: 50, combo: 25 } }
};

export function useGamePoints() {
  const { address } = useAccount();
  const [balance, setBalance] = useState<PointsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string>(
    typeof window !== 'undefined' 
      ? localStorage.getItem('anon_session_id') || crypto.randomUUID()
      : crypto.randomUUID()
  );
  
  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('anon_session_id')) {
      localStorage.setItem('anon_session_id', sessionIdRef.current);
    }
  }, []);
  
  const walletOrSession = address?.toLowerCase() || `anon:${sessionIdRef.current}`;
  
  const { isConnected, on } = useWebSocket({
    walletAddress: address,
    rooms: ['leaderboard']
  });
  
  useEffect(() => {
    const unsubPoints = on('points_update', (data) => {
      console.log('[WS] Received points_update:', data);
      setBalance(prev => {
        if (!prev) return prev;
        
        const updatedGames = prev.games.map(g => 
          g.game === data.game 
            ? { ...g, earned: g.earned + data.earned, dailyEarned: data.dailyTotal }
            : g
        );
        
        return {
          ...prev,
          totalEarned: data.totalEarned,
          dailyEarnedTotal: data.dailyTotal,
          games: updatedGames,
          vestingProgress: data.brainXProgress
        };
      });
    });
    
    const unsubVesting = on('vesting_update', (data) => {
      console.log('[WS] Received vesting_update:', data);
      setBalance(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          brainXLocked: prev.brainXLocked + data.brainXVested,
          vestingEndDate: data.lockEndDate
        };
      });
    });
    
    const unsubLeaderboard = on('leaderboard_update', (data) => {
      console.log('[WS] Received leaderboard_update:', data);
    });
    
    return () => {
      unsubPoints();
      unsubVesting();
      unsubLeaderboard();
    };
  }, [on]);
  
  const fetchBalance = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/points/balance/${encodeURIComponent(walletOrSession)}`);
      if (!response.ok) throw new Error('Failed to fetch balance');
      
      const data = await response.json();
      setBalance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [walletOrSession]);
  
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);
  
  const earnPoints = useCallback(async (
    game: GameType,
    action: string
  ): Promise<EarnPointsResult> => {
    const config = POINTS_CONFIG[game];
    
    try {
      const response = await fetch('/api/points/earn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: walletOrSession,
          game,
          action
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to earn points');
      }
      
      const result: EarnPointsResult = await response.json();
      
      setBalance(prev => {
        if (!prev) return prev;
        
        const existingGame = prev.games.find(g => g.game === game);
        const updatedGames = existingGame
          ? prev.games.map(g => g.game === game 
              ? { ...g, earned: g.earned + result.earned, dailyEarned: result.dailyTotal }
              : g)
          : [...prev.games, { game, earned: result.earned, vested: 0, dailyEarned: result.dailyTotal, dailyCap: config.dailyCap }];
        
        return {
          ...prev,
          totalEarned: result.totalEarned,
          dailyEarnedTotal: result.globalDailyTotal,
          games: updatedGames,
          vestingProgress: result.brainXProgress
        };
      });
      
      return result;
    } catch (err) {
      console.error('[Points] Earn error:', err);
      return {
        success: false,
        earned: 0,
        dailyTotal: balance?.dailyEarnedTotal || 0,
        dailyCap: config.dailyCap,
        globalDailyTotal: balance?.dailyEarnedTotal || 0,
        capped: true,
        totalEarned: balance?.totalEarned || 0,
        vestedBrainX: 0,
        brainXProgress: balance?.vestingProgress || 0
      };
    }
  }, [walletOrSession, balance]);
  
  const vestPoints = useCallback(async (): Promise<{
    success: boolean;
    brainXVested?: number;
    lockEndDate?: string;
    error?: string;
  }> => {
    try {
      const response = await fetch('/api/brainx/vest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: walletOrSession })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to vest points');
      }
      
      const result = await response.json();
      await fetchBalance();
      
      return { success: true, ...result };
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      };
    }
  }, [walletOrSession, fetchBalance]);
  
  const getGameBalance = useCallback((game: string): GamePointsBalance | null => {
    return balance?.games.find(g => g.game === game) || null;
  }, [balance]);
  
  const formatPoints = useCallback((points: number): string => {
    return points.toLocaleString();
  }, []);
  
  return {
    balance,
    isLoading,
    error,
    isConnected,
    earnPoints,
    vestPoints,
    getGameBalance,
    formatPoints,
    refetch: fetchBalance,
    POINTS_CONFIG
  };
}
