export const CC_COLORS = {
  background: {
    void: '#0a0014',
    voidGradientStart: '#0f0020',
    voidGradientEnd: '#000008',
    grid: 'rgba(0, 255, 255, 0.04)',
    gridBright: 'rgba(0, 255, 255, 0.08)',
    nebulaPurple: 'rgba(139, 92, 246, 0.03)',
    nebulaBlue: 'rgba(59, 130, 246, 0.02)',
  },
  
  explosions: {
    coreBlue: '#00ffff',
    corePurple: '#a855f7',
    glowCyan: 'rgba(0, 255, 255, 0.6)',
    glowPurple: 'rgba(168, 85, 247, 0.5)',
    rippleInner: 'rgba(0, 255, 255, 0.8)',
    rippleOuter: 'rgba(139, 92, 246, 0.3)',
    flareWhite: 'rgba(255, 255, 255, 0.9)',
  },
  
  missiles: {
    enemyCore: '#ff4444',
    enemyGlow: 'rgba(255, 68, 68, 0.6)',
    enemyTrail: 'rgba(255, 100, 50, 0.4)',
    playerCore: '#00ffff',
    playerGlow: 'rgba(0, 255, 255, 0.5)',
    playerTrail: 'rgba(0, 200, 255, 0.3)',
  },
  
  lairs: {
    healthFull: '#22c55e',
    healthMid: '#eab308',
    healthLow: '#ef4444',
    crystal: 'rgba(200, 220, 255, 0.8)',
    metallic: 'rgba(120, 140, 180, 0.9)',
    glow: 'rgba(0, 255, 255, 0.3)',
    damage: 'rgba(255, 100, 50, 0.8)',
  },
  
  hud: {
    border: 'rgba(0, 255, 255, 0.5)',
    borderBright: 'rgba(0, 255, 255, 0.8)',
    text: '#00ffff',
    textPurple: '#a855f7',
    textGold: '#ffd700',
    background: 'rgba(0, 0, 0, 0.7)',
    combo: '#ff00ff',
  },
  
  creatures: {
    'ultra-based': { core: '#9333EA', glow: 'rgba(147, 51, 234, 0.6)', trail: 'rgba(147, 51, 234, 0.4)' },
    'based': { core: '#00FFFF', glow: 'rgba(0, 255, 255, 0.6)', trail: 'rgba(0, 255, 255, 0.4)' },
    'crystal': { core: '#E0E0FF', glow: 'rgba(224, 224, 255, 0.6)', trail: 'rgba(224, 224, 255, 0.4)' },
    'midnight': { core: '#4B0082', glow: 'rgba(75, 0, 130, 0.6)', trail: 'rgba(75, 0, 130, 0.4)' },
    'jelly': { core: '#FF69B4', glow: 'rgba(255, 105, 180, 0.6)', trail: 'rgba(255, 105, 180, 0.4)' },
    'golden': { core: '#FFD700', glow: 'rgba(255, 215, 0, 0.6)', trail: 'rgba(255, 215, 0, 0.4)' },
    'pearlescent': { core: '#FFF0F5', glow: 'rgba(255, 240, 245, 0.6)', trail: 'rgba(255, 240, 245, 0.4)' },
    'guardian': { core: '#FF00FF', glow: 'rgba(255, 0, 255, 0.6)', trail: 'rgba(255, 0, 255, 0.4)' },
  } as Record<string, { core: string; glow: string; trail: string }>,
};

export const CC_EFFECTS = {
  starLayers: 3,
  starsPerLayer: [80, 50, 30],
  starSpeeds: [0.1, 0.2, 0.4],
  
  gridSpacing: 40,
  gridLineWidth: 0.5,
  
  explosionRipples: 3,
  explosionRippleDelay: 0.15,
  
  trailLength: 8,
  trailFadeRate: 0.85,
  
  particleCount: {
    explosion: 16,
    intercept: 24,
    destruction: 32,
  },
  
  glowPulseSpeed: 0.003,
  damageFlickerRate: 100,
};

export const CC_LAIR_DESIGNS = {
  'NEON JAGUAR LAIR': {
    shape: 'pyramid',
    accent: '#00ff88',
    pattern: 'stripes',
  },
  'SERPENT SANCTUM': {
    shape: 'spiral',
    accent: '#00ffff',
    pattern: 'scales',
  },
  'PHOENIX ROOST': {
    shape: 'tower',
    accent: '#ff6600',
    pattern: 'flames',
  },
  'WOLF DEN': {
    shape: 'fortress',
    accent: '#8888ff',
    pattern: 'angular',
  },
} as Record<string, { shape: string; accent: string; pattern: string }>;

export function createRadialGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  innerRadius: number,
  outerRadius: number,
  innerColor: string,
  outerColor: string
): CanvasGradient {
  const gradient = ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(1, outerColor);
  return gradient;
}

export function createLinearGradient(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  colors: Array<{ stop: number; color: string }>
): CanvasGradient {
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  colors.forEach(({ stop, color }) => gradient.addColorStop(stop, color));
  return gradient;
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function pulseValue(time: number, min: number, max: number, speed: number = 1): number {
  return min + (max - min) * (0.5 + 0.5 * Math.sin(time * speed));
}
