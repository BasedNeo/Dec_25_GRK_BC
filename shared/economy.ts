export const ECONOMY = {
  GLOBAL_DAILY_CAP: 500,
  VESTING_THRESHOLD: 1000,
  VESTING_LOCK_YEARS: 1,
  
  GAMES: {
    'riddle-quest': {
      dailyCap: 500,
      actions: {
        riddle: 10,
        challenge: 50
      }
    },
    'creature-command': {
      dailyCap: 500,
      actions: {
        wave: 10,
        lairs: 50
      }
    },
    'retro-defender': {
      dailyCap: 200,
      actions: {
        pad: 20,
        task: 50
      }
    },
    'infinity-race': {
      dailyCap: 500,
      actions: {
        race_win: 50,
        race_partial: 10,
        brainx_award: 100
      }
    },
    'guardian-defense': {
      dailyCap: 500,
      actions: {
        wave: 10,
        lairs: 50,
        combo: 25
      }
    }
  }
} as const;

export type GameType = keyof typeof ECONOMY.GAMES;
export type ActionType<G extends GameType> = keyof typeof ECONOMY.GAMES[G]['actions'];

export const VALID_GAMES = Object.keys(ECONOMY.GAMES) as GameType[];

export function getActionPoints(game: GameType, action: string): number | null {
  const gameConfig = ECONOMY.GAMES[game];
  if (!gameConfig) return null;
  
  const actions = gameConfig.actions as Record<string, number>;
  return actions[action] ?? null;
}

export function isValidAction(game: GameType, action: string): boolean {
  return getActionPoints(game, action) !== null;
}

export function getGameDailyCap(game: GameType): number {
  return ECONOMY.GAMES[game]?.dailyCap ?? ECONOMY.GLOBAL_DAILY_CAP;
}
