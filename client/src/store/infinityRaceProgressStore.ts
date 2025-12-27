import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Achievement = 'first_win' | '10_races' | '25_races' | '10_wins';
export type ColorPalette = 'default' | 'neon_cyan' | 'neon_pink' | 'neon_green' | 'neon_orange';

export const PALETTE_COLORS: Record<ColorPalette, { primary: string; secondary: string; accent: string }> = {
  default: { primary: '#00ffff', secondary: '#00ff88', accent: '#ffffff' },
  neon_cyan: { primary: '#00ffff', secondary: '#0099ff', accent: '#66ffff' },
  neon_pink: { primary: '#ff00ff', secondary: '#ff0099', accent: '#ff66ff' },
  neon_green: { primary: '#00ff00', secondary: '#88ff00', accent: '#66ff66' },
  neon_orange: { primary: '#ff8800', secondary: '#ffaa00', accent: '#ffbb66' },
};

export const ACHIEVEMENT_INFO: Record<Achievement, { title: string; description: string; brainx: number; icon: string }> = {
  first_win: { title: 'First Victory', description: 'Win your first race', brainx: 50, icon: '🏆' },
  '10_races': { title: 'Speed Demon', description: 'Complete 10 races', brainx: 0, icon: '🏎️' },
  '25_races': { title: 'Road Warrior', description: 'Complete 25 races', brainx: 100, icon: '⚡' },
  '10_wins': { title: 'Champion', description: 'Win 10 races', brainx: 200, icon: '👑' },
};

export const LEVEL_THRESHOLDS = [0, 10, 15, 20, 30, 40, 50, 60, 75, 100];

interface RaceProgress {
  totalRaces: number;
  totalWins: number;
  level: number;
  statBonus: number;
  achievements: Achievement[];
  unlockedPalettes: ColorPalette[];
  selectedPalette: ColorPalette;
}

interface PopupItem {
  id: string;
  type: 'achievement' | 'level_up' | 'palette_unlock';
  data: Achievement | number | ColorPalette[];
}

interface InfinityRaceProgressState {
  progress: RaceProgress | null;
  connectedWallet: string | null;
  isLoading: boolean;
  popupQueue: PopupItem[];
  
  fetchProgress: (walletAddress: string) => Promise<void>;
  updateProgressFromRace: (newProgress: RaceProgress, newAchievements: Achievement[], levelUp: boolean) => void;
  selectPalette: (palette: ColorPalette) => Promise<void>;
  getStatBonus: () => number;
  addPopup: (popup: PopupItem) => void;
  dismissPopup: () => void;
  clearWallet: () => void;
}

export const useInfinityRaceProgressStore = create<InfinityRaceProgressState>()(
  persist(
    (set, get) => ({
      progress: null,
      connectedWallet: null,
      isLoading: false,
      popupQueue: [],
      
      fetchProgress: async (walletAddress: string) => {
        set({ isLoading: true, connectedWallet: walletAddress });
        
        try {
          const response = await fetch(`/api/infinity-race/progress/${walletAddress}`);
          if (!response.ok) {
            throw new Error('Failed to fetch progress');
          }
          
          const data = await response.json();
          set({
            progress: {
              totalRaces: data.totalRaces,
              totalWins: data.totalWins,
              level: data.level,
              statBonus: data.statBonus,
              achievements: data.achievements || [],
              unlockedPalettes: data.unlockedPalettes || ['default'],
              selectedPalette: data.selectedPalette || 'default',
            },
            isLoading: false,
          });
        } catch (error) {
          console.error('[InfinityRaceProgress] Failed to fetch:', error);
          set({ 
            isLoading: false,
            progress: {
              totalRaces: 0,
              totalWins: 0,
              level: 1,
              statBonus: 0,
              achievements: [],
              unlockedPalettes: ['default'],
              selectedPalette: 'default',
            }
          });
        }
      },
      
      updateProgressFromRace: (newProgress: RaceProgress, newAchievements: Achievement[], levelUp: boolean) => {
        const state = get();
        
        if (levelUp) {
          get().addPopup({
            id: `level_${Date.now()}`,
            type: 'level_up',
            data: newProgress.level,
          });
        }
        
        newAchievements.forEach(achievement => {
          get().addPopup({
            id: `achievement_${achievement}_${Date.now()}`,
            type: 'achievement',
            data: achievement,
          });
        });
        
        if (newAchievements.includes('10_races')) {
          get().addPopup({
            id: `palette_${Date.now()}`,
            type: 'palette_unlock',
            data: ['neon_cyan', 'neon_pink', 'neon_green', 'neon_orange'] as ColorPalette[],
          });
        }
        
        set({ progress: newProgress });
      },
      
      selectPalette: async (palette: ColorPalette) => {
        const state = get();
        if (!state.connectedWallet || !state.progress) return;
        
        if (!state.progress.unlockedPalettes.includes(palette)) {
          console.error('[InfinityRaceProgress] Palette not unlocked:', palette);
          return;
        }
        
        set({
          progress: { ...state.progress, selectedPalette: palette }
        });
        
        try {
          await fetch('/api/infinity-race/progress/palette', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: state.connectedWallet,
              palette,
            }),
          });
        } catch (error) {
          console.error('[InfinityRaceProgress] Failed to save palette:', error);
        }
      },
      
      getStatBonus: () => {
        const state = get();
        return state.progress?.statBonus || 0;
      },
      
      addPopup: (popup: PopupItem) => {
        set(state => ({
          popupQueue: [...state.popupQueue, popup],
        }));
      },
      
      dismissPopup: () => {
        set(state => ({
          popupQueue: state.popupQueue.slice(1),
        }));
      },
      
      clearWallet: () => {
        set({ progress: null, connectedWallet: null, popupQueue: [] });
      },
    }),
    {
      name: 'infinity-race-progress',
      partialize: (state) => ({
        progress: state.progress,
        connectedWallet: state.connectedWallet,
      }),
    }
  )
);
