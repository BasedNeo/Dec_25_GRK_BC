import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useOwnedNFTs } from './useOwnedNFTs';

export interface CraftDefinition {
  name: string;
  tier: 'basic' | 'cooler' | 'premium';
  cost: number;
  nftRequired: number;
}

export interface UpgradeDefinition {
  name: string;
  description: string;
  cost: number;
  maxLevel: number;
}

export interface OwnedCraft {
  id: string;
  walletAddress: string;
  craftId: string;
  purchasedAt: string;
  source: string;
  upgrades: {
    engineLevel: number;
    thrusterLevel: number;
    shieldLevel: number;
  };
}

export interface RaceBet {
  id: string;
  walletAddress: string;
  craftId: string;
  betAmountOre: number;
  betStatus: string;
  outcome?: string;
  brainxAwarded: number;
  distanceReached?: number;
  raceStartedAt: string;
  completedAt?: string;
}

export interface InfinityRaceState {
  crafts: OwnedCraft[];
  racesToday: number;
  racesRemaining: number;
  activeBet: RaceBet | null;
  raceHistory: RaceBet[];
  craftDefinitions: Record<string, CraftDefinition>;
  upgradeDefinitions: Record<string, UpgradeDefinition>;
  maxBet: number;
  dailyLimit: number;
}

export function useInfinityRace() {
  const { address } = useAccount();
  const { nfts } = useOwnedNFTs();
  const nftCount = nfts?.length || 0;
  
  const [state, setState] = useState<InfinityRaceState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oreBalance, setOreBalance] = useState(0);

  const fetchState = useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [stateRes, balanceRes] = await Promise.all([
        fetch(`/api/infinity-race/state/${address}`),
        fetch(`/api/points/balance/${address}`)
      ]);
      
      if (stateRes.ok) {
        const data = await stateRes.json();
        setState(data);
      }
      
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        setOreBalance(balanceData.totalEarned || 0);
      }
    } catch (err) {
      console.error('[InfinityRace] Failed to fetch state:', err);
      setError('Failed to load race data');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const buyCraft = useCallback(async (craftId: string): Promise<{ success: boolean; error?: string }> => {
    if (!address) return { success: false, error: 'Wallet not connected' };
    
    try {
      const res = await fetch('/api/infinity-race/buy-craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, craftId, nftCount })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        return { success: false, error: data.error || 'Purchase failed' };
      }
      
      await fetchState();
      return { success: true };
    } catch (err) {
      console.error('[InfinityRace] Buy craft failed:', err);
      return { success: false, error: 'Network error' };
    }
  }, [address, nftCount, fetchState]);

  const upgradeCraft = useCallback(async (
    craftId: string, 
    upgradeType: 'engine' | 'thruster' | 'shield'
  ): Promise<{ success: boolean; error?: string; newLevel?: number }> => {
    if (!address) return { success: false, error: 'Wallet not connected' };
    
    try {
      const res = await fetch('/api/infinity-race/upgrade-craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, craftId, upgradeType })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        return { success: false, error: data.error || 'Upgrade failed' };
      }
      
      await fetchState();
      return { success: true, newLevel: data.newLevel };
    } catch (err) {
      console.error('[InfinityRace] Upgrade craft failed:', err);
      return { success: false, error: 'Network error' };
    }
  }, [address, fetchState]);

  const startRace = useCallback(async (
    craftId: string, 
    betAmountOre: number
  ): Promise<{ success: boolean; raceId?: string; error?: string }> => {
    if (!address) return { success: false, error: 'Wallet not connected' };
    
    try {
      const res = await fetch('/api/infinity-race/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, craftId, betAmountOre })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to start race' };
      }
      
      await fetchState();
      return { success: true, raceId: data.raceId };
    } catch (err) {
      console.error('[InfinityRace] Start race failed:', err);
      return { success: false, error: 'Network error' };
    }
  }, [address, fetchState]);

  const completeRace = useCallback(async (
    raceId: string,
    won: boolean,
    distanceReached: number
  ): Promise<{ success: boolean; brainxAwarded?: number; error?: string }> => {
    if (!address) return { success: false, error: 'Wallet not connected' };
    
    try {
      const res = await fetch('/api/infinity-race/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, raceId, won, distanceReached })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to complete race' };
      }
      
      await fetchState();
      return { success: true, brainxAwarded: data.brainxAwarded };
    } catch (err) {
      console.error('[InfinityRace] Complete race failed:', err);
      return { success: false, error: 'Network error' };
    }
  }, [address, fetchState]);

  const hasCraft = useCallback((craftId: string): boolean => {
    return state?.crafts.some(c => c.craftId === craftId) || false;
  }, [state]);

  const getCraftUpgrades = useCallback((craftId: string) => {
    const craft = state?.crafts.find(c => c.craftId === craftId);
    return craft?.upgrades || { engineLevel: 0, thrusterLevel: 0, shieldLevel: 0 };
  }, [state]);

  const canAfford = useCallback((cost: number): boolean => {
    return oreBalance >= cost;
  }, [oreBalance]);

  const meetsNftRequirement = useCallback((required: number): boolean => {
    return nftCount >= required;
  }, [nftCount]);

  return {
    state,
    loading,
    error,
    oreBalance,
    nftCount,
    buyCraft,
    upgradeCraft,
    startRace,
    completeRace,
    hasCraft,
    getCraftUpgrades,
    canAfford,
    meetsNftRequirement,
    refresh: fetchState
  };
}
