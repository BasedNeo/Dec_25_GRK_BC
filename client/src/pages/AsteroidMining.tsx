import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useGameScoresLocal } from '@/hooks/useGameScoresLocal';
import { useGameAccess } from '@/hooks/useGameAccess';
import { trackEvent } from '@/lib/analytics';
import { GameStorageManager, GameStats, GameSettings as BaseGameSettings } from '@/lib/gameStorage';
import { getGameConfig } from '@/lib/gameRegistry';
import { GameHUD } from '@/components/game/GameHUD';
import { VictoryScreen } from '@/components/game/VictoryScreen';
import {
  Play, Zap, Info, ChevronRight, Volume2, VolumeX,
  Heart, Shield as ShieldIcon, Sparkles, Target,
  Crosshair, Home, Loader2, Trophy
} from 'lucide-react';

type AsteroidSize = 'small' | 'medium' | 'large';
type AsteroidColor = 'grey' | 'blue' | 'green' | 'purple' | 'gold';
type PowerUpType = 'shield' | 'rapidFire' | 'magnet' | 'extraLife';

interface Vector2D {
  x: number;
  y: number;
}

interface Asteroid {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  size: AsteroidSize;
  color: AsteroidColor;
  rotation: number;
  rotationSpeed: number;
  radius: number;
  health: number;
}

interface Bullet {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  lifetime: number;
}

interface Resource {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  color: AsteroidColor;
  value: number;
  lifetime: number;
}

interface PowerUp {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  type: PowerUpType;
  lifetime: number;
}

interface Particle {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  color: string;
  size: number;
  lifetime: number;
}

interface Ship {
  position: Vector2D;
  velocity: Vector2D;
  rotation: number;
  shield: number;
  maxShield: number;
  lives: number;
  invulnerable: boolean;
  invulnerableTime: number;
}

interface GameState {
  ship: Ship;
  asteroids: Asteroid[];
  bullets: Bullet[];
  resources: Resource[];
  powerUps: PowerUp[];
  particles: Particle[];
  score: number;
  combo: number;
  comboTimer: number;
  survivalTime: number;
  asteroidsDestroyed: number;
  resourcesCollected: number;
  accuracy: { hits: number; shots: number };
  powerUpActive: { type: PowerUpType; duration: number } | null;
}

interface AsteroidGameSettings extends BaseGameSettings {
  // Inherits soundEnabled, soundVolume, animationSpeed, particleIntensity from BaseGameSettings
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SHIP_SIZE = 24;
const SHIP_SPEED = 300;
const BULLET_SPEED = 500;
const BULLET_LIFETIME = 1.5;
const MAX_BULLETS = 50;

const ASTEROID_SPAWN_INTERVAL = 2000;
const ASTEROID_MIN_SPEED = 30;
const ASTEROID_MAX_SPEED = 100;
const GOLD_ASTEROID_CHANCE = 0.02;

const ASTEROID_SIZES = {
  small: { radius: 15, health: 1, points: 50 },
  medium: { radius: 30, health: 2, points: 100 },
  large: { radius: 50, health: 3, points: 200 },
};

const ASTEROID_COLOR_MULTIPLIERS = {
  grey: 1,
  blue: 2.5,
  green: 5,
  purple: 10,
  gold: 25,
};

const ASTEROID_COLORS = {
  grey: '#9CA3AF',
  blue: '#3B82F6',
  green: '#10B981',
  purple: '#A855F7',
  gold: '#FBBF24',
};

const POWER_UP_DURATION = 10000;
const POWER_UP_DROP_CHANCE = 0.15;
const EXTRA_LIFE_DROP_CHANCE = 0.02;

const COMBO_TIMEOUT = 2000;
const INVULNERABLE_TIME = 3000;

const getDistance = (a: Vector2D, b: Vector2D): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const wrapPosition = (pos: Vector2D, margin: number = 0): Vector2D => {
  return {
    x: pos.x < -margin ? CANVAS_WIDTH + margin : pos.x > CANVAS_WIDTH + margin ? -margin : pos.x,
    y: pos.y < -margin ? CANVAS_HEIGHT + margin : pos.y > CANVAS_HEIGHT + margin ? -margin : pos.y,
  };
};

const randomInRange = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

const randomColor = (): AsteroidColor => {
  const rand = Math.random();
  if (rand < GOLD_ASTEROID_CHANCE) return 'gold';
  if (rand < 0.12) return 'purple';
  if (rand < 0.32) return 'green';
  if (rand < 0.62) return 'blue';
  return 'grey';
};

export default function AsteroidMining() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { submitScore } = useGameScoresLocal();
  const { isHolder, isLoading: nftLoading, access, recordPlay } = useGameAccess();

  const gameConfig = useMemo(() => getGameConfig('asteroid-mining'), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const shootIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const [playsToday, setPlaysToday] = useState(0);
  const [targetPosition, setTargetPosition] = useState<Vector2D | null>(null);
  const [isShooting, setIsShooting] = useState(false);

  const [stats, setStats] = useState<GameStats>(() =>
    address 
      ? GameStorageManager.loadStats('asteroid-mining', address)
      : GameStorageManager.getDefaultStats()
  );

  const [settings, setSettings] = useState<AsteroidGameSettings>(() =>
    GameStorageManager.loadSettings<AsteroidGameSettings>('asteroid-mining', {
      soundEnabled: true,
      soundVolume: 70,
      animationSpeed: 'normal',
      particleIntensity: 'medium',
    })
  );

  const gameStateRef = useRef<GameState>({
    ship: {
      position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      velocity: { x: 0, y: 0 },
      rotation: 0,
      shield: 5,
      maxShield: 5,
      lives: 3,
      invulnerable: false,
      invulnerableTime: 0,
    },
    asteroids: [],
    bullets: [],
    resources: [],
    powerUps: [],
    particles: [],
    score: 0,
    combo: 0,
    comboTimer: 0,
    survivalTime: 0,
    asteroidsDestroyed: 0,
    resourcesCollected: 0,
    accuracy: { hits: 0, shots: 0 },
    powerUpActive: null,
  });

  const [renderTrigger, setRenderTrigger] = useState(0);

  useEffect(() => {
    if (!address) return;
    
    const loadedStats = GameStorageManager.loadStats('asteroid-mining', address);
    setStats(loadedStats);
    setPlaysToday(loadedStats.gamesPlayed % gameConfig.maxPlaysPerDay);
  }, [address, gameConfig.maxPlaysPerDay]);

  useEffect(() => {
    GameStorageManager.saveSettings('asteroid-mining', settings);
  }, [settings]);

  useEffect(() => {
    if (typeof window === 'undefined' || !settings.soundEnabled) return;

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (err) {
      console.error('AudioContext not supported:', err);
    }

    return () => {
      audioContextRef.current?.close();
    };
  }, [settings.soundEnabled]);

  const playSound = useCallback((type: 'shoot' | 'explosion' | 'collect' | 'powerup' | 'hit' | 'death') => {
    if (!settings.soundEnabled || !audioContextRef.current) return;
    
    try {
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const volume = settings.soundVolume / 100;
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      switch (type) {
        case 'shoot':
          oscillator.frequency.setValueAtTime(800, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1 * volume, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
        
        case 'explosion':
          oscillator.frequency.setValueAtTime(150, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
          gainNode.gain.setValueAtTime(0.15 * volume, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        
        case 'collect':
          oscillator.frequency.setValueAtTime(600, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
          gainNode.gain.setValueAtTime(0.12 * volume, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
        
        case 'powerup':
          const freqs = [400, 500, 600, 800];
          freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
            gain.gain.setValueAtTime(0.1 * volume, ctx.currentTime + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.2);
            osc.start(ctx.currentTime + i * 0.08);
            osc.stop(ctx.currentTime + i * 0.08 + 0.2);
          });
          return;
        
        case 'hit':
          oscillator.frequency.setValueAtTime(100, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.2 * volume, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.stop(ctx.currentTime + 0.2);
          break;
        
        case 'death':
          oscillator.frequency.setValueAtTime(300, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
          gainNode.gain.setValueAtTime(0.2 * volume, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          oscillator.stop(ctx.currentTime + 0.5);
          break;
      }
      
      oscillator.start(ctx.currentTime);
    } catch (err) {
      console.error('Sound playback error:', err);
    }
  }, [settings.soundEnabled, settings.soundVolume]);

  const createParticles = useCallback((
    position: Vector2D,
    color: string,
    count: number,
    speed: number = 100
  ) => {
    const intensityMap: Record<string, number> = {
      off: 0,
      low: 0.3,
      medium: 0.7,
      high: 1.0,
    };
    const intensityMultiplier = intensityMap[settings.particleIntensity] ?? 0.7;
    
    const adjustedCount = Math.round(count * intensityMultiplier);
    const state = gameStateRef.current;
    
    for (let i = 0; i < adjustedCount; i++) {
      const angle = (Math.PI * 2 * i) / adjustedCount;
      const velocity = {
        x: Math.cos(angle) * speed * (0.5 + Math.random() * 0.5),
        y: Math.sin(angle) * speed * (0.5 + Math.random() * 0.5),
      };
      
      state.particles.push({
        id: `particle-${Date.now()}-${i}`,
        position: { ...position },
        velocity,
        color,
        size: 2 + Math.random() * 3,
        lifetime: 0.5 + Math.random() * 0.5,
      });
    }
  }, [settings.particleIntensity]);

  const spawnAsteroid = useCallback(() => {
    const state = gameStateRef.current;
    const side = Math.floor(Math.random() * 4);
    
    let position: Vector2D;
    let velocity: Vector2D;
    
    const speed = randomInRange(ASTEROID_MIN_SPEED, ASTEROID_MAX_SPEED);
    const angle = Math.random() * Math.PI * 2;
    
    switch (side) {
      case 0:
        position = { x: Math.random() * CANVAS_WIDTH, y: -50 };
        velocity = { x: Math.cos(angle) * speed, y: Math.abs(Math.sin(angle)) * speed };
        break;
      case 1:
        position = { x: CANVAS_WIDTH + 50, y: Math.random() * CANVAS_HEIGHT };
        velocity = { x: -Math.abs(Math.cos(angle)) * speed, y: Math.sin(angle) * speed };
        break;
      case 2:
        position = { x: Math.random() * CANVAS_WIDTH, y: CANVAS_HEIGHT + 50 };
        velocity = { x: Math.cos(angle) * speed, y: -Math.abs(Math.sin(angle)) * speed };
        break;
      default:
        position = { x: -50, y: Math.random() * CANVAS_HEIGHT };
        velocity = { x: Math.abs(Math.cos(angle)) * speed, y: Math.sin(angle) * speed };
    }
    
    const color = randomColor();
    const size: AsteroidSize = 'large';
    
    state.asteroids.push({
      id: `asteroid-${Date.now()}-${Math.random()}`,
      position,
      velocity,
      size,
      color,
      rotation: 0,
      rotationSpeed: randomInRange(-2, 2),
      radius: ASTEROID_SIZES[size].radius,
      health: ASTEROID_SIZES[size].health,
    });
  }, []);

  const splitAsteroid = useCallback((asteroid: Asteroid) => {
    const state = gameStateRef.current;
    
    if (asteroid.size === 'large') {
      for (let i = 0; i < 2; i++) {
        const angle = (Math.PI * 2 * i) / 2 + Math.random() * 0.5;
        const speed = Math.sqrt(asteroid.velocity.x ** 2 + asteroid.velocity.y ** 2) * 1.2;
        
        state.asteroids.push({
          id: `asteroid-${Date.now()}-${i}`,
          position: { ...asteroid.position },
          velocity: {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed,
          },
          size: 'medium',
          color: asteroid.color,
          rotation: 0,
          rotationSpeed: randomInRange(-3, 3),
          radius: ASTEROID_SIZES.medium.radius,
          health: ASTEROID_SIZES.medium.health,
        });
      }
    } else if (asteroid.size === 'medium') {
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.3;
        const speed = Math.sqrt(asteroid.velocity.x ** 2 + asteroid.velocity.y ** 2) * 1.3;
        
        state.asteroids.push({
          id: `asteroid-${Date.now()}-${i}`,
          position: { ...asteroid.position },
          velocity: {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed,
          },
          size: 'small',
          color: asteroid.color,
          rotation: 0,
          rotationSpeed: randomInRange(-4, 4),
          radius: ASTEROID_SIZES.small.radius,
          health: ASTEROID_SIZES.small.health,
        });
      }
    }
  }, []);

  const destroyAsteroid = useCallback((asteroid: Asteroid, hitByBullet: boolean = false) => {
    const state = gameStateRef.current;
    
    const basePoints = ASTEROID_SIZES[asteroid.size].points;
    const colorMultiplier = ASTEROID_COLOR_MULTIPLIERS[asteroid.color];
    let points = Math.floor(basePoints * colorMultiplier);
    
    if (state.combo >= 2) {
      points *= Math.min(state.combo, 4);
    }
    
    state.score += points;
    state.asteroidsDestroyed++;
    
    if (hitByBullet) {
      state.accuracy.hits++;
    }
    
    state.combo++;
    state.comboTimer = COMBO_TIMEOUT;
    
    createParticles(asteroid.position, ASTEROID_COLORS[asteroid.color], 15, 150);
    
    const resourceValue = Math.floor(points * 0.5);
    state.resources.push({
      id: `resource-${Date.now()}`,
      position: { ...asteroid.position },
      velocity: { x: 0, y: 50 },
      color: asteroid.color,
      value: resourceValue,
      lifetime: 10,
    });
    
    if (Math.random() < POWER_UP_DROP_CHANCE) {
      const powerUpTypes: PowerUpType[] = ['shield', 'rapidFire', 'magnet'];
      const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      
      state.powerUps.push({
        id: `powerup-${Date.now()}`,
        position: { ...asteroid.position },
        velocity: { x: 0, y: 30 },
        type,
        lifetime: 15,
      });
    }
    
    if (Math.random() < EXTRA_LIFE_DROP_CHANCE) {
      state.powerUps.push({
        id: `powerup-life-${Date.now()}`,
        position: { ...asteroid.position },
        velocity: { x: 0, y: 30 },
        type: 'extraLife',
        lifetime: 15,
      });
    }
    
    playSound('explosion');
    
    if (asteroid.size !== 'small') {
      splitAsteroid(asteroid);
    }
  }, [createParticles, playSound, splitAsteroid]);

  const shoot = useCallback(() => {
    const state = gameStateRef.current;
    if (state.bullets.length >= MAX_BULLETS) return;
    
    const ship = state.ship;
    const bulletVelocity = {
      x: Math.cos(ship.rotation) * BULLET_SPEED,
      y: Math.sin(ship.rotation) * BULLET_SPEED,
    };
    
    state.bullets.push({
      id: `bullet-${Date.now()}-${Math.random()}`,
      position: {
        x: ship.position.x + Math.cos(ship.rotation) * (SHIP_SIZE / 2),
        y: ship.position.y + Math.sin(ship.rotation) * (SHIP_SIZE / 2),
      },
      velocity: bulletVelocity,
      lifetime: BULLET_LIFETIME,
    });
    
    state.accuracy.shots++;
    playSound('shoot');
  }, [playSound]);

  useEffect(() => {
    if (isShooting && gameStarted && !gameOver && !isPaused) {
      shoot();
      const interval = gameStateRef.current.powerUpActive?.type === 'rapidFire' ? 80 : 200;
      shootIntervalRef.current = setInterval(shoot, interval);
    }
    
    return () => {
      if (shootIntervalRef.current) {
        clearInterval(shootIntervalRef.current);
        shootIntervalRef.current = null;
      }
    };
  }, [isShooting, gameStarted, gameOver, isPaused, shoot]);

  const handleShipHit = useCallback(() => {
    const state = gameStateRef.current;
    
    if (state.ship.invulnerable) return;
    
    state.ship.shield--;
    playSound('hit');
    
    if (state.ship.shield <= 0) {
      state.ship.lives--;
      
      if (state.ship.lives <= 0) {
        playSound('death');
        setGameOver(true);
        setShowVictory(true);
        
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
        }
        
        endGame();
      } else {
        state.ship.shield = state.ship.maxShield;
        state.ship.invulnerable = true;
        state.ship.invulnerableTime = INVULNERABLE_TIME;
      }
    }
    
    createParticles(state.ship.position, '#EF4444', 10, 80);
  }, [createParticles, playSound]);

  const update = useCallback((deltaTime: number) => {
    if (gameOver || isPaused) return;
    
    const state = gameStateRef.current;
    const dt = deltaTime / 1000;
    
    state.survivalTime += deltaTime;
    
    if (state.comboTimer > 0) {
      state.comboTimer -= deltaTime;
      if (state.comboTimer <= 0) {
        state.combo = 0;
      }
    }
    
    if (state.powerUpActive) {
      state.powerUpActive.duration -= deltaTime;
      if (state.powerUpActive.duration <= 0) {
        state.powerUpActive = null;
      }
    }
    
    if (state.ship.invulnerable) {
      state.ship.invulnerableTime -= deltaTime;
      if (state.ship.invulnerableTime <= 0) {
        state.ship.invulnerable = false;
      }
    }
    
    if (targetPosition) {
      const dx = targetPosition.x - state.ship.position.x;
      const dy = targetPosition.y - state.ship.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 5) {
        state.ship.rotation = Math.atan2(dy, dx);
        const moveSpeed = Math.min(SHIP_SPEED * dt, distance);
        state.ship.position.x += (dx / distance) * moveSpeed;
        state.ship.position.y += (dy / distance) * moveSpeed;
      } else {
        setTargetPosition(null);
      }
    }
    
    state.ship.position.x = Math.max(SHIP_SIZE, Math.min(CANVAS_WIDTH - SHIP_SIZE, state.ship.position.x));
    state.ship.position.y = Math.max(SHIP_SIZE, Math.min(CANVAS_HEIGHT - SHIP_SIZE, state.ship.position.y));
    
    state.bullets = state.bullets.filter(bullet => {
      bullet.position.x += bullet.velocity.x * dt;
      bullet.position.y += bullet.velocity.y * dt;
      bullet.lifetime -= dt;
      
      return bullet.lifetime > 0 && 
             bullet.position.x >= 0 && bullet.position.x <= CANVAS_WIDTH &&
             bullet.position.y >= 0 && bullet.position.y <= CANVAS_HEIGHT;
    });
    
    state.asteroids.forEach(asteroid => {
      asteroid.position.x += asteroid.velocity.x * dt;
      asteroid.position.y += asteroid.velocity.y * dt;
      asteroid.rotation += asteroid.rotationSpeed * dt;
      
      asteroid.position = wrapPosition(asteroid.position, asteroid.radius);
    });
    
    state.resources = state.resources.filter(resource => {
      resource.position.y += resource.velocity.y * dt;
      resource.lifetime -= dt;
      return resource.lifetime > 0 && resource.position.y < CANVAS_HEIGHT + 20;
    });
    
    state.powerUps = state.powerUps.filter(powerUp => {
      powerUp.position.y += powerUp.velocity.y * dt;
      powerUp.lifetime -= dt;
      return powerUp.lifetime > 0 && powerUp.position.y < CANVAS_HEIGHT + 20;
    });
    
    state.particles = state.particles.filter(particle => {
      particle.position.x += particle.velocity.x * dt;
      particle.position.y += particle.velocity.y * dt;
      particle.lifetime -= dt;
      return particle.lifetime > 0;
    });
    
    const bulletsToRemove: string[] = [];
    const asteroidsToDestroy: Asteroid[] = [];
    
    state.bullets.forEach(bullet => {
      state.asteroids.forEach(asteroid => {
        const dist = getDistance(bullet.position, asteroid.position);
        if (dist < asteroid.radius) {
          bulletsToRemove.push(bullet.id);
          asteroid.health--;
          
          if (asteroid.health <= 0) {
            asteroidsToDestroy.push(asteroid);
          }
        }
      });
    });
    
    state.bullets = state.bullets.filter(b => !bulletsToRemove.includes(b.id));
    
    asteroidsToDestroy.forEach(asteroid => {
      destroyAsteroid(asteroid, true);
    });
    
    state.asteroids = state.asteroids.filter(
      a => !asteroidsToDestroy.some(d => d.id === a.id)
    );
    
    state.asteroids.forEach(asteroid => {
      const dist = getDistance(state.ship.position, asteroid.position);
      if (dist < asteroid.radius + SHIP_SIZE / 2) {
        handleShipHit();
      }
    });
    
    const magnetRange = state.powerUpActive?.type === 'magnet' ? 150 : 40;
    
    state.resources = state.resources.filter(resource => {
      const dist = getDistance(state.ship.position, resource.position);
      if (dist < magnetRange) {
        const dx = state.ship.position.x - resource.position.x;
        const dy = state.ship.position.y - resource.position.y;
        const pullSpeed = state.powerUpActive?.type === 'magnet' ? 300 : 0;
        
        if (pullSpeed > 0) {
          resource.position.x += (dx / dist) * pullSpeed * dt;
          resource.position.y += (dy / dist) * pullSpeed * dt;
        }
        
        if (dist < 25) {
          state.score += resource.value;
          state.resourcesCollected++;
          playSound('collect');
          createParticles(resource.position, ASTEROID_COLORS[resource.color], 5, 50);
          return false;
        }
      }
      return true;
    });
    
    state.powerUps = state.powerUps.filter(powerUp => {
      const dist = getDistance(state.ship.position, powerUp.position);
      if (dist < 30) {
        playSound('powerup');
        
        switch (powerUp.type) {
          case 'shield':
            state.ship.shield = Math.min(state.ship.shield + 2, state.ship.maxShield);
            break;
          case 'rapidFire':
            state.powerUpActive = { type: 'rapidFire', duration: POWER_UP_DURATION };
            break;
          case 'magnet':
            state.powerUpActive = { type: 'magnet', duration: POWER_UP_DURATION };
            break;
          case 'extraLife':
            state.ship.lives = Math.min(state.ship.lives + 1, 5);
            break;
        }
        
        createParticles(powerUp.position, '#A855F7', 10, 80);
        return false;
      }
      return true;
    });
  }, [gameOver, isPaused, destroyAsteroid, handleShipHit, playSound, createParticles, targetPosition]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const state = gameStateRef.current;
    
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    const starCount = 50;
    for (let i = 0; i < starCount; i++) {
      const x = (i * 137.5 + Date.now() * 0.01) % CANVAS_WIDTH;
      const y = (i * 97.3) % CANVAS_HEIGHT;
      const brightness = 0.3 + 0.7 * Math.sin(Date.now() * 0.002 + i);
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.5})`;
      ctx.fillRect(x, y, 1, 1);
    }
    
    state.particles.forEach(particle => {
      const alpha = particle.lifetime / 1;
      ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(particle.position.x, particle.position.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
    
    state.asteroids.forEach(asteroid => {
      ctx.save();
      ctx.translate(asteroid.position.x, asteroid.position.y);
      ctx.rotate(asteroid.rotation);
      
      ctx.fillStyle = ASTEROID_COLORS[asteroid.color];
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      const points = 8;
      for (let i = 0; i < points; i++) {
        const angle = (Math.PI * 2 * i) / points;
        const variance = 0.7 + (((i * 31) % 10) / 10) * 0.3;
        const r = asteroid.radius * variance;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      if (asteroid.color === 'gold') {
        ctx.shadowBlur = 20;
        ctx.shadowColor = ASTEROID_COLORS.gold;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      
      ctx.restore();
    });
    
    state.resources.forEach(resource => {
      const alpha = Math.min(1, resource.lifetime / 2);
      ctx.fillStyle = ASTEROID_COLORS[resource.color];
      ctx.globalAlpha = alpha;
      
      ctx.beginPath();
      const size = 8 + Math.sin(Date.now() / 200) * 2;
      
      ctx.moveTo(resource.position.x, resource.position.y - size);
      ctx.lineTo(resource.position.x + size * 0.7, resource.position.y);
      ctx.lineTo(resource.position.x, resource.position.y + size);
      ctx.lineTo(resource.position.x - size * 0.7, resource.position.y);
      ctx.closePath();
      ctx.fill();
      
      ctx.globalAlpha = 1;
    });
    
    state.powerUps.forEach(powerUp => {
      const alpha = Math.min(1, powerUp.lifetime / 3);
      const colors: Record<PowerUpType, string> = {
        shield: '#3B82F6',
        rapidFire: '#EF4444',
        magnet: '#A855F7',
        extraLife: '#10B981',
      };
      
      ctx.fillStyle = `${colors[powerUp.type]}${Math.floor(alpha * 200).toString(16).padStart(2, '0')}`;
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      
      const size = 15 + Math.sin(Date.now() / 200) * 3;
      ctx.beginPath();
      ctx.arc(powerUp.position.x, powerUp.position.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.shadowBlur = 15;
      ctx.shadowColor = colors[powerUp.type];
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
    
    state.bullets.forEach(bullet => {
      ctx.fillStyle = '#FFF';
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#FFF';
      ctx.beginPath();
      ctx.arc(bullet.position.x, bullet.position.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bullet.position.x, bullet.position.y);
      ctx.lineTo(
        bullet.position.x - bullet.velocity.x * 0.03,
        bullet.position.y - bullet.velocity.y * 0.03
      );
      ctx.stroke();
    });
    
    const ship = state.ship;
    ctx.save();
    ctx.translate(ship.position.x, ship.position.y);
    ctx.rotate(ship.rotation);
    
    if (ship.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }
    
    ctx.fillStyle = '#60A5FA';
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(SHIP_SIZE / 2, 0);
    ctx.lineTo(-SHIP_SIZE / 2, SHIP_SIZE / 3);
    ctx.lineTo(-SHIP_SIZE / 3, 0);
    ctx.lineTo(-SHIP_SIZE / 2, -SHIP_SIZE / 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    if (targetPosition) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
      ctx.beginPath();
      ctx.moveTo(-SHIP_SIZE / 3, SHIP_SIZE / 4);
      ctx.lineTo(-SHIP_SIZE / 2 - 5, 0);
      ctx.lineTo(-SHIP_SIZE / 3, -SHIP_SIZE / 4);
      ctx.fill();
    }
    
    ctx.restore();
  }, [targetPosition]);

  const gameLoop = useCallback((currentTime: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = currentTime;
    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;
    
    update(deltaTime);
    render();
    setRenderTrigger(prev => prev + 1);
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [update, render]);

  const endGame = useCallback(async () => {
    if (!address) return;

    const state = gameStateRef.current;
    const finalScore = Math.min(state.score, gameConfig.scoring.maxScore);
    const survivalMinutes = Math.floor(state.survivalTime / 60000);
    
    const newStats: GameStats = { ...stats };
    newStats.gamesPlayed++;
    newStats.totalScore += finalScore;
    newStats.totalTime += Math.floor(state.survivalTime / 1000);
    
    if (survivalMinutes >= 5) {
      newStats.gamesWon++;
      newStats.currentStreak++;
      newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak);
    } else {
      newStats.currentStreak = 0;
    }
    
    if (finalScore > newStats.bestScore) {
      newStats.bestScore = finalScore;
    }
    
    newStats.lastPlayed = Date.now();
    
    GameStorageManager.saveStats('asteroid-mining', address, newStats);
    setStats(newStats);

    try {
      submitScore(finalScore, 0);
      setPlaysToday(prev => prev + 1);
      trackEvent('game_complete', 'Game', `Asteroid Mining - ${finalScore} pts`);
    } catch (err) {
      console.error('Failed to submit score:', err);
    }
  }, [address, stats, gameConfig.scoring.maxScore, submitScore]);

  const startGame = useCallback(() => {
    if (!isConnected) {
      toast({ 
        title: "Wallet Required", 
        description: "Please connect your wallet to play", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!isHolder) {
      toast({ 
        title: "Guardian NFT Required", 
        description: "You must own a Guardian NFT to access this game", 
        variant: "destructive" 
      });
      return;
    }
    
    if (playsToday >= gameConfig.maxPlaysPerDay) {
      toast({ 
        title: "Daily Limit Reached", 
        description: `You've used all ${gameConfig.maxPlaysPerDay} plays today. Return tomorrow!`, 
        variant: "destructive" 
      });
      return;
    }

    gameStateRef.current = {
      ship: {
        position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
        velocity: { x: 0, y: 0 },
        rotation: 0,
        shield: 5,
        maxShield: 5,
        lives: 3,
        invulnerable: false,
        invulnerableTime: 0,
      },
      asteroids: [],
      bullets: [],
      resources: [],
      powerUps: [],
      particles: [],
      score: 0,
      combo: 0,
      comboTimer: 0,
      survivalTime: 0,
      asteroidsDestroyed: 0,
      resourcesCollected: 0,
      accuracy: { hits: 0, shots: 0 },
      powerUpActive: null,
    };
    
    for (let i = 0; i < 3; i++) {
      setTimeout(() => spawnAsteroid(), i * 500);
    }
    
    recordPlay();
    setGameStarted(true);
    setGameOver(false);
    setShowVictory(false);
    lastTimeRef.current = 0;
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    trackEvent('game_start', 'Game', 'Asteroid Mining');
  }, [isConnected, isHolder, playsToday, gameConfig.maxPlaysPerDay, spawnAsteroid, gameLoop, toast, recordPlay]);

  useEffect(() => {
    if (!gameStarted || gameOver || isPaused) return;
    
    const interval = setInterval(() => {
      spawnAsteroid();
    }, ASTEROID_SPAWN_INTERVAL);
    
    return () => clearInterval(interval);
  }, [gameStarted, gameOver, isPaused, spawnAsteroid]);

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  if (nftLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-900 via-purple-900 to-black">
        <Card className="p-8 bg-white/5 border-cyan-500/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            <p className="text-cyan-400">Loading Asteroid Mining...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <section className="py-8 min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-black relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none opacity-40">
          {[...Array(100)].map((_, i) => (
            <motion.div
              key={`star-${i}`}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 2 + Math.random() * 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <div className="max-w-4xl mx-auto px-4 relative z-10">
          <div className="text-center mb-8">
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-400 mb-3 font-orbitron tracking-tight">
                ASTEROID MINING
              </h1>
              <p className="text-gray-400 text-base mb-4">
                Endless Space Survival - Mine Resources - Score Big
              </p>
            </motion.div>

            {stats.gamesPlayed > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-8 text-sm flex-wrap mb-6"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-300">
                    Best: {stats.bestScore.toLocaleString()} pts
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-300">
                    {stats.gamesPlayed} Games Played
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="p-10 bg-black/70 border-orange-500/30 backdrop-blur-lg">
              <div className="space-y-8">
                
                <div className="flex justify-center">
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ 
                      rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="w-32 h-32 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-full flex items-center justify-center border-2 border-white/10"
                  >
                    <Zap className="w-16 h-16 text-orange-400" />
                  </motion.div>
                </div>

                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-5 h-5 text-orange-400" />
                    <h3 className="font-bold text-white text-lg">How to Play</h3>
                  </div>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Tap screen</strong> to move your ship toward that location</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Hold FIRE button</strong> to shoot asteroids</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>Destroy asteroids and <strong>collect resources</strong> they drop</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>Large asteroids split into smaller pieces when destroyed</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>Survive as long as possible and maximize your score!</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-white text-lg">Asteroid Types</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                      <span className="text-gray-300">Grey - Common</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-400"></div>
                      <span className="text-gray-300">Blue - Uncommon</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-400"></div>
                      <span className="text-gray-300">Green - Rare</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-purple-400"></div>
                      <span className="text-gray-300">Purple - Epic</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <div className="w-4 h-4 rounded-full bg-yellow-400 animate-pulse"></div>
                      <span className="text-gray-300 font-bold">Gold - Legendary (5000 pts!)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-8 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-400" />
                    <span className="text-gray-300">
                      3 Lives - 5 Shield per Life
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-300">
                      {gameConfig.maxPlaysPerDay - playsToday}/{gameConfig.maxPlaysPerDay} Plays Remaining
                    </span>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    data-testid="button-toggle-sound"
                  >
                    {settings.soundEnabled ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4" />
                    )}
                    <span>Sound {settings.soundEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                <div className="flex gap-4 justify-center flex-wrap">
                  <Button
                    onClick={startGame}
                    size="lg"
                    disabled={!isConnected || !isHolder || playsToday >= gameConfig.maxPlaysPerDay}
                    className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold px-10 py-6 text-lg"
                    data-testid="button-start-mining"
                  >
                    <Play className="w-6 h-6 mr-2" />
                    START MINING
                  </Button>
                </div>

                {!isConnected && (
                  <p className="text-center text-red-400 text-sm">
                    Connect your wallet to play
                  </p>
                )}
                {isConnected && !isHolder && (
                  <p className="text-center text-red-400 text-sm">
                    Guardian NFT required to access this game
                  </p>
                )}
                {playsToday >= gameConfig.maxPlaysPerDay && (
                  <p className="text-center text-red-400 text-sm">
                    Daily play limit reached. Return tomorrow!
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
    );
  }

  const state = gameStateRef.current;
  
  return (
    <section className="py-6 min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-black relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4">
        
        <div className="mb-4">
          <GameHUD
            score={state.score}
            time={Math.floor(state.survivalTime / 1000)}
            combo={state.combo >= 2 ? state.combo : undefined}
            extraStats={[
              { icon: Target, label: '', value: `${state.asteroidsDestroyed} destroyed`, color: 'text-orange-400' },
              { icon: Sparkles, label: '', value: `${state.resourcesCollected} collected`, color: 'text-cyan-400' },
            ]}
          />
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <div className="flex gap-1">
              {[...Array(state.ship.lives)].map((_, i) => (
                <Heart key={i} className="w-5 h-5 text-red-400 fill-current" data-testid={`icon-life-${i}`} />
              ))}
            </div>
            
            <div className="flex gap-1 ml-3">
              {[...Array(state.ship.maxShield)].map((_, i) => (
                <ShieldIcon 
                  key={i} 
                  className={`w-4 h-4 ${i < state.ship.shield ? 'text-cyan-400 fill-current' : 'text-gray-600'}`}
                  data-testid={`icon-shield-${i}`}
                />
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="border-white/20"
            data-testid="button-exit-game"
          >
            <Home className="w-4 h-4 mr-1" />
            Exit
          </Button>
        </div>

        {state.powerUpActive && (
          <div className="mb-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-lg">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 font-bold" data-testid="text-powerup-active">
                {state.powerUpActive.type === 'rapidFire' ? 'RAPID FIRE' : 'MAGNET'} - {Math.ceil(state.powerUpActive.duration / 1000)}s
              </span>
            </div>
          </div>
        )}

        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full max-w-full border-2 border-white/20 rounded-lg bg-black/80 cursor-crosshair touch-none"
            data-testid="canvas-game"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const scaleX = CANVAS_WIDTH / rect.width;
              const scaleY = CANVAS_HEIGHT / rect.height;
              const x = (e.clientX - rect.left) * scaleX;
              const y = (e.clientY - rect.top) * scaleY;
              setTargetPosition({ x, y });
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const touch = e.touches[0];
              const scaleX = CANVAS_WIDTH / rect.width;
              const scaleY = CANVAS_HEIGHT / rect.height;
              const x = (touch.clientX - rect.left) * scaleX;
              const y = (touch.clientY - rect.top) * scaleY;
              setTargetPosition({ x, y });
            }}
          />
          
          <div className="absolute bottom-4 right-4">
            <button
              className="w-20 h-20 rounded-full bg-red-500/80 border-4 border-white/50 flex items-center justify-center active:scale-95 transition-transform shadow-lg"
              onMouseDown={() => setIsShooting(true)}
              onMouseUp={() => setIsShooting(false)}
              onMouseLeave={() => setIsShooting(false)}
              onTouchStart={(e) => {
                e.preventDefault();
                setIsShooting(true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsShooting(false);
              }}
              data-testid="button-fire"
            >
              <Crosshair className="w-10 h-10 text-white" />
            </button>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-400">
          <p>Tap screen to move - Hold FIRE button to shoot</p>
        </div>
      </div>

      {showVictory && (
        <VictoryScreen
          gameType="asteroid-mining"
          score={state.score}
          time={Math.floor(state.survivalTime / 1000)}
          playsRemaining={gameConfig.maxPlaysPerDay - playsToday}
          maxPlays={gameConfig.maxPlaysPerDay}
          isNewBest={state.score > stats.bestScore}
          personalBest={stats.bestScore}
          onPlayAgain={() => {
            setShowVictory(false);
            setGameStarted(false);
          }}
          onExit={() => navigate('/')}
          extraStats={[
            { icon: Target, label: 'Destroyed', value: state.asteroidsDestroyed, color: 'text-orange-400' },
            { icon: Sparkles, label: 'Collected', value: state.resourcesCollected, color: 'text-cyan-400' },
          ]}
        />
      )}
    </section>
  );
}
