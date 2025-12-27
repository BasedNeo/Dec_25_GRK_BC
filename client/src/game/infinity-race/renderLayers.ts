import p5 from 'p5';

export interface CraftVisual {
  id: string;
  primaryColor: string;
  accentColor: string;
  glowColor: string;
  metallicHighlight: string;
  bodyPath: { x: number; y: number }[];
  wingPath: { x: number; y: number }[];
  engineGlow: { x: number; y: number; radius: number }[];
}

export const CRAFT_VISUALS: Record<string, CraftVisual> = {
  neon_fox: {
    id: 'neon_fox',
    primaryColor: '#0a2a3a',
    accentColor: '#00ffff',
    glowColor: '#00ffff',
    metallicHighlight: '#4dd9ff',
    bodyPath: [
      { x: 25, y: 0 }, { x: 15, y: -6 }, { x: -5, y: -8 },
      { x: -18, y: -10 }, { x: -18, y: 10 }, { x: -5, y: 8 },
      { x: 15, y: 6 }
    ],
    wingPath: [
      { x: 5, y: -8 }, { x: -10, y: -18 }, { x: -15, y: -12 },
      { x: 5, y: 8 }, { x: -10, y: 18 }, { x: -15, y: 12 }
    ],
    engineGlow: [{ x: -20, y: 0, radius: 8 }]
  },
  dust_hawk: {
    id: 'dust_hawk',
    primaryColor: '#2a1a0a',
    accentColor: '#f59e0b',
    glowColor: '#fbbf24',
    metallicHighlight: '#fcd34d',
    bodyPath: [
      { x: 22, y: 0 }, { x: 10, y: -5 }, { x: -8, y: -6 },
      { x: -15, y: -4 }, { x: -15, y: 4 }, { x: -8, y: 6 },
      { x: 10, y: 5 }
    ],
    wingPath: [
      { x: 0, y: -6 }, { x: -12, y: -22 }, { x: -18, y: -15 },
      { x: 0, y: 6 }, { x: -12, y: 22 }, { x: -18, y: 15 }
    ],
    engineGlow: [
      { x: -17, y: -3, radius: 5 },
      { x: -17, y: 3, radius: 5 }
    ]
  },
  crystal_owl: {
    id: 'crystal_owl',
    primaryColor: '#1a0a2a',
    accentColor: '#a855f7',
    glowColor: '#c084fc',
    metallicHighlight: '#e879f9',
    bodyPath: [
      { x: 20, y: 0 }, { x: 12, y: -10 }, { x: -5, y: -12 },
      { x: -16, y: -8 }, { x: -16, y: 8 }, { x: -5, y: 12 },
      { x: 12, y: 10 }
    ],
    wingPath: [
      { x: 8, y: -10 }, { x: -5, y: -20 }, { x: -12, y: -14 },
      { x: 8, y: 10 }, { x: -5, y: 20 }, { x: -12, y: 14 }
    ],
    engineGlow: [{ x: -18, y: 0, radius: 10 }]
  },
  jelly_wisp: {
    id: 'jelly_wisp',
    primaryColor: '#0a2a1a',
    accentColor: '#22c55e',
    glowColor: '#4ade80',
    metallicHighlight: '#86efac',
    bodyPath: [
      { x: 28, y: 0 }, { x: 18, y: -4 }, { x: 5, y: -5 },
      { x: -12, y: -6 }, { x: -12, y: 6 }, { x: 5, y: 5 },
      { x: 18, y: 4 }
    ],
    wingPath: [
      { x: 10, y: -5 }, { x: 0, y: -12 }, { x: -8, y: -8 },
      { x: 10, y: 5 }, { x: 0, y: 12 }, { x: -8, y: 8 }
    ],
    engineGlow: [{ x: -14, y: 0, radius: 6 }]
  },
  ultra_falcon: {
    id: 'ultra_falcon',
    primaryColor: '#2a0a0a',
    accentColor: '#ef4444',
    glowColor: '#f87171',
    metallicHighlight: '#fca5a5',
    bodyPath: [
      { x: 24, y: 0 }, { x: 14, y: -7 }, { x: 0, y: -9 },
      { x: -14, y: -8 }, { x: -14, y: 8 }, { x: 0, y: 9 },
      { x: 14, y: 7 }
    ],
    wingPath: [
      { x: 6, y: -9 }, { x: -6, y: -20 }, { x: -14, y: -12 },
      { x: 6, y: 9 }, { x: -6, y: 20 }, { x: -14, y: 12 }
    ],
    engineGlow: [
      { x: -16, y: -5, radius: 6 },
      { x: -16, y: 5, radius: 6 }
    ]
  }
};

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'trail' | 'collision' | 'finish' | 'ambient';
}

export interface TrailPoint {
  x: number;
  y: number;
  age: number;
  speed: number;
}

export interface RenderContext {
  cameraX: number;
  cameraY: number;
  canvasWidth: number;
  canvasHeight: number;
  craftVisual: CraftVisual;
  gameState: {
    x: number;
    y: number;
    angle: number;
    velocity: { x: number; y: number };
    shieldHp: number;
    boosting: boolean;
  };
  trackPoints: { x: number; y: number }[];
  obstacles: {
    x: number;
    y: number;
    radius: number;
    type: string;
    rotation: number;
  }[];
  particles: Particle[];
  trailPoints: TrailPoint[];
  time: number;
  timeLeft: number;
  trackLength: number;
  racerName: string;
  frameCount: number;
  isMobile: boolean;
}

const STAR_CACHE_KEY = 'starfield';
const graphicsCache = new Map<string, p5.Graphics>();

export function initGraphicsCache(p: p5) {
  graphicsCache.clear();
}

function getOrCreateGraphics(p: p5, key: string, width: number, height: number): p5.Graphics {
  if (!graphicsCache.has(key)) {
    graphicsCache.set(key, p.createGraphics(width, height));
  }
  return graphicsCache.get(key)!;
}

export function renderBackground(p: p5, ctx: RenderContext) {
  p.background(5, 5, 15);
  
  const starGfx = getOrCreateGraphics(p, STAR_CACHE_KEY, ctx.canvasWidth, ctx.canvasHeight);
  
  if (ctx.frameCount === 1) {
    starGfx.clear();
    starGfx.noStroke();
    
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * ctx.canvasWidth;
      const y = Math.random() * ctx.canvasHeight;
      const brightness = 100 + Math.random() * 155;
      const size = 0.5 + Math.random() * 1.5;
      starGfx.fill(brightness, brightness, brightness + 30);
      starGfx.ellipse(x, y, size, size);
    }
    
    for (let i = 0; i < 3; i++) {
      const nx = Math.random() * ctx.canvasWidth;
      const ny = Math.random() * ctx.canvasHeight;
      const nw = 100 + Math.random() * 200;
      const nh = 50 + Math.random() * 100;
      
      for (let j = 0; j < 50; j++) {
        const ox = nx + (Math.random() - 0.5) * nw;
        const oy = ny + (Math.random() - 0.5) * nh;
        const alpha = 20 + Math.random() * 40;
        const hue = [200, 280, 320][i];
        starGfx.fill(`hsla(${hue}, 80%, 60%, ${alpha / 255})`);
        starGfx.ellipse(ox, oy, 3 + Math.random() * 8, 3 + Math.random() * 8);
      }
    }
  }
  
  const parallax1 = (ctx.cameraX * 0.02) % ctx.canvasWidth;
  const parallax2 = (ctx.cameraX * 0.05) % ctx.canvasWidth;
  
  p.push();
  p.tint(255, 180);
  p.image(starGfx, -parallax1, 0);
  p.image(starGfx, ctx.canvasWidth - parallax1, 0);
  p.pop();
  
  p.push();
  p.tint(255, 100);
  p.image(starGfx, -parallax2, 0);
  p.pop();
}

export function renderGrid(p: p5, ctx: RenderContext) {
  p.push();
  p.translate(ctx.canvasWidth / 2 - ctx.cameraX, ctx.canvasHeight / 2);
  
  const gridSpacing = 100;
  const startX = Math.floor((ctx.cameraX - ctx.canvasWidth) / gridSpacing) * gridSpacing;
  const endX = ctx.cameraX + ctx.canvasWidth;
  
  for (let gx = startX; gx < endX; gx += gridSpacing) {
    const intensity = 15 + Math.sin(gx * 0.01 + ctx.time * 0.002) * 10;
    p.stroke(0, intensity, intensity * 2, 50);
    p.strokeWeight(0.5);
    p.line(gx, -500, gx, 500);
  }
  
  for (let gy = -500; gy <= 500; gy += gridSpacing) {
    p.stroke(0, 20, 40, 40);
    p.strokeWeight(0.5);
    p.line(ctx.cameraX - ctx.canvasWidth, gy, ctx.cameraX + ctx.canvasWidth, gy);
  }
  
  p.pop();
}

export function renderTrack(p: p5, ctx: RenderContext) {
  p.push();
  p.translate(ctx.canvasWidth / 2 - ctx.cameraX, ctx.canvasHeight / 2);
  
  const visiblePoints = ctx.trackPoints.filter(
    pt => pt.x > ctx.cameraX - ctx.canvasWidth && pt.x < ctx.cameraX + ctx.canvasWidth
  );
  
  if (visiblePoints.length > 1) {
    for (let layer = 3; layer >= 0; layer--) {
      const alpha = layer === 0 ? 255 : 40 - layer * 10;
      const weight = layer === 0 ? 4 : 60 + layer * 20;
      
      p.noFill();
      if (layer === 0) {
        p.stroke(0, 255, 255, alpha);
      } else {
        p.stroke(0, 100, 150, alpha);
      }
      p.strokeWeight(weight);
      
      p.beginShape();
      for (const pt of visiblePoints) {
        p.vertex(pt.x, pt.y);
      }
      p.endShape();
    }
    
    const pulse = Math.sin(ctx.time * 0.005) * 0.5 + 0.5;
    p.stroke(0, 255, 255, 100 + pulse * 100);
    p.strokeWeight(2);
    p.beginShape();
    for (const pt of visiblePoints) {
      p.vertex(pt.x, pt.y - 35);
    }
    p.endShape();
    
    p.beginShape();
    for (const pt of visiblePoints) {
      p.vertex(pt.x, pt.y + 35);
    }
    p.endShape();
  }
  
  const finishX = ctx.trackLength;
  if (finishX > ctx.cameraX - ctx.canvasWidth / 2 && finishX < ctx.cameraX + ctx.canvasWidth / 2) {
    for (let i = 4; i >= 0; i--) {
      const alpha = i === 0 ? 255 : 60 - i * 12;
      const weight = i === 0 ? 6 : 20 + i * 15;
      p.stroke(0, 255, 0, alpha);
      p.strokeWeight(weight);
      p.line(finishX, -250, finishX, 250);
    }
    
    p.fill(0, 255, 0);
    p.noStroke();
    p.textSize(20);
    p.textAlign(p.CENTER);
    p.text('FINISH', finishX, -280);
  }
  
  p.pop();
}

export function renderObstacles(p: p5, ctx: RenderContext) {
  p.push();
  p.translate(ctx.canvasWidth / 2 - ctx.cameraX, ctx.canvasHeight / 2);
  
  for (const obs of ctx.obstacles) {
    if (obs.x < ctx.cameraX - ctx.canvasWidth / 2 || obs.x > ctx.cameraX + ctx.canvasWidth / 2) continue;
    
    p.push();
    p.translate(obs.x, obs.y);
    p.rotate(obs.rotation + ctx.time * 0.001);
    
    const pulseGlow = Math.sin(ctx.time * 0.003 + obs.x * 0.01) * 0.3 + 0.7;
    
    if (obs.type === 'asteroid') {
      for (let i = 3; i >= 0; i--) {
        const alpha = i === 0 ? 200 : 30 - i * 8;
        const size = obs.radius * 2 + i * 15;
        p.fill(80 + i * 10, 50 + i * 10, 30 + i * 10, alpha);
        p.noStroke();
        p.ellipse(0, 0, size, size * 0.85);
      }
      p.fill(60, 40, 25);
      p.ellipse(-obs.radius * 0.3, -obs.radius * 0.2, obs.radius * 0.4, obs.radius * 0.3);
      p.ellipse(obs.radius * 0.2, obs.radius * 0.3, obs.radius * 0.3, obs.radius * 0.25);
    } else if (obs.type === 'shadow_hack') {
      for (let i = 4; i >= 0; i--) {
        const alpha = (30 - i * 6) * pulseGlow;
        const size = obs.radius * 2 + i * 20;
        p.fill(100, 0, 160, alpha);
        p.noStroke();
        p.ellipse(0, 0, size, size);
      }
      p.fill(150, 50, 200);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * p.TWO_PI + ctx.time * 0.002;
        p.ellipse(Math.cos(angle) * obs.radius * 0.5, Math.sin(angle) * obs.radius * 0.5, 8, 8);
      }
    } else if (obs.type === 'debris') {
      for (let i = 2; i >= 0; i--) {
        const alpha = i === 0 ? 220 : 40 - i * 15;
        const size = obs.radius + i * 10;
        p.fill(90 + i * 20, 90 + i * 20, 100 + i * 20, alpha);
        p.noStroke();
        p.rect(-size / 2, -size / 2, size, size);
      }
      p.stroke(150, 150, 160);
      p.strokeWeight(2);
      p.line(-obs.radius * 0.3, -obs.radius * 0.3, obs.radius * 0.3, obs.radius * 0.3);
    } else if (obs.type === 'pulse_mine') {
      for (let i = 5; i >= 0; i--) {
        const alpha = (50 - i * 8) * pulseGlow;
        const size = obs.radius * 2 + i * 25;
        p.fill(255, 50 + i * 10, 50 + i * 10, alpha);
        p.noStroke();
        p.ellipse(0, 0, size, size);
      }
      p.fill(255, 100, 100);
      p.ellipse(0, 0, obs.radius, obs.radius);
      p.fill(255, 200, 200);
      p.ellipse(0, 0, obs.radius * 0.4, obs.radius * 0.4);
    } else {
      for (let i = 6; i >= 0; i--) {
        const alpha = 20 - i * 2;
        const size = obs.radius * 2.5 + i * 30;
        p.fill(40, 0, 80, alpha * pulseGlow);
        p.noStroke();
        p.ellipse(0, 0, size, size);
      }
      p.fill(20, 0, 50, 180);
      p.ellipse(0, 0, obs.radius * 1.5, obs.radius * 1.5);
    }
    
    p.pop();
  }
  
  p.pop();
}

export function renderCraft(p: p5, ctx: RenderContext) {
  const { gameState, craftVisual } = ctx;
  const speed = Math.sqrt(gameState.velocity.x ** 2 + gameState.velocity.y ** 2);
  
  p.push();
  p.translate(ctx.canvasWidth / 2 - ctx.cameraX, ctx.canvasHeight / 2);
  p.translate(gameState.x, gameState.y);
  p.rotate(gameState.angle);
  
  for (const engine of craftVisual.engineGlow) {
    const thrustLength = 10 + speed * 3 + Math.random() * 5;
    for (let i = 4; i >= 0; i--) {
      const alpha = 80 - i * 15;
      const width = engine.radius + i * 4;
      p.fill(craftVisual.glowColor + Math.floor(alpha).toString(16).padStart(2, '0'));
      p.noStroke();
      p.ellipse(engine.x - thrustLength * 0.5 - i * 5, engine.y, thrustLength + i * 10, width);
    }
    
    p.fill(255, 200, 100);
    p.ellipse(engine.x, engine.y, engine.radius * 0.8, engine.radius * 0.6);
  }
  
  for (let i = 0; i < 3; i += 3) {
    const wingPts = craftVisual.wingPath;
    p.fill(craftVisual.primaryColor);
    p.stroke(craftVisual.accentColor);
    p.strokeWeight(1);
    
    p.beginShape();
    for (let j = 0; j < 3; j++) {
      p.vertex(wingPts[j].x, wingPts[j].y);
    }
    p.endShape(p.CLOSE);
    
    p.beginShape();
    for (let j = 3; j < 6; j++) {
      p.vertex(wingPts[j].x, wingPts[j].y);
    }
    p.endShape(p.CLOSE);
  }
  
  for (let glow = 2; glow >= 0; glow--) {
    const alpha = glow === 0 ? 255 : 40 - glow * 15;
    const offset = glow * 3;
    
    p.fill(glow === 0 ? craftVisual.primaryColor : craftVisual.glowColor + '20');
    p.stroke(craftVisual.accentColor + (glow === 0 ? 'ff' : '40'));
    p.strokeWeight(glow === 0 ? 2 : 1);
    
    p.beginShape();
    for (const pt of craftVisual.bodyPath) {
      p.vertex(pt.x + (pt.x > 0 ? offset : -offset), pt.y + (pt.y > 0 ? offset * 0.3 : -offset * 0.3));
    }
    p.endShape(p.CLOSE);
  }
  
  p.fill(craftVisual.metallicHighlight + '80');
  p.noStroke();
  p.ellipse(10, -2, 8, 4);
  p.ellipse(5, 3, 6, 3);
  
  p.fill(craftVisual.accentColor);
  p.ellipse(20, 0, 4, 4);
  
  p.pop();
}

export function renderParticles(p: p5, ctx: RenderContext) {
  p.push();
  p.translate(ctx.canvasWidth / 2 - ctx.cameraX, ctx.canvasHeight / 2);
  
  for (const particle of ctx.particles) {
    if (particle.life <= 0) continue;
    
    const lifeRatio = particle.life / particle.maxLife;
    const alpha = Math.floor(lifeRatio * 255);
    
    p.noStroke();
    
    if (particle.type === 'trail') {
      for (let i = 2; i >= 0; i--) {
        const size = particle.size + i * 3;
        const a = Math.floor(alpha * (1 - i * 0.3));
        p.fill(particle.color + a.toString(16).padStart(2, '0'));
        p.ellipse(particle.x, particle.y, size, size);
      }
    } else if (particle.type === 'collision') {
      const size = particle.size * (2 - lifeRatio);
      for (let i = 3; i >= 0; i--) {
        const a = Math.floor(alpha * (1 - i * 0.25));
        p.fill(255, 150 + i * 30, 50, a);
        p.ellipse(particle.x, particle.y, size + i * 8, size + i * 8);
      }
    } else if (particle.type === 'finish') {
      const size = particle.size * (2 - lifeRatio * 0.5);
      p.fill(0, 255, 100, alpha);
      p.ellipse(particle.x, particle.y, size, size);
    }
  }
  
  p.pop();
}

export function renderTrail(p: p5, ctx: RenderContext) {
  if (ctx.trailPoints.length < 2) return;
  
  p.push();
  p.translate(ctx.canvasWidth / 2 - ctx.cameraX, ctx.canvasHeight / 2);
  
  p.noFill();
  for (let layer = 2; layer >= 0; layer--) {
    const weight = layer === 0 ? 3 : 8 + layer * 4;
    const alpha = layer === 0 ? 180 : 30 - layer * 10;
    
    p.stroke(ctx.craftVisual.glowColor + Math.floor(alpha).toString(16).padStart(2, '0'));
    p.strokeWeight(weight);
    
    p.beginShape();
    for (let i = 0; i < ctx.trailPoints.length; i++) {
      const pt = ctx.trailPoints[i];
      const ageRatio = 1 - pt.age / 60;
      if (ageRatio > 0) {
        p.vertex(pt.x, pt.y);
      }
    }
    p.endShape();
  }
  
  p.pop();
}

export function renderHUD(p: p5, ctx: RenderContext) {
  const { gameState, craftVisual, timeLeft, trackLength, racerName } = ctx;
  const speed = Math.sqrt(gameState.velocity.x ** 2 + gameState.velocity.y ** 2);
  const progress = gameState.x / trackLength;
  
  p.push();
  
  p.fill(0, 0, 0, 150);
  p.noStroke();
  p.rect(10, 10, 220, 110, 8);
  
  for (let i = 2; i >= 0; i--) {
    p.stroke(craftVisual.accentColor + (i === 0 ? 'ff' : '40'));
    p.strokeWeight(i === 0 ? 2 : 1);
    p.noFill();
    p.rect(10 + i, 10 + i, 220 - i * 2, 110 - i * 2, 8);
  }
  
  p.fill(255);
  p.noStroke();
  p.textSize(14);
  p.textAlign(p.LEFT);
  p.text(racerName, 20, 32);
  
  p.textSize(12);
  p.fill(150);
  p.text('DISTANCE', 20, 52);
  p.fill(craftVisual.accentColor);
  p.text(`${Math.floor(gameState.x)} / ${trackLength}`, 100, 52);
  
  p.fill(150);
  p.text('SPEED', 20, 72);
  p.fill(speed > 10 ? '#22c55e' : craftVisual.accentColor);
  p.text(`${Math.floor(speed * 10)} km/s`, 100, 72);
  
  p.fill(150);
  p.text('SHIELD', 20, 92);
  for (let i = 0; i < 6; i++) {
    if (i < gameState.shieldHp) {
      for (let g = 1; g >= 0; g--) {
        p.fill(g === 0 ? craftVisual.accentColor : craftVisual.glowColor + '40');
        p.rect(100 + i * 18 - g, 82 - g, 14 + g * 2, 10 + g * 2, 2);
      }
    } else {
      p.fill(50);
      p.rect(100 + i * 18, 82, 14, 10, 2);
    }
  }
  
  p.fill(150);
  p.text('TIME', 20, 112);
  const timeColor = timeLeft <= 10 ? '#ef4444' : timeLeft <= 20 ? '#f59e0b' : '#22c55e';
  p.fill(timeColor);
  p.textSize(16);
  p.text(`${timeLeft}s`, 100, 113);
  
  const barWidth = 300;
  const barX = ctx.canvasWidth / 2 - barWidth / 2;
  const barY = 20;
  
  p.fill(30, 30, 40);
  p.rect(barX, barY, barWidth, 12, 6);
  
  for (let i = 2; i >= 0; i--) {
    const alpha = i === 0 ? 255 : 80 - i * 30;
    p.fill(0, 255, 255, alpha);
    p.rect(barX + i, barY + i, (barWidth - i * 2) * progress, 12 - i * 2, 6);
  }
  
  p.fill(255);
  p.textSize(10);
  p.textAlign(p.CENTER);
  p.text(`${Math.floor(progress * 100)}%`, barX + barWidth / 2, barY + 10);
  
  p.stroke(0, 255, 0);
  p.strokeWeight(2);
  p.line(barX + barWidth - 2, barY - 2, barX + barWidth - 2, barY + 14);
  
  p.pop();
}

export function updateParticles(particles: Particle[], deltaTime: number = 1): Particle[] {
  return particles.filter(p => {
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    p.life -= deltaTime;
    p.vx *= 0.98;
    p.vy *= 0.98;
    return p.life > 0;
  });
}

export function updateTrail(trailPoints: TrailPoint[], x: number, y: number, speed: number, maxPoints: number = 30): TrailPoint[] {
  const newPoints = trailPoints.map(pt => ({ ...pt, age: pt.age + 1 })).filter(pt => pt.age < 60);
  
  if (speed > 1) {
    newPoints.unshift({ x, y, age: 0, speed });
  }
  
  return newPoints.slice(0, maxPoints);
}

export function spawnCollisionParticles(particles: Particle[], x: number, y: number, color: string, isMobile: boolean): Particle[] {
  const count = isMobile ? 8 : 15;
  const newParticles: Particle[] = [];
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const speed = 3 + Math.random() * 5;
    newParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      size: 4 + Math.random() * 6,
      color,
      type: 'collision'
    });
  }
  
  return [...particles, ...newParticles].slice(-200);
}

export function spawnFinishParticles(particles: Particle[], x: number, y: number, isMobile: boolean): Particle[] {
  const count = isMobile ? 30 : 60;
  const newParticles: Particle[] = [];
  
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 8;
    newParticles.push({
      x: x + (Math.random() - 0.5) * 100,
      y: y + (Math.random() - 0.5) * 100,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 60 + Math.random() * 40,
      maxLife: 100,
      size: 5 + Math.random() * 10,
      color: '#22c55e',
      type: 'finish'
    });
  }
  
  return [...particles, ...newParticles].slice(-200);
}
