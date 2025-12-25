import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

export interface RiddleLeaderboardEntry {
  id: number;
  walletAddress: string;
  totalSolves: number;
  dailySolves: number;
  bestTimeMs: number | null;
  totalTimeMs: number | null;
  currentStreak: number;
  longestStreak: number;
  level: number;
  points: number;
  lastActiveAt: string;
  createdAt: string;
}

export interface DailyRiddle {
  id: number;
  index: number;
  question: string;
  hint: string | null;
  difficulty: string;
  theme: string | null;
  isOracle: boolean;
}

export interface DailySetResponse {
  dateKey: string;
  setId: number;
  generatedViaOracle: boolean;
  riddleCount: number;
  riddles: DailyRiddle[];
}

export interface RiddleAttempt {
  id: number;
  walletAddress: string;
  riddleEntryId: number;
  dateKey: string;
  attemptCount: number;
  solved: boolean;
  solveTimeMs: number | null;
  pointsEarned: number;
  attemptedAt: string;
  solvedAt: string | null;
}

export interface DailyProgressResponse {
  dateKey: string;
  attempts: RiddleAttempt[];
  solved: number;
  total: number;
}

export interface AttemptResult {
  success: boolean;
  isCorrect?: boolean;
  pointsEarned?: number;
  message: string;
  alreadySolved?: boolean;
}

export function useRiddleLeaderboard(limit: number = 50) {
  return useQuery<RiddleLeaderboardEntry[]>({
    queryKey: ['riddle-leaderboard', limit],
    queryFn: async () => {
      const res = await fetch(`/api/riddle-quest/leaderboard?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: 60000
  });
}

export function useRiddleStats(walletAddress?: string) {
  return useQuery<{ exists: boolean; stats: RiddleLeaderboardEntry | null }>({
    queryKey: ['riddle-stats', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return { exists: false, stats: null };
      const res = await fetch(`/api/riddle-quest/stats/${walletAddress}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    enabled: !!walletAddress,
    staleTime: 15000
  });
}

export function useDailyRiddles() {
  return useQuery<DailySetResponse>({
    queryKey: ['daily-riddles'],
    queryFn: async () => {
      const res = await fetch('/api/riddle-quest/daily');
      if (!res.ok) throw new Error('Failed to fetch daily riddles');
      return res.json();
    },
    staleTime: 5 * 60 * 1000
  });
}

export function useDailyProgress(walletAddress?: string) {
  return useQuery<DailyProgressResponse>({
    queryKey: ['daily-progress', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return { dateKey: '', attempts: [], solved: 0, total: 0 };
      const res = await fetch(`/api/riddle-quest/daily/progress/${walletAddress}`);
      if (!res.ok) throw new Error('Failed to fetch progress');
      return res.json();
    },
    enabled: !!walletAddress,
    staleTime: 10000
  });
}

export function useSubmitRiddleAttempt() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation<AttemptResult, Error, {
    riddleEntryId: number;
    answer: string;
    solveTimeMs?: number;
    isOracle?: boolean;
  }>({
    mutationFn: async ({ riddleEntryId, answer, solveTimeMs, isOracle }) => {
      const res = await fetch('/api/riddle-quest/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          riddleEntryId,
          answer,
          solveTimeMs,
          isOracle
        })
      });
      if (!res.ok) throw new Error('Failed to submit attempt');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-progress', address] });
      queryClient.invalidateQueries({ queryKey: ['riddle-stats', address] });
      queryClient.invalidateQueries({ queryKey: ['riddle-leaderboard'] });
    }
  });
}

export function usePlayerRank(walletAddress?: string) {
  const { data: leaderboard } = useRiddleLeaderboard(100);
  
  if (!walletAddress || !leaderboard) return null;
  
  const rank = leaderboard.findIndex(
    e => e.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
  
  return rank >= 0 ? rank + 1 : null;
}
