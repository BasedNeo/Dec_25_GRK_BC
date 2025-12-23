import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useGameScoresLocal } from '@/hooks/useGameScoresLocal';
import { useGameAccess } from '@/hooks/useGameAccess';
import { trackEvent } from '@/lib/analytics';
import { GameStorageManager } from '@/lib/gameStorage';
import { getGameConfig } from '@/lib/gameRegistry';
import { VictoryScreen } from '@/components/game/VictoryScreen';
import { Play, Home, Trophy, Heart, Zap, Volume2, VolumeX, Target, Shield, Smartphone } from 'lucide-react';
import { isMobile, haptic } from '@/lib/mobileUtils';
import { AnimatePresence } from 'framer-motion';

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  invincible: number;
  rapidFire: number;
  shield: boolean;
}

interface Bullet {
  x: number;
  y: number;
  speed: number;
}

type EnemyType = 'basic' | 'fast' | 'tank' | 'elite';

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
  points: number;
  type: EnemyType;
  health: number;
}

type PowerUpType = 'shield' | 'rapidfire' | 'extralife';

interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  speed: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface ScorePopup {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

interface GameState {
  player: Player;
  bullets: Bullet[];
  enemies: Enemy[];
  powerUps: PowerUp[];
  particles: Particle[];
  scorePopups: ScorePopup[];
  score: number;
  lives: number;
  gameOver: boolean;
  enemiesDestroyed: number;
  combo: number;
  lastHitTime: number;
  screenShake: number;
  wave: number;
}

type GamePhase = 'menu' | 'playing' | 'gameover';

const PLAYER_SPEED = 8;
const BULLET_SPEED = 14;
const SHOOT_COOLDOWN = 180;
const RAPID_FIRE_COOLDOWN = 80;
const COMBO_TIMEOUT = 1500;

const ENEMY_TYPES: Record<EnemyType, { color: string; speed: number; points: number; health: number; width: number }> = {
  basic: { color: '#EF4444', speed: 2, points: 50, health: 1, width: 30 },
  fast: { color: '#FBBF24', speed: 4, points: 75, health: 1, width: 25 },
  tank: { color: '#8B5CF6', speed: 1.5, points: 150, health: 3, width: 45 },
  elite: { color: '#F97316', speed: 3, points: 200, health: 2, width: 35 },
};

const POWERUP_COLORS: Record<PowerUpType, string> = {
  shield: '#3B82F6',
  rapidfire: '#FBBF24',
  extralife: '#22C55E',
};

export default function AsteroidMining() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { submitScore, myStats, refreshStats } = useGameScoresLocal();
  const { access, recordPlay, isLoading: nftLoading } = useGameAccess();

  const gameConfig = useMemo(() => getGameConfig('asteroid-mining'), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const lastShootRef = useRef<number>(0);
  const touchRef = useRef<{ left: boolean; right: boolean; shoot: boolean }>({ left: false, right: false, shoot: false });
  const audioContextRef = useRef<AudioContext | null>(null);
  const starsRef = useRef<{ x: number; y: number; speed: number; brightness: number }[]>([]);

  const [gamePhase, setGamePhase] = useState<GamePhase>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [hasShield, setHasShield] = useState(false);
  const [hasRapidFire, setHasRapidFire] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 600 });
  const [showIntro, setShowIntro] = useState(false);
  const [introText, setIntroText] = useState('');
  const [waveAnnouncement, setWaveAnnouncement] = useState<number | null>(null);
  const lastWaveRef = useRef(0);

  const stats = useMemo(() => ({
    gamesPlayed: myStats.totalGames || 0,
    bestScore: myStats.bestScore || 0,
    totalScore: myStats.lifetimeScore || 0,
  }), [myStats]);

  const playSound = useCallback((type: 'shoot' | 'hit' | 'explosion' | 'gameover' | 'powerup' | 'playerhit') => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      switch (type) {
        case 'shoot':
          osc.frequency.setValueAtTime(900, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
          break;
        case 'hit':
          osc.frequency.setValueAtTime(400, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
          osc.start();
          osc.stop(ctx.currentTime + 0.12);
          break;
        case 'explosion':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.25);
          gain.gain.setValueAtTime(0.18, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          osc.start();
          osc.stop(ctx.currentTime + 0.25);
          break;
        case 'powerup':
          osc.frequency.setValueAtTime(400, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
          break;
        case 'playerhit':
          osc.type = 'square';
          osc.frequency.setValueAtTime(200, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          break;
        case 'gameover':
          osc.frequency.setValueAtTime(400, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.6);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          osc.start();
          osc.stop(ctx.currentTime + 0.6);
          break;
      }
    } catch (e) {}
  }, [soundEnabled]);

  const createParticles = useCallback((x: number, y: number, color: string, count: number): Particle[] => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        size: 2 + Math.random() * 4,
      });
    }
    return particles;
  }, []);

  const initGame = useCallback((): GameState => {
    const { width, height } = canvasSize;
    starsRef.current = Array.from({ length: 80 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 0.5 + Math.random() * 2,
      brightness: 0.3 + Math.random() * 0.7,
    }));
    return {
      player: {
        x: width / 2 - 20,
        y: height - 80,
        width: 40,
        height: 40,
        invincible: 0,
        rapidFire: 0,
        shield: false,
      },
      bullets: [],
      enemies: [],
      powerUps: [],
      particles: [],
      scorePopups: [],
      score: 0,
      lives: 3,
      gameOver: false,
      enemiesDestroyed: 0,
      combo: 0,
      lastHitTime: 0,
      screenShake: 0,
      wave: 1,
    };
  }, [canvasSize]);

  const spawnEnemy = useCallback((state: GameState) => {
    const { width } = canvasSize;
    const wave = state.wave;
    
    const types: EnemyType[] = wave < 3 ? ['basic', 'basic', 'fast'] 
      : wave < 6 ? ['basic', 'fast', 'fast', 'tank'] 
      : ['basic', 'fast', 'tank', 'elite', 'elite'];
    const type = types[Math.floor(Math.random() * types.length)];
    const config = ENEMY_TYPES[type];
    
    const x = Math.random() * (width - config.width);
    const speedMultiplier = 1 + (wave * 0.1);

    state.enemies.push({
      x, y: -50,
      width: config.width,
      height: 30,
      speed: config.speed * speedMultiplier,
      color: config.color,
      points: config.points,
      type,
      health: config.health,
    });
  }, [canvasSize]);

  const spawnPowerUp = useCallback((state: GameState, x: number, y: number) => {
    if (Math.random() > 0.15) return;
    const types: PowerUpType[] = ['shield', 'rapidfire', 'extralife'];
    const weights = [0.4, 0.4, 0.2];
    let r = Math.random();
    let type: PowerUpType = 'shield';
    for (let i = 0; i < types.length; i++) {
      r -= weights[i];
      if (r <= 0) { type = types[i]; break; }
    }
    state.powerUps.push({ x, y, type, speed: 2 });
  }, []);

  const shoot = useCallback(() => {
    const state = gameStateRef.current;
    if (!state || state.gameOver) return;
    const now = Date.now();
    const cooldown = state.player.rapidFire > 0 ? RAPID_FIRE_COOLDOWN : SHOOT_COOLDOWN;
    if (now - lastShootRef.current < cooldown) return;
    lastShootRef.current = now;

    state.bullets.push({
      x: state.player.x + state.player.width / 2 - 3,
      y: state.player.y,
      speed: BULLET_SPEED,
    });
    playSound('shoot');
    if (isMobile && hapticEnabled) haptic.light();
  }, [playSound]);

  const update = useCallback(() => {
    const state = gameStateRef.current;
    if (!state || state.gameOver) return;
    const { width, height } = canvasSize;
    const keys = keysRef.current;
    const touch = touchRef.current;
    const now = Date.now();

    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A') || touch.left) state.player.x -= PLAYER_SPEED;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D') || touch.right) state.player.x += PLAYER_SPEED;
    if (keys.has(' ') || touch.shoot) shoot();
    state.player.x = Math.max(0, Math.min(width - state.player.width, state.player.x));

    if (state.player.invincible > 0) state.player.invincible--;
    if (state.player.rapidFire > 0) state.player.rapidFire--;
    if (state.screenShake > 0) state.screenShake *= 0.9;
    if (now - state.lastHitTime > COMBO_TIMEOUT && state.combo > 0) state.combo = 0;

    for (const star of starsRef.current) {
      star.y += star.speed;
      if (star.y > height) { star.y = 0; star.x = Math.random() * width; }
    }

    for (let i = state.bullets.length - 1; i >= 0; i--) {
      state.bullets[i].y -= state.bullets[i].speed;
      if (state.bullets[i].y < -10) state.bullets.splice(i, 1);
    }

    for (let i = state.powerUps.length - 1; i >= 0; i--) {
      const pu = state.powerUps[i];
      pu.y += pu.speed;
      if (pu.y > height + 30) { state.powerUps.splice(i, 1); continue; }
      
      if (state.player.x < pu.x + 20 && state.player.x + state.player.width > pu.x &&
          state.player.y < pu.y + 20 && state.player.y + state.player.height > pu.y) {
        if (pu.type === 'shield') { state.player.shield = true; state.player.invincible = 300; }
        else if (pu.type === 'rapidfire') state.player.rapidFire = 600;
        else if (pu.type === 'extralife') state.lives = Math.min(5, state.lives + 1);
        state.particles.push(...createParticles(pu.x + 10, pu.y + 10, POWERUP_COLORS[pu.type], 8));
        state.scorePopups.push({ x: pu.x + 10, y: pu.y, text: pu.type.toUpperCase() + '!', life: 1, color: POWERUP_COLORS[pu.type] });
        state.powerUps.splice(i, 1);
        playSound('powerup');
        if (isMobile && hapticEnabled) haptic.medium?.() || haptic.light();
      }
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      enemy.y += enemy.speed;
      if (enemy.y > height + 50) { state.enemies.splice(i, 1); continue; }

      if (state.player.invincible <= 0 &&
          state.player.x < enemy.x + enemy.width && state.player.x + state.player.width > enemy.x &&
          state.player.y < enemy.y + enemy.height && state.player.y + state.player.height > enemy.y) {
        if (state.player.shield) {
          state.player.shield = false;
          state.player.invincible = 60;
          state.particles.push(...createParticles(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2, '#3B82F6', 20));
          state.enemies.splice(i, 1);
          playSound('explosion');
        } else {
          state.lives--;
          state.combo = 0;
          state.player.invincible = 120;
          state.screenShake = 15;
          state.particles.push(...createParticles(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2, '#00FFFF', 20));
          state.enemies.splice(i, 1);
          playSound('playerhit');
          if (isMobile && hapticEnabled) haptic.heavy();
          if (state.lives <= 0) { state.gameOver = true; playSound('gameover'); }
        }
        continue;
      }

      for (let j = state.bullets.length - 1; j >= 0; j--) {
        const bullet = state.bullets[j];
        if (bullet.x < enemy.x + enemy.width && bullet.x + 6 > enemy.x &&
            bullet.y < enemy.y + enemy.height && bullet.y + 10 > enemy.y) {
          enemy.health--;
          state.bullets.splice(j, 1);
          if (enemy.health <= 0) {
            state.combo++;
            state.lastHitTime = now;
            const multiplier = Math.min(state.combo, 10);
            const points = Math.floor(enemy.points * (1 + multiplier * 0.1));
            state.score += points;
            state.enemiesDestroyed++;
            state.screenShake = Math.min(state.screenShake + 3, 8);
            state.particles.push(...createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 12));
            state.scorePopups.push({ x: enemy.x + enemy.width / 2, y: enemy.y, text: `+${points}${multiplier > 1 ? ` x${multiplier}` : ''}`, life: 1, color: enemy.color });
            spawnPowerUp(state, enemy.x + enemy.width / 2, enemy.y);
            state.enemies.splice(i, 1);
            playSound('hit');
            if (isMobile && hapticEnabled) haptic.light();
            if (state.enemiesDestroyed % 15 === 0) state.wave++;
          } else {
            state.particles.push(...createParticles(bullet.x, bullet.y, '#FFFFFF', 4));
          }
          break;
        }
      }
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      state.particles[i].x += state.particles[i].vx;
      state.particles[i].y += state.particles[i].vy;
      state.particles[i].life -= 0.025;
      if (state.particles[i].life <= 0) state.particles.splice(i, 1);
    }

    for (let i = state.scorePopups.length - 1; i >= 0; i--) {
      state.scorePopups[i].y -= 1.5;
      state.scorePopups[i].life -= 0.025;
      if (state.scorePopups[i].life <= 0) state.scorePopups.splice(i, 1);
    }

    setScore(state.score);
    setLives(state.lives);
    setCombo(state.combo);
    setHasShield(state.player.shield);
    setHasRapidFire(state.player.rapidFire > 0);
    
    if (state.wave > lastWaveRef.current) {
      lastWaveRef.current = state.wave;
      setWaveAnnouncement(state.wave);
      setTimeout(() => setWaveAnnouncement(null), 1500);
    }
  }, [canvasSize, shoot, createParticles, spawnPowerUp, playSound]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const state = gameStateRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvasSize;

    ctx.save();
    if (state.screenShake > 0.5) {
      ctx.translate((Math.random() - 0.5) * state.screenShake, (Math.random() - 0.5) * state.screenShake);
    }

    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, width, height);

    for (const star of starsRef.current) {
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
      ctx.fillRect(star.x, star.y, 1.5, 1.5);
    }

    const flash = state.player.invincible > 0 && Math.floor(state.player.invincible / 8) % 2 === 0;
    if (!flash) {
      ctx.fillStyle = state.player.shield ? '#3B82F6' : '#00FFFF';
      ctx.shadowColor = state.player.shield ? '#3B82F6' : '#00FFFF';
      ctx.shadowBlur = state.player.rapidFire > 0 ? 15 : 10;
      ctx.beginPath();
      ctx.moveTo(state.player.x + state.player.width / 2, state.player.y);
      ctx.lineTo(state.player.x + state.player.width, state.player.y + state.player.height);
      ctx.lineTo(state.player.x + state.player.width / 2, state.player.y + state.player.height - 10);
      ctx.lineTo(state.player.x, state.player.y + state.player.height);
      ctx.closePath();
      ctx.fill();
      if (state.player.shield) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2, 30, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = '#00FF88';
    ctx.shadowColor = '#00FF88';
    ctx.shadowBlur = 6;
    for (const bullet of state.bullets) {
      ctx.beginPath();
      ctx.ellipse(bullet.x + 3, bullet.y + 5, 3, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    for (const pu of state.powerUps) {
      ctx.fillStyle = POWERUP_COLORS[pu.type];
      ctx.shadowColor = POWERUP_COLORS[pu.type];
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(pu.x + 10, pu.y + 10, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(pu.type === 'shield' ? 'S' : pu.type === 'rapidfire' ? 'R' : '+', pu.x + 10, pu.y + 14);
      ctx.shadowBlur = 0;
    }

    for (const enemy of state.enemies) {
      ctx.fillStyle = enemy.color;
      ctx.shadowColor = enemy.color;
      ctx.shadowBlur = 8;
      if (enemy.type === 'tank') {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(enemy.x + 5, enemy.y + 5, enemy.width - 10, enemy.height - 10);
      } else if (enemy.type === 'elite') {
        ctx.beginPath();
        ctx.moveTo(enemy.x + enemy.width / 2, enemy.y);
        ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
        ctx.lineTo(enemy.x, enemy.y + enemy.height);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width / 2, enemy.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    for (const particle of state.particles) {
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.life;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.font = 'bold 14px Orbitron, monospace';
    ctx.textAlign = 'center';
    for (const popup of state.scorePopups) {
      ctx.fillStyle = popup.color;
      ctx.globalAlpha = popup.life;
      ctx.fillText(popup.text, popup.x, popup.y);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }, [canvasSize]);

  const gameLoop = useCallback(() => {
    update();
    render();
    const state = gameStateRef.current;
    if (state && state.gameOver) {
      setGamePhase('gameover');
      const playerAddress = address || 'anonymous';
      const today = new Date().toDateString();
      const dailyData = GameStorageManager.getDailyData('asteroid-mining', playerAddress, today);
      GameStorageManager.updateDailyData('asteroid-mining', playerAddress, today, {
        gamesPlayed: dailyData.gamesPlayed + 1,
        pointsEarned: dailyData.pointsEarned + state.score
      });
      if (address && state.score > 0) {
        submitScore(state.score, state.enemiesDestroyed);
        refreshStats();
      }
      trackEvent('game_complete', 'asteroid-mining', String(state.enemiesDestroyed), state.score);
      return;
    }
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [update, render, address, submitScore, refreshStats]);

  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const spawnInterval = setInterval(() => {
      const state = gameStateRef.current;
      if (state && !state.gameOver) {
        const spawnCount = Math.min(1 + Math.floor(state.wave / 3), 3);
        for (let i = 0; i < spawnCount; i++) setTimeout(() => spawnEnemy(state), i * 300);
      }
    }, 1200);
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      clearInterval(spawnInterval);
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gamePhase, gameLoop, spawnEnemy]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', ' ', 'a', 'd', 'A', 'D'].includes(e.key)) {
        e.preventDefault();
        keysRef.current.add(e.key);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const updateCanvasSize = () => {
      const maxWidth = Math.min(window.innerWidth - 32, 500);
      const maxHeight = Math.min(window.innerHeight - 200, 700);
      let width = maxWidth;
      let height = width * 1.5;
      if (height > maxHeight) { height = maxHeight; width = height / 1.5; }
      setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, [canvasSize]);

  const startGame = useCallback(() => {
    if (!address) {
      toast({ title: "Wallet Required", description: "Connect your wallet to play", variant: "destructive" });
      return;
    }
    if (!access.canPlay) {
      toast({ title: "No Plays Left", description: access.reason || "Come back tomorrow!", variant: "destructive" });
      return;
    }
    const dailyLimits = GameStorageManager.checkDailyLimits('asteroid-mining', address, gameConfig.maxPlaysPerDay, 50000);
    if (!dailyLimits.canPlay) {
      toast({ title: "Daily Limit Reached", description: dailyLimits.reason || "Come back tomorrow!", variant: "destructive" });
      return;
    }
    recordPlay();
    gameStateRef.current = initGame();
    setScore(0);
    setLives(3);
    setCombo(0);
    setHasShield(false);
    setHasRapidFire(false);
    keysRef.current.clear();
    lastWaveRef.current = 1;
    
    setShowIntro(true);
    setIntroText('');
    setGamePhase('playing');
    
    const introMessage = 'LAUNCHING MISSION...';
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < introMessage.length) {
        setIntroText(introMessage.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => {
          setShowIntro(false);
          setWaveAnnouncement(1);
          setTimeout(() => setWaveAnnouncement(null), 1500);
        }, 400);
      }
    }, 60);
    
    trackEvent('game_start', 'asteroid-mining', '', 0);
  }, [address, access.canPlay, access.reason, gameConfig.maxPlaysPerDay, toast, initGame, recordPlay]);

  const handleTouchStart = useCallback((zone: 'left' | 'right' | 'shoot') => {
    if (zone === 'left') touchRef.current.left = true;
    if (zone === 'right') touchRef.current.right = true;
    if (zone === 'shoot') { touchRef.current.shoot = true; shoot(); }
  }, [shoot]);

  const handleTouchEnd = useCallback((zone: 'left' | 'right' | 'shoot') => {
    if (zone === 'left') touchRef.current.left = false;
    if (zone === 'right') touchRef.current.right = false;
    if (zone === 'shoot') touchRef.current.shoot = false;
  }, []);

  if (nftLoading) {
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <section className="py-6 min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black flex items-center justify-center pt-16">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-cyan-400 font-orbitron">Loading Game...</p>
          </div>
        </section>
      </>
    );
  }

  if (gamePhase === 'menu') {
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <section className="py-6 min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-16 pb-24">
          <div className="max-w-md mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
              <h1 className="text-4xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2">
                SPACE SHOOTER
              </h1>
              <p className="text-gray-400">Destroy enemies. Collect power-ups. Get high scores.</p>
            </motion.div>

            <Card className="bg-black/60 border-cyan-500/30 backdrop-blur-xl p-6 mb-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg mb-4">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-bold">Best: {stats.bestScore.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center mb-6">
                  <div><div className="text-2xl text-cyan-400 font-bold">{stats.gamesPlayed}</div><div className="text-xs text-gray-500">Games Played</div></div>
                  <div><div className="text-2xl text-purple-400 font-bold">{stats.totalScore.toLocaleString()}</div><div className="text-xs text-gray-500">Total Score</div></div>
                </div>
              </div>

              <div className="mb-4 p-4 bg-white/5 rounded-lg">
                <h3 className="text-sm font-bold text-cyan-400 mb-2">CONTROLS</h3>
                <div className="text-xs text-gray-400 space-y-1">
                  <p><span className="text-white">Desktop:</span> Arrow keys or A/D to move, Spacebar to shoot</p>
                  <p><span className="text-white">Mobile:</span> On-screen buttons below the game</p>
                </div>
              </div>

              <div className="mb-4 p-4 bg-white/5 rounded-lg">
                <h3 className="text-sm font-bold text-purple-400 mb-2">POWER-UPS</h3>
                <div className="text-xs text-gray-400 space-y-1">
                  <p><span className="text-blue-400">● Shield</span> - Blocks one hit</p>
                  <p><span className="text-yellow-400">● Rapid Fire</span> - Faster shooting</p>
                  <p><span className="text-green-400">● Extra Life</span> - +1 life (max 5)</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Sound</span>
                <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="text-cyan-400" data-testid="button-toggle-sound">
                  {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </Button>
              </div>
              
              {isMobile && (
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400 flex items-center gap-2"><Smartphone className="w-4 h-4" /> Haptic Feedback</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setHapticEnabled(!hapticEnabled)} 
                    className={hapticEnabled ? 'text-cyan-400' : 'text-gray-500'}
                    data-testid="button-toggle-haptic"
                  >
                    {hapticEnabled ? 'ON' : 'OFF'}
                  </Button>
                </div>
              )}

              <Button onClick={startGame} disabled={!access.canPlay} className="w-full h-14 text-lg font-orbitron bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500" data-testid="button-start-game">
                <Play className="w-6 h-6 mr-2" />
                {!access.canPlay ? 'NO PLAYS LEFT' : 'START GAME'}
              </Button>
              {access.playsRemaining !== undefined && <p className="text-center text-sm text-gray-400 mt-3">{access.playsRemaining} plays remaining today</p>}
            </Card>

            <div className="flex justify-center">
              <Button variant="outline" onClick={() => navigate('/arcade')} className="border-white/20" data-testid="button-back-arcade">
                <Home className="w-4 h-4 mr-2" /> Back to Arcade
              </Button>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (gamePhase === 'gameover') {
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <section className="py-6 min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black pt-16 pb-24">
          <div className="max-w-md mx-auto px-4">
            <VictoryScreen
              gameType="asteroid-mining"
              score={score}
              stats={[
                { icon: Target, label: 'Score', value: score.toLocaleString(), color: 'text-cyan-400' },
                { icon: Zap, label: 'Enemies', value: gameStateRef.current?.enemiesDestroyed || 0, color: 'text-purple-400' },
              ]}
              playsRemaining={Math.max(0, (access.playsRemaining || 0) - 1)}
              maxPlays={gameConfig.maxPlaysPerDay}
              isNewBest={score > stats.bestScore}
              onPlayAgain={startGame}
              onExit={() => navigate('/arcade')}
            />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
      <section className="py-2 min-h-screen bg-black pt-16 pb-32 flex flex-col items-center">
        <div className="flex items-center justify-between w-full max-w-md px-4 mb-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-mono font-bold">{score}</span>
            </div>
            {combo > 1 && <span className="text-yellow-400 font-bold text-sm animate-pulse">x{Math.min(combo, 10)}</span>}
            <div className="flex items-center gap-1">
              {[...Array(lives)].map((_, i) => <Heart key={i} className="w-4 h-4 text-red-500 fill-red-500" />)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasShield && <Shield className="w-4 h-4 text-blue-400" />}
            {hasRapidFire && <Zap className="w-4 h-4 text-yellow-400" />}
            <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="text-cyan-400">
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <canvas ref={canvasRef} className="border border-cyan-500/30 rounded-lg" style={{ touchAction: 'none' }} data-testid="game-canvas" />

        {isMobile && (
          <div className="fixed bottom-4 left-0 right-0 px-4">
            <div className="flex justify-center gap-4">
              <Button
                className="w-20 h-16 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-2xl font-bold active:bg-cyan-500/40"
                onTouchStart={() => handleTouchStart('left')}
                onTouchEnd={() => handleTouchEnd('left')}
                onMouseDown={() => handleTouchStart('left')}
                onMouseUp={() => handleTouchEnd('left')}
                onMouseLeave={() => handleTouchEnd('left')}
                data-testid="button-move-left"
              >←</Button>
              <Button
                className="w-24 h-16 bg-red-500/20 border border-red-500/50 text-red-400 text-lg font-bold active:bg-red-500/40"
                onTouchStart={() => handleTouchStart('shoot')}
                onTouchEnd={() => handleTouchEnd('shoot')}
                onMouseDown={() => handleTouchStart('shoot')}
                onMouseUp={() => handleTouchEnd('shoot')}
                onMouseLeave={() => handleTouchEnd('shoot')}
                data-testid="button-shoot"
              >FIRE</Button>
              <Button
                className="w-20 h-16 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-2xl font-bold active:bg-cyan-500/40"
                onTouchStart={() => handleTouchStart('right')}
                onTouchEnd={() => handleTouchEnd('right')}
                onMouseDown={() => handleTouchStart('right')}
                onMouseUp={() => handleTouchEnd('right')}
                onMouseLeave={() => handleTouchEnd('right')}
                data-testid="button-move-right"
              >→</Button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showIntro && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center">
                <div className="text-2xl md:text-4xl font-mono text-cyan-400 mb-4">
                  {introText}<span className="animate-pulse">_</span>
                </div>
                <div className="text-sm text-gray-500">Initializing weapons systems...</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {waveAnnouncement && (
            <motion.div
              className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <div className="text-center">
                <motion.div
                  className="text-5xl md:text-7xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"
                  animate={{ textShadow: ['0 0 10px #22d3ee', '0 0 30px #a855f7', '0 0 10px #22d3ee'] }}
                  transition={{ duration: 0.3, repeat: 4 }}
                >
                  WAVE {waveAnnouncement}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );
}
