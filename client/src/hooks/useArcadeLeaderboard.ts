import { useState, useEffect, useCallback } from 'react';

export interface LeaderboardEntry {
  displayName: string;
  score: number;
  game: string;
  date: string;
  // Legacy support for old entries
  initials?: string;
}

export interface DailyChallenge {
  game: string;
  targetScore: number;
  description: string;
  completed: boolean;
  date: string;
}

export interface PersonalStats {
  totalGamesPlayed: number;
  totalTimePlayed: number;
  bestScores: Record<string, number>;
  gamesPerType: Record<string, number>;
  lastPlayed: string | null;
  streakDays: number;
  dailyChallengesCompleted: number;
}

const LEADERBOARD_KEY = 'arcade_leaderboard_v2';
const PERSONAL_STATS_KEY = 'arcade_personal_stats';
const DAILY_CHALLENGE_KEY = 'arcade_daily_challenge';
const PLAYER_INITIALS_KEY = 'arcade_player_initials';

const GAMES = ['ring-game', 'asteroid-mining', 'cyber-breach'];

const DAILY_CHALLENGES = [
  { game: 'ring-game', targetScore: 500, description: 'Score 500+ in Ring Game' },
  { game: 'asteroid-mining', targetScore: 1000, description: 'Score 1000+ in Space Shooter' },
  { game: 'cyber-breach', targetScore: 800, description: 'Score 800+ in Cyber Breach' },
  { game: 'ring-game', targetScore: 1000, description: 'Score 1000+ in Ring Game' },
  { game: 'asteroid-mining', targetScore: 2000, description: 'Score 2000+ in Space Shooter' },
  { game: 'cyber-breach', targetScore: 1500, description: 'Score 1500+ in Cyber Breach' },
  { game: 'ring-game', targetScore: 2000, description: 'Reach Transcendent in Ring Game' },
];

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getLeaderboard(): LeaderboardEntry[] {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    let entries: LeaderboardEntry[] = [];
    
    if (data) {
      entries = JSON.parse(data);
    } else {
      const oldData = localStorage.getItem('arcade_leaderboard');
      if (oldData) {
        entries = JSON.parse(oldData);
      }
    }
    
    // Migrate legacy entries: if entry has initials but no displayName, use initials as displayName
    return entries.map(entry => ({
      ...entry,
      displayName: entry.displayName || entry.initials || 'Guardian'
    }));
  } catch {
    return [];
  }
}

function saveLeaderboard(entries: LeaderboardEntry[]) {
  const perGameEntries: LeaderboardEntry[] = [];
  
  GAMES.forEach(game => {
    const gameEntries = entries
      .filter(e => e.game === game)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    perGameEntries.push(...gameEntries);
  });
  
  const otherEntries = entries
    .filter(e => !GAMES.includes(e.game))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  perGameEntries.push(...otherEntries);
  
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(perGameEntries));
}

function getPersonalStats(): PersonalStats {
  try {
    const data = localStorage.getItem(PERSONAL_STATS_KEY);
    return data ? JSON.parse(data) : {
      totalGamesPlayed: 0,
      totalTimePlayed: 0,
      bestScores: {},
      gamesPerType: {},
      lastPlayed: null,
      streakDays: 0,
      dailyChallengesCompleted: 0,
    };
  } catch {
    return {
      totalGamesPlayed: 0,
      totalTimePlayed: 0,
      bestScores: {},
      gamesPerType: {},
      lastPlayed: null,
      streakDays: 0,
      dailyChallengesCompleted: 0,
    };
  }
}

function savePersonalStats(stats: PersonalStats) {
  localStorage.setItem(PERSONAL_STATS_KEY, JSON.stringify(stats));
}

function getDailyChallenge(): DailyChallenge {
  try {
    const data = localStorage.getItem(DAILY_CHALLENGE_KEY);
    if (data) {
      const challenge = JSON.parse(data);
      if (challenge.date === getTodayString()) {
        return challenge;
      }
    }
  } catch {}
  
  const today = getTodayString();
  const dayIndex = new Date().getDay();
  const challenge = DAILY_CHALLENGES[dayIndex % DAILY_CHALLENGES.length];
  const newChallenge: DailyChallenge = {
    ...challenge,
    completed: false,
    date: today,
  };
  localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(newChallenge));
  return newChallenge;
}

function saveDailyChallenge(challenge: DailyChallenge) {
  localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(challenge));
}

export function useArcadeLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [personalStats, setPersonalStats] = useState<PersonalStats>(getPersonalStats());
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge>(getDailyChallenge());
  const [playerInitials, setPlayerInitials] = useState<string>(() => {
    return localStorage.getItem(PLAYER_INITIALS_KEY) || '';
  });

  useEffect(() => {
    setLeaderboard(getLeaderboard());
  }, []);

  const saveInitials = useCallback((displayName: string) => {
    localStorage.setItem(PLAYER_INITIALS_KEY, displayName);
    setPlayerInitials(displayName);
    return displayName;
  }, []);

  const submitScore = useCallback((game: string, score: number, playerDisplayName?: string) => {
    const displayName = playerDisplayName || playerInitials || 'Guardian';
    const today = getTodayString();
    
    const entries = getLeaderboard();
    const newEntry: LeaderboardEntry = {
      displayName,
      score,
      game,
      date: today,
    };
    
    entries.push(newEntry);
    saveLeaderboard(entries);
    const savedEntries = getLeaderboard();
    setLeaderboard(savedEntries);
    
    const gameEntries = savedEntries
      .filter(e => e.game === game)
      .sort((a, b) => b.score - a.score);
    const rank = gameEntries.findIndex(e => e.score === score && e.displayName === newEntry.displayName && e.date === today) + 1;
    
    const stats = getPersonalStats();
    stats.totalGamesPlayed += 1;
    stats.gamesPerType[game] = (stats.gamesPerType[game] || 0) + 1;
    if (!stats.bestScores[game] || score > stats.bestScores[game]) {
      stats.bestScores[game] = score;
    }
    
    if (stats.lastPlayed !== today) {
      if (stats.lastPlayed) {
        const lastDate = new Date(stats.lastPlayed);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          stats.streakDays += 1;
        } else if (diffDays > 1) {
          stats.streakDays = 1;
        }
      } else {
        stats.streakDays = 1;
      }
    }
    stats.lastPlayed = today;
    
    savePersonalStats(stats);
    setPersonalStats(stats);
    
    const challenge = getDailyChallenge();
    if (!challenge.completed && challenge.game === game && score >= challenge.targetScore) {
      challenge.completed = true;
      stats.dailyChallengesCompleted += 1;
      saveDailyChallenge(challenge);
      savePersonalStats(stats);
      setDailyChallenge(challenge);
      setPersonalStats(stats);
    }
    
    return { rank: rank > 0 && rank <= 10 ? rank : null, isNewBest: stats.bestScores[game] === score };
  }, [playerInitials]);

  const getGameLeaderboard = useCallback((game: string, limit = 10) => {
    return leaderboard
      .filter(e => e.game === game)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }, [leaderboard]);

  const getTopScores = useCallback((limit = 10) => {
    return [...leaderboard]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }, [leaderboard]);

  return {
    leaderboard,
    personalStats,
    dailyChallenge,
    playerInitials,
    saveInitials,
    submitScore,
    getGameLeaderboard,
    getTopScores,
  };
}
