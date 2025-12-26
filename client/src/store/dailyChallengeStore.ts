import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DAILY_CHALLENGE_GOAL = 50;
const DAILY_CHALLENGE_REWARD = 100;

interface DailyChallengeState {
  survivesCount: number;
  challengeCompleted: boolean;
  pointsAwarded: number;
  highestStage: number;
  highestWave: number;
  gamesPlayed: number;
  dateKey: string;
  connectedWallet: string | null;
  isSyncing: boolean;
  
  incrementSurvives: (count?: number) => void;
  updateProgress: (stage: number, wave: number) => void;
  incrementGamesPlayed: () => void;
  checkAndAwardChallenge: () => boolean;
  resetForNewDay: () => void;
  hydrateFromDB: (walletAddress: string) => Promise<void>;
  syncToDB: () => Promise<void>;
  setConnectedWallet: (wallet: string | null) => void;
  
  getProgress: () => number;
  getGoal: () => number;
  getReward: () => number;
}

const getTodayKey = (): string => new Date().toISOString().split('T')[0];

export const useDailyChallengeStore = create<DailyChallengeState>()(
  persist(
    (set, get) => ({
      survivesCount: 0,
      challengeCompleted: false,
      pointsAwarded: 0,
      highestStage: 1,
      highestWave: 1,
      gamesPlayed: 0,
      dateKey: getTodayKey(),
      connectedWallet: null,
      isSyncing: false,
      
      incrementSurvives: (count: number = 1) => {
        const state = get();
        const today = getTodayKey();
        
        if (state.dateKey !== today) {
          set({
            survivesCount: count,
            challengeCompleted: false,
            pointsAwarded: 0,
            dateKey: today,
            gamesPlayed: 0,
          });
        } else {
          set({ survivesCount: state.survivesCount + count });
        }
        
        if (state.connectedWallet) {
          get().syncToDB();
        }
      },
      
      updateProgress: (stage: number, wave: number) => {
        const state = get();
        set({
          highestStage: Math.max(state.highestStage, stage),
          highestWave: Math.max(state.highestWave, wave),
        });
      },
      
      incrementGamesPlayed: () => {
        set((state) => ({ gamesPlayed: state.gamesPlayed + 1 }));
      },
      
      checkAndAwardChallenge: () => {
        const state = get();
        if (state.challengeCompleted || state.survivesCount < DAILY_CHALLENGE_GOAL) {
          return false;
        }
        
        set({
          challengeCompleted: true,
          pointsAwarded: DAILY_CHALLENGE_REWARD,
        });
        
        if (state.connectedWallet) {
          get().syncToDB();
        }
        
        return true;
      },
      
      resetForNewDay: () => {
        const today = getTodayKey();
        set({
          survivesCount: 0,
          challengeCompleted: false,
          pointsAwarded: 0,
          dateKey: today,
          gamesPlayed: 0,
        });
      },
      
      setConnectedWallet: (wallet: string | null) => {
        set({ connectedWallet: wallet });
      },
      
      hydrateFromDB: async (walletAddress: string) => {
        set({ isSyncing: true, connectedWallet: walletAddress });
        
        try {
          const response = await fetch(`/api/daily-challenge/${walletAddress}`);
          if (!response.ok) {
            throw new Error('Failed to fetch daily challenge');
          }
          
          const data = await response.json();
          const today = getTodayKey();
          
          if (data.dateKey === today) {
            const localState = get();
            set({
              survivesCount: Math.max(localState.survivesCount, data.survivesCount),
              challengeCompleted: data.challengeCompleted || localState.challengeCompleted,
              pointsAwarded: Math.max(localState.pointsAwarded, data.pointsAwarded),
              highestStage: Math.max(localState.highestStage, data.highestStage),
              highestWave: Math.max(localState.highestWave, data.highestWave),
              gamesPlayed: Math.max(localState.gamesPlayed, data.gamesPlayed),
              dateKey: today,
              isSyncing: false,
            });
          } else {
            set({ dateKey: today, isSyncing: false });
          }
          
          console.log('[DailyChallenge] Hydrated from DB');
        } catch (error) {
          console.error('[DailyChallenge] Failed to hydrate from DB:', error);
          set({ isSyncing: false });
        }
      },
      
      syncToDB: async () => {
        const state = get();
        if (!state.connectedWallet || state.isSyncing) {
          return;
        }
        
        set({ isSyncing: true });
        
        try {
          const payload = {
            walletAddress: state.connectedWallet,
            dateKey: state.dateKey,
            survivesCount: state.survivesCount,
            challengeCompleted: state.challengeCompleted,
            pointsAwarded: state.pointsAwarded,
            highestStage: state.highestStage,
            highestWave: state.highestWave,
            gamesPlayed: 0,
          };
          
          const response = await fetch('/api/daily-challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          
          if (!response.ok) {
            throw new Error('Failed to save daily challenge');
          }
          
          set({ isSyncing: false });
          console.log('[DailyChallenge] Synced to DB');
        } catch (error) {
          console.error('[DailyChallenge] Failed to sync to DB:', error);
          set({ isSyncing: false });
        }
      },
      
      getProgress: () => get().survivesCount,
      getGoal: () => DAILY_CHALLENGE_GOAL,
      getReward: () => DAILY_CHALLENGE_REWARD,
    }),
    {
      name: 'daily-challenge-storage',
      partialize: (state) => ({
        survivesCount: state.survivesCount,
        challengeCompleted: state.challengeCompleted,
        pointsAwarded: state.pointsAwarded,
        highestStage: state.highestStage,
        highestWave: state.highestWave,
        gamesPlayed: state.gamesPlayed,
        dateKey: state.dateKey,
      }),
    }
  )
);
