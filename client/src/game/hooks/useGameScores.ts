import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

interface ScoreEntry {
  wallet: string;
  score: number;
  wave: number;
  timestamp: number;
}

interface PlayerStats {
  lifetimeScore: number;
  bestScore: number;
  gamesPlayed: number;
  rank: string;
}

const SCORES_KEY = 'guardian_game_scores';
const STATS_KEY = 'guardian_game_stats_';

export const RANKS = [
  { min: 0, title: 'Cadet', color: '#808080' },
  { min: 1000, title: 'Pilot', color: '#00ff88' },
  { min: 5000, title: 'Void Walker', color: '#00ffff' },
  { min: 15000, title: 'Star Commander', color: '#bf00ff' },
  { min: 50000, title: 'Fleet Admiral', color: '#ff8800' },
  { min: 100000, title: 'Based Eternal', color: '#ffd700' },
];

export function useGameScoresLocal() {
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [myStats, setMyStats] = useState<PlayerStats>({ lifetimeScore: 0, bestScore: 0, gamesPlayed: 0, rank: 'Cadet' });

  useEffect(() => {
    const scores = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    setLeaderboard(scores.sort((a: ScoreEntry, b: ScoreEntry) => b.score - a.score).slice(0, 10));

    if (address) {
      const stats = JSON.parse(localStorage.getItem(STATS_KEY + address.toLowerCase()) || 'null');
      if (stats) setMyStats(stats);
    }
  }, [address]);

  const submitScore = useCallback((score: number, wave: number) => {
    if (!address || score <= 0) return;

    const scores: ScoreEntry[] = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    scores.push({ wallet: address, score, wave, timestamp: Date.now() });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores.slice(0, 50)));
    setLeaderboard(scores.slice(0, 10));

    const statsKey = STATS_KEY + address.toLowerCase();
    const existing: PlayerStats = JSON.parse(localStorage.getItem(statsKey) || '{"lifetimeScore":0,"bestScore":0,"gamesPlayed":0,"rank":"Cadet"}');
    
    const newStats: PlayerStats = {
      lifetimeScore: existing.lifetimeScore + score,
      bestScore: Math.max(existing.bestScore, score),
      gamesPlayed: existing.gamesPlayed + 1,
      rank: RANKS.filter(r => existing.lifetimeScore + score >= r.min).pop()?.title || 'Cadet',
    };
    
    localStorage.setItem(statsKey, JSON.stringify(newStats));
    setMyStats(newStats);

    return newStats;
  }, [address]);

  const getGlobalRank = useCallback(() => {
    if (!address) return 0;
    const scores: ScoreEntry[] = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
    const myBest = scores.filter(s => s.wallet.toLowerCase() === address.toLowerCase())
      .sort((a, b) => b.score - a.score)[0];
    if (!myBest) return scores.length + 1;
    return scores.filter(s => s.score > myBest.score).length + 1;
  }, [address]);

  return { leaderboard, myStats, submitScore, getGlobalRank, RANKS };
}
