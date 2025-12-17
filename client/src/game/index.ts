/**
 * GAME MODULE EXPORTS
 * Self-contained game module with single export point.
 */

export { createGame, updateGame, applyInput, spawnAliens, getCanvasSize } from './engine/gameEngine';
export type { GameState, Alien, Entity, Vec2 } from './engine/gameEngine';

export { render } from './engine/gameRenderer';

export { useGameAccess } from './hooks/useGameAccess';
export { useGameScoresLocal as useGameScores, RANKS } from './hooks/useGameScores';
