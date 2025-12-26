export type AbilityId = 
  | 'piercing_bubbles'
  | 'shield_bubbles'
  | 'rapid_fire'
  | 'explosive_radius'
  | 'slow_field'
  | 'multi_bubble'
  | 'regen_burst';

export interface AbilityDefinition {
  id: AbilityId;
  name: string;
  creatureNumber: number;
  creatureName: string;
  description: string;
  maxLevel: number;
  costPerLevel: number;
  icon: string;
  color: string;
}

export interface AbilityLevelEffect {
  level: number;
  description: string;
  modifier: number;
}

export const UPGRADE_COSTS = [100, 250, 500];

export const ABILITY_DEFINITIONS: Record<AbilityId, AbilityDefinition> = {
  piercing_bubbles: {
    id: 'piercing_bubbles',
    name: 'Crystal Piercing',
    creatureNumber: 2,
    creatureName: 'Crystal',
    description: 'Explosions can destroy multiple missiles',
    maxLevel: 3,
    costPerLevel: 100,
    icon: '💎',
    color: '#00ffff',
  },
  shield_bubbles: {
    id: 'shield_bubbles',
    name: 'Midnight Shield',
    creatureNumber: 3,
    creatureName: 'Midnight',
    description: 'Protect adjacent lairs from damage',
    maxLevel: 3,
    costPerLevel: 100,
    icon: '🌙',
    color: '#a855f7',
  },
  rapid_fire: {
    id: 'rapid_fire',
    name: 'Based Standard',
    creatureNumber: 1,
    creatureName: 'Based',
    description: 'Standard bubble - faster reload',
    maxLevel: 3,
    costPerLevel: 100,
    icon: '🔵',
    color: '#3b82f6',
  },
  explosive_radius: {
    id: 'explosive_radius',
    name: 'Golden Blast',
    creatureNumber: 5,
    creatureName: 'Golden',
    description: 'Larger explosion radius',
    maxLevel: 3,
    costPerLevel: 100,
    icon: '✨',
    color: '#f59e0b',
  },
  slow_field: {
    id: 'slow_field',
    name: 'Jelly Slow',
    creatureNumber: 4,
    creatureName: 'Jelly',
    description: 'Slow enemies in explosion radius',
    maxLevel: 3,
    costPerLevel: 100,
    icon: '🪼',
    color: '#ec4899',
  },
  multi_bubble: {
    id: 'multi_bubble',
    name: 'Pearl Multi-Shot',
    creatureNumber: 6,
    creatureName: 'Pearl',
    description: 'Fire multiple missiles at once',
    maxLevel: 3,
    costPerLevel: 100,
    icon: '🦪',
    color: '#f8fafc',
  },
  regen_burst: {
    id: 'regen_burst',
    name: 'Ultra Based Regen',
    creatureNumber: 7,
    creatureName: 'Ultra Based',
    description: 'Restore destroyed lairs on wave clear',
    maxLevel: 3,
    costPerLevel: 100,
    icon: '🌟',
    color: '#10b981',
  },
};

export const ABILITY_LEVEL_EFFECTS: Record<AbilityId, AbilityLevelEffect[]> = {
  piercing_bubbles: [
    { level: 1, description: 'Piercing: destroy 1 extra missile', modifier: 1 },
    { level: 2, description: 'Piercing: destroy 2 extra missiles', modifier: 2 },
    { level: 3, description: 'Piercing: destroy 4 extra missiles', modifier: 4 },
  ],
  shield_bubbles: [
    { level: 1, description: 'Shield: 15% damage reduction', modifier: 0.15 },
    { level: 2, description: 'Shield: 25% damage reduction', modifier: 0.25 },
    { level: 3, description: 'Shield: 40% damage reduction', modifier: 0.40 },
  ],
  rapid_fire: [
    { level: 1, description: 'Rapid Fire: 15% faster reload', modifier: 0.15 },
    { level: 2, description: 'Rapid Fire: 30% faster reload', modifier: 0.30 },
    { level: 3, description: 'Rapid Fire: 50% faster reload', modifier: 0.50 },
  ],
  explosive_radius: [
    { level: 1, description: 'Explosive: +20% blast radius', modifier: 1.20 },
    { level: 2, description: 'Explosive: +40% blast radius', modifier: 1.40 },
    { level: 3, description: 'Explosive: +75% blast radius', modifier: 1.75 },
  ],
  slow_field: [
    { level: 1, description: 'Slow Field: 15% enemy slow', modifier: 0.15 },
    { level: 2, description: 'Slow Field: 30% enemy slow', modifier: 0.30 },
    { level: 3, description: 'Slow Field: 45% enemy slow', modifier: 0.45 },
  ],
  multi_bubble: [
    { level: 1, description: 'Multi-Shot: 20% chance for 2 missiles', modifier: 0.20 },
    { level: 2, description: 'Multi-Shot: 35% chance for 2 missiles', modifier: 0.35 },
    { level: 3, description: 'Multi-Shot: 50% chance for 2 missiles', modifier: 0.50 },
  ],
  regen_burst: [
    { level: 1, description: 'Regen: 8% lair restore on wave clear', modifier: 0.08 },
    { level: 2, description: 'Regen: 15% lair restore on wave clear', modifier: 0.15 },
    { level: 3, description: 'Regen: 25% lair restore on wave clear', modifier: 0.25 },
  ],
};

export const POINTS_PER_WAVE = 20;
export const POINTS_PER_LAIR = 50;
export const COMBO_BONUS_MULTIPLIER = 5;
export const STARTING_POINTS = 50;

export function getUpgradeCost(currentLevel: number): number {
  if (currentLevel === 0) return 100;
  if (currentLevel === 1) return 250;
  if (currentLevel === 2) return 500;
  return 0;
}

export function getAbilityModifier(abilityId: AbilityId, level: number): number {
  if (level <= 0) return 0;
  const effects = ABILITY_LEVEL_EFFECTS[abilityId];
  const effect = effects.find(e => e.level === level);
  return effect?.modifier ?? 0;
}

export function getAbilityList(): AbilityDefinition[] {
  return Object.values(ABILITY_DEFINITIONS).sort((a, b) => a.creatureNumber - b.creatureNumber);
}
