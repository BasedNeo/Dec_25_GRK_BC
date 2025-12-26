import { GameState, Alien, Bullet, Explosion, PowerUp } from './gameEngine';
import fudImage from '@assets/generated_images/glowing_red_fud_neon_text.png';
import robotChickenImage from '@assets/fud-alien.png';
import landerBgImage from '@assets/b303721e-ccd4-4589-848c-0e8986bad2ff_1766039912853.png';

// Preload game images
let fudImageElement: HTMLImageElement | null = null;
let robotChickenElement: HTMLImageElement | null = null;
let robotChickenLoaded = false;
let landerBgElement: HTMLImageElement | null = null;
let landerBgLoaded = false;

// Animated background state
let bgOffset = 0;
const GRID_SIZE = 40;

if (typeof window !== 'undefined') {
  fudImageElement = new Image();
  fudImageElement.src = fudImage;
  
  robotChickenElement = new Image();
  robotChickenElement.crossOrigin = 'anonymous';
  robotChickenElement.onload = () => {
    robotChickenLoaded = true;
  };
  robotChickenElement.src = robotChickenImage;
  
  landerBgElement = new Image();
  landerBgElement.crossOrigin = 'anonymous';
  landerBgElement.onload = () => {
    landerBgLoaded = true;
  };
  landerBgElement.src = landerBgImage;
}

const COLORS = {
  shipCyan: '#00ffff',
  shipGreen: '#6cff61',
  bulletYellow: '#ffff00',
  bulletEnemy: '#ff4444',
  alienRed: '#ff0066',
  alienBlue: '#0088ff',
  alienGreen: '#00ff88',
  alienPurple: '#aa00ff',
  alienYellow: '#ffcc00',
  explosionOrange: '#ff8800',
  powerUpGold: '#ffd700',
  starWhite: '#ffffff',
};

export function render(
  ctx: CanvasRenderingContext2D, 
  state: GameState, 
  w: number, 
  h: number, 
  isHolder: boolean,
  shipImage?: HTMLImageElement
): void {
  // Premium gradient background
  const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
  bgGradient.addColorStop(0, '#000816');
  bgGradient.addColorStop(0.5, '#001122');
  bgGradient.addColorStop(1, '#000816');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, w, h);
  
  // Animated moving grid
  bgOffset = (bgOffset + 0.3) % GRID_SIZE;
  const pulseIntensity = 0.15 + 0.05 * Math.sin(state.time * 0.02);
  ctx.strokeStyle = `rgba(0, 255, 255, ${pulseIntensity})`;
  ctx.lineWidth = 0.5;
  
  // Vertical grid lines
  for (let x = -GRID_SIZE + bgOffset; x < w + GRID_SIZE; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  
  // Horizontal grid lines
  for (let y = -GRID_SIZE + bgOffset; y < h + GRID_SIZE; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  
  // Enhanced twinkling stars with glow
  state.stars.forEach(star => {
    const twinkle = 0.5 + 0.5 * Math.sin(state.time * 0.05 + star.x * 0.1);
    const alpha = star.brightness * twinkle;
    
    // Star glow
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = star.speed > 0.5 ? 4 : 2;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(Math.floor(star.x), Math.floor(star.y), star.speed > 0.5 ? 1.5 : 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  
  state.powerUps.forEach(pu => drawPowerUp(ctx, pu, state.time));
  
  state.aliens.filter(a => a.active).forEach(alien => drawAlien(ctx, alien, state.time));
  
  state.bullets.filter(b => b.active).forEach(bullet => drawBullet(ctx, bullet));
  
  if (state.player.active && (state.player.invincible <= 0 || state.time % 8 < 4)) {
    drawPlayer(ctx, state.player, isHolder, shipImage, state.time);
  }
  
  state.explosions.forEach(exp => drawExplosion(ctx, exp));
  
  drawHUD(ctx, state, w, h);
  
  if (state.phase === 'dying' || state.phase === 'respawning') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, w, h);
  }
  
  if (state.phase === 'gameOver') {
    drawGameOver(ctx, state, w, h);
  }
  
  if (state.phase === 'lander' || state.phase === 'landerReady') {
    drawLander(ctx, state, w, h, isHolder);
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D, 
  p: GameState['player'], 
  isHolder: boolean,
  shipImage?: HTMLImageElement,
  time: number = 0
): void {
  ctx.save();
  ctx.translate(p.pos.x + p.size.x / 2, p.pos.y + p.size.y / 2);
  
  if (shipImage && shipImage.complete) {
    ctx.drawImage(shipImage, -p.size.x / 2, -p.size.y / 2, p.size.x, p.size.y);
  } else {
    const color = isHolder ? COLORS.shipGreen : COLORS.shipCyan;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(-24, 24);
    ctx.lineTo(-8, 16);
    ctx.lineTo(-8, 32);
    ctx.lineTo(8, 32);
    ctx.lineTo(8, 16);
    ctx.lineTo(24, 24);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#001133';
    ctx.beginPath();
    ctx.ellipse(0, -8, 8, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = `rgba(255, 136, 0, ${0.5 + 0.3 * Math.sin(time * 0.3)})`;
    ctx.beginPath();
    ctx.ellipse(-4, 28, 4, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(4, 28, 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  
  if (p.powerUp === 'shield') {
    ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + 0.2 * Math.sin(time * 0.1)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  ctx.restore();
}

function drawAlien(ctx: CanvasRenderingContext2D, alien: Alien, time: number): void {
  const { x, y } = alien.pos;
  const frame = Math.floor(alien.animFrame / 10) % 2;
  const pulseGlow = 0.5 + 0.5 * Math.sin(time * 0.1);
  
  ctx.save();
  ctx.translate(x + alien.size.x / 2, y + alien.size.y / 2);
  
  if (alien.state === 'diving') {
    const angle = Math.atan2(alien.vel?.y || 1, alien.vel?.x || 0) - Math.PI / 2;
    ctx.rotate(angle * 0.3);
    
    for (let i = 1; i <= 3; i++) {
      const trailAlpha = 0.15 - i * 0.04;
      ctx.fillStyle = `rgba(255, 0, 102, ${trailAlpha})`;
      ctx.beginPath();
      ctx.arc(0, i * 8, 10 - i * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  switch (alien.type) {
    case 'grunt':
      ctx.shadowColor = '#ff00ff';
      ctx.shadowBlur = 8 + pulseGlow * 6;
      ctx.fillStyle = `hsl(${320 + Math.sin(time * 0.05) * 20}, 100%, 60%)`;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FUD', 0, 0);
      ctx.shadowBlur = 0;
      break;
      
    case 'bee':
      if (robotChickenElement && robotChickenLoaded) {
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 6 + pulseGlow * 4;
        const imgSize = 40;
        ctx.drawImage(robotChickenElement, -imgSize/2, -imgSize/2, imgSize, imgSize);
        ctx.shadowBlur = 0;
      } else {
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#0088aa';
        ctx.beginPath();
        ctx.ellipse(0, 2, 10, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -10, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff0066';
        ctx.shadowColor = '#ff0066';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(-3, -11, 2.5, 0, Math.PI * 2);
        ctx.arc(3, -11, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      break;
      
    case 'butterfly':
      ctx.shadowColor = '#aa00ff';
      ctx.shadowBlur = 10 + pulseGlow * 5;
      const wingHue = 280 + Math.sin(time * 0.08) * 30;
      ctx.fillStyle = `hsl(${wingHue}, 100%, 55%)`;
      ctx.beginPath();
      ctx.ellipse(-10, 0, 8, 12, frame ? 0.5 : 0, 0, Math.PI * 2);
      ctx.ellipse(10, 0, 8, 12, frame ? -0.5 : 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 3, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
      
    case 'boss':
      ctx.shadowColor = '#ff0066';
      ctx.shadowBlur = 15 + pulseGlow * 8;
      const bossGradient = ctx.createLinearGradient(-14, 0, 14, 0);
      bossGradient.addColorStop(0, '#ff0066');
      bossGradient.addColorStop(0.5, '#ff00aa');
      bossGradient.addColorStop(1, '#ff0066');
      ctx.fillStyle = bossGradient;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-10, 14);
      ctx.lineTo(10, 14);
      ctx.lineTo(14, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(-5, 0, 3.5, 0, Math.PI * 2);
      ctx.arc(5, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(-5, 0, 1.5, 0, Math.PI * 2);
      ctx.arc(5, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'galaga':
      if (fudImageElement && fudImageElement.complete) {
        ctx.shadowColor = '#ff0066';
        ctx.shadowBlur = 12 + pulseGlow * 8;
        const imgSize = 44;
        ctx.drawImage(fudImageElement, -imgSize/2, -imgSize/2, imgSize, imgSize);
        ctx.shadowBlur = 0;
      } else {
        ctx.shadowColor = '#ff0066';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ff0066';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('FUD', 0, 0);
        ctx.shadowBlur = 0;
      }
      break;
  }
  
  ctx.restore();
}

function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet): void {
  if (bullet.isEnemy) {
    // Enemy bullet with red glow
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 8;
    ctx.fillStyle = COLORS.bulletEnemy;
    ctx.beginPath();
    ctx.arc(bullet.pos.x + 3, bullet.pos.y + 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    // Player bullet with cyan glow trail
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLORS.bulletYellow;
    ctx.fillRect(bullet.pos.x, bullet.pos.y, bullet.size.x, bullet.size.y);
    ctx.shadowBlur = 0;
    
    // Glow trail effect
    ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
    ctx.fillRect(bullet.pos.x - 1, bullet.pos.y + 4, bullet.size.x + 2, bullet.size.y);
    ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.fillRect(bullet.pos.x - 2, bullet.pos.y + 8, bullet.size.x + 4, bullet.size.y);
  }
}

function drawExplosion(ctx: CanvasRenderingContext2D, exp: Explosion): void {
  const progress = exp.frame / exp.maxFrames;
  const radius = exp.size * (0.3 + progress * 0.7);
  const alpha = 1 - progress;
  
  const hueShift = progress * 60;
  
  ctx.shadowColor = `hsl(${340 - hueShift}, 100%, 50%)`;
  ctx.shadowBlur = 25 + (1 - progress) * 15;
  ctx.strokeStyle = `hsla(${340 - hueShift}, 100%, 60%, ${alpha})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(exp.pos.x, exp.pos.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 15;
  ctx.strokeStyle = `rgba(0, 255, 255, ${alpha * 0.6})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(exp.pos.x, exp.pos.y, radius * 0.75, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  
  const coreGradient = ctx.createRadialGradient(
    exp.pos.x, exp.pos.y, 0,
    exp.pos.x, exp.pos.y, radius * 0.6
  );
  coreGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
  coreGradient.addColorStop(0.3, `hsla(${300 - hueShift}, 100%, 70%, ${alpha * 0.7})`);
  coreGradient.addColorStop(0.6, `hsla(${180}, 100%, 50%, ${alpha * 0.4})`);
  coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(exp.pos.x, exp.pos.y, radius * 0.6, 0, Math.PI * 2);
  ctx.fill();
  
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + progress * 4;
    const dist = radius * (0.4 + progress * 0.8);
    const sparkAlpha = alpha * (1 - (i % 3) * 0.2);
    const sparkHue = (i * 30 + hueShift * 2) % 360;
    
    ctx.shadowColor = `hsl(${sparkHue}, 100%, 60%)`;
    ctx.shadowBlur = 8;
    ctx.fillStyle = `hsla(${sparkHue}, 100%, 70%, ${sparkAlpha})`;
    ctx.beginPath();
    ctx.arc(
      exp.pos.x + Math.cos(angle) * dist,
      exp.pos.y + Math.sin(angle) * dist,
      4 * (1 - progress),
      0, Math.PI * 2
    );
    ctx.fill();
  }
  
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + progress * 2;
    const innerDist = radius * (0.2 + progress * 0.4);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(
      exp.pos.x + Math.cos(angle) * innerDist,
      exp.pos.y + Math.sin(angle) * innerDist,
      2 * (1 - progress * 0.5),
      0, Math.PI * 2
    );
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUp, time: number): void {
  ctx.save();
  ctx.translate(pu.pos.x + 10, pu.pos.y + 10);
  ctx.rotate(time * 0.05);
  
  const glow = 0.5 + 0.3 * Math.sin(time * 0.1);
  
  // Outer glow ring
  const glowGradient = ctx.createRadialGradient(0, 0, 8, 0, 0, 18);
  glowGradient.addColorStop(0, `rgba(255, 215, 0, ${glow * 0.5})`);
  glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  
  // Star shape with glow
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#ffd700';
  ctx.fillStyle = `rgba(255, 215, 0, ${glow + 0.3})`;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const innerAngle = angle + Math.PI / 5;
    ctx.lineTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
    ctx.lineTo(Math.cos(innerAngle) * 4, Math.sin(innerAngle) * 4);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  
  ctx.fillStyle = '#000';
  ctx.font = 'bold 8px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const icon = pu.type === 'double' ? '2x' : pu.type === 'shield' ? 'S' : 'F';
  ctx.fillText(icon, 0, 0);
  
  ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number): void {
  // Semi-transparent HUD panel
  ctx.fillStyle = 'rgba(0, 8, 22, 0.75)';
  ctx.fillRect(5, 5, 130, 38);
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(5, 5, 130, 38);
  
  // Score with glow
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#00ffff';
  ctx.fillStyle = '#00ffff';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${state.score.toLocaleString()}`, 10, 20);
  ctx.shadowBlur = 0;
  
  ctx.fillStyle = '#666';
  ctx.font = '10px monospace';
  ctx.fillText(`HI: ${state.highScore.toLocaleString()}`, 10, 34);
  
  // Wave indicator with glow
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#00ffff';
  ctx.fillStyle = '#00ffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`WAVE ${state.wave}`, w / 2, 20);
  ctx.shadowBlur = 0;
  
  // Lives display with glow
  ctx.shadowBlur = 6;
  ctx.shadowColor = '#00ffff';
  ctx.fillStyle = '#00ffff';
  for (let i = 0; i < state.player.lives; i++) {
    ctx.beginPath();
    ctx.moveTo(w - 20 - i * 25, 12);
    ctx.lineTo(w - 30 - i * 25, 22);
    ctx.lineTo(w - 10 - i * 25, 22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  
  // Power-up indicator with glow
  if (state.player.powerUp !== 'none') {
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffd700';
    ctx.fillStyle = COLORS.powerUpGold;
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'right';
    const timeLeft = Math.ceil(state.player.powerUpTime / 60);
    ctx.fillText(`${state.player.powerUp.toUpperCase()} ${timeLeft}s`, w - 10, 38);
    ctx.shadowBlur = 0;
  }
}

function drawGameOver(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, w, h);
  
  ctx.fillStyle = '#ff0066';
  ctx.font = 'bold 32px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', w / 2, h / 2 - 40);
  
  ctx.fillStyle = '#fff';
  ctx.font = '18px monospace';
  ctx.fillText(`SCORE: ${state.score.toLocaleString()}`, w / 2, h / 2);
  
  ctx.fillStyle = '#0ff';
  ctx.font = '14px monospace';
  ctx.fillText(`WAVE: ${state.wave}`, w / 2, h / 2 + 30);
  
  if (state.score >= state.highScore && state.score > 0) {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('NEW HIGH SCORE!', w / 2, h / 2 + 60);
  }
}

function drawLander(ctx: CanvasRenderingContext2D, state: GameState, w: number, h: number, isHolder: boolean): void {
  const p = state.player;
  const GROUND = h - 60;
  const PAD_X = w / 2 - 50;
  const PAD_W = 100;
  
  // Draw space background image
  if (landerBgElement && landerBgLoaded) {
    ctx.drawImage(landerBgElement, 0, 0, w, h);
  } else {
    // Fallback gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0a0020');
    gradient.addColorStop(0.5, '#1a0040');
    gradient.addColorStop(1, '#2a0060');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }
  
  // Draw ground overlay at bottom
  ctx.fillStyle = 'rgba(30, 0, 50, 0.9)';
  ctx.fillRect(0, GROUND, w, 60);
  
  // Draw landing base structure
  ctx.fillStyle = '#555';
  ctx.fillRect(PAD_X - 10, GROUND - 8, PAD_W + 20, 12);
  
  // Landing pad surface
  ctx.fillStyle = '#888';
  ctx.fillRect(PAD_X, GROUND - 10, PAD_W, 8);
  
  // Landing pad markings
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(PAD_X + 10, GROUND - 8, 20, 4);
  ctx.fillRect(PAD_X + PAD_W - 30, GROUND - 8, 20, 4);
  
  // Blinking landing lights
  ctx.fillStyle = state.time % 30 < 15 ? '#00ff00' : '#004400';
  ctx.beginPath();
  ctx.arc(PAD_X + 8, GROUND - 4, 4, 0, Math.PI * 2);
  ctx.arc(PAD_X + PAD_W - 8, GROUND - 4, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Base buildings on sides
  ctx.fillStyle = '#444';
  ctx.fillRect(10, GROUND - 30, 30, 30);
  ctx.fillRect(w - 40, GROUND - 25, 30, 25);
  
  // Building windows
  ctx.fillStyle = '#00ffff44';
  ctx.fillRect(15, GROUND - 25, 8, 8);
  ctx.fillRect(27, GROUND - 25, 8, 8);
  ctx.fillRect(w - 35, GROUND - 20, 8, 8);
  
  // Draw the ship using same style as main game
  ctx.save();
  ctx.translate(p.pos.x + p.size.x / 2, p.pos.y + p.size.y / 2);
  
  const color = isHolder ? COLORS.shipGreen : COLORS.shipCyan;
  
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.lineTo(-24, 24);
  ctx.lineTo(-8, 16);
  ctx.lineTo(-8, 32);
  ctx.lineTo(8, 32);
  ctx.lineTo(8, 16);
  ctx.lineTo(24, 24);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = '#001133';
  ctx.beginPath();
  ctx.ellipse(0, -8, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Thruster flames when fuel is being used
  if (p.fuel && p.fuel > 0 && (p.vel.y < 0 || state.time % 4 < 2)) {
    ctx.fillStyle = `rgba(255, 136, 0, ${0.5 + 0.3 * Math.sin(state.time * 0.3)})`;
    ctx.beginPath();
    ctx.ellipse(-4, 36, 4, 10 + Math.random() * 6, 0, 0, Math.PI * 2);
    ctx.ellipse(4, 36, 4, 10 + Math.random() * 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
  
  // HUD display
  const vel = Math.sqrt(p.vel.x ** 2 + p.vel.y ** 2);
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(5, h - 85, 100, 50);
  ctx.strokeStyle = '#00ffff44';
  ctx.strokeRect(5, h - 85, 100, 50);
  
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  
  ctx.fillStyle = vel < 1 ? '#00ff00' : vel < 1.5 ? '#ffff00' : '#ff0000';
  ctx.fillText(`VEL: ${vel.toFixed(1)}`, 12, h - 68);
  
  ctx.fillStyle = (p.fuel || 0) > 30 ? '#00ff00' : '#ff0000';
  ctx.fillText(`FUEL: ${Math.floor(p.fuel || 0)}%`, 12, h - 52);
  
  ctx.fillStyle = '#00ffff';
  ctx.fillText('LAND SAFELY!', 12, h - 38);
}
