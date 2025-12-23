import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

interface GameScore {
  id: string;
  walletAddress: string;
  customName: string | null;
  score: number;
  level: number;
  lifetimeScore: number;
  gamesPlayed: number;
  highScore: number;
  rank: string;
  updatedAt: string;
}

export function useGameLeaderboard(limit: number = 20) {
  return useQuery<GameScore[]>({
    queryKey: ['game-leaderboard', limit],
    queryFn: async () => {
      const res = await fetch(`/api/game/leaderboard?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return res.json();
    },
    refetchInterval: 30000,
    staleTime: 15000,
    gcTime: 2 * 60 * 1000, // 2min garbage collection
  });
}

export function usePlayerGameStats() {
  const { address, isConnected } = useAccount();
  
  return useQuery<{ exists: boolean; stats: GameScore | null }>({
    queryKey: ['player-game-stats', address],
    queryFn: async () => {
      if (!address) throw new Error('No wallet connected');
      const res = await fetch(`/api/game/stats/${address}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: isConnected && !!address,
    staleTime: 10000,
    gcTime: 2 * 60 * 1000, // 2min garbage collection
  });
}

export function useSubmitGameScore() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  
  return useMutation({
    mutationFn: async (data: { score: number; level: number; customName?: string }) => {
      if (!address) throw new Error('No wallet connected');
      
      const res = await fetch('/api/game/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          score: data.score,
          level: data.level,
          customName: data.customName,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to submit score');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['player-game-stats'] });
    },
  });
}
