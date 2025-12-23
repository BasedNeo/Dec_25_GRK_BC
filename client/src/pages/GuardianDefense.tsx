import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
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
  Play, Shield, Info, ChevronRight, Volume2, VolumeX,
  Home, Loader2, Trophy, Zap, Target, Star, Crosshair
} from 'lucide-react';

type MissileColor = 'green' | 'red' | 'yellow';

interface Vector2D {
  x: number;
  y: number;
}

interface EnemyMissile {
  id: string;
  start: Vector2D;
  target: Vector2D;
  position: Vector2D;
  color: MissileColor;
  speed: number;
  progress: number;
  active: boolean;
}

interface DefensiveMissile {
  id: string;
  start: Vector2D;
  target: Vector2D;
  position: Vector2D;
  progress: number;
  batteryIndex: number;
}

interface Explosion {
  id: string;
  position: Vector2D;
  radius: number;
  maxRadius: number;
  expanding: boolean;
  lifetime: number;
  maxLifetime: number;
  isPlayer: boolean;
}

interface Particle {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  color: string;
  size: number;
  lifetime: number;
}

interface Battery {
  missiles: number;
  maxMissiles: number;
  position: Vector2D;
  reloading: boolean;
  reloadProgress: number;
}

interface City {
  id: string;
  position: Vector2D;
  active: boolean;
  name: string;
}

interface ShootingStar {
  id: string;
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
  progress: number;
}

interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  twinkleOffset: number;
  layer: number;
}

interface ScorePopup {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  lifetime: number;
  isSpecial: boolean;
}

interface PowerUp {
  id: string;
  type: 'rapidfire' | 'shield' | 'bomb';
  position: Vector2D;
  velocity: Vector2D;
  lifetime: number;
}

interface GameState {
  wave: number;
  score: number;
  batteries: Battery[];
  cities: City[];
  enemyMissiles: EnemyMissile[];
  defensiveMissiles: DefensiveMissile[];
  explosions: Explosion[];
  particles: Particle[];
  shootingStars: ShootingStar[];
  backgroundStars: BackgroundStar[];
  scorePopups: ScorePopup[];
  powerUps: PowerUp[];
  chainReactions: number;
  waveChainBonus: number;
  accuracy: { hits: number; shots: number };
  waveActive: boolean;
  gameTime: number;
  screenShake: number;
  waveComplete: boolean;
  waveTransition: boolean;
  missilesRemaining: number;
  activePowerUp: { type: 'rapidfire' | 'shield' | 'bomb'; duration: number } | null;
}

interface GuardianDefenseSettings extends BaseGameSettings {
}

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const GROUND_Y = 440;

const BATTERY_POSITIONS = [
  { x: 80, y: GROUND_Y },
  { x: 320, y: GROUND_Y },
  { x: 560, y: GROUND_Y },
];

const CITY_POSITIONS = [
  { x: 160, y: GROUND_Y, name: 'NEON JAGUAR LAIR' },
  { x: 240, y: GROUND_Y, name: 'SERPENT SANCTUM' },
  { x: 400, y: GROUND_Y, name: 'PHOENIX ROOST' },
  { x: 480, y: GROUND_Y, name: 'WOLF DEN' },
];

const MISSILE_COLORS: Record<MissileColor, string> = {
  green: '#10B981',
  red: '#EF4444',
  yellow: '#FBBF24',
};

const MISSILE_POINTS: Record<MissileColor, number> = {
  green: 1,
  red: 1,
  yellow: 2,
};

const MISSILES_PER_BATTERY = 4;
const DEFENSIVE_MISSILE_SPEED = 700;
const EXPLOSION_MAX_RADIUS = 40;
const EXPLOSION_LIFETIME = 1.8;
const RELOAD_TIME = 6000;
const MIN_FIRE_INTERVAL = 200;

const WAVE_CONFIG = [
  { count: 4, speed: 45, delay: 400, message: "The creatures sense danger!" },
  { count: 6, speed: 50, delay: 350, message: "The Jaguar roars in defiance!" },
  { count: 8, speed: 55, delay: 320, message: "Serpent coils for defense!" },
  { count: 10, speed: 60, delay: 300, message: "Phoenix flames ignite!" },
  { count: 12, speed: 65, delay: 280, message: "Wolf pack assembles!" },
  { count: 14, speed: 70, delay: 260, message: "All creatures UNITE!" },
  { count: 16, speed: 75, delay: 240, message: "The swarm overwhelms!" },
  { count: 18, speed: 80, delay: 220, message: "Creatures fight as one!" },
  { count: 20, speed: 85, delay: 200, message: "The final stand begins!" },
  { count: 28, speed: 95, delay: 150, message: "⚠️ ALPHA SWARM - DEFEND THE LAIRS!" },
];

const WAVE_MESSAGES = [
  "The Neon Jaguar purrs with gratitude!",
  "The Cyber Serpent coils in victory!",
  "Phoenix rises from the ashes!",
  "The Wolf howls in triumph!",
  "All creature lairs are secure!",
  "The Based Creatures stand strong!",
  "The sanctuary is defended!",
  "Creature powers channeled!",
  "The homeworld is safe!",
  "LEGENDARY CREATURE COMMANDER!",
];

const getDistance = (a: Vector2D, b: Vector2D): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * Math.min(1, Math.max(0, t));
};

const randomColor = (): MissileColor => {
  const colors: MissileColor[] = ['green', 'red', 'yellow'];
  const weights = [0.5, 0.35, 0.15];
  const r = Math.random();
  if (r < weights[0]) return colors[0];
  if (r < weights[0] + weights[1]) return colors[1];
  return colors[2];
};

const generateBackgroundStars = (): BackgroundStar[] => {
  const stars: BackgroundStar[] = [];
  for (let layer = 0; layer < 3; layer++) {
    const count = 60 - layer * 15;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (CANVAS_HEIGHT - 150),
        size: 0.5 + layer * 0.4 + Math.random() * 0.5,
        twinkleOffset: Math.random() * Math.PI * 2,
        layer,
      });
    }
  }
  return stars;
};

export default function GuardianDefense() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { submitScore } = useGameScoresLocal();
  const { isHolder, isLoading: nftLoading, access, recordPlay } = useGameAccess();

  const gameConfig = useMemo(() => getGameConfig('guardian-defense'), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastFireTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gameStartTimeRef = useRef<number>(Date.now());

  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [playsToday, setPlaysToday] = useState(0);
  const [canvasScale, setCanvasScale] = useState(1);

  const [stats, setStats] = useState<GameStats>(() =>
    address 
      ? GameStorageManager.loadStats('guardian-defense', address)
      : GameStorageManager.getDefaultStats()
  );

  const [settings, setSettings] = useState<GuardianDefenseSettings>(() =>
    GameStorageManager.loadSettings<GuardianDefenseSettings>('guardian-defense', {
      soundEnabled: true,
      soundVolume: 70,
      animationSpeed: 'normal',
      particleIntensity: 'medium',
    })
  );

  const initialGameState = useCallback((): GameState => ({
    wave: 1,
    score: 0,
    batteries: BATTERY_POSITIONS.map(pos => ({
      missiles: MISSILES_PER_BATTERY,
      maxMissiles: MISSILES_PER_BATTERY,
      position: { ...pos },
      reloading: false,
      reloadProgress: 0,
    })),
    cities: CITY_POSITIONS.map((pos, i) => ({
      id: `city-${i}`,
      position: { x: pos.x, y: pos.y },
      active: true,
      name: pos.name,
    })),
    enemyMissiles: [],
    defensiveMissiles: [],
    explosions: [],
    particles: [],
    shootingStars: [],
    backgroundStars: generateBackgroundStars(),
    scorePopups: [],
    powerUps: [],
    chainReactions: 0,
    waveChainBonus: 0,
    accuracy: { hits: 0, shots: 0 },
    waveActive: false,
    gameTime: 0,
    screenShake: 0,
    waveComplete: false,
    waveTransition: false,
    missilesRemaining: 0,
    activePowerUp: null,
  }), []);

  const gameStateRef = useRef<GameState>(initialGameState());
  const [renderTrigger, setRenderTrigger] = useState(0);

  useEffect(() => {
    if (!address) return;
    const loadedStats = GameStorageManager.loadStats('guardian-defense', address);
    setStats(loadedStats);
    setPlaysToday(loadedStats.gamesPlayed % gameConfig.maxPlaysPerDay);
  }, [address, gameConfig.maxPlaysPerDay]);

  useEffect(() => {
    GameStorageManager.saveSettings('guardian-defense', settings);
  }, [settings]);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 32;
        const scale = Math.min(1, containerWidth / CANVAS_WIDTH);
        setCanvasScale(scale);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [gameStarted]);

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

  const playSound = useCallback((type: 'launch' | 'explosion' | 'chain' | 'hit' | 'wave' | 'death' | 'victory') => {
    if (!settings.soundEnabled || !audioContextRef.current) return;
    try {
      const ctx = audioContextRef.current;
      const volume = settings.soundVolume / 100;
      
      const createOsc = (freq: number, duration: number, type: OscillatorType = 'sine') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.1 * volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      };

      switch (type) {
        case 'launch':
          createOsc(600, 0.12, 'square');
          break;
        case 'explosion':
          createOsc(150, 0.3, 'sawtooth');
          break;
        case 'chain':
          createOsc(400, 0.15);
          setTimeout(() => createOsc(600, 0.15), 50);
          break;
        case 'hit':
          createOsc(80, 0.4, 'sawtooth');
          break;
        case 'wave':
          [300, 400, 500, 600].forEach((f, i) => {
            setTimeout(() => createOsc(f, 0.2), i * 80);
          });
          break;
        case 'death':
          createOsc(200, 0.6, 'sawtooth');
          break;
        case 'victory':
          [400, 500, 600, 800, 1000].forEach((f, i) => {
            setTimeout(() => createOsc(f, 0.25), i * 100);
          });
          break;
      }
    } catch (err) {
      console.error('Sound error:', err);
    }
  }, [settings.soundEnabled, settings.soundVolume]);

  const createParticles = useCallback((position: Vector2D, color: string, count: number, speed: number = 120) => {
    const state = gameStateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      state.particles.push({
        id: `p-${Date.now()}-${i}-${Math.random()}`,
        position: { ...position },
        velocity: {
          x: Math.cos(angle) * speed * (0.5 + Math.random() * 0.5),
          y: Math.sin(angle) * speed * (0.5 + Math.random() * 0.5),
        },
        color,
        size: 2 + Math.random() * 3,
        lifetime: 0.6 + Math.random() * 0.6,
      });
    }
  }, []);

  const spawnShootingStar = useCallback(() => {
    const state = gameStateRef.current;
    if (state.shootingStars.length < 3 && Math.random() < 0.02) {
      state.shootingStars.push({
        id: `ss-${Date.now()}`,
        x: Math.random() * CANVAS_WIDTH * 0.8,
        y: Math.random() * 150,
        length: 60 + Math.random() * 80,
        speed: 250 + Math.random() * 150,
        angle: Math.PI / 5 + (Math.random() - 0.5) * 0.3,
        opacity: 0.6 + Math.random() * 0.4,
        progress: 0,
      });
    }
  }, []);

  const endGame = useCallback(async (won: boolean) => {
    if (!address) return;
    const state = gameStateRef.current;
    
    // Bot protection: minimum play duration check
    const playDuration = (Date.now() - gameStartTimeRef.current) / 1000;
    
    const citiesBonus = state.cities.filter(c => c.active).length * 5;
    const accuracyBonus = state.accuracy.shots > 0 
      ? Math.floor((state.accuracy.hits / state.accuracy.shots) * 10)
      : 0;
    const waveBonus = (state.wave - 1) * 2;
    
    let finalScore = Math.min(
      state.score + citiesBonus + accuracyBonus + waveBonus,
      gameConfig.scoring.maxScore
    );
    
    if (playDuration < gameConfig.minPlayDuration) {
      toast({
        title: "Play Too Fast",
        description: `Game must be played for at least ${gameConfig.minPlayDuration} seconds for valid score`,
        variant: "destructive"
      });
      finalScore = 0;
    }

    const newStats: GameStats = { ...stats };
    newStats.gamesPlayed++;
    newStats.totalScore += finalScore;
    newStats.totalTime += Math.floor(state.gameTime / 1000);
    
    if (won) {
      newStats.gamesWon++;
      newStats.currentStreak++;
      newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak);
      playSound('victory');
    } else {
      newStats.currentStreak = 0;
      playSound('death');
    }
    
    if (finalScore > newStats.bestScore) {
      newStats.bestScore = finalScore;
    }
    newStats.lastPlayed = Date.now();
    
    GameStorageManager.saveStats('guardian-defense', address, newStats);
    setStats(newStats);
    gameStateRef.current.score = finalScore;

    try {
      submitScore(finalScore, state.wave);
      setPlaysToday(prev => prev + 1);
      trackEvent('game_complete', 'Game', `Guardian Defense - Wave ${state.wave} - ${finalScore} pts`);
    } catch (err) {
      console.error('Failed to submit score:', err);
    }
  }, [address, stats, gameConfig.scoring.maxScore, gameConfig.minPlayDuration, submitScore, playSound, toast]);

  const spawnWave = useCallback((waveNumber: number) => {
    const state = gameStateRef.current;
    const config = WAVE_CONFIG[waveNumber - 1];
    
    if (!config) {
      setGameWon(true);
      setGameOver(true);
      setShowVictory(true);
      endGame(true);
      return;
    }
    
    state.waveActive = true;
    state.waveComplete = false;
    state.waveTransition = false;
    state.waveChainBonus = 0;
    state.missilesRemaining = config.count;
    
    const waveToast = toast({
      title: waveNumber === 10 ? "⚠️ FINAL BOSS WAVE" : `WAVE ${waveNumber}`,
      description: config.message,
      className: waveNumber === 10 
        ? "bg-black/90 border-red-500 text-red-400"
        : "bg-black/90 border-cyan-500/50 text-cyan-400"
    });
    setTimeout(() => waveToast.dismiss(), 3000);
    
    playSound('wave');
    
    for (let i = 0; i < config.count; i++) {
      setTimeout(() => {
        if (gameOver) return;
        
        const startX = 50 + Math.random() * (CANVAS_WIDTH - 100);
        let target: Vector2D;
        
        const activeTargets = [
          ...state.cities.filter(c => c.active).map(c => c.position),
          ...state.batteries.filter(b => b.missiles > 0 || b.reloading).map(b => b.position),
        ];
        
        if (activeTargets.length > 0 && Math.random() < 0.75) {
          const t = activeTargets[Math.floor(Math.random() * activeTargets.length)];
          target = { x: t.x + (Math.random() - 0.5) * 30, y: t.y };
        } else {
          target = { x: 50 + Math.random() * (CANVAS_WIDTH - 100), y: GROUND_Y };
        }
        
        state.enemyMissiles.push({
          id: `em-${Date.now()}-${i}-${Math.random()}`,
          start: { x: startX, y: -10 },
          target,
          position: { x: startX, y: -10 },
          color: randomColor(),
          speed: config.speed + Math.random() * 15,
          progress: 0,
          active: true,
        });
      }, i * config.delay + Math.random() * 100);
    }
  }, [toast, playSound, gameOver, endGame]);

  const fireMissile = useCallback((targetX: number, targetY: number) => {
    const state = gameStateRef.current;
    if (gameOver || state.waveTransition) return;
    
    const now = Date.now();
    if (now - lastFireTimeRef.current < MIN_FIRE_INTERVAL) return;
    lastFireTimeRef.current = now;
    
    const sortedBatteries = state.batteries
      .map((b, i) => ({ battery: b, index: i, dist: Math.abs(b.position.x - targetX) }))
      .filter(b => b.battery.missiles > 0 && !b.battery.reloading)
      .sort((a, b) => a.dist - b.dist);
    
    if (sortedBatteries.length === 0) {
      const totalMissiles = state.batteries.reduce((sum, b) => sum + b.missiles, 0);
      const anyReloading = state.batteries.some(b => b.reloading);
      
      if (totalMissiles === 0 && !anyReloading) {
        toast({
          title: "All Batteries Empty!",
          description: "Wait for reload...",
          variant: "destructive"
        });
      }
      return;
    }
    
    const { battery, index } = sortedBatteries[0];
    battery.missiles--;
    state.accuracy.shots++;
    
    state.defensiveMissiles.push({
      id: `dm-${Date.now()}-${Math.random()}`,
      start: { ...battery.position, y: battery.position.y - 15 },
      target: { x: targetX, y: Math.max(50, targetY) },
      position: { ...battery.position, y: battery.position.y - 15 },
      progress: 0,
      batteryIndex: index,
    });
    
    playSound('launch');
    
    if (battery.missiles === 0) {
      battery.reloading = true;
      battery.reloadProgress = 0;
    }
  }, [playSound, toast, gameOver]);

  const createExplosion = useCallback((position: Vector2D, isPlayer: boolean) => {
    const state = gameStateRef.current;
    state.explosions.push({
      id: `ex-${Date.now()}-${Math.random()}`,
      position: { ...position },
      radius: 0,
      maxRadius: EXPLOSION_MAX_RADIUS,
      expanding: true,
      lifetime: EXPLOSION_LIFETIME,
      maxLifetime: EXPLOSION_LIFETIME,
      isPlayer,
    });
    
    createParticles(position, isPlayer ? '#60A5FA' : '#EF4444', 12, 100);
    state.screenShake = Math.min(state.screenShake + (isPlayer ? 3 : 8), 15);
    playSound('explosion');
  }, [createParticles, playSound]);

  const createScorePopup = useCallback((text: string, x: number, y: number, color: string, isSpecial: boolean = false) => {
    const state = gameStateRef.current;
    state.scorePopups.push({
      id: `sp-${Date.now()}-${Math.random()}`,
      text,
      x,
      y,
      color,
      lifetime: isSpecial ? 1.5 : 1.0,
      isSpecial,
    });
  }, []);

  const checkCollisions = useCallback(() => {
    const state = gameStateRef.current;
    
    state.explosions.forEach(explosion => {
      if (!explosion.isPlayer) return;
      
      state.enemyMissiles.forEach(missile => {
        if (!missile.active) return;
        
        const dist = getDistance(explosion.position, missile.position);
        if (dist < explosion.radius + 8) {
          missile.active = false;
          state.accuracy.hits++;
          
          const basePoints = MISSILE_POINTS[missile.color];
          const chainBonus = state.chainReactions * 5;
          const totalPoints = basePoints + chainBonus;
          state.score += totalPoints;
          state.waveChainBonus += chainBonus;
          state.chainReactions++;
          
          createExplosion(missile.position, true);
          
          if (state.chainReactions > 1) {
            createScorePopup(`+${totalPoints} x${state.chainReactions}`, missile.position.x, missile.position.y - 20, '#FBBF24', true);
            playSound('chain');
          } else {
            createScorePopup(`+${totalPoints}`, missile.position.x, missile.position.y - 20, '#10B981', false);
          }
        }
      });
    });
    
    state.enemyMissiles.forEach(missile => {
      if (!missile.active) return;
      
      if (missile.position.y >= GROUND_Y - 5) {
        missile.active = false;
        createExplosion(missile.position, false);
        
        state.cities.forEach(city => {
          if (!city.active) return;
          const dist = getDistance(missile.position, city.position);
          if (dist < 40) {
            city.active = false;
            state.screenShake = 20;
            playSound('hit');
            
            toast({
              title: `${city.name} DESTROYED`,
              description: "Installation lost!",
              variant: "destructive",
              className: "bg-black/90 border-red-500"
            });
          }
        });
        
        state.batteries.forEach(battery => {
          const dist = getDistance(missile.position, battery.position);
          if (dist < 35) {
            battery.missiles = Math.max(0, battery.missiles - 3);
            state.screenShake = 15;
          }
        });
      }
    });
  }, [createExplosion, createScorePopup, playSound, toast]);

  const update = useCallback((deltaMs: number) => {
    if (gameOver) return;
    
    const state = gameStateRef.current;
    const dt = deltaMs / 1000;
    state.gameTime += deltaMs;
    
    spawnShootingStar();
    
    state.shootingStars.forEach(star => {
      star.progress += dt * 0.5;
      star.x += Math.cos(star.angle) * star.speed * dt;
      star.y += Math.sin(star.angle) * star.speed * dt;
    });
    state.shootingStars = state.shootingStars.filter(s => s.progress < 1);
    
    state.batteries.forEach(battery => {
      if (battery.reloading) {
        battery.reloadProgress += deltaMs;
        if (battery.reloadProgress >= RELOAD_TIME) {
          battery.reloading = false;
          battery.missiles = battery.maxMissiles;
          battery.reloadProgress = 0;
        }
      }
    });
    
    state.defensiveMissiles.forEach(missile => {
      const totalDist = getDistance(missile.start, missile.target);
      const moveAmount = (DEFENSIVE_MISSILE_SPEED * dt) / totalDist;
      missile.progress += moveAmount;
      
      missile.position.x = lerp(missile.start.x, missile.target.x, missile.progress);
      missile.position.y = lerp(missile.start.y, missile.target.y, missile.progress);
    });
    
    const arrivedMissiles = state.defensiveMissiles.filter(m => m.progress >= 1);
    arrivedMissiles.forEach(missile => {
      createExplosion(missile.target, true);
      state.chainReactions = 0;
    });
    state.defensiveMissiles = state.defensiveMissiles.filter(m => m.progress < 1);
    
    state.enemyMissiles.forEach(missile => {
      if (!missile.active) return;
      
      const totalDist = getDistance(missile.start, missile.target);
      const moveAmount = (missile.speed * dt) / totalDist;
      missile.progress += moveAmount;
      
      missile.position.x = lerp(missile.start.x, missile.target.x, missile.progress);
      missile.position.y = lerp(missile.start.y, missile.target.y, missile.progress);
    });
    
    checkCollisions();
    
    state.enemyMissiles = state.enemyMissiles.filter(m => m.active);
    
    state.explosions.forEach(explosion => {
      explosion.lifetime -= dt;
      
      const lifeRatio = explosion.lifetime / explosion.maxLifetime;
      if (lifeRatio > 0.7) {
        explosion.radius = explosion.maxRadius * (1 - lifeRatio) / 0.3;
      } else if (lifeRatio > 0.3) {
        explosion.radius = explosion.maxRadius;
      } else {
        explosion.radius = explosion.maxRadius * (lifeRatio / 0.3);
      }
    });
    state.explosions = state.explosions.filter(e => e.lifetime > 0);
    
    state.particles.forEach(particle => {
      particle.lifetime -= dt;
      particle.position.x += particle.velocity.x * dt;
      particle.position.y += particle.velocity.y * dt;
      particle.velocity.y += 150 * dt;
    });
    state.particles = state.particles.filter(p => p.lifetime > 0);
    
    state.scorePopups.forEach(popup => {
      popup.lifetime -= dt;
      popup.y -= 40 * dt;
    });
    state.scorePopups = state.scorePopups.filter(p => p.lifetime > 0);
    
    state.screenShake = Math.max(0, state.screenShake - dt * 30);
    
    const activeCities = state.cities.filter(c => c.active).length;
    if (activeCities === 0) {
      setGameOver(true);
      setShowVictory(true);
      setGameWon(false);
      endGame(false);
      return;
    }
    
    if (state.waveActive && state.enemyMissiles.length === 0 && state.explosions.length === 0) {
      state.waveActive = false;
      state.waveComplete = true;
      
      const savedCities = state.cities.filter(c => c.active).length;
      const perfectDefense = savedCities === 4;
      
      const waveBonus = state.wave * 1;
      const chainBonus = state.waveChainBonus;
      const perfectBonus = perfectDefense ? 5 : 0;
      state.score += waveBonus + perfectBonus;
      
      if (perfectDefense) {
        createScorePopup('PERFECT DEFENSE!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40, '#10B981', true);
        createScorePopup(`+${perfectBonus} BONUS`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '#FBBF24', false);
      }
      if (chainBonus > 0) {
        createScorePopup(`CHAIN BONUS +${chainBonus}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30, '#a855f7', true);
      }
      
      const completeToast = toast({
        title: perfectDefense ? "⭐ PERFECT DEFENSE!" : `Wave ${state.wave} Complete!`,
        description: WAVE_MESSAGES[state.wave - 1] || "Well defended!",
        className: "bg-black/90 border-green-500 text-green-400"
      });
      setTimeout(() => completeToast.dismiss(), 3000);
      
      if (state.wave >= 10) {
        setGameWon(true);
        setGameOver(true);
        setShowVictory(true);
        endGame(true);
        return;
      }
      
      state.waveTransition = true;
      setTimeout(() => {
        if (!gameOver) {
          state.wave++;
          state.batteries.forEach(b => {
            b.missiles = b.maxMissiles;
            b.reloading = false;
            b.reloadProgress = 0;
          });
          spawnWave(state.wave);
        }
      }, 1500);
    }
  }, [gameOver, spawnShootingStar, checkCollisions, createExplosion, createScorePopup, spawnWave, toast, endGame]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const state = gameStateRef.current;
    
    ctx.save();
    if (state.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * state.screenShake;
      const shakeY = (Math.random() - 0.5) * state.screenShake;
      ctx.translate(shakeX, shakeY);
    }
    
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyGradient.addColorStop(0, '#0a0a1a');
    skyGradient.addColorStop(0.3, '#1a103a');
    skyGradient.addColorStop(0.6, '#2d1b4e');
    skyGradient.addColorStop(1, '#1e1b3a');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    const time = state.gameTime / 1000;
    state.backgroundStars.forEach(star => {
      const twinkle = Math.sin(time * 2 + star.twinkleOffset) * 0.3 + 0.7;
      const layerAlpha = 0.4 + star.layer * 0.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * layerAlpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    
    state.shootingStars.forEach(star => {
      const alpha = star.opacity * (1 - star.progress);
      const gradient = ctx.createLinearGradient(
        star.x, star.y,
        star.x - Math.cos(star.angle) * star.length,
        star.y - Math.sin(star.angle) * star.length
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(star.x, star.y);
      ctx.lineTo(
        star.x - Math.cos(star.angle) * star.length,
        star.y - Math.sin(star.angle) * star.length
      );
      ctx.stroke();
    });
    
    const mountainLayers = [
      { baseY: GROUND_Y - 40, color1: '#1a0a30', color2: '#2d1050', peaks: 12, height: 60 },
      { baseY: GROUND_Y - 20, color1: '#2a1040', color2: '#3d1560', peaks: 8, height: 45 },
      { baseY: GROUND_Y, color1: '#3a1550', color2: '#4d1a70', peaks: 6, height: 30 },
    ];
    
    mountainLayers.forEach(layer => {
      const gradient = ctx.createLinearGradient(0, layer.baseY - layer.height, 0, GROUND_Y);
      gradient.addColorStop(0, layer.color2);
      gradient.addColorStop(1, layer.color1);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT);
      
      for (let i = 0; i <= layer.peaks; i++) {
        const x = (CANVAS_WIDTH / layer.peaks) * i;
        const peakY = layer.baseY - layer.height + Math.sin(i * 1.3 + time * 0.02) * 10;
        ctx.lineTo(x, peakY);
      }
      
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();
    });
    
    const groundGradient = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
    groundGradient.addColorStop(0, '#1a1a2e');
    groundGradient.addColorStop(1, '#0f0f1a');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();
    
    state.cities.forEach(city => {
      if (!city.active) return;
      
      const buildingHeight = 30;
      const buildingWidth = 35;
      
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(
        city.position.x - buildingWidth / 2,
        city.position.y - buildingHeight,
        buildingWidth,
        buildingHeight
      );
      
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        city.position.x - buildingWidth / 2,
        city.position.y - buildingHeight,
        buildingWidth,
        buildingHeight
      );
      
      ctx.fillStyle = '#fbbf24';
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          const windowOn = Math.sin(time * 3 + row + col + city.position.x) > -0.3;
          if (windowOn) {
            ctx.fillRect(
              city.position.x - 10 + col * 14,
              city.position.y - buildingHeight + 6 + row * 9,
              5, 5
            );
          }
        }
      }
      
      ctx.fillStyle = '#9ca3af';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(city.name, city.position.x, city.position.y + 12);
    });
    
    state.batteries.forEach((battery, i) => {
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.moveTo(battery.position.x - 25, battery.position.y);
      ctx.lineTo(battery.position.x - 15, battery.position.y - 20);
      ctx.lineTo(battery.position.x + 15, battery.position.y - 20);
      ctx.lineTo(battery.position.x + 25, battery.position.y);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = '#60a5fa';
      ctx.beginPath();
      ctx.arc(battery.position.x, battery.position.y - 12, 6, 0, Math.PI * 2);
      ctx.fill();
      
      if (battery.reloading) {
        const progress = battery.reloadProgress / RELOAD_TIME;
        ctx.fillStyle = '#374151';
        ctx.fillRect(battery.position.x - 15, battery.position.y - 32, 30, 6);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(battery.position.x - 15, battery.position.y - 32, 30 * progress, 6);
        
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('RELOAD', battery.position.x, battery.position.y - 36);
      } else {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${battery.missiles}`, battery.position.x, battery.position.y - 28);
      }
      
      ctx.fillStyle = '#6b7280';
      ctx.font = '8px monospace';
      ctx.fillText(['ALPHA', 'BETA', 'GAMMA'][i], battery.position.x, battery.position.y + 12);
    });
    
    state.enemyMissiles.forEach(missile => {
      if (!missile.active) return;
      
      const color = MISSILE_COLORS[missile.color];
      
      ctx.strokeStyle = `${color}60`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(missile.start.x, missile.start.y);
      ctx.lineTo(missile.position.x, missile.position.y);
      ctx.stroke();
      
      ctx.fillStyle = color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(missile.position.x, missile.position.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    
    state.defensiveMissiles.forEach(missile => {
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(missile.start.x, missile.start.y);
      ctx.lineTo(missile.position.x, missile.position.y);
      ctx.stroke();
      
      ctx.fillStyle = '#60a5fa';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#60a5fa';
      ctx.beginPath();
      ctx.arc(missile.position.x, missile.position.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    
    state.explosions.forEach(explosion => {
      const color = explosion.isPlayer ? '#60a5fa' : '#ef4444';
      const alpha = Math.min(1, explosion.lifetime / 0.6);
      
      const gradient = ctx.createRadialGradient(
        explosion.position.x, explosion.position.y, 0,
        explosion.position.x, explosion.position.y, explosion.radius
      );
      gradient.addColorStop(0, `${color}${Math.floor(alpha * 180).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(0.5, `${color}${Math.floor(alpha * 100).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, `${color}00`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(explosion.position.x, explosion.position.y, explosion.radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = `${color}${Math.floor(alpha * 200).toString(16).padStart(2, '0')}`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(explosion.position.x, explosion.position.y, explosion.radius, 0, Math.PI * 2);
      ctx.stroke();
    });
    
    state.particles.forEach(particle => {
      const alpha = Math.min(1, particle.lifetime * 2);
      ctx.fillStyle = `${particle.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
      ctx.beginPath();
      ctx.arc(particle.position.x, particle.position.y, particle.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
    
    state.scorePopups.forEach(popup => {
      const alpha = Math.min(1, popup.lifetime * 2);
      const scale = popup.isSpecial ? 1.3 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${Math.floor(14 * scale)}px Orbitron, monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = popup.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = popup.color;
      ctx.fillText(popup.text, popup.x, popup.y);
      ctx.restore();
    });
    
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 12px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CREATURE COMMAND CENTER', CANVAS_WIDTH / 2, GROUND_Y + 28);
    
    ctx.fillStyle = '#6b7280';
    ctx.font = '9px monospace';
    ctx.fillText('BASED CREATURES • LEGENDARY DEFENDERS', CANVAS_WIDTH / 2, GROUND_Y + 42);
    
    if (state.waveTransition && !gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 28px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`WAVE ${state.wave} COMPLETE`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
      
      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px monospace';
      ctx.fillText('Preparing next wave...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    }
    
    ctx.restore();
  }, [gameOver]);

  const gameLoop = useCallback((currentTime: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = currentTime;
    const deltaTime = Math.min(currentTime - lastTimeRef.current, 50);
    lastTimeRef.current = currentTime;
    
    update(deltaTime);
    render();
    setRenderTrigger(prev => prev + 1);
    
    if (!gameOver) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [update, render, gameOver]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (gameOver) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      e.preventDefault();
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = (clientX - rect.left) / canvasScale;
    const y = (clientY - rect.top) / canvasScale;
    
    if (y < GROUND_Y - 30) {
      fireMissile(x, y);
    }
  }, [canvasScale, fireMissile, gameOver]);

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

    gameStateRef.current = initialGameState();
    gameStartTimeRef.current = Date.now();
    setGameStarted(true);
    setGameOver(false);
    setGameWon(false);
    setShowVictory(false);
    lastTimeRef.current = 0;
    
    setTimeout(() => {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      setTimeout(() => spawnWave(1), 800);
    }, 100);
    
    trackEvent('game_start', 'Game', 'Guardian Defense');
  }, [isConnected, isHolder, playsToday, gameConfig.maxPlaysPerDay, initialGameState, gameLoop, spawnWave, toast]);

  const restartGame = useCallback(() => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    setShowVictory(false);
    startGame();
  }, [startGame]);

  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  if (nftLoading) {
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-950 via-purple-950 to-black pt-20">
          <Card className="p-8 bg-black/60 border-cyan-500/30 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <p className="text-cyan-400">Awakening the Creatures...</p>
            </div>
          </Card>
        </div>
      </>
    );
  }

  if (showVictory) {
    const state = gameStateRef.current;
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <VictoryScreen
        gameType="guardian-defense"
        score={state.score}
        time={Math.floor(state.gameTime / 1000)}
        playsRemaining={gameConfig.maxPlaysPerDay - playsToday}
        maxPlays={gameConfig.maxPlaysPerDay}
        isNewBest={state.score > stats.bestScore}
        personalBest={stats.bestScore}
        extraStats={[
          { icon: Zap, label: 'Wave', value: `${state.wave}/10`, color: 'text-purple-400' },
          { icon: Shield, label: 'Lairs', value: `${state.cities.filter(c => c.active).length}/4`, color: 'text-cyan-400' },
          { icon: Target, label: 'Accuracy', value: `${state.accuracy.shots > 0 ? Math.round((state.accuracy.hits / state.accuracy.shots) * 100) : 0}%`, color: 'text-green-400' },
          { icon: Star, label: 'Chain Bonus', value: state.waveChainBonus, color: 'text-yellow-400' },
        ]}
        onPlayAgain={restartGame}
        onExit={() => setLocation('/')}
      />
      </>
    );
  }

  if (!gameStarted) {
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <section className="py-8 min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black relative overflow-hidden pt-16">
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(80)].map((_, i) => (
            <motion.div
              key={`star-${i}`}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 70}%`,
              }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 1.3, 1],
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
              <div className="flex items-center justify-center gap-3 mb-4">
                <Target className="w-10 h-10 text-cyan-400" />
                <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 font-orbitron tracking-tight">
                  CREATURE COMMAND
                </h1>
              </div>
              <p className="text-purple-300 text-sm mb-2 font-mono">
                BASED CREATURES • LEGENDARY DEFENDERS
              </p>
              <p className="text-gray-400 text-base">
                Command the Creatures • Protect the Sacred Lairs
              </p>
            </motion.div>

            {stats.gamesPlayed > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-8 text-sm flex-wrap mt-6"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-300">
                    Best: {stats.bestScore.toLocaleString()} pts
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-300">
                    {stats.gamesWon} Victories
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-300">
                    {stats.gamesPlayed} Defenses
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
            <Card className="p-8 bg-black/70 border-purple-500/30 backdrop-blur-lg">
              <div className="space-y-6">
                
                <div className="flex justify-center">
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        '0 0 20px rgba(139, 92, 246, 0.3)',
                        '0 0 40px rgba(6, 182, 212, 0.4)',
                        '0 0 20px rgba(139, 92, 246, 0.3)',
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-28 h-28 bg-gradient-to-br from-purple-600/30 to-cyan-600/30 rounded-full flex items-center justify-center border-2 border-purple-500/50"
                  >
                    <Crosshair className="w-14 h-14 text-cyan-400" />
                  </motion.div>
                </div>

                <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl p-5 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-5 h-5 text-purple-400" />
                    <h3 className="font-bold text-white text-lg">Creature Commander Briefing</h3>
                  </div>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Tap the sky</strong> to unleash creature energy at that location</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span>Intercept the swarm before they reach the sacred ground</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span>Defend <strong>4 creature lairs</strong>: Jaguar, Serpent, Phoenix & Wolf</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span>Chain creature powers for <strong>devastating combo attacks</strong>!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span>Survive <strong>10 waves</strong> to become a Legendary Creature Commander!</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-black/40 rounded-xl p-5 border border-white/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-bold text-white text-lg">Missile Types</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-center">
                    <div>
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
                      </div>
                      <p className="text-green-400 font-bold">Green</p>
                      <p className="text-xs text-gray-500">+150 pts</p>
                    </div>
                    <div>
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50"></div>
                      </div>
                      <p className="text-red-400 font-bold">Red</p>
                      <p className="text-xs text-gray-500">+200 pts</p>
                    </div>
                    <div>
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50"></div>
                      </div>
                      <p className="text-yellow-400 font-bold">Yellow</p>
                      <p className="text-xs text-gray-500">+250 pts</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Chain reactions: +50 bonus per chained missile!
                  </p>
                </div>

                <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-300">
                      {gameConfig.maxPlaysPerDay - playsToday}/{gameConfig.maxPlaysPerDay} Plays
                    </span>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    data-testid="button-toggle-sound"
                  >
                    {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    <span>Sound {settings.soundEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                <div className="flex gap-4 justify-center flex-wrap">
                  <Button
                    onClick={() => setLocation('/')}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    data-testid="button-back-home"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={startGame}
                    size="lg"
                    disabled={!isConnected || !isHolder || playsToday >= gameConfig.maxPlaysPerDay}
                    className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-bold px-10 py-6 text-lg"
                    data-testid="button-start-game"
                  >
                    <Play className="w-6 h-6 mr-2" />
                    LAUNCH DEFENSE
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
      </>
    );
  }

  const state = gameStateRef.current;
  const citiesAlive = state.cities.filter(c => c.active).length;
  const totalMissiles = state.batteries.reduce((sum, b) => sum + b.missiles, 0);
  
  return (
    <>
      <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
      <section className="py-4 min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black relative overflow-y-auto pt-16 pb-24" ref={containerRef}>
      <div className="max-w-4xl mx-auto px-4">
        
        <GameHUD
          score={state.score}
          extraStats={[
            { icon: Zap, label: 'Wave', value: `${state.wave}/10`, color: 'text-purple-400' },
            { icon: Shield, label: 'Lairs', value: `${citiesAlive}/4`, color: 'text-cyan-400' },
            { icon: Target, label: 'Missiles', value: totalMissiles, color: 'text-yellow-400' },
          ]}
        />

        <div className="flex justify-center mt-4">
          <div 
            className="relative rounded-lg overflow-hidden border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20"
            style={{ 
              width: CANVAS_WIDTH * canvasScale, 
              height: CANVAS_HEIGHT * canvasScale 
            }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onClick={handleCanvasClick}
              onTouchStart={handleCanvasClick}
              className="cursor-crosshair touch-none"
              style={{ 
                width: CANVAS_WIDTH * canvasScale, 
                height: CANVAS_HEIGHT * canvasScale 
              }}
              data-testid="game-canvas"
            />
            
            <div className="absolute top-2 left-2 text-cyan-400 text-xs font-mono opacity-70">
              WAVE {state.wave}/10
            </div>
            <div className="absolute top-2 right-2 text-yellow-400 text-xs font-mono opacity-70">
              {state.score.toLocaleString()} PTS
            </div>
          </div>
        </div>
        
        <div className="text-center mt-4 text-gray-500 text-xs">
          Tap above the ground to fire • Protect all installations
        </div>
        
        <div className="flex justify-center gap-4 mt-6 pb-8">
          <Button
            variant="outline"
            onClick={() => setLocation('/arcade')}
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            data-testid="button-back-arcade"
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Arcade
          </Button>
        </div>
      </div>
    </section>
    </>
  );
}
