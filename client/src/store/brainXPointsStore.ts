import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DAILY_CAP = 500;
const LOCK_DURATION_DAYS = 365;

interface BrainXPointsState {
  totalPoints: number;
  lockedPoints: number;
  unlockedPoints: number;
  pointsEarnedToday: number;
  pendingPoints: number;
  lastEarnedDate: string | null;
  lockExpiresAt: Date | null;
  connectedWallet: string | null;
  isSyncing: boolean;
  
  earnPoints: (points: number) => number;
  getRemainingDailyCap: () => number;
  isAtDailyCap: () => boolean;
  getLockProgress: () => number;
  hydrateFromDB: (walletAddress: string) => Promise<void>;
  syncToDB: () => Promise<void>;
  setConnectedWallet: (wallet: string | null) => void;
  resetForNewDay: () => void;
}

const getTodayKey = (): string => new Date().toISOString().split('T')[0];

export const useBrainXPointsStore = create<BrainXPointsState>()(
  persist(
    (set, get) => ({
      totalPoints: 0,
      lockedPoints: 0,
      unlockedPoints: 0,
      pointsEarnedToday: 0,
      pendingPoints: 0,
      lastEarnedDate: null,
      lockExpiresAt: null,
      connectedWallet: null,
      isSyncing: false,
      
      earnPoints: (points: number): number => {
        const state = get();
        const today = getTodayKey();
        
        if (state.lastEarnedDate !== today) {
          set({ pointsEarnedToday: 0, pendingPoints: 0, lastEarnedDate: today });
        }
        
        const currentState = get();
        const remainingCap = DAILY_CAP - currentState.pointsEarnedToday;
        const actualPoints = Math.min(points, remainingCap);
        
        if (actualPoints <= 0) return 0;
        
        const now = new Date();
        const lockExpiry = new Date(now.getTime() + LOCK_DURATION_DAYS * 24 * 60 * 60 * 1000);
        
        set({
          totalPoints: currentState.totalPoints + actualPoints,
          lockedPoints: currentState.lockedPoints + actualPoints,
          pointsEarnedToday: currentState.pointsEarnedToday + actualPoints,
          pendingPoints: currentState.pendingPoints + actualPoints,
          lastEarnedDate: today,
          lockExpiresAt: lockExpiry,
        });
        
        if (currentState.connectedWallet) {
          get().syncToDB();
        }
        
        return actualPoints;
      },
      
      getRemainingDailyCap: () => {
        const state = get();
        const today = getTodayKey();
        if (state.lastEarnedDate !== today) return DAILY_CAP;
        return Math.max(0, DAILY_CAP - state.pointsEarnedToday);
      },
      
      isAtDailyCap: () => {
        return get().getRemainingDailyCap() <= 0;
      },
      
      getLockProgress: () => {
        const state = get();
        if (!state.lockExpiresAt) return 0;
        
        const now = new Date();
        const lockStart = new Date(state.lockExpiresAt.getTime() - LOCK_DURATION_DAYS * 24 * 60 * 60 * 1000);
        const totalDuration = state.lockExpiresAt.getTime() - lockStart.getTime();
        const elapsed = now.getTime() - lockStart.getTime();
        
        return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      },
      
      resetForNewDay: () => {
        const today = getTodayKey();
        set({ pointsEarnedToday: 0, lastEarnedDate: today });
      },
      
      setConnectedWallet: (wallet: string | null) => {
        set({ connectedWallet: wallet });
      },
      
      hydrateFromDB: async (walletAddress: string) => {
        set({ isSyncing: true, connectedWallet: walletAddress });
        
        try {
          const response = await fetch(`/api/brainx-points/${walletAddress}`);
          if (!response.ok) {
            if (response.status === 404) {
              set({ isSyncing: false });
              return;
            }
            throw new Error('Failed to fetch brainX points');
          }
          
          const data = await response.json();
          const today = getTodayKey();
          const localState = get();
          
          set({
            totalPoints: Math.max(localState.totalPoints, data.totalPoints || 0),
            lockedPoints: Math.max(localState.lockedPoints, data.lockedPoints || 0),
            unlockedPoints: Math.max(localState.unlockedPoints, data.unlockedPoints || 0),
            pointsEarnedToday: data.lastEarnedDate === today 
              ? Math.max(localState.pointsEarnedToday, data.pointsEarnedToday || 0) 
              : 0,
            lastEarnedDate: data.lastEarnedDate === today ? today : null,
            lockExpiresAt: data.lockExpiresAt ? new Date(data.lockExpiresAt) : null,
            isSyncing: false,
          });
          
          console.log('[BrainXPoints] Hydrated from DB');
        } catch (error) {
          console.error('[BrainXPoints] Failed to hydrate from DB:', error);
          set({ isSyncing: false });
        }
      },
      
      syncToDB: async () => {
        const state = get();
        if (!state.connectedWallet || state.isSyncing) return;
        if (state.pendingPoints <= 0) return;
        
        const pointsToSync = state.pendingPoints;
        set({ isSyncing: true, pendingPoints: 0 });
        
        try {
          const response = await fetch('/api/brainx-points', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: state.connectedWallet,
              points: pointsToSync,
            }),
          });
          
          if (!response.ok) {
            set({ pendingPoints: get().pendingPoints + pointsToSync });
            throw new Error('Failed to sync brainX points');
          }
          
          set({ isSyncing: false });
          console.log('[BrainXPoints] Synced', pointsToSync, 'points to DB');
        } catch (error) {
          console.error('[BrainXPoints] Failed to sync to DB:', error);
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: 'brainx-points-storage',
      partialize: (state) => ({
        totalPoints: state.totalPoints,
        lockedPoints: state.lockedPoints,
        unlockedPoints: state.unlockedPoints,
        pointsEarnedToday: state.pointsEarnedToday,
        pendingPoints: state.pendingPoints,
        lastEarnedDate: state.lastEarnedDate,
        lockExpiresAt: state.lockExpiresAt,
      }),
    }
  )
);

export const BRAINX_DAILY_CAP = DAILY_CAP;
export const BRAINX_LOCK_DURATION_DAYS = LOCK_DURATION_DAYS;
