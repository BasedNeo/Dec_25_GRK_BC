import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  AbilityId, 
  ABILITY_DEFINITIONS, 
  POINTS_PER_WAVE,
  COMBO_BONUS_MULTIPLIER,
  STARTING_POINTS,
  getAbilityModifier,
  getUpgradeCost,
} from '@/shared/creatureAbilities';

interface CreatureProgressFromDB {
  walletAddress: string;
  totalPoints: number;
  piercingLevel: number;
  shieldLevel: number;
  rapidFireLevel: number;
  explosiveLevel: number;
  slowFieldLevel: number;
  multiBubbleLevel: number;
  regenBurstLevel: number;
}

interface CreatureAbilitiesState {
  abilityLevels: Record<AbilityId, number>;
  totalPoints: number;
  sessionPoints: number;
  selectedAbility: AbilityId | null;
  connectedWallet: string | null;
  isSyncing: boolean;
  lastSyncError: string | null;
  
  earnPoints: (wavesCleared: number, comboBonus?: number) => void;
  upgradeAbility: (abilityId: AbilityId) => boolean;
  setSelectedAbility: (abilityId: AbilityId | null) => void;
  resetForNewGame: () => void;
  resetAll: () => void;
  
  hydrateFromDB: (walletAddress: string) => Promise<void>;
  syncToDB: () => Promise<void>;
  setConnectedWallet: (wallet: string | null) => void;
  
  getPiercingCount: () => number;
  getShieldReduction: () => number;
  getReloadSpeedMultiplier: () => number;
  getExplosionRadiusMultiplier: () => number;
  getSlowFieldStrength: () => number;
  getMultiBubbleChance: () => number;
  getRegenChance: () => number;
}

const initialAbilityLevels: Record<AbilityId, number> = {
  piercing_bubbles: 0,
  shield_bubbles: 0,
  rapid_fire: 0,
  explosive_radius: 0,
  slow_field: 0,
  multi_bubble: 0,
  regen_burst: 0,
};

function mapDBToAbilityLevels(db: CreatureProgressFromDB): Record<AbilityId, number> {
  return {
    piercing_bubbles: db.piercingLevel,
    shield_bubbles: db.shieldLevel,
    rapid_fire: db.rapidFireLevel,
    explosive_radius: db.explosiveLevel,
    slow_field: db.slowFieldLevel,
    multi_bubble: db.multiBubbleLevel,
    regen_burst: db.regenBurstLevel,
  };
}

function mapAbilityLevelsToDB(levels: Record<AbilityId, number>): Omit<CreatureProgressFromDB, 'walletAddress' | 'totalPoints'> {
  return {
    piercingLevel: levels.piercing_bubbles,
    shieldLevel: levels.shield_bubbles,
    rapidFireLevel: levels.rapid_fire,
    explosiveLevel: levels.explosive_radius,
    slowFieldLevel: levels.slow_field,
    multiBubbleLevel: levels.multi_bubble,
    regenBurstLevel: levels.regen_burst,
  };
}

export const useCreatureAbilitiesStore = create<CreatureAbilitiesState>()(
  persist(
    (set, get) => ({
      abilityLevels: { ...initialAbilityLevels },
      totalPoints: STARTING_POINTS,
      sessionPoints: 0,
      selectedAbility: null,
      connectedWallet: null,
      isSyncing: false,
      lastSyncError: null,
      
      earnPoints: (wavesCleared: number, comboBonus: number = 0) => {
        const basePoints = wavesCleared * POINTS_PER_WAVE;
        const bonusPoints = comboBonus * COMBO_BONUS_MULTIPLIER;
        const earned = basePoints + bonusPoints;
        set((state) => ({
          totalPoints: state.totalPoints + earned,
          sessionPoints: state.sessionPoints + earned,
        }));
        
        const state = get();
        if (state.connectedWallet) {
          get().syncToDB();
        }
      },
      
      upgradeAbility: (abilityId: AbilityId) => {
        const state = get();
        const definition = ABILITY_DEFINITIONS[abilityId];
        const currentLevel = state.abilityLevels[abilityId];
        
        if (currentLevel >= definition.maxLevel) {
          return false;
        }
        
        const cost = getUpgradeCost(currentLevel);
        if (state.totalPoints < cost) {
          return false;
        }
        
        set((s) => ({
          abilityLevels: {
            ...s.abilityLevels,
            [abilityId]: currentLevel + 1,
          },
          totalPoints: s.totalPoints - cost,
        }));
        
        if (state.connectedWallet) {
          get().syncToDB();
        }
        
        return true;
      },
      
      setSelectedAbility: (abilityId: AbilityId | null) => {
        set({ selectedAbility: abilityId });
      },
      
      resetForNewGame: () => {
        set({
          sessionPoints: 0,
        });
      },
      
      resetAll: () => {
        set({
          abilityLevels: { ...initialAbilityLevels },
          totalPoints: STARTING_POINTS,
          sessionPoints: 0,
          selectedAbility: null,
        });
      },
      
      setConnectedWallet: (wallet: string | null) => {
        set({ connectedWallet: wallet });
      },
      
      hydrateFromDB: async (walletAddress: string) => {
        set({ isSyncing: true, lastSyncError: null, connectedWallet: walletAddress });
        
        try {
          const response = await fetch(`/api/creature-progress/${walletAddress}`);
          if (!response.ok) {
            throw new Error('Failed to fetch progress');
          }
          
          const data: CreatureProgressFromDB = await response.json();
          const dbLevels = mapDBToAbilityLevels(data);
          const localState = get();
          
          const mergedLevels = { ...localState.abilityLevels };
          (Object.keys(dbLevels) as AbilityId[]).forEach((key) => {
            mergedLevels[key] = Math.max(mergedLevels[key], dbLevels[key]);
          });
          
          const mergedPoints = Math.max(localState.totalPoints, data.totalPoints);
          
          set({
            abilityLevels: mergedLevels,
            totalPoints: mergedPoints,
            isSyncing: false,
          });
          
          console.log('[CreatureAbilities] Hydrated from DB for wallet:', walletAddress);
        } catch (error) {
          console.error('[CreatureAbilities] Failed to hydrate from DB:', error);
          set({ 
            isSyncing: false, 
            lastSyncError: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      },
      
      syncToDB: async () => {
        const state = get();
        if (!state.connectedWallet || state.isSyncing) {
          return;
        }
        
        set({ isSyncing: true, lastSyncError: null });
        
        try {
          const payload = {
            walletAddress: state.connectedWallet,
            totalPoints: state.totalPoints,
            ...mapAbilityLevelsToDB(state.abilityLevels),
          };
          
          const response = await fetch('/api/creature-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          
          if (!response.ok) {
            throw new Error('Failed to save progress');
          }
          
          set({ isSyncing: false });
          console.log('[CreatureAbilities] Synced to DB');
        } catch (error) {
          console.error('[CreatureAbilities] Failed to sync to DB:', error);
          set({ 
            isSyncing: false, 
            lastSyncError: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      },
      
      getPiercingCount: () => {
        const level = get().abilityLevels.piercing_bubbles;
        return level > 0 ? getAbilityModifier('piercing_bubbles', level) : 0;
      },
      
      getShieldReduction: () => {
        const level = get().abilityLevels.shield_bubbles;
        return level > 0 ? getAbilityModifier('shield_bubbles', level) : 0;
      },
      
      getReloadSpeedMultiplier: () => {
        const level = get().abilityLevels.rapid_fire;
        return level > 0 ? 1 + getAbilityModifier('rapid_fire', level) : 1;
      },
      
      getExplosionRadiusMultiplier: () => {
        const level = get().abilityLevels.explosive_radius;
        return level > 0 ? getAbilityModifier('explosive_radius', level) : 1;
      },
      
      getSlowFieldStrength: () => {
        const level = get().abilityLevels.slow_field;
        return level > 0 ? getAbilityModifier('slow_field', level) : 0;
      },
      
      getMultiBubbleChance: () => {
        const level = get().abilityLevels.multi_bubble;
        return level > 0 ? getAbilityModifier('multi_bubble', level) : 0;
      },
      
      getRegenChance: () => {
        const level = get().abilityLevels.regen_burst;
        return level > 0 ? getAbilityModifier('regen_burst', level) : 0;
      },
    }),
    {
      name: 'creature-abilities-storage',
      partialize: (state) => ({
        abilityLevels: state.abilityLevels,
        totalPoints: state.totalPoints,
      }),
    }
  )
);

export function useAbilityModifiers() {
  const store = useCreatureAbilitiesStore();
  
  return {
    piercingCount: store.getPiercingCount(),
    shieldReduction: store.getShieldReduction(),
    reloadSpeedMultiplier: store.getReloadSpeedMultiplier(),
    explosionRadiusMultiplier: store.getExplosionRadiusMultiplier(),
    slowFieldStrength: store.getSlowFieldStrength(),
    multiBubbleChance: store.getMultiBubbleChance(),
    regenChance: store.getRegenChance(),
  };
}
