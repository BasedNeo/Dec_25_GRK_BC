import { GameState, Alien } from './gameEngine';

const COLORS = {
  bg: '#050510',
  stars: 'rgba(255,255,255,0.6)',
  cyan: '#00ffff',
  purple: '#8b00ff',
  magenta: '#ff00ff',
  green: '#00ff88',
  gold: '#ffd700',
  red: '#ff0044',
  orange: '#ff8800',
};

let rocketImg: HTMLImageElement | null = null;
const loadRocketImage = () => {
  if (!rocketImg) {
    rocketImg = new Image();
    rocketImg.src = '/attached_assets/Based Guardians rocket (1).png';
  }
  return rocketImg;
};

export function render(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, isHolder: boolean): void {
  renderBackground(ctx, state, w, h);
  
  if (state.mode === 'shooter') renderShooter(ctx, state, w, h, isHolder);
  else if (state.mode === 'lander') renderLander(ctx, state, w, h, isHolder);
  
  renderScanlines(ctx, w, h);
  renderVignette(ctx, w, h);
}

function renderBackground(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0a0015');
  grad.addColorStop(0.5, '#050510');
  grad.addColorStop(1, '#0a0020');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 60; i++) {
    const x = (i * 73 + state.time * 0.1) % w;
    const y = (i * 137 + state.time * 0.5) % h;
    const size = (i % 3) === 0 ? 2 : 1;
    const alpha = 0.3 + Math.sin(state.time * 0.03 + i) * 0.3;
    ctx.fillStyle = i % 5 === 0 ? `rgba(0,255,255,${alpha})` : `rgba(255,255,255,${alpha})`;
    ctx.fillRect(x, y, size, size);
  }

  if (state.time % 120 < 60) {
    const nebulaX = (state.time * 0.2) % w;
    const nebulaGrad = ctx.createRadialGradient(nebulaX, h * 0.3, 0, nebulaX, h * 0.3, 100);
    nebulaGrad.addColorStop(0, 'rgba(139,0,255,0.1)');
    nebulaGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(0, 0, w, h);
  }
}

function renderScanlines(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }
}

function renderVignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createRadialGradient(w/2, h/2, h * 0.3, w/2, h/2, h * 0.8);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function renderShooter(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, isHolder: boolean): void {
  const p = state.player;
  const rocket = loadRocketImage();
  
  if (rocket.complete && rocket.naturalWidth > 0) {
    const rw = 50, rh = 60;
    ctx.save();
    ctx.translate(p.pos.x + p.size.x/2, p.pos.y + p.size.y/2);
    ctx.drawImage(rocket, -rw/2, -rh/2, rw, rh);
    ctx.restore();
  } else {
    renderPlayerShip(ctx, p, isHolder);
  }

  ctx.shadowColor = COLORS.cyan;
  ctx.shadowBlur = 8;
  state.bullets.forEach(b => {
    const grad = ctx.createLinearGradient(b.pos.x, b.pos.y + b.size.y, b.pos.x, b.pos.y);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, COLORS.cyan);
    ctx.fillStyle = grad;
    ctx.fillRect(b.pos.x - 1, b.pos.y, b.size.x + 2, b.size.y);
  });
  ctx.shadowBlur = 0;

  state.aliens.forEach(a => renderAlien(ctx, a, state.time));
}

function renderPlayerShip(ctx: CanvasRenderingContext2D, p: { pos: { x: number; y: number }; size: { x: number; y: number } }, isHolder: boolean): void {
  const cx = p.pos.x + p.size.x/2;
  const cy = p.pos.y + p.size.y/2;
  
  ctx.save();
  ctx.shadowColor = isHolder ? COLORS.green : COLORS.cyan;
  ctx.shadowBlur = 15;

  const shipGrad = ctx.createLinearGradient(cx, p.pos.y, cx, p.pos.y + p.size.y);
  shipGrad.addColorStop(0, isHolder ? '#00ff88' : '#00ffff');
  shipGrad.addColorStop(1, isHolder ? '#008844' : '#0088aa');
  ctx.fillStyle = shipGrad;

  ctx.beginPath();
  ctx.moveTo(cx, p.pos.y - 5);
  ctx.lineTo(cx - 18, p.pos.y + p.size.y);
  ctx.lineTo(cx - 8, p.pos.y + p.size.y - 8);
  ctx.lineTo(cx, p.pos.y + p.size.y - 3);
  ctx.lineTo(cx + 8, p.pos.y + p.size.y - 8);
  ctx.lineTo(cx + 18, p.pos.y + p.size.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(cx, p.pos.y + 12, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function renderAlien(ctx: CanvasRenderingContext2D, a: Alien, time: number): void {
  const { x, y } = a.pos;
  ctx.save();
  
  if (a.type === 'glitch') {
    ctx.shadowColor = COLORS.magenta;
    ctx.shadowBlur = 10;
    const glitchOffset = Math.sin(time * 0.3) * 3;
    
    ctx.fillStyle = COLORS.magenta;
    ctx.fillRect(x + glitchOffset, y, 26, 26);
    
    ctx.fillStyle = COLORS.cyan;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x - glitchOffset, y + 2, 26, 26);
    ctx.globalAlpha = 1;
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 6, y + 8, 5, 5);
    ctx.fillRect(x + 16, y + 8, 5, 5);
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 8 + (time % 10 < 5 ? 1 : 0), y + 10, 2, 2);
    ctx.fillRect(x + 18 + (time % 10 < 5 ? 1 : 0), y + 10, 2, 2);
    
  } else if (a.type === 'jelly') {
    ctx.shadowColor = COLORS.purple;
    ctx.shadowBlur = 12;
    
    const pulseScale = 1 + Math.sin(time * 0.08) * 0.1;
    ctx.save();
    ctx.translate(x + 15, y + 12);
    ctx.scale(pulseScale, pulseScale);
    
    const jellyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
    jellyGrad.addColorStop(0, 'rgba(139,0,255,0.9)');
    jellyGrad.addColorStop(1, 'rgba(139,0,255,0.3)');
    ctx.fillStyle = jellyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 16, Math.PI, 0);
    ctx.fill();
    
    ctx.restore();
    
    ctx.strokeStyle = 'rgba(0,255,255,0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 4 + i * 8, y + 12);
      const wave = Math.sin(time * 0.1 + i * 0.8) * 6;
      ctx.quadraticCurveTo(x + 4 + i * 8 + wave, y + 25, x + 4 + i * 8, y + 38);
      ctx.stroke();
    }
    
  } else if (a.type === 'serpent' && a.segments) {
    ctx.shadowColor = COLORS.green;
    ctx.shadowBlur = 8;
    
    a.segments.forEach((s, i) => {
      const size = i === 0 ? 12 : 9 - i * 0.8;
      const segGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, size);
      segGrad.addColorStop(0, COLORS.green);
      segGrad.addColorStop(1, 'rgba(0,255,136,0.3)');
      ctx.fillStyle = segGrad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
      ctx.fill();
    });
    
    if (a.segments[0]) {
      ctx.fillStyle = COLORS.red;
      ctx.beginPath();
      ctx.arc(a.segments[0].x - 4, a.segments[0].y - 3, 3, 0, Math.PI * 2);
      ctx.arc(a.segments[0].x + 4, a.segments[0].y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(a.segments[0].x - 4, a.segments[0].y - 3, 1.5, 0, Math.PI * 2);
      ctx.arc(a.segments[0].x + 4, a.segments[0].y - 3, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
  } else if (a.type === 'fractal') {
    ctx.save();
    ctx.translate(x + 20, y + 20);
    ctx.rotate(a.phase + time * 0.02);
    
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;
    
    const fractalGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
    fractalGrad.addColorStop(0, 'rgba(255,255,255,0.8)');
    fractalGrad.addColorStop(0.5, 'rgba(191,0,255,0.6)');
    fractalGrad.addColorStop(1, 'rgba(191,0,255,0.2)');
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 3) * i - Math.PI / 2;
      const r = 20 + Math.sin(time * 0.05 + i) * 3;
      const px = Math.cos(ang) * r;
      const py = Math.sin(ang) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = fractalGrad;
    ctx.fill();
    
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 3) * i;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * 12, Math.sin(ang) * 12);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.stroke();
    
    ctx.restore();
    
  } else if (a.type === 'boss') {
    ctx.shadowColor = COLORS.red;
    ctx.shadowBlur = 20;
    
    const bossGrad = ctx.createRadialGradient(x + 40, y + 40, 0, x + 40, y + 40, 40);
    bossGrad.addColorStop(0, '#300030');
    bossGrad.addColorStop(1, '#100010');
    ctx.fillStyle = bossGrad;
    ctx.beginPath();
    ctx.ellipse(x + 40, y + 40, 38, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    
    const eyeOpen = Math.sin(time * 0.05) > -0.8;
    if (eyeOpen) {
      const eyeGrad = ctx.createRadialGradient(x + 40, y + 38, 0, x + 40, y + 38, 22);
      eyeGrad.addColorStop(0, '#ff0000');
      eyeGrad.addColorStop(0.5, '#aa0000');
      eyeGrad.addColorStop(1, '#550000');
      ctx.fillStyle = eyeGrad;
      ctx.beginPath();
      ctx.arc(x + 40, y + 38, 22, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(x + 40, y + 38, 10, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(x + 35, y + 33, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.fillStyle = COLORS.cyan;
    for (let i = 0; i < a.hp; i++) {
      const ang = time * 0.03 + (Math.PI * 2 / 4) * i;
      const orbX = x + 40 + Math.cos(ang) * 48;
      const orbY = y + 40 + Math.sin(ang) * 35;
      
      const orbGrad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, 10);
      orbGrad.addColorStop(0, COLORS.cyan);
      orbGrad.addColorStop(1, 'rgba(0,255,255,0.2)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(orbX, orbY, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  ctx.restore();
}

function renderLander(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, isHolder: boolean): void {
  const p = state.player;
  const GROUND = h - 50;
  const PAD_X = w / 2 - 40;
  const PAD_W = 80;

  const groundGrad = ctx.createLinearGradient(0, GROUND, 0, h);
  groundGrad.addColorStop(0, '#2a0050');
  groundGrad.addColorStop(1, '#1a0030');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, GROUND, w, 50);

  ctx.fillStyle = '#444';
  ctx.fillRect(PAD_X, GROUND, PAD_W, 10);
  ctx.strokeStyle = '#00ff00';
  ctx.lineWidth = 2;
  ctx.strokeRect(PAD_X, GROUND, PAD_W, 10);

  const lightOn = Math.sin(state.time * 0.15) > 0;
  ctx.fillStyle = lightOn ? '#00ff00' : '#003300';
  ctx.shadowColor = lightOn ? '#00ff00' : 'transparent';
  ctx.shadowBlur = lightOn ? 10 : 0;
  ctx.beginPath();
  ctx.arc(PAD_X + 10, GROUND + 5, 4, 0, Math.PI * 2);
  ctx.arc(PAD_X + PAD_W - 10, GROUND + 5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  const rocket = loadRocketImage();
  if (rocket.complete && rocket.naturalWidth > 0) {
    const rw = 40, rh = 50;
    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);
    ctx.drawImage(rocket, -rw/2, -rh/2, rw, rh);
    ctx.restore();
  } else {
    renderPlayerShip(ctx, { pos: { x: p.pos.x - 20, y: p.pos.y - 20 }, size: { x: 40, y: 40 } }, isHolder);
  }

  if (p.fuel > 0 && state.time % 4 < 2) {
    ctx.fillStyle = COLORS.orange;
    ctx.shadowColor = COLORS.orange;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(p.pos.x - 6, p.pos.y + 20);
    ctx.lineTo(p.pos.x, p.pos.y + 35 + Math.random() * 10);
    ctx.lineTo(p.pos.x + 6, p.pos.y + 20);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.font = 'bold 13px "Courier New", monospace';
  const vel = Math.sqrt(p.vel.x ** 2 + p.vel.y ** 2);
  
  ctx.fillStyle = vel < 1 ? COLORS.green : vel < 2 ? COLORS.gold : COLORS.red;
  ctx.fillText(`VEL: ${vel.toFixed(1)}`, 12, 24);
  
  ctx.fillStyle = p.fuel > 30 ? COLORS.green : COLORS.red;
  ctx.fillText(`FUEL: ${Math.floor(p.fuel)}%`, 12, 42);

  ctx.fillStyle = 'rgba(0,255,255,0.3)';
  ctx.fillRect(w - 70, 10, 60, 8);
  ctx.fillStyle = p.fuel > 30 ? COLORS.green : COLORS.red;
  ctx.fillRect(w - 70, 10, (p.fuel / 100) * 60, 8);
}
