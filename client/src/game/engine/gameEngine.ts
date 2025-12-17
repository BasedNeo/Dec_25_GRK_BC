export interface Vec2 { x: number; y: number; }
export interface Entity { pos: Vec2; vel: Vec2; size: Vec2; active: boolean; }

export interface Alien extends Entity {
  type: 'glitch' | 'jelly' | 'serpent' | 'fractal' | 'boss';
  hp: number;
  pts: number;
  phase: number;
  segments?: Vec2[];
}

export interface GameState {
  level: number;
  mode: 'shooter' | 'lander' | 'complete';
  player: Entity & { fuel: number };
  bullets: Entity[];
  aliens: Alien[];
  score: number;
  lives: number;
  gameOver: boolean;
  time: number;
}

export const getCanvasSize = () => {
  const maxW = Math.min(400, window.innerWidth - 32);
  const maxH = Math.min(600, window.innerHeight - 200);
  return { width: maxW, height: maxH };
};

export function createGame(w: number, h: number, extraLife: boolean): GameState {
  return {
    level: 1, mode: 'shooter',
    player: { pos: { x: w/2 - 20, y: h - 60 }, vel: { x: 0, y: 0 }, size: { x: 40, y: 40 }, active: true, fuel: 100 },
    bullets: [], aliens: [], score: 0, lives: extraLife ? 4 : 3, gameOver: false, time: 0,
  };
}

export function spawnAliens(state: GameState, w: number): void {
  const { level } = state;
  const types: Alien['type'][] = ['glitch', 'jelly', 'serpent', 'fractal'];
  const type = types[Math.min(level - 1, 3)] || 'glitch';
  const count = 4 + level * 2;

  for (let i = 0; i < count; i++) {
    const x = (w / (count + 1)) * (i + 1);
    const alien: Alien = {
      pos: { x, y: -40 - (i % 3) * 50 }, vel: { x: (Math.random() - 0.5) * 2, y: 0 },
      size: { x: 30, y: 30 }, active: true, type, hp: type === 'fractal' ? 2 : 1,
      pts: [10, 25, 15, 50][Math.min(level - 1, 3)], phase: Math.random() * Math.PI * 2,
    };
    if (type === 'serpent') {
      alien.segments = [{ ...alien.pos }];
      for (let j = 1; j < 5; j++) alien.segments.push({ x: alien.pos.x, y: alien.pos.y - j * 20 });
    }
    state.aliens.push(alien);
  }

  if (level === 2 || level === 4) {
    state.aliens.push({
      pos: { x: w/2 - 40, y: -100 }, vel: { x: 0, y: 0 }, size: { x: 80, y: 80 },
      active: true, type: 'boss', hp: 4, pts: 500, phase: 0,
    });
  }
}

export function updateGame(state: GameState, w: number, h: number): void {
  if (state.gameOver) return;
  state.time++;

  if (state.mode === 'shooter') updateShooter(state, w, h);
  else if (state.mode === 'lander') updateLander(state, w, h);
}

function updateShooter(state: GameState, w: number, h: number): void {
  state.bullets = state.bullets.filter(b => { b.pos.y -= 8; return b.pos.y > -20 && b.active; });

  state.aliens.forEach(a => {
    if (!a.active) return;
    
    if (a.type === 'glitch') { a.pos.y += 1.5; a.pos.x += Math.sin(state.time * 0.1 + a.phase) * 1; }
    else if (a.type === 'jelly') { a.pos.y += 1; a.pos.x += Math.sin(state.time * 0.05 + a.phase) * 2; }
    else if (a.type === 'serpent' && a.segments) {
      a.segments[0].x += a.vel.x; a.segments[0].y += 0.8;
      if (a.segments[0].x < 20 || a.segments[0].x > w - 20) a.vel.x *= -1;
      for (let i = 1; i < a.segments.length; i++) {
        a.segments[i].x += (a.segments[i-1].x - a.segments[i].x) * 0.15;
        a.segments[i].y += (a.segments[i-1].y - a.segments[i].y) * 0.15;
      }
      a.pos = { ...a.segments[0] };
    }
    else if (a.type === 'fractal') { a.pos.y += 0.5; a.phase += 0.03; }
    else if (a.type === 'boss') { a.pos.x = w/2 - 40 + Math.sin(state.time * 0.02) * 100; a.pos.y = Math.min(80, a.pos.y + 0.5); }

    if (a.pos.y > h - 40) { a.active = false; state.lives--; if (state.lives <= 0) state.gameOver = true; }
  });

  state.bullets.forEach(b => {
    state.aliens.forEach(a => {
      if (b.active && a.active && collides(b, a)) {
        b.active = false; a.hp--;
        if (a.hp <= 0) { a.active = false; state.score += a.pts; }
      }
    });
  });

  state.aliens.forEach(a => {
    if (a.active && collides(state.player, a)) {
      a.active = false; state.lives--; if (state.lives <= 0) state.gameOver = true;
    }
  });

  state.aliens = state.aliens.filter(a => a.active);

  if (state.aliens.length === 0) {
    state.score += 100;
    state.level++;
    if (state.level > 4) { state.mode = 'lander'; state.player.pos = { x: w/2, y: 50 }; state.player.vel = { x: 0, y: 0 }; state.player.fuel = 100; }
    else spawnAliens(state, w);
  }
}

function updateLander(state: GameState, w: number, h: number): void {
  const p = state.player;
  const GRAVITY = 0.04, PAD_X = w/2 - 40, PAD_W = 80, GROUND = h - 50;

  p.vel.y += GRAVITY;
  p.pos.x += p.vel.x; p.pos.y += p.vel.y;
  p.pos.x = Math.max(20, Math.min(w - 20, p.pos.x));

  if (p.pos.y >= GROUND - 20) {
    const onPad = p.pos.x >= PAD_X && p.pos.x <= PAD_X + PAD_W;
    const speed = Math.abs(p.vel.y);
    if (onPad && speed < 2) {
      state.mode = 'complete';
      state.score += speed < 1 ? 500 : 200;
    } else {
      state.lives--; state.gameOver = state.lives <= 0;
      if (!state.gameOver) { p.pos = { x: w/2, y: 50 }; p.vel = { x: 0, y: 0 }; p.fuel = 100; }
    }
  }
}

export function applyInput(state: GameState, input: { left: boolean; right: boolean; up: boolean; shoot: boolean }, w: number): void {
  const p = state.player;
  if (state.mode === 'shooter') {
    if (input.left) p.pos.x = Math.max(0, p.pos.x - 6);
    if (input.right) p.pos.x = Math.min(w - p.size.x, p.pos.x + 6);
    if (input.shoot && state.time % 10 === 0) {
      state.bullets.push({ pos: { x: p.pos.x + p.size.x/2 - 3, y: p.pos.y }, vel: { x: 0, y: -8 }, size: { x: 6, y: 15 }, active: true });
    }
  } else if (state.mode === 'lander' && p.fuel > 0) {
    if (input.up) { p.vel.y -= 0.1; p.fuel -= 0.5; }
    if (input.left) { p.vel.x -= 0.05; p.fuel -= 0.2; }
    if (input.right) { p.vel.x += 0.05; p.fuel -= 0.2; }
  }
}

function collides(a: Entity, b: Entity): boolean {
  return a.pos.x < b.pos.x + b.size.x && a.pos.x + a.size.x > b.pos.x &&
         a.pos.y < b.pos.y + b.size.y && a.pos.y + a.size.y > b.pos.y;
}
