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
  Crosshair, Home, Loader2, Trophy, RotateCcw
} from 'lucide-react';
import { isMobile, haptic, mobileSettings } from '@/lib/mobileUtils';

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
  const [showOrientationWarning, setShowOrientationWarning] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      setShowOrientationWarning(isPortrait && gameStarted);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, [gameStarted]);

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
    
    initialSpawnTimeoutsRef.current.forEach(t => clearTimeout(t));
    initialSpawnTimeoutsRef.current = [];
    for (let i = 0; i < 3; i++) {
      const timeoutId = setTimeout(() => spawnAsteroid(), i * 500);
      initialSpawnTimeoutsRef.current.push(timeoutId);
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

  const initialSpawnTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      if (shootIntervalRef.current) {
        clearInterval(shootIntervalRef.current);
        shootIntervalRef.current = null;
      }
      initialSpawnTimeoutsRef.current.forEach(t => clearTimeout(t));
      initialSpawnTimeoutsRef.current = [];
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
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
      <section className="py-8 min-h-screen bg-gradient-to-b from-slate-950 via-orange-950/20 to-black relative overflow-hidden">
        <div className="absolute top-4 left-4 z-20">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-cyan-500/30">
            <ShieldIcon className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-400 font-orbitron">GUARDIAN</span>
          </div>
        </div>
        <style>{`
          @keyframes telemetry-scan {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes radar-sweep {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes engine-glow {
            0%, 100% { box-shadow: 0 0 20px rgba(251, 146, 60, 0.3), 0 0 40px rgba(251, 146, 60, 0.1); }
            50% { box-shadow: 0 0 30px rgba(251, 146, 60, 0.5), 0 0 60px rgba(251, 146, 60, 0.2); }
          }
          @keyframes countdown-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
          }
          @keyframes data-stream {
            0% { background-position: 0% 0%; }
            100% { background-position: 0% 100%; }
          }
          @keyframes asteroid-drift {
            0%, 100% { transform: translateX(0) rotate(0deg); }
            50% { transform: translateX(10px) rotate(180deg); }
          }
        `}</style>

        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,146,60,0.05),transparent_70%)]" />
          {[...Array(60)].map((_, i) => (
            <motion.div
              key={`star-${i}`}
              className="absolute w-0.5 h-0.5 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 1.5 + Math.random() * 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500/30 to-transparent overflow-hidden">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400 to-transparent w-1/3"
            style={{ animation: 'telemetry-scan 3s linear infinite' }}
          />
        </div>

        <div className="max-w-4xl mx-auto px-4 relative z-10 pt-12">
          <div className="text-center mb-6">
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <motion.div
                className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-2"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs font-mono tracking-widest">LAUNCH PAD ALPHA</span>
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </motion.div>
              
              <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-yellow-300 to-orange-400 mb-2 font-orbitron tracking-tight">
                ASTEROID MINING
              </h1>
              <motion.p 
                className="text-orange-400/70 text-sm font-mono tracking-wider"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                FLIGHT CONTROL • MISSION BRIEFING
              </motion.p>
            </motion.div>

            {stats.gamesPlayed > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-4 text-sm flex-wrap mt-4"
              >
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-yellow-500/30">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-300 font-mono">{stats.bestScore.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-cyan-500/30">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-300 font-mono">{stats.gamesPlayed} MISSIONS</span>
                </div>
              </motion.div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="p-6 md:p-8 bg-black/80 border-2 border-orange-500/30 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,146,60,0.08),transparent_60%)]" />
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent" />
              
              <div className="absolute top-3 right-3 flex items-center gap-2 opacity-60">
                <div className="w-16 h-16 relative">
                  <div className="absolute inset-0 border-2 border-orange-500/30 rounded-full" />
                  <div 
                    className="absolute inset-0 border-t-2 border-orange-400 rounded-full origin-center"
                    style={{ animation: 'radar-sweep 4s linear infinite' }}
                  />
                  <div className="absolute inset-2 bg-orange-500/10 rounded-full" />
                </div>
              </div>
              
              <div className="space-y-6 relative z-10">
                <div className="flex justify-center">
                  <div className="relative">
                    <motion.div
                      className="absolute -inset-4 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-full blur-xl"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <motion.div
                      className="relative w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center border-2 border-orange-500/40"
                      style={{ animation: 'engine-glow 2s ease-in-out infinite' }}
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                      <Crosshair className="w-12 h-12 text-orange-400" />
                    </motion.div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-500/20 text-orange-400 text-xs font-mono px-2 py-0.5 rounded border border-orange-500/30">
                      READY
                    </div>
                  </div>
                </div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 rounded-xl p-5 border border-orange-500/20 relative overflow-hidden"
                >
                  <div className="absolute -top-3 left-4 bg-slate-900 px-2 py-0.5 rounded text-xs text-orange-400 font-mono border border-orange-500/30">
                    MISSION BRIEF
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                    <div className="flex items-start gap-2 text-gray-300">
                      <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>Tap to navigate ship</span>
                    </div>
                    <div className="flex items-start gap-2 text-gray-300">
                      <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>Hold FIRE to attack</span>
                    </div>
                    <div className="flex items-start gap-2 text-gray-300">
                      <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>Collect dropped resources</span>
                    </div>
                    <div className="flex items-start gap-2 text-gray-300">
                      <ChevronRight className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>Large rocks split apart</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-br from-purple-950/40 to-orange-950/40 rounded-xl p-5 border border-purple-500/20 relative overflow-hidden"
                >
                  <div className="absolute -top-3 left-4 bg-slate-900 px-2 py-0.5 rounded text-xs text-purple-400 font-mono border border-purple-500/30">
                    ORE CLASSIFICATION
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-xs mt-2">
                    <div className="flex flex-col items-center gap-1 bg-black/30 rounded-lg p-2">
                      <motion.div 
                        className="w-5 h-5 rounded-full bg-gray-400"
                        style={{ animation: 'asteroid-drift 4s ease-in-out infinite' }}
                      />
                      <span className="text-gray-400 font-mono">IRON</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 bg-black/30 rounded-lg p-2">
                      <motion.div 
                        className="w-5 h-5 rounded-full bg-blue-400"
                        style={{ animation: 'asteroid-drift 4.5s ease-in-out infinite' }}
                      />
                      <span className="text-blue-400 font-mono">COBALT</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 bg-black/30 rounded-lg p-2">
                      <motion.div 
                        className="w-5 h-5 rounded-full bg-green-400"
                        style={{ animation: 'asteroid-drift 5s ease-in-out infinite' }}
                      />
                      <span className="text-green-400 font-mono">TITANIUM</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 bg-black/30 rounded-lg p-2">
                      <motion.div 
                        className="w-5 h-5 rounded-full bg-purple-400"
                        style={{ animation: 'asteroid-drift 5.5s ease-in-out infinite' }}
                      />
                      <span className="text-purple-400 font-mono">PLASMA</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 bg-black/30 rounded-lg p-2 col-span-3 md:col-span-1">
                      <motion.div 
                        className="w-5 h-5 rounded-full bg-yellow-400"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span className="text-yellow-400 font-mono font-bold">GOLD 5K</span>
                    </div>
                  </div>
                </motion.div>

                <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                    <Heart className="w-4 h-4 text-red-400" />
                    <span className="text-red-300 font-mono">3 LIVES</span>
                  </div>
                  <div className="flex items-center gap-2 bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20">
                    <Play className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-300 font-mono">
                      {gameConfig.maxPlaysPerDay - playsToday}/{gameConfig.maxPlaysPerDay}
                    </span>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                    className="flex items-center gap-2 text-gray-400 hover:text-orange-400 transition-colors bg-black/20 px-3 py-1.5 rounded-lg border border-white/10 hover:border-orange-500/30"
                    data-testid="button-toggle-sound"
                  >
                    {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span className="font-mono text-xs">{settings.soundEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                <div className="flex gap-4 justify-center flex-wrap">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative group"
                  >
                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl blur-md opacity-40 group-hover:opacity-70 transition-opacity" />
                    <Button
                      onClick={startGame}
                      size="lg"
                      disabled={!isConnected || !isHolder || playsToday >= gameConfig.maxPlaysPerDay}
                      className="relative bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-500 hover:to-yellow-400 text-white font-bold px-8 py-5 text-base border-0 shadow-lg shadow-orange-500/20"
                      data-testid="button-start-mining"
                    >
                      <Zap className="w-5 h-5 mr-2" />
                      LAUNCH MISSION
                    </Button>
                  </motion.div>
                </div>

                {!isConnected && (
                  <motion.p 
                    className="text-center text-red-400/80 text-sm font-mono"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    ⚠ AUTHORIZATION REQUIRED - Connect Wallet
                  </motion.p>
                )}
                {isConnected && !isHolder && (
                  <p className="text-center text-red-400 text-sm font-mono bg-red-500/10 rounded-lg py-2 border border-red-500/20">
                    ⛔ Guardian NFT clearance required
                  </p>
                )}
                {playsToday >= gameConfig.maxPlaysPerDay && (
                  <p className="text-center text-orange-400 text-sm font-mono bg-orange-500/10 rounded-lg py-2 border border-orange-500/20">
                    Daily mission quota reached. Return tomorrow.
                  </p>
                )}

                <div className="flex justify-center pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/')}
                    className="text-gray-500 hover:text-orange-400 text-sm"
                    data-testid="button-back-home"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Command Center
                  </Button>
                </div>
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
          
          <div className={`absolute bottom-4 right-4 ${isMobile ? 'scale-110' : ''}`}>
            <button
              className={`${isMobile ? 'w-24 h-24' : 'w-20 h-20'} rounded-full bg-red-500/80 border-4 border-white/50 flex items-center justify-center active:scale-95 transition-transform shadow-lg ${isShooting ? 'ring-4 ring-red-300/50 animate-pulse' : ''}`}
              onMouseDown={() => setIsShooting(true)}
              onMouseUp={() => setIsShooting(false)}
              onMouseLeave={() => setIsShooting(false)}
              onTouchStart={(e) => {
                e.preventDefault();
                setIsShooting(true);
                haptic.medium();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsShooting(false);
              }}
              data-testid="button-fire"
            >
              <Crosshair className={`${isMobile ? 'w-12 h-12' : 'w-10 h-10'} text-white`} />
            </button>
          </div>
          
          {showOrientationWarning && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center bg-black/90 rounded-lg z-20"
              data-testid="orientation-warning"
            >
              <div className="text-center p-6">
                <motion.div
                  animate={{ rotate: [0, 90, 90, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  className="mb-4"
                >
                  <RotateCcw className="w-16 h-16 text-cyan-400 mx-auto" />
                </motion.div>
                <p className="text-white font-orbitron text-lg mb-2">ROTATE DEVICE</p>
                <p className="text-cyan-400/70 text-sm">For best experience, play in landscape mode</p>
              </div>
            </motion.div>
          )}
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
