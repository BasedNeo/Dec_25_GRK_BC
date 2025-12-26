import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MilestoneProgress {
  id: string;
  completedAt: string | null;
}

interface RiddleMilestoneState {
  totalPoints: number;
  totalSolves: number;
  dailySolves: number;
  lastSyncDate: string | null;
  milestones: MilestoneProgress[];
  connectedWallet: string | null;
  
  addPoints: (points: number) => void;
  addSolve: () => void;
  resetDailySolves: () => void;
  completeMilestone: (id: string) => void;
  isMilestoneCompleted: (id: string) => boolean;
  setConnectedWallet: (wallet: string | null) => void;
  hydrateFromStats: (stats: { points: number; totalSolves: number; dailySolves: number }) => void;
  syncWithLeaderboard: () => void;
}

const getTodayKey = (): string => new Date().toISOString().split('T')[0];

export const useRiddleMilestoneStore = create<RiddleMilestoneState>()(
  persist(
    (set, get) => ({
      totalPoints: 0,
      totalSolves: 0,
      dailySolves: 0,
      lastSyncDate: null,
      milestones: [],
      connectedWallet: null,
      
      addPoints: (points: number) => {
        set(state => ({
          totalPoints: state.totalPoints + points
        }));
        get().syncWithLeaderboard();
      },
      
      addSolve: () => {
        const today = getTodayKey();
        set(state => {
          const isNewDay = state.lastSyncDate !== today;
          return {
            totalSolves: state.totalSolves + 1,
            dailySolves: isNewDay ? 1 : state.dailySolves + 1,
            lastSyncDate: today
          };
        });
        get().syncWithLeaderboard();
      },
      
      resetDailySolves: () => {
        const today = getTodayKey();
        set(state => {
          if (state.lastSyncDate !== today) {
            return { dailySolves: 0, lastSyncDate: today };
          }
          return {};
        });
      },
      
      completeMilestone: (id: string) => {
        set(state => {
          const existing = state.milestones.find(m => m.id === id);
          if (existing?.completedAt) return {};
          
          const newMilestones = state.milestones.filter(m => m.id !== id);
          newMilestones.push({ id, completedAt: new Date().toISOString() });
          
          return { milestones: newMilestones };
        });
      },
      
      isMilestoneCompleted: (id: string) => {
        return get().milestones.some(m => m.id === id && m.completedAt !== null);
      },
      
      setConnectedWallet: (wallet: string | null) => {
        set({ connectedWallet: wallet });
      },
      
      hydrateFromStats: (stats) => {
        set({
          totalPoints: Math.max(get().totalPoints, stats.points || 0),
          totalSolves: Math.max(get().totalSolves, stats.totalSolves || 0),
          dailySolves: stats.dailySolves || 0
        });
      },
      
      syncWithLeaderboard: async () => {
        const state = get();
        if (!state.connectedWallet) return;
        
        try {
          const res = await fetch(`/api/riddle-quest/stats/${state.connectedWallet}`);
          if (res.ok) {
            const data = await res.json();
            if (data.exists && data.stats) {
              set({
                totalPoints: Math.max(state.totalPoints, data.stats.points || 0),
                totalSolves: Math.max(state.totalSolves, data.stats.totalSolves || 0)
              });
            }
          }
        } catch (error) {
          console.error('[RiddleMilestone] Failed to sync with leaderboard:', error);
        }
      }
    }),
    {
      name: 'riddle-milestone-storage',
      partialize: (state) => ({
        totalPoints: state.totalPoints,
        totalSolves: state.totalSolves,
        dailySolves: state.dailySolves,
        lastSyncDate: state.lastSyncDate,
        milestones: state.milestones
      })
    }
  )
);

export default useRiddleMilestoneStore;
