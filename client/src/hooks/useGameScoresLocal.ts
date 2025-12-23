import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { SecureStorage } from '@/lib/secureStorage';
import { getLoreProgressStatic } from './useLoreProgress';
import { 
  GameType, 
  calculateEcosystemPoints, 
  validateScoreSubmission, 
  generateScoreChecksum,
  ECONOMY_CONFIG,
  getEconomySummary
} from '@/lib/gameRegistry';

interface ScoreEntry {
  wallet: string;
  score: number;
  ecosystemPoints: number;
  gameType: GameType;
  wave: number;
  timestamp: number;
}

interface PlayerStats {
  lifetimeScore: number;
  bestScore: number;
  gamesPlayed: number;
  rank: string;
  effectiveRank?: string;
  rankLocked?: boolean;
  lockReason?: string;
}

const SCORES_KEY = 'guardian_game_scores';
const STATS_KEY = 'guardian_game_stats_';

export const RANKS = [
  { min: 0, title: 'Cadet', color: '#808080', loreRequired: 0, gameRequired: false },
  { min: 1000, title: 'Pilot', color: '#00ff88', loreRequired: 0, gameRequired: false },
  { min: 5000, title: 'Void Walker', color: '#00ffff', loreRequired: 0, gameRequired: false },
  { min: 15000, title: 'Star Commander', color: '#bf00ff', loreRequired: 25, gameRequired: true },
  { min: 50000, title: 'Fleet Admiral', color: '#ff8800', loreRequired: 50, gameRequired: true },
  { min: 100000, title: 'Based Eternal', color: '#ffd700', loreRequired: 75, gameRequired: true },
];

function calculateEffectiveRank(lifetimeScore: number, gamesPlayed: number): { 
  rank: string; 
  effectiveRank: string; 
  locked: boolean; 
  lockReason?: string;
} {
  const loreProgress = getLoreProgressStatic();
  const scoreRank = RANKS.filter(r => lifetimeScore >= r.min).pop() || RANKS[0];
  const scoreRankIndex = RANKS.findIndex(r => r.title === scoreRank.title);
  
  if (scoreRankIndex <= 2) {
    return { 
      rank: scoreRank.title, 
      effectiveRank: scoreRank.title, 
      locked: false 
    };
  }
  
  if (scoreRank.gameRequired && gamesPlayed < 1) {
    const cappedRank = RANKS[2];
    return {
      rank: scoreRank.title,
      effectiveRank: cappedRank.title,
      locked: true,
      lockReason: 'Play Retro Defender at least once to unlock higher ranks'
    };
  }
  
  if (loreProgress.percentage < scoreRank.loreRequired) {
    let effectiveIndex = scoreRankIndex;
    for (let i = scoreRankIndex; i >= 0; i--) {
      if (loreProgress.percentage >= RANKS[i].loreRequired && (!RANKS[i].gameRequired || gamesPlayed >= 1)) {
        effectiveIndex = i;
        break;
      }
      effectiveIndex = i - 1;
    }
    effectiveIndex = Math.max(0, effectiveIndex);
    
    return {
      rank: scoreRank.title,
      effectiveRank: RANKS[effectiveIndex].title,
      locked: true,
      lockReason: `Discover ${scoreRank.loreRequired}% of lore to unlock ${scoreRank.title} (currently ${loreProgress.percentage}%)`
    };
  }
  
  return { 
    rank: scoreRank.title, 
    effectiveRank: scoreRank.title, 
    locked: false 
  };
}

export function useGameScoresLocal() {
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [myStats, setMyStats] = useState<PlayerStats>({ 
    lifetimeScore: 0, 
    bestScore: 0, 
    gamesPlayed: 0, 
    rank: 'Cadet',
    effectiveRank: 'Cadet',
    rankLocked: false
  });

  const refreshStats = useCallback(() => {
    if (address) {
      const stats = SecureStorage.get<PlayerStats>(STATS_KEY + address.toLowerCase());
      if (stats) {
        const rankInfo = calculateEffectiveRank(stats.lifetimeScore, stats.gamesPlayed);
        setMyStats({
          ...stats,
          rank: rankInfo.rank,
          effectiveRank: rankInfo.effectiveRank,
          rankLocked: rankInfo.locked,
          lockReason: rankInfo.lockReason
        });
      }
    }
  }, [address]);

  useEffect(() => {
    const scores = SecureStorage.get<ScoreEntry[]>(SCORES_KEY, []) || [];
    setLeaderboard(scores.sort((a: ScoreEntry, b: ScoreEntry) => b.score - a.score).slice(0, 10));
    refreshStats();
  }, [address, refreshStats]);

  useEffect(() => {
    // Only refresh on storage events, not constant polling
    const handleStorage = () => refreshStats();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshStats]);

  const submitScore = useCallback(async (
    score: number, 
    wave: number,
    gameType: GameType = 'space-defender',
    duration: number = 60
  ) => {
    if (!address || score <= 0) return;

    // Validate score submission
    const validation = validateScoreSubmission(gameType, score, duration);
    if (!validation.valid) {
      console.warn('[GameScores] Invalid score submission:', validation.reason);
    }

    // Calculate ecosystem points using the unified economy system
    const ecosystemPoints = calculateEcosystemPoints(gameType, score, 0);
    const timestamp = Date.now();
    const checksum = generateScoreChecksum(gameType, score, duration, timestamp);

    const scores: ScoreEntry[] = SecureStorage.get<ScoreEntry[]>(SCORES_KEY, []) || [];
    scores.push({ 
      wallet: address, 
      score, 
      ecosystemPoints,
      gameType,
      wave, 
      timestamp 
    });
    scores.sort((a, b) => b.ecosystemPoints - a.ecosystemPoints);
    SecureStorage.set(SCORES_KEY, scores.slice(0, 50));
    setLeaderboard(scores.slice(0, 10));

    const statsKey = STATS_KEY + address.toLowerCase();
    const existing: PlayerStats = SecureStorage.get<PlayerStats>(statsKey) || 
      { lifetimeScore: 0, bestScore: 0, gamesPlayed: 0, rank: 'Cadet' };
    
    // Use ecosystem points for lifetime score (economy currency)
    const newLifetimeScore = existing.lifetimeScore + ecosystemPoints;
    const newGamesPlayed = existing.gamesPlayed + 1;
    const rankInfo = calculateEffectiveRank(newLifetimeScore, newGamesPlayed);
    
    const newStats: PlayerStats = {
      lifetimeScore: newLifetimeScore,
      bestScore: Math.max(existing.bestScore, ecosystemPoints),
      gamesPlayed: newGamesPlayed,
      rank: rankInfo.rank,
      effectiveRank: rankInfo.effectiveRank,
      rankLocked: rankInfo.locked,
      lockReason: rankInfo.lockReason
    };
    
    SecureStorage.set(statsKey, newStats);
    setMyStats(newStats);

    try {
      const response = await fetch('/api/game/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          score: score,
          ecosystemPoints: ecosystemPoints,
          gameType: gameType,
          duration: duration,
          checksum: checksum,
          level: Math.min(Math.max(wave, 1), 5),
        })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('[GameScores] Server rejected score submission:', response.status, error);
      }
    } catch (err) {
      console.error('[GameScores] Failed to submit score to server:', err);
    }

    return { ...newStats, ecosystemPoints };
  }, [address]);

  const getGlobalRank = useCallback(() => {
    if (!address) return 0;
    const scores: ScoreEntry[] = SecureStorage.get<ScoreEntry[]>(SCORES_KEY, []) || [];
    const myBest = scores.filter(s => s.wallet.toLowerCase() === address.toLowerCase())
      .sort((a, b) => b.score - a.score)[0];
    if (!myBest) return scores.length + 1;
    return scores.filter(s => s.score > myBest.score).length + 1;
  }, [address]);

  // Get economy summary for a specific game result
  const getPointsSummary = useCallback((gameType: GameType, rawScore: number, streakDays: number = 0) => {
    return getEconomySummary(gameType, rawScore, streakDays);
  }, []);

  return { 
    leaderboard, 
    myStats, 
    submitScore, 
    getGlobalRank, 
    refreshStats, 
    getPointsSummary,
    RANKS,
    ECONOMY_CONFIG 
  };
}
