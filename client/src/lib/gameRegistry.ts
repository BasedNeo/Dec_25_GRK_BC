import { LucideIcon } from 'lucide-react';
import { Target, Spade, Shield, Rocket, Zap, Circle, Brain } from 'lucide-react';

/**
 * Unique identifier for each game in the platform
 */
export type GameType = 'riddle-quest' | 'guardian-defense' | 'guardian-solitaire' | 'space-defender' | 'asteroid-mining' | 'cyber-breach' | 'ring-game';

/**
 * Game difficulty levels
 */
export type GameDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Game categories for filtering and organization
 */
export type GameCategory = 'action' | 'strategy' | 'puzzle';

/**
 * Performance tiers for score evaluation
 */
export type PerformanceTier = 'beginner' | 'good' | 'great' | 'legendary';

/**
 * Scoring configuration for each game
 * Used for normalization and performance evaluation
 */
export interface ScoringConfig {
  maxScore: number;        // Theoretical maximum (for 0-100% normalization)
  goodScore: number;       // 60th percentile target
  greatScore: number;      // 85th percentile target  
  legendaryScore: number;  // 95th percentile target
}

/**
 * Complete game configuration
 * All metadata needed to render, route, and evaluate a game
 */
export interface GameConfig {
  // Identity
  id: GameType;
  name: string;
  description: string;
  
  // Routing
  path: string;
  
  // UI/UX
  icon: LucideIcon;
  iconColor: string;
  thumbnailGradient: string; // Tailwind gradient classes
  
  // Metadata
  category: GameCategory;
  difficulty: GameDifficulty;
  averagePlayTime: number; // seconds
  
  // Game Rules
  maxPlaysPerDay: number;
  enabled: boolean;
  
  // Scoring
  scoring: ScoringConfig;
  
  // Optional features
  features?: {
    hasTimer?: boolean;
    hasMoves?: boolean;
    hasLives?: boolean;
    hasCombo?: boolean;
    hasUndo?: boolean;
  };
  
  // Access control
  nftRequired: boolean;
  thumbnail?: string; // for arcade hub
  hidden?: boolean; // Hide from arcade UI but preserve code
}

/**
 * GAME REGISTRY
 * Add new games here - single source of truth
 */
export const GAME_REGISTRY: Record<GameType, GameConfig> = {
  'riddle-quest': {
    id: 'riddle-quest',
    name: 'Riddle Quest',
    description: 'Solve cosmic riddles to unlock the Based Universe. 2 plays/day.',
    path: '/games/riddle-quest',
    icon: Brain,
    iconColor: 'text-cyan-400',
    thumbnailGradient: 'from-cyan-400 to-purple-600',
    category: 'puzzle',
    difficulty: 'medium',
    averagePlayTime: 300,
    maxPlaysPerDay: 2,
    enabled: true,
    scoring: {
      maxScore: 10000,
      goodScore: 2000,
      greatScore: 5000,
      legendaryScore: 8000,
    },
    features: {
      hasTimer: false,
      hasMoves: false,
      hasLives: false,
      hasCombo: false,
    },
    nftRequired: true,
  },
  
  'guardian-defense': {
    id: 'guardian-defense',
    name: 'Creature Command',
    description: 'Command the legendary Based Creatures to defend their homeworld! Lead the Neon Jaguar, Cyber Serpent, and other mythical guardians against the incoming swarm. Chain creature powers for devastating combos!',
    path: '/games/guardian-defense',
    icon: Target,
    iconColor: 'text-cyan-400',
    thumbnailGradient: 'from-indigo-500 to-purple-600',
    category: 'action',
    difficulty: 'medium',
    averagePlayTime: 300,
    maxPlaysPerDay: 10,
    enabled: true,
    scoring: {
      maxScore: 50000,
      goodScore: 8000,
      greatScore: 25000,
      legendaryScore: 40000,
    },
    features: {
      hasTimer: false,
      hasMoves: false,
      hasLives: true,
      hasCombo: true,
    },
    nftRequired: true,
  },
  
  'guardian-solitaire': {
    id: 'guardian-solitaire',
    name: 'Guardian Solitaire',
    description: 'Premium Klondike Solitaire using Guardian NFT images as playing cards. Strategy meets style.',
    path: '/games/guardian-solitaire',
    icon: Spade,
    iconColor: 'text-cyan-400',
    thumbnailGradient: 'from-cyan-500 to-blue-600',
    category: 'strategy',
    difficulty: 'medium',
    averagePlayTime: 300,
    maxPlaysPerDay: 10,
    enabled: true,
    scoring: {
      maxScore: 50000,
      goodScore: 12000,
      greatScore: 20000,
      legendaryScore: 35000,
    },
    features: {
      hasTimer: true,
      hasMoves: true,
      hasUndo: true,
      hasCombo: true,
    },
    nftRequired: false,
    hidden: true,
  },
  
  'space-defender': {
    id: 'space-defender',
    name: 'Retro Defender',
    description: 'Defend the Based Galaxy from alien invaders! Classic arcade shooter with waves, power-ups, and lunar lander bonus stages.',
    path: '/game',
    icon: Shield,
    iconColor: 'text-purple-400',
    thumbnailGradient: 'from-purple-500 to-cyan-600',
    category: 'action',
    difficulty: 'medium',
    averagePlayTime: 180,
    maxPlaysPerDay: 10,
    enabled: true,
    scoring: {
      maxScore: 100000,
      goodScore: 5000,
      greatScore: 15000,
      legendaryScore: 50000,
    },
    features: {
      hasTimer: false,
      hasLives: true,
      hasCombo: false,
    },
    nftRequired: true,
  },
  
  'asteroid-mining': {
    id: 'asteroid-mining',
    name: 'Asteroid Mining',
    description: 'Pilot your Guardian ship through endless asteroid fields! Destroy asteroids, collect resources, and survive as long as possible.',
    path: '/games/asteroid-mining',
    icon: Rocket,
    iconColor: 'text-orange-400',
    thumbnailGradient: 'from-orange-500 to-yellow-600',
    category: 'action',
    difficulty: 'medium',
    averagePlayTime: 180,
    maxPlaysPerDay: 10,
    enabled: true,
    scoring: {
      maxScore: 50000,
      goodScore: 5000,
      greatScore: 20000,
      legendaryScore: 40000,
    },
    features: {
      hasTimer: true,
      hasLives: true,
      hasCombo: true,
    },
    nftRequired: true,
    hidden: true,
  },
  
  'cyber-breach': {
    id: 'cyber-breach',
    name: 'Cyber Breach',
    description: 'Memory match hacking challenge! Flip cards to find matching pairs and breach the FUD mainframe. Clear all 3 security levels before time runs out. Fast matches earn bonus points!',
    path: '/games/cyber-breach',
    icon: Zap,
    iconColor: 'text-cyan-400',
    thumbnailGradient: 'from-cyan-500 to-green-500',
    category: 'puzzle',
    difficulty: 'medium',
    averagePlayTime: 180,
    maxPlaysPerDay: 10,
    enabled: true,
    scoring: {
      maxScore: 50000,
      goodScore: 8000,
      greatScore: 20000,
      legendaryScore: 40000,
    },
    features: {
      hasTimer: true,
      hasMoves: true,
      hasLives: false,
      hasCombo: false,
    },
    nftRequired: true,
    hidden: true,
  },
  
  'ring-game': {
    id: 'ring-game',
    name: 'Ring Game',
    description: 'Align the rings with perfect timing! Inspired by Apple Watch Ring-O. Tap when the gaps align to progress through increasingly difficult levels.',
    path: '/games/ring-game',
    icon: Circle,
    iconColor: 'text-purple-400',
    thumbnailGradient: 'from-purple-500 to-cyan-500',
    category: 'action',
    difficulty: 'easy',
    averagePlayTime: 120,
    maxPlaysPerDay: 15,
    enabled: true,
    scoring: {
      maxScore: 50000,
      goodScore: 5000,
      greatScore: 15000,
      legendaryScore: 30000,
    },
    features: {
      hasTimer: false,
      hasLives: true,
      hasCombo: true,
    },
    nftRequired: false,
    hidden: true,
  },
};

/**
 * Get configuration for a specific game
 */
export function getGameConfig(gameId: GameType): GameConfig {
  const config = GAME_REGISTRY[gameId];
  if (!config) {
    throw new Error(`Game configuration not found: ${gameId}`);
  }
  return config;
}

/**
 * Get all game configurations
 */
export function getAllGames(): GameConfig[] {
  return Object.values(GAME_REGISTRY);
}

/**
 * Get only enabled games (ready to play, not hidden)
 */
export function getEnabledGames(): GameConfig[] {
  return Object.values(GAME_REGISTRY).filter(g => g.enabled && !g.hidden);
}

/**
 * Get visible arcade games in the correct order (Riddle Quest, Creature Command, Retro Defender)
 */
export function getArcadeGames(): GameConfig[] {
  const order: GameType[] = ['riddle-quest', 'guardian-defense', 'space-defender'];
  return order
    .map(id => GAME_REGISTRY[id])
    .filter(g => g && g.enabled && !g.hidden);
}

/**
 * Get games by category
 */
export function getGamesByCategory(category: GameCategory): GameConfig[] {
  return Object.values(GAME_REGISTRY).filter(
    g => g.category === category && g.enabled
  );
}

/**
 * Get games by difficulty
 */
export function getGamesByDifficulty(difficulty: GameDifficulty): GameConfig[] {
  return Object.values(GAME_REGISTRY).filter(
    g => g.difficulty === difficulty && g.enabled
  );
}

/**
 * Normalize score to 0-100 scale for cross-game comparison
 * Allows leaderboards to show "best overall player" fairly
 */
export function normalizeScore(gameId: GameType, score: number): number {
  const config = getGameConfig(gameId);
  const normalized = (score / config.scoring.maxScore) * 100;
  return Math.min(100, Math.max(0, normalized));
}

/**
 * Get performance tier for a score
 * Used for victory screen messaging and achievements
 */
export function getScorePerformanceTier(
  gameId: GameType, 
  score: number
): PerformanceTier {
  const config = getGameConfig(gameId);
  
  if (score >= config.scoring.legendaryScore) return 'legendary';
  if (score >= config.scoring.greatScore) return 'great';
  if (score >= config.scoring.goodScore) return 'good';
  return 'beginner';
}

/**
 * Get percentage to next tier
 * Used for progress bars and motivation
 */
export function getProgressToNextTier(
  gameId: GameType,
  score: number
): { currentTier: PerformanceTier; nextTier: PerformanceTier | null; progress: number } {
  const tier = getScorePerformanceTier(gameId, score);
  const config = getGameConfig(gameId);
  
  const tiers: Array<{ tier: PerformanceTier; threshold: number }> = [
    { tier: 'beginner', threshold: 0 },
    { tier: 'good', threshold: config.scoring.goodScore },
    { tier: 'great', threshold: config.scoring.greatScore },
    { tier: 'legendary', threshold: config.scoring.legendaryScore },
  ];
  
  const currentIndex = tiers.findIndex(t => t.tier === tier);
  const nextIndex = currentIndex + 1;
  
  if (nextIndex >= tiers.length) {
    return { currentTier: tier, nextTier: null, progress: 100 };
  }
  
  const current = tiers[currentIndex];
  const next = tiers[nextIndex];
  const range = next.threshold - current.threshold;
  const achieved = score - current.threshold;
  const progress = Math.min(100, (achieved / range) * 100);
  
  return {
    currentTier: tier,
    nextTier: next.tier,
    progress: Math.max(0, progress),
  };
}

/**
 * Validate that a game exists and is playable
 */
export function isGamePlayable(gameId: string): gameId is GameType {
  return gameId in GAME_REGISTRY && GAME_REGISTRY[gameId as GameType].enabled;
}

// ============================================
// ECOSYSTEM ECONOMY CONFIGURATION
// Points system coordinated across all games
// ============================================

/**
 * Economy configuration for normalized point conversion
 * All games convert raw scores to ecosystem points using this formula:
 * ecosystemPoints = floor(baseWeight * clamp01(log1p(score) / log1p(legendaryScore)) * difficultyMultiplier * 1000)
 * 
 * This ensures:
 * - Fair comparison across games with different score scales
 * - Points capped at MAX_ECOSYSTEM_POINTS per session
 * - Consistent rewards regardless of which game is played
 */
export const ECONOMY_CONFIG = {
  // Maximum ecosystem points awardable per game session
  MAX_ECOSYSTEM_POINTS: 1000,
  
  // Daily point cap to prevent abuse
  DAILY_POINT_CAP: 5000,
  
  // Per-game base weights (tuned for fair cross-game comparison)
  GAME_WEIGHTS: {
    'riddle-quest': 1.15,        // Puzzle - knowledge-based
    'guardian-defense': 1.0,     // Action - medium complexity
    'guardian-solitaire': 1.1,   // Strategy - skill-based
    'space-defender': 1.0,       // Action - classic
    'asteroid-mining': 0.95,     // Action - survival
    'cyber-breach': 1.05,        // Puzzle - memory
    'ring-game': 0.9,            // Easy - timing
  } as Record<GameType, number>,
  
  // Difficulty multipliers applied on top of base weight
  DIFFICULTY_MULTIPLIERS: {
    'easy': 0.8,
    'medium': 1.0,
    'hard': 1.2,
  } as Record<GameDifficulty, number>,
  
  // Streak bonuses for consecutive days played
  STREAK_BONUSES: {
    3: 1.1,   // 10% bonus after 3 days
    7: 1.2,   // 20% bonus after 7 days
    14: 1.3,  // 30% bonus after 14 days
    30: 1.5,  // 50% bonus after 30 days
  } as Record<number, number>,
  
  // Anti-exploitation: minimum time between score submissions (seconds)
  MIN_SUBMISSION_INTERVAL: 30,
  
  // Score verification checksums enabled
  REQUIRE_CHECKSUM: true,
  
  // Version for cache invalidation on economy updates
  VERSION: 1,
} as const;

/**
 * Convert raw game score to normalized ecosystem points
 * Uses logarithmic scaling to prevent score inflation
 * 
 * @param gameId - The game type
 * @param rawScore - The raw score from the game
 * @param streakDays - Number of consecutive days played (optional)
 * @returns Normalized ecosystem points (0 to MAX_ECOSYSTEM_POINTS)
 */
export function calculateEcosystemPoints(
  gameId: GameType,
  rawScore: number,
  streakDays: number = 0
): number {
  const config = getGameConfig(gameId);
  const weight = ECONOMY_CONFIG.GAME_WEIGHTS[gameId] ?? 1.0;
  const difficultyMult = ECONOMY_CONFIG.DIFFICULTY_MULTIPLIERS[config.difficulty] ?? 1.0;
  
  // Logarithmic scaling: log1p(score) / log1p(legendaryScore)
  // This gives diminishing returns as scores increase
  const legendaryScore = config.scoring.legendaryScore;
  const normalizedRatio = Math.min(1, Math.log1p(rawScore) / Math.log1p(legendaryScore));
  
  // Calculate base points
  let points = Math.floor(weight * normalizedRatio * difficultyMult * ECONOMY_CONFIG.MAX_ECOSYSTEM_POINTS);
  
  // Apply streak bonus
  const applicableStreaks = Object.keys(ECONOMY_CONFIG.STREAK_BONUSES)
    .map(Number)
    .filter(days => streakDays >= days)
    .sort((a, b) => b - a);
  
  if (applicableStreaks.length > 0) {
    const streakBonus = ECONOMY_CONFIG.STREAK_BONUSES[applicableStreaks[0]] ?? 1.0;
    points = Math.floor(points * streakBonus);
  }
  
  // Cap at maximum
  return Math.min(points, ECONOMY_CONFIG.MAX_ECOSYSTEM_POINTS);
}

/**
 * Validate score submission for anti-exploitation
 * Returns true if the score appears legitimate
 * Note: Minimum play duration checks removed - daily caps handle balance
 */
export function validateScoreSubmission(
  gameId: GameType,
  rawScore: number,
): { valid: boolean; reason?: string } {
  const config = getGameConfig(gameId);
  
  // Check maximum score
  if (rawScore > config.scoring.maxScore * 1.1) { // 10% tolerance for bonuses
    return { valid: false, reason: 'Score exceeds maximum possible' };
  }
  
  // Check negative scores
  if (rawScore < 0) {
    return { valid: false, reason: 'Invalid score' };
  }
  
  return { valid: true };
}

/**
 * Generate a simple checksum for score verification
 * Used to detect tampering on client-side score submission
 */
export function generateScoreChecksum(
  gameId: GameType,
  score: number,
  duration: number,
  timestamp: number
): string {
  // Simple checksum - rotate and XOR
  const data = `${gameId}:${score}:${duration}:${timestamp}:${ECONOMY_CONFIG.VERSION}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get economy summary for a player's session
 */
export function getEconomySummary(
  gameId: GameType,
  rawScore: number,
  streakDays: number = 0
): {
  rawScore: number;
  ecosystemPoints: number;
  tier: PerformanceTier;
  streakBonus: number;
  maxDailyPoints: number;
} {
  const points = calculateEcosystemPoints(gameId, rawScore, streakDays);
  const tier = getScorePerformanceTier(gameId, rawScore);
  
  const applicableStreaks = Object.keys(ECONOMY_CONFIG.STREAK_BONUSES)
    .map(Number)
    .filter(days => streakDays >= days)
    .sort((a, b) => b - a);
  
  const streakBonus = applicableStreaks.length > 0 
    ? ECONOMY_CONFIG.STREAK_BONUSES[applicableStreaks[0]] ?? 1.0 
    : 1.0;
  
  return {
    rawScore,
    ecosystemPoints: points,
    tier,
    streakBonus,
    maxDailyPoints: ECONOMY_CONFIG.DAILY_POINT_CAP,
  };
}
