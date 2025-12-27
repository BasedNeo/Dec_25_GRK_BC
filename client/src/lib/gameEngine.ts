export interface Vec2 { x: number; y: number; }

export interface Entity {
  pos: Vec2;
  vel: Vec2;
  size: Vec2;
  active: boolean;
}

export interface Bullet extends Entity {
  isEnemy?: boolean;
  type: 'normal' | 'double' | 'spread';
}

export interface Explosion {
  pos: Vec2;
  frame: number;
  maxFrames: number;
  size: number;
}

export interface Star {
  x: number;
  y: number;
  speed: number;
  brightness: number;
}

export interface Alien extends Entity {
  type: 'grunt' | 'bee' | 'butterfly' | 'boss' | 'galaga';
  hp: number;
  pts: number;
  state: 'formation' | 'diving' | 'returning' | 'dead';
  formationPos: Vec2;
  diveProgress: number;
  divePath: Vec2[];
  shootCooldown: number;
  animFrame: number;
}

export interface PowerUp extends Entity {
  type: 'double' | 'shield' | 'speed' | 'bomb';
}

export interface Player extends Entity {
  lives: number;
  powerUp: 'none' | 'double' | 'shield' | 'speed';
  powerUpTime: number;
  shootCooldown: number;
  invincible: number;
  capturedShip: boolean;
  fuel?: number;
}

export interface GameState {
  phase: 'playing' | 'dying' | 'respawning' | 'stageComplete' | 'gameOver' | 'bonus' | 'landerReady' | 'lander' | 'complete';
  stage: number;
  wave: number;
  player: Player;
  bullets: Bullet[];
  aliens: Alien[];
  explosions: Explosion[];
  powerUps: PowerUp[];
  stars: Star[];
  score: number;
  highScore: number;
  time: number;
  spawnTimer: number;
  diveTimer: number;
  bonusTimer: number;
  difficulty: number;
  enemiesKilledThisWave: number;
}

const PLAYER_MOVE_ZONE = 0.4;
const FORMATION_ROWS = 5;

function getDifficultyMultiplier(wave: number): number {
  if (wave === 1) return 0.5;
  if (wave === 2) return 0.75;
  return 1.0;
}

export function getCanvasSize(fullscreen = false) {
  const isMobileDevice = window.innerWidth <= 768 || ('ontouchstart' in window);
  const controlBarHeight = 100;
  
  if (fullscreen || isMobileDevice) {
    return { 
      width: window.innerWidth, 
      height: window.innerHeight - controlBarHeight 
    };
  }
  const maxW = Math.min(420, window.innerWidth - 24);
  const maxH = Math.min(640, window.innerHeight - 180);
  return { width: maxW, height: maxH };
}

function createStars(count: number, w: number, h: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      speed: 0.2 + Math.random() * 0.8,
      brightness: 0.3 + Math.random() * 0.7,
    });
  }
  return stars;
}

export function createGame(w: number, h: number, extraLife: boolean): GameState {
  const highScore = parseInt(localStorage.getItem('galaga_high') || '0');
  
  return {
    phase: 'playing',
    stage: 1,
    wave: 1,
    player: {
      pos: { x: w / 2 - 21, y: h - 60 },
      vel: { x: 0, y: 0 },
      size: { x: 42, y: 42 },
      active: true,
      lives: extraLife ? 4 : 3,
      powerUp: 'none',
      powerUpTime: 0,
      shootCooldown: 0,
      invincible: 150,
      capturedShip: false,
    },
    bullets: [],
    aliens: [],
    explosions: [],
    powerUps: [],
    stars: createStars(80, w, h),
    score: 0,
    highScore,
    time: 0,
    spawnTimer: 60,
    diveTimer: 0,
    bonusTimer: 0,
    difficulty: 1,
    enemiesKilledThisWave: 0,
  };
}

export function spawnWave(state: GameState, w: number): void {
  const { wave } = state;
  const diff = getDifficultyMultiplier(wave);
  const baseCount = Math.min(30, 8 + wave * 3);
  const enemyCount = Math.max(4, Math.floor(baseCount * diff));
  const rows = Math.min(FORMATION_ROWS, 2 + Math.floor(wave / 2));
  const cols = Math.ceil(enemyCount / rows);
  
  const startX = (w - cols * 36) / 2;
  const startY = 50;
  
  let idx = 0;
  for (let row = 0; row < rows && idx < enemyCount; row++) {
    for (let col = 0; col < cols && idx < enemyCount; col++) {
      const formationX = startX + col * 36;
      const formationY = startY + row * 32;
      
      let type: Alien['type'] = 'grunt';
      let hp = 1;
      let pts = 50;
      
      if (row === 0) {
        type = wave >= 3 ? 'galaga' : 'boss';
        hp = wave >= 3 ? 3 : 2;
        pts = wave >= 3 ? 400 : 150;
      } else if (row === 1) {
        type = 'butterfly';
        hp = 1;
        pts = 80;
      } else if (row === 2) {
        type = 'bee';
        pts = 60;
      }
      
      const alien: Alien = {
        pos: { x: formationX, y: -40 - row * 20 },
        vel: { x: 0, y: 2 },
        size: { x: 28, y: 28 },
        active: true,
        type,
        hp,
        pts,
        state: 'returning',
        formationPos: { x: formationX, y: formationY },
        diveProgress: 0,
        divePath: [],
        shootCooldown: 60 + Math.random() * 120,
        animFrame: 0,
      };
      
      state.aliens.push(alien);
      idx++;
    }
  }
  
  state.diveTimer = 120;
}

function generateDivePath(start: Vec2, w: number, h: number): Vec2[] {
  const targetX = Math.random() * (w - 60) + 30;
  const midX1 = Math.random() * w;
  const midX2 = Math.random() * w;
  
  return [
    { ...start },
    { x: midX1, y: h * 0.3 },
    { x: midX2, y: h * 0.6 },
    { x: targetX, y: h + 40 },
  ];
}

function bezier(points: Vec2[], t: number): Vec2 {
  if (points.length === 1) return points[0];
  const newPoints: Vec2[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    newPoints.push({
      x: points[i].x + (points[i + 1].x - points[i].x) * t,
      y: points[i].y + (points[i + 1].y - points[i].y) * t,
    });
  }
  return bezier(newPoints, t);
}

export function updateGame(state: GameState, w: number, h: number): void {
  if (state.phase === 'gameOver' || state.phase === 'complete') return;
  
  state.time++;
  const diff = getDifficultyMultiplier(state.wave);
  
  state.stars.forEach(star => {
    star.y += star.speed;
    if (star.y > h) {
      star.y = 0;
      star.x = Math.random() * w;
    }
  });
  
  if (state.phase === 'dying') {
    if (state.time % 60 === 0) {
      if (state.player.lives > 0) {
        state.phase = 'respawning';
        state.player.pos = { x: w / 2 - 21, y: h - 60 };
        state.player.active = true;
        state.player.invincible = 200;
      } else {
        state.phase = 'gameOver';
        if (state.score > state.highScore) {
          localStorage.setItem('galaga_high', state.score.toString());
        }
      }
    }
    return;
  }
  
  if (state.phase === 'respawning') {
    state.player.invincible--;
    if (state.player.invincible <= 0) {
      state.phase = 'playing';
    }
  }
  
  const p = state.player;
  p.pos.x += p.vel.x;
  p.pos.y += p.vel.y;
  
  p.pos.x = Math.max(0, Math.min(w - p.size.x, p.pos.x));
  p.pos.y = Math.max(h * (1 - PLAYER_MOVE_ZONE), Math.min(h - p.size.y, p.pos.y));
  
  p.vel.x *= 0.92;
  p.vel.y *= 0.92;
  
  if (p.shootCooldown > 0) p.shootCooldown--;
  if (p.invincible > 0) p.invincible--;
  
  if (p.powerUpTime > 0) {
    p.powerUpTime--;
    if (p.powerUpTime <= 0) p.powerUp = 'none';
  }
  
  state.bullets = state.bullets.filter(b => {
    if (b.isEnemy) {
      b.pos.y += 5 * diff;
      return b.pos.y < h + 20 && b.active;
    } else {
      b.pos.y -= 10;
      return b.pos.y > -20 && b.active;
    }
  });
  
  state.spawnTimer--;
  const activeAliens = state.aliens.filter(a => a.active).length;
  if (state.spawnTimer <= 0 && activeAliens === 0) {
    state.wave++;
    state.difficulty = 1 + state.wave * 0.1;
    state.aliens = []; // Clear old aliens array
    spawnWave(state, w);
    state.spawnTimer = 999999;
    state.enemiesKilledThisWave = 0;
  }
  
  state.diveTimer--;
  if (state.diveTimer <= 0) {
    const formationAliens = state.aliens.filter(a => a.state === 'formation' && a.active);
    if (formationAliens.length > 0) {
      const diver = formationAliens[Math.floor(Math.random() * formationAliens.length)];
      diver.state = 'diving';
      diver.diveProgress = 0;
      diver.divePath = generateDivePath(diver.pos, w, h);
    }
    state.diveTimer = Math.max(30, 90 - state.wave * 5);
  }
  
  state.aliens.forEach(alien => {
    if (!alien.active) return;
    
    alien.animFrame++;
    alien.shootCooldown--;
    
    if (alien.state === 'returning') {
      const dx = alien.formationPos.x - alien.pos.x;
      const dy = alien.formationPos.y - alien.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 3) {
        alien.pos = { ...alien.formationPos };
        alien.state = 'formation';
        alien.vel = { x: 0, y: 0 };
      } else {
        alien.pos.x += (dx / dist) * 3 * diff;
        alien.pos.y += (dy / dist) * 3 * diff;
      }
    } else if (alien.state === 'formation') {
      alien.pos.x = alien.formationPos.x + Math.sin(state.time * 0.02 + alien.formationPos.y * 0.1) * 8;
      
      if (alien.shootCooldown <= 0 && Math.random() < 0.01 * state.difficulty * diff) {
        state.bullets.push({
          pos: { x: alien.pos.x + alien.size.x / 2 - 3, y: alien.pos.y + alien.size.y },
          vel: { x: 0, y: 5 },
          size: { x: 6, y: 12 },
          active: true,
          isEnemy: true,
          type: 'normal',
        });
        alien.shootCooldown = 120;
      }
    } else if (alien.state === 'diving') {
      alien.diveProgress += 0.008 * state.difficulty * diff;
      
      if (alien.diveProgress >= 1) {
        alien.pos.y = -40;
        alien.state = 'returning';
        alien.diveProgress = 0;
      } else {
        const newPos = bezier(alien.divePath, alien.diveProgress);
        alien.pos = newPos;
        
        if (alien.shootCooldown <= 0 && Math.random() < 0.03 * diff) {
          state.bullets.push({
            pos: { x: alien.pos.x + alien.size.x / 2 - 3, y: alien.pos.y + alien.size.y },
            vel: { x: (p.pos.x - alien.pos.x) * 0.02, y: 4 },
            size: { x: 6, y: 12 },
            active: true,
            isEnemy: true,
            type: 'normal',
          });
          alien.shootCooldown = 60;
        }
      }
    }
  });
  
  state.bullets.filter(b => !b.isEnemy && b.active).forEach(bullet => {
    state.aliens.filter(a => a.active).forEach(alien => {
      if (collides(bullet, alien)) {
        bullet.active = false;
        alien.hp--;
        
        if (alien.hp <= 0) {
          alien.active = false;
          state.score += alien.pts * (alien.state === 'diving' ? 2 : 1);
          state.enemiesKilledThisWave++;
          
          state.explosions.push({
            pos: { x: alien.pos.x + alien.size.x / 2, y: alien.pos.y + alien.size.y / 2 },
            frame: 0,
            maxFrames: 20,
            size: 32,
          });
          
          if (Math.random() < 0.08) {
            const types: PowerUp['type'][] = ['double', 'shield', 'speed'];
            state.powerUps.push({
              pos: { x: alien.pos.x, y: alien.pos.y },
              vel: { x: 0, y: 1.5 },
              size: { x: 20, y: 20 },
              active: true,
              type: types[Math.floor(Math.random() * types.length)],
            });
          }
        }
      }
    });
  });
  
  if (p.invincible <= 0 && p.powerUp !== 'shield') {
    state.bullets.filter(b => b.isEnemy && b.active).forEach(bullet => {
      if (collides(bullet, p)) {
        bullet.active = false;
        playerHit(state, w, h);
      }
    });
  }
  
  if (p.invincible <= 0) {
    state.aliens.filter(a => a.active && a.state === 'diving').forEach(alien => {
      if (collides(alien, p)) {
        alien.active = false;
        state.explosions.push({
          pos: { x: alien.pos.x, y: alien.pos.y },
          frame: 0,
          maxFrames: 20,
          size: 32,
        });
        if (p.powerUp !== 'shield') {
          playerHit(state, w, h);
        }
      }
    });
  }
  
  state.powerUps = state.powerUps.filter(pu => {
    pu.pos.y += pu.vel.y;
    
    if (collides(pu, p)) {
      p.powerUp = pu.type as 'double' | 'shield' | 'speed';
      p.powerUpTime = 720;
      state.score += 100;
      return false;
    }
    
    return pu.pos.y < h + 20;
  });
  
  state.explosions = state.explosions.filter(exp => {
    exp.frame++;
    return exp.frame < exp.maxFrames;
  });
  
  if (state.aliens.filter(a => a.active).length === 0 && state.spawnTimer > 100) {
    state.score += 500;
    state.spawnTimer = 90;
    
    if (state.wave > 0 && state.wave % 4 === 0) {
      state.phase = 'landerReady';
      state.player.pos = { x: w / 2 - 21, y: 60 };
      state.player.vel = { x: 0, y: 0 };
      state.player.fuel = 100;
    }
  }
}

function playerHit(state: GameState, w: number, h: number): void {
  state.player.lives--;
  state.player.active = false;
  state.phase = 'dying';
  
  state.explosions.push({
    pos: { x: state.player.pos.x + 21, y: state.player.pos.y + 21 },
    frame: 0,
    maxFrames: 30,
    size: 42,
  });
}

function collides(a: Entity, b: Entity): boolean {
  return a.pos.x < b.pos.x + b.size.x &&
         a.pos.x + a.size.x > b.pos.x &&
         a.pos.y < b.pos.y + b.size.y &&
         a.pos.y + a.size.y > b.pos.y;
}

export function applyInput(
  state: GameState, 
  input: { left: boolean; right: boolean; up: boolean; down: boolean; shoot: boolean },
  w: number
): void {
  if (state.phase !== 'playing' && state.phase !== 'respawning') return;
  
  const p = state.player;
  const acceleration = p.powerUp === 'speed' ? 0.6 : 0.5;
  const friction = 0.85;
  const maxSpeed = p.powerUp === 'speed' ? 8 : 6;
  
  // Apply acceleration based on input
  if (input.left) p.vel.x -= acceleration;
  if (input.right) p.vel.x += acceleration;
  if (input.up) p.vel.y -= acceleration;
  if (input.down) p.vel.y += acceleration;
  
  // Apply friction for smooth deceleration
  p.vel.x *= friction;
  p.vel.y *= friction;
  
  // Clamp to max speed using vector magnitude
  const speed = Math.sqrt(p.vel.x ** 2 + p.vel.y ** 2);
  if (speed > maxSpeed) {
    p.vel.x = (p.vel.x / speed) * maxSpeed;
    p.vel.y = (p.vel.y / speed) * maxSpeed;
  }
  
  if (input.shoot && p.shootCooldown <= 0) {
    const bulletSpeed = -10;
    
    if (p.powerUp === 'double') {
      state.bullets.push({
        pos: { x: p.pos.x + 4, y: p.pos.y },
        vel: { x: 0, y: bulletSpeed },
        size: { x: 4, y: 14 },
        active: true,
        type: 'double',
      });
      state.bullets.push({
        pos: { x: p.pos.x + p.size.x - 8, y: p.pos.y },
        vel: { x: 0, y: bulletSpeed },
        size: { x: 4, y: 14 },
        active: true,
        type: 'double',
      });
      p.shootCooldown = 10;
    } else {
      state.bullets.push({
        pos: { x: p.pos.x + p.size.x / 2 - 2, y: p.pos.y },
        vel: { x: 0, y: bulletSpeed },
        size: { x: 4, y: 14 },
        active: true,
        type: 'normal',
      });
      p.shootCooldown = 12;
    }
  }
}

export function updateLander(state: GameState, w: number, h: number): void {
  const p = state.player;
  const GRAVITY = 0.03;
  const GROUND = h - 50;
  const PAD_X = w / 2 - 40;
  const PAD_W = 80;
  
  p.vel.y += GRAVITY;
  p.pos.x += p.vel.x;
  p.pos.y += p.vel.y;
  p.pos.x = Math.max(10, Math.min(w - 42, p.pos.x));
  
  if (p.pos.y >= GROUND - 20) {
    const onPad = p.pos.x >= PAD_X - 10 && p.pos.x <= PAD_X + PAD_W;
    const speed = Math.sqrt(p.vel.x ** 2 + p.vel.y ** 2);
    
    if (onPad && speed < 1.5) {
      state.score += Math.floor((1.5 - speed) * 500);
      state.phase = 'playing';
      state.player.pos = { x: w / 2 - 21, y: h - 60 };
      state.spawnTimer = 60;
    } else {
      state.player.lives--;
      if (state.player.lives > 0) {
        p.pos = { x: w / 2 - 21, y: 60 };
        p.vel = { x: 0, y: 0 };
        p.fuel = 100;
      } else {
        state.phase = 'gameOver';
      }
    }
  }
}

export function applyLanderInput(
  state: GameState,
  input: { left: boolean; right: boolean; up: boolean },
  w: number
): void {
  const p = state.player;
  if (!p.fuel || p.fuel <= 0) return;
  
  if (input.up) {
    p.vel.y -= 0.08;
    p.fuel -= 0.3;
  }
  if (input.left) {
    p.vel.x -= 0.04;
    p.fuel -= 0.15;
  }
  if (input.right) {
    p.vel.x += 0.04;
    p.fuel -= 0.15;
  }
}
