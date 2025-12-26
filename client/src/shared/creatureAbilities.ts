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

export const UPGRADE_COSTS = [100, 200, 300];

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
    { level: 1, description: 'Destroy 1 extra missile', modifier: 1 },
    { level: 2, description: 'Destroy 2 extra missiles', modifier: 2 },
    { level: 3, description: 'Destroy 3 extra missiles', modifier: 3 },
  ],
  shield_bubbles: [
    { level: 1, description: '10% damage reduction', modifier: 0.10 },
    { level: 2, description: '20% damage reduction', modifier: 0.20 },
    { level: 3, description: '30% damage reduction', modifier: 0.30 },
  ],
  rapid_fire: [
    { level: 1, description: '15% faster reload', modifier: 0.15 },
    { level: 2, description: '30% faster reload', modifier: 0.30 },
    { level: 3, description: '50% faster reload', modifier: 0.50 },
  ],
  explosive_radius: [
    { level: 1, description: '+15% explosion radius', modifier: 1.15 },
    { level: 2, description: '+30% explosion radius', modifier: 1.30 },
    { level: 3, description: '+50% explosion radius', modifier: 1.50 },
  ],
  slow_field: [
    { level: 1, description: '15% enemy slow', modifier: 0.15 },
    { level: 2, description: '25% enemy slow', modifier: 0.25 },
    { level: 3, description: '40% enemy slow', modifier: 0.40 },
  ],
  multi_bubble: [
    { level: 1, description: '20% chance for 2 missiles', modifier: 0.20 },
    { level: 2, description: '35% chance for 2 missiles', modifier: 0.35 },
    { level: 3, description: '50% chance for 2 missiles', modifier: 0.50 },
  ],
  regen_burst: [
    { level: 1, description: '5% regen chance on wave clear', modifier: 0.05 },
    { level: 2, description: '10% regen chance on wave clear', modifier: 0.10 },
    { level: 3, description: '20% regen chance on wave clear', modifier: 0.20 },
  ],
};

export const POINTS_PER_WAVE = 10;
export const COMBO_BONUS_MULTIPLIER = 5;
export const STARTING_POINTS = 0;

export function getUpgradeCost(currentLevel: number): number {
  if (currentLevel === 0) return 100;
  if (currentLevel === 1) return 200;
  if (currentLevel === 2) return 300;
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
