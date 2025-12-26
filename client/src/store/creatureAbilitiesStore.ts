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

interface CreatureAbilitiesState {
  abilityLevels: Record<AbilityId, number>;
  totalPoints: number;
  sessionPoints: number;
  selectedAbility: AbilityId | null;
  
  earnPoints: (wavesCleared: number, comboBonus?: number) => void;
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
      totalPoints: STARTING_POINTS,
      sessionPoints: 0,
      selectedAbility: null,
      
      earnPoints: (wavesCleared: number, comboBonus: number = 0) => {
        const basePoints = wavesCleared * POINTS_PER_WAVE;
        const bonusPoints = comboBonus * COMBO_BONUS_MULTIPLIER;
        const earned = basePoints + bonusPoints;
        set((state) => ({
          totalPoints: state.totalPoints + earned,
          sessionPoints: state.sessionPoints + earned,
        }));
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
