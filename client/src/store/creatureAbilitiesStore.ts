import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  AbilityId, 
  ABILITY_DEFINITIONS, 
  ABILITY_LEVEL_EFFECTS,
  POINTS_PER_WAVE,
  STARTING_BASED_BALANCE,
  getAbilityModifier,
} from '@/shared/creatureAbilities';

interface CreatureAbilitiesState {
  abilityLevels: Record<AbilityId, number>;
  points: number;
  basedBalance: number;
  selectedAbility: AbilityId | null;
  
  earnPoints: (wavesCleared: number) => void;
  upgradeAbility: (abilityId: AbilityId) => boolean;
  setSelectedAbility: (abilityId: AbilityId | null) => void;
  resetForNewGame: () => void;
  resetAll: () => void;
  
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

export const useCreatureAbilitiesStore = create<CreatureAbilitiesState>()(
  persist(
    (set, get) => ({
      abilityLevels: { ...initialAbilityLevels },
      points: 0,
      basedBalance: STARTING_BASED_BALANCE,
      selectedAbility: null,
      
      earnPoints: (wavesCleared: number) => {
        const earned = wavesCleared * POINTS_PER_WAVE;
        set((state) => ({
          points: state.points + earned,
          basedBalance: state.basedBalance + earned,
        }));
      },
      
      upgradeAbility: (abilityId: AbilityId) => {
        const state = get();
        const definition = ABILITY_DEFINITIONS[abilityId];
        const currentLevel = state.abilityLevels[abilityId];
        
        if (currentLevel >= definition.maxLevel) {
          return false;
        }
        
        if (state.basedBalance < definition.costPerLevel) {
          return false;
        }
        
        set((s) => ({
          abilityLevels: {
            ...s.abilityLevels,
            [abilityId]: currentLevel + 1,
          },
          basedBalance: s.basedBalance - definition.costPerLevel,
        }));
        
        return true;
      },
      
      setSelectedAbility: (abilityId: AbilityId | null) => {
        set({ selectedAbility: abilityId });
      },
      
      resetForNewGame: () => {
        set({
          points: 0,
        });
      },
      
      resetAll: () => {
        set({
          abilityLevels: { ...initialAbilityLevels },
          points: 0,
          basedBalance: STARTING_BASED_BALANCE,
          selectedAbility: null,
        });
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
        basedBalance: state.basedBalance,
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
