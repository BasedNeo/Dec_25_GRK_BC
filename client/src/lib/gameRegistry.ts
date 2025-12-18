import { LucideIcon } from 'lucide-react';
import { Zap, Spade, Shield } from 'lucide-react';

/**
 * Unique identifier for each game in the platform
 */
export type GameType = 'jaguar-runner' | 'guardian-solitaire' | 'space-defender';

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
}

/**
 * GAME REGISTRY
 * Add new games here - single source of truth
 */
export const GAME_REGISTRY: Record<GameType, GameConfig> = {
  'jaguar-runner': {
    id: 'jaguar-runner',
    name: 'Jaguar Runner',
    description: 'Endless runner on an alien planet. Jump over obstacles and survive as long as you can!',
    path: '/jaguar-runner',
    icon: Zap,
    iconColor: 'text-orange-400',
    thumbnailGradient: 'from-orange-500 to-red-600',
    category: 'action',
    difficulty: 'easy',
    averagePlayTime: 120,
    maxPlaysPerDay: 10,
    enabled: true,
    scoring: {
      maxScore: 50000,      // Perfect run: 5000 distance
      goodScore: 5000,      // 500 distance, decent performance
      greatScore: 15000,    // 1500 distance, strong performance
      legendaryScore: 30000, // 3000+ distance, top 5%
    },
    features: {
      hasTimer: false,
      hasMoves: false,
      hasLives: true,
    },
  },
  
  'guardian-solitaire': {
    id: 'guardian-solitaire',
    name: 'Guardian Solitaire',
    description: 'Premium Klondike Solitaire using Guardian NFT images as playing cards. Strategy meets style.',
    path: '/guardian-solitaire',
    icon: Spade,
    iconColor: 'text-cyan-400',
    thumbnailGradient: 'from-cyan-500 to-blue-600',
    category: 'strategy',
    difficulty: 'medium',
    averagePlayTime: 300,
    maxPlaysPerDay: 10,
    enabled: true,
    scoring: {
      maxScore: 50000,       // Sub-3min, sub-80 moves, flawless
      goodScore: 12000,      // Completed in reasonable time/moves
      greatScore: 20000,     // Fast completion, efficient moves
      legendaryScore: 35000, // Near-perfect execution
    },
    features: {
      hasTimer: true,
      hasMoves: true,
      hasUndo: true,
      hasCombo: true,
    },
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
 * Get only enabled games (ready to play)
 */
export function getEnabledGames(): GameConfig[] {
  return Object.values(GAME_REGISTRY).filter(g => g.enabled);
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
