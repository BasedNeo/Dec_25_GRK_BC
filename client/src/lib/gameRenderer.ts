import { GameState, Alien } from './gameEngine';

export function render(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, isHolder: boolean): void {
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(state.time * 0.02 + i) * 0.2})`;
    ctx.fillRect((i * 73) % w, ((i * 137) + state.time * 0.3) % h, 1, 1);
  }

  if (state.mode === 'shooter') renderShooter(ctx, state, w, h, isHolder);
  else if (state.mode === 'lander') renderLander(ctx, state, w, h, isHolder);
}

function renderShooter(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, isHolder: boolean): void {
  const p = state.player;
  ctx.fillStyle = isHolder ? '#6cff61' : '#00ffff';
  ctx.beginPath();
  ctx.moveTo(p.pos.x + p.size.x/2, p.pos.y);
  ctx.lineTo(p.pos.x, p.pos.y + p.size.y);
  ctx.lineTo(p.pos.x + p.size.x, p.pos.y + p.size.y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#00ffff';
  state.bullets.forEach(b => ctx.fillRect(b.pos.x, b.pos.y, b.size.x, b.size.y));

  state.aliens.forEach(a => renderAlien(ctx, a, state.time));
}

function renderAlien(ctx: CanvasRenderingContext2D, a: Alien, time: number): void {
  const { x, y } = a.pos;
  
  if (a.type === 'glitch') {
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(x + Math.sin(time * 0.2) * 2, y, 24, 24);
    ctx.fillStyle = '#00ffff';
    if (Math.random() > 0.7) ctx.fillRect(x - 4, y + 8, 6, 3);
  } else if (a.type === 'jelly') {
    ctx.fillStyle = 'rgba(139,0,255,0.6)';
    ctx.beginPath(); ctx.arc(x + 15, y + 10, 15, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = 'rgba(0,255,255,0.5)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(x + 5 + i*10, y + 10);
      ctx.lineTo(x + 5 + i*10 + Math.sin(time*0.1 + i)*4, y + 35); ctx.stroke();
    }
  } else if (a.type === 'serpent' && a.segments) {
    ctx.fillStyle = '#00ff88';
    a.segments.forEach((s, i) => { ctx.beginPath(); ctx.arc(s.x, s.y, i === 0 ? 10 : 7, 0, Math.PI*2); ctx.fill(); });
    if (a.segments[0]) { ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(a.segments[0].x-3, a.segments[0].y-2, 2, 0, Math.PI*2); ctx.arc(a.segments[0].x+3, a.segments[0].y-2, 2, 0, Math.PI*2); ctx.fill(); }
  } else if (a.type === 'fractal') {
    ctx.save(); ctx.translate(x + 20, y + 20); ctx.rotate(a.phase);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const ang = Math.PI/3*i - Math.PI/2; ctx.lineTo(Math.cos(ang)*20, Math.sin(ang)*20); } ctx.closePath(); ctx.stroke();
    ctx.fillStyle = `rgba(191,0,255,${0.5 + Math.sin(time*0.1)*0.2})`; ctx.fill();
    ctx.restore();
  } else if (a.type === 'boss') {
    ctx.fillStyle = '#1a0030'; ctx.beginPath(); ctx.ellipse(x+40, y+40, 35, 30, 0, 0, Math.PI*2); ctx.fill();
    if (Math.sin(time*0.05) < 0.9) {
      ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(x+40, y+40, 20, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x+40, y+40, 8, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#00ffff';
    for (let i = 0; i < a.hp; i++) {
      const ang = time*0.03 + (Math.PI*2/4)*i;
      ctx.beginPath(); ctx.arc(x+40 + Math.cos(ang)*45, y+40 + Math.sin(ang)*30, 8, 0, Math.PI*2); ctx.fill();
    }
  }
}

function renderLander(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, isHolder: boolean): void {
  const p = state.player;
  const GROUND = h - 50, PAD_X = w/2 - 40, PAD_W = 80;

  ctx.fillStyle = '#4a0080';
  ctx.fillRect(0, GROUND, w, 50);
  ctx.fillStyle = '#333'; ctx.fillRect(PAD_X, GROUND, PAD_W, 8);
  ctx.fillStyle = Math.sin(state.time * 0.1) > 0 ? '#00ff00' : '#004400';
  ctx.beginPath(); ctx.arc(PAD_X + 8, GROUND + 4, 3, 0, Math.PI*2); ctx.arc(PAD_X + PAD_W - 8, GROUND + 4, 3, 0, Math.PI*2); ctx.fill();

  ctx.fillStyle = isHolder ? '#6cff61' : '#00ffff';
  ctx.beginPath(); ctx.moveTo(p.pos.x, p.pos.y - 15); ctx.lineTo(p.pos.x - 12, p.pos.y + 15); ctx.lineTo(p.pos.x + 12, p.pos.y + 15); ctx.closePath(); ctx.fill();

  if (p.fuel > 0 && state.time % 4 < 2) {
    ctx.fillStyle = '#ff8800';
    ctx.beginPath(); ctx.moveTo(p.pos.x - 5, p.pos.y + 15); ctx.lineTo(p.pos.x, p.pos.y + 25 + Math.random()*8); ctx.lineTo(p.pos.x + 5, p.pos.y + 15); ctx.fill();
  }

  ctx.fillStyle = '#fff'; ctx.font = '12px monospace';
  const vel = Math.sqrt(p.vel.x**2 + p.vel.y**2);
  ctx.fillStyle = vel < 1 ? '#00ff00' : vel < 2 ? '#ffff00' : '#ff0000';
  ctx.fillText(`VEL: ${vel.toFixed(1)}`, 10, 20);
  ctx.fillStyle = p.fuel > 30 ? '#00ff00' : '#ff0000';
  ctx.fillText(`FUEL: ${Math.floor(p.fuel)}%`, 10, 35);
}
