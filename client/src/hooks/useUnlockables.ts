import { useState, useEffect, useCallback } from 'react';

export interface Unlockable {
  id: string;
  name: string;
  description: string;
  unlockRequirement: string;
  checkUnlock: (stats: UnlockStats) => boolean;
}

export interface UnlockStats {
  highScore: number;
  maxWave: number;
  maxLevel: number;
  maxRing: number;
}

export type ShipSkin = 'default' | 'magenta' | 'gold' | 'rainbow';
export type RingTheme = 'default' | 'fire' | 'ice' | 'galaxy';
export type TerminalSkin = 'default' | 'amber' | 'hologram' | 'matrix';

export const SHIP_SKINS: Record<ShipSkin, Unlockable & { colors: { primary: string; secondary: string; glow: string } }> = {
  default: {
    id: 'default',
    name: 'Cyan Guardian',
    description: 'Standard issue ship',
    unlockRequirement: 'Default',
    checkUnlock: () => true,
    colors: { primary: '#00FFFF', secondary: '#0088AA', glow: '#00FFFF' },
  },
  magenta: {
    id: 'magenta',
    name: 'Nebula Runner',
    description: 'A ship forged in cosmic storms',
    unlockRequirement: 'Score 1,000+ points',
    checkUnlock: (stats) => stats.highScore >= 1000,
    colors: { primary: '#FF00FF', secondary: '#AA0088', glow: '#FF00FF' },
  },
  gold: {
    id: 'gold',
    name: 'Solar Fury',
    description: 'Blazing through the void',
    unlockRequirement: 'Score 5,000+ points',
    checkUnlock: (stats) => stats.highScore >= 5000,
    colors: { primary: '#FFD700', secondary: '#FFA500', glow: '#FFD700' },
  },
  rainbow: {
    id: 'rainbow',
    name: 'Prismatic Elite',
    description: 'The rarest ship in the galaxy',
    unlockRequirement: 'Reach Wave 15',
    checkUnlock: (stats) => stats.maxWave >= 15,
    colors: { primary: '#FF0000', secondary: '#00FF00', glow: '#FFFFFF' },
  },
};

export const RING_THEMES: Record<RingTheme, Unlockable & { colors: { ring1: string; ring2: string; bg: string; particle: string } }> = {
  default: {
    id: 'default',
    name: 'Cyber Core',
    description: 'The original neon aesthetic',
    unlockRequirement: 'Default',
    checkUnlock: () => true,
    colors: { ring1: '#00FFFF', ring2: '#AA00FF', bg: '#050510', particle: '#00FFFF' },
  },
  fire: {
    id: 'fire',
    name: 'Inferno',
    description: 'Burn through the rings',
    unlockRequirement: 'Reach Ring 10',
    checkUnlock: (stats) => stats.maxRing >= 10,
    colors: { ring1: '#FF4500', ring2: '#FF8C00', bg: '#1a0500', particle: '#FF6600' },
  },
  ice: {
    id: 'ice',
    name: 'Frozen Void',
    description: 'Cool precision under pressure',
    unlockRequirement: 'Reach Ring 20',
    checkUnlock: (stats) => stats.maxRing >= 20,
    colors: { ring1: '#87CEEB', ring2: '#FFFFFF', bg: '#0a1020', particle: '#ADD8E6' },
  },
  galaxy: {
    id: 'galaxy',
    name: 'Stellar Dreams',
    description: 'The cosmos within',
    unlockRequirement: 'Reach Ring 30',
    checkUnlock: (stats) => stats.maxRing >= 30,
    colors: { ring1: '#9933FF', ring2: '#FF33CC', bg: '#0a0015', particle: '#FFFF00' },
  },
};

export const TERMINAL_SKINS: Record<TerminalSkin, Unlockable & { colors: { text: string; bg: string; accent: string; glow: string } }> = {
  default: {
    id: 'default',
    name: 'Classic Green',
    description: 'Traditional terminal aesthetics',
    unlockRequirement: 'Default',
    checkUnlock: () => true,
    colors: { text: '#00FF88', bg: '#020208', accent: '#00FFFF', glow: '#00FF88' },
  },
  amber: {
    id: 'amber',
    name: 'Retro Amber',
    description: 'Old school computing vibes',
    unlockRequirement: 'Reach Level 3',
    checkUnlock: (stats) => stats.maxLevel >= 3,
    colors: { text: '#FFB000', bg: '#1a1000', accent: '#FF8C00', glow: '#FFB000' },
  },
  hologram: {
    id: 'hologram',
    name: 'Blue Hologram',
    description: 'Futuristic holographic display',
    unlockRequirement: 'Reach Level 5',
    checkUnlock: (stats) => stats.maxLevel >= 5,
    colors: { text: '#00BFFF', bg: '#001020', accent: '#87CEEB', glow: '#00BFFF' },
  },
  matrix: {
    id: 'matrix',
    name: 'Matrix Rain',
    description: 'See beyond the code',
    unlockRequirement: 'Reach Level 8',
    checkUnlock: (stats) => stats.maxLevel >= 8,
    colors: { text: '#00FF00', bg: '#000000', accent: '#33FF33', glow: '#00FF00' },
  },
};

const UNLOCKS_KEY = 'arcade_unlocks';
const SELECTED_KEY = 'arcade_selected_cosmetics';

interface UnlocksData {
  stats: UnlockStats;
  unlockedShips: ShipSkin[];
  unlockedThemes: RingTheme[];
  unlockedTerminals: TerminalSkin[];
}

interface SelectedCosmetics {
  ship: ShipSkin;
  ringTheme: RingTheme;
  terminal: TerminalSkin;
}

function getUnlocksData(): UnlocksData {
  try {
    const data = localStorage.getItem(UNLOCKS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {}
  return {
    stats: { highScore: 0, maxWave: 0, maxLevel: 0, maxRing: 0 },
    unlockedShips: ['default'],
    unlockedThemes: ['default'],
    unlockedTerminals: ['default'],
  };
}

function getSelectedCosmetics(): SelectedCosmetics {
  try {
    const data = localStorage.getItem(SELECTED_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch {}
  return { ship: 'default', ringTheme: 'default', terminal: 'default' };
}

export function useUnlockables() {
  const [unlocksData, setUnlocksData] = useState<UnlocksData>(getUnlocksData());
  const [selected, setSelected] = useState<SelectedCosmetics>(getSelectedCosmetics());

  useEffect(() => {
    setUnlocksData(getUnlocksData());
    setSelected(getSelectedCosmetics());
  }, []);

  const updateStats = useCallback((game: 'asteroid-mining' | 'ring-game' | 'cyber-breach', newStats: Partial<UnlockStats>) => {
    const data = getUnlocksData();
    
    if (newStats.highScore !== undefined && newStats.highScore > data.stats.highScore) {
      data.stats.highScore = newStats.highScore;
    }
    if (newStats.maxWave !== undefined && newStats.maxWave > data.stats.maxWave) {
      data.stats.maxWave = newStats.maxWave;
    }
    if (newStats.maxLevel !== undefined && newStats.maxLevel > data.stats.maxLevel) {
      data.stats.maxLevel = newStats.maxLevel;
    }
    if (newStats.maxRing !== undefined && newStats.maxRing > data.stats.maxRing) {
      data.stats.maxRing = newStats.maxRing;
    }
    
    const newUnlocks: string[] = [];
    
    (Object.keys(SHIP_SKINS) as ShipSkin[]).forEach(skin => {
      if (!data.unlockedShips.includes(skin) && SHIP_SKINS[skin].checkUnlock(data.stats)) {
        data.unlockedShips.push(skin);
        newUnlocks.push(`Ship: ${SHIP_SKINS[skin].name}`);
      }
    });
    
    (Object.keys(RING_THEMES) as RingTheme[]).forEach(theme => {
      if (!data.unlockedThemes.includes(theme) && RING_THEMES[theme].checkUnlock(data.stats)) {
        data.unlockedThemes.push(theme);
        newUnlocks.push(`Theme: ${RING_THEMES[theme].name}`);
      }
    });
    
    (Object.keys(TERMINAL_SKINS) as TerminalSkin[]).forEach(terminal => {
      if (!data.unlockedTerminals.includes(terminal) && TERMINAL_SKINS[terminal].checkUnlock(data.stats)) {
        data.unlockedTerminals.push(terminal);
        newUnlocks.push(`Terminal: ${TERMINAL_SKINS[terminal].name}`);
      }
    });
    
    localStorage.setItem(UNLOCKS_KEY, JSON.stringify(data));
    setUnlocksData(data);
    
    return newUnlocks;
  }, []);

  const selectShip = useCallback((skin: ShipSkin) => {
    if (unlocksData.unlockedShips.includes(skin)) {
      const newSelected = { ...selected, ship: skin };
      localStorage.setItem(SELECTED_KEY, JSON.stringify(newSelected));
      setSelected(newSelected);
    }
  }, [unlocksData.unlockedShips, selected]);

  const selectRingTheme = useCallback((theme: RingTheme) => {
    if (unlocksData.unlockedThemes.includes(theme)) {
      const newSelected = { ...selected, ringTheme: theme };
      localStorage.setItem(SELECTED_KEY, JSON.stringify(newSelected));
      setSelected(newSelected);
    }
  }, [unlocksData.unlockedThemes, selected]);

  const selectTerminal = useCallback((terminal: TerminalSkin) => {
    if (unlocksData.unlockedTerminals.includes(terminal)) {
      const newSelected = { ...selected, terminal: terminal };
      localStorage.setItem(SELECTED_KEY, JSON.stringify(newSelected));
      setSelected(newSelected);
    }
  }, [unlocksData.unlockedTerminals, selected]);

  const isShipUnlocked = useCallback((skin: ShipSkin) => {
    return unlocksData.unlockedShips.includes(skin);
  }, [unlocksData.unlockedShips]);

  const isThemeUnlocked = useCallback((theme: RingTheme) => {
    return unlocksData.unlockedThemes.includes(theme);
  }, [unlocksData.unlockedThemes]);

  const isTerminalUnlocked = useCallback((terminal: TerminalSkin) => {
    return unlocksData.unlockedTerminals.includes(terminal);
  }, [unlocksData.unlockedTerminals]);

  return {
    stats: unlocksData.stats,
    selected,
    selectShip,
    selectRingTheme,
    selectTerminal,
    isShipUnlocked,
    isThemeUnlocked,
    isTerminalUnlocked,
    updateStats,
    unlockedShips: unlocksData.unlockedShips,
    unlockedThemes: unlocksData.unlockedThemes,
    unlockedTerminals: unlocksData.unlockedTerminals,
  };
}
