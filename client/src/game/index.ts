/**
 * GAME MODULE EXPORTS
 * Self-contained game module with single export point.
 */

export { createGame, updateGame, applyInput, spawnAliens, getCanvasSize } from '@/lib/gameEngine';
export type { GameState, Alien, Entity, Vec2 } from '@/lib/gameEngine';

export { render } from '@/lib/gameRenderer';

export { useGameAccess } from '@/hooks/useGameAccess';
export { useGameScoresLocal as useGameScores, RANKS } from '@/hooks/useGameScoresLocal';
