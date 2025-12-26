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
import { CC_COLORS, CC_EFFECTS, CC_LAIR_DESIGNS, pulseValue, hexToRgba } from '@/lib/creatureCommandStyles';
import { GameHUD } from '@/components/game/GameHUD';
import { VictoryScreen } from '@/components/game/VictoryScreen';
import { CreatureAbilityPanel } from '@/components/game/CreatureAbilityPanel';
import { useCreatureAbilitiesStore, useAbilityModifiers } from '@/store/creatureAbilitiesStore';
import { useDailyChallengeStore } from '@/store/dailyChallengeStore';
import {
  Play, Shield, Info, ChevronRight, Volume2, VolumeX,
  Home, Loader2, Trophy, Zap, Target, Star, Crosshair
} from 'lucide-react';

import creatureUltraBased from '@/assets/creature-ultra-based-game.png';
import creaturePearlescent from '@/assets/creature-pearlescent-game.png';
import creatureGolden from '@/assets/creature-golden-game.png';
import creatureBased from '@/assets/creature-based-game.png';
import creatureMidnight from '@/assets/creature-midnight-game.png';
import creatureJelly from '@/assets/creature-jelly-game.png';
import creatureCrystal from '@/assets/creature-crystal-game.png';

type CreatureType = 'ultra-based' | 'based' | 'crystal' | 'midnight' | 'jelly' | 'golden' | 'pearlescent' | 'guardian';

interface Vector2D {
  x: number;
  y: number;
}

interface EnemyMissile {
  id: string;
  start: Vector2D;
  target: Vector2D;
  position: Vector2D;
  creatureType: CreatureType;
  speed: number;
  progress: number;
  active: boolean;
  health: number;
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
  globalWave: number;
  currentStage: number;
  stageWave: number;
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
  shotsRemaining: number;
  activePowerUp: { type: 'rapidfire' | 'shield' | 'bomb'; duration: number } | null;
  survivesThisGame: number;
}

const getShotsForWave = (wave: number): number => {
  if (wave <= 3) return 3;
  if (wave <= 5) return 4;
  if (wave <= 7) return 5;
  return 6;
};

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

const CREATURE_COLORS: Record<CreatureType, string> = {
  'ultra-based': '#9333EA',
  based: '#00FFFF',
  crystal: '#E0E0FF',
  midnight: '#4B0082',
  jelly: '#FF69B4',
  golden: '#FFD700',
  pearlescent: '#FFF0F5',
  guardian: '#FF00FF',
};

const CREATURE_POINTS: Record<CreatureType, number> = {
  'ultra-based': 100,
  based: 10,
  crystal: 15,
  midnight: 20,
  jelly: 15,
  golden: 50,
  pearlescent: 25,
  guardian: 200,
};

const CREATURE_HEALTH: Record<CreatureType, number> = {
  'ultra-based': 2,
  based: 1,
  crystal: 1,
  midnight: 1,
  jelly: 2,
  golden: 1,
  pearlescent: 2,
  guardian: 5,
};

const CREATURE_SPEEDS: Record<CreatureType, number> = {
  'ultra-based': 0.7,
  based: 1,
  crystal: 1.2,
  midnight: 1.5,
  jelly: 0.8,
  golden: 2,
  pearlescent: 1,
  guardian: 0.5,
};

const CREATURE_NAMES: Record<CreatureType, string> = {
  'ultra-based': 'Ultra Based',
  based: 'Based Creature',
  crystal: 'Crystal Creature',
  midnight: 'Midnight Creature',
  jelly: 'Sentient Jelly',
  golden: 'Golden Creature',
  pearlescent: 'Pearlescent Creature',
  guardian: 'Guardian',
};

const CREATURE_IMAGES: Record<CreatureType, string> = {
  'ultra-based': creatureUltraBased,
  based: creatureBased,
  crystal: creatureCrystal,
  midnight: creatureMidnight,
  jelly: creatureJelly,
  golden: creatureGolden,
  pearlescent: creaturePearlescent,
  guardian: creatureUltraBased,
};

const MISSILES_PER_BATTERY = 4;
const DEFENSIVE_MISSILE_SPEED = 700;
const EXPLOSION_MAX_RADIUS = 40;
const EXPLOSION_LIFETIME = 1.8;
const RELOAD_TIME = 6000;
const MIN_FIRE_INTERVAL = 200;

interface StageConfig {
  name: string;
  subtitle: string;
  baseCount: number;
  baseSpeed: number;
  baseDelay: number;
  speedMultiplier: number;
  countMultiplier: number;
  color: string;
}

const STAGE_CONFIG: StageConfig[] = [
  { name: 'FUD SWARM', subtitle: 'The Fear Begins', baseCount: 4, baseSpeed: 45, baseDelay: 400, speedMultiplier: 1.0, countMultiplier: 1.0, color: '#22c55e' },
  { name: 'BEAR MARKET', subtitle: 'Markets Crash', baseCount: 8, baseSpeed: 55, baseDelay: 350, speedMultiplier: 1.15, countMultiplier: 1.2, color: '#eab308' },
  { name: 'LIQUIDATION STORM', subtitle: 'Positions Destroyed', baseCount: 12, baseSpeed: 65, baseDelay: 300, speedMultiplier: 1.3, countMultiplier: 1.4, color: '#f97316' },
  { name: 'PROTOCOL BREACH', subtitle: 'Security Compromised', baseCount: 16, baseSpeed: 75, baseDelay: 250, speedMultiplier: 1.5, countMultiplier: 1.6, color: '#ef4444' },
  { name: 'COSMIC PURGE', subtitle: 'The Final Test', baseCount: 20, baseSpeed: 85, baseDelay: 200, speedMultiplier: 1.8, countMultiplier: 2.0, color: '#9333ea' },
];

const WAVES_PER_STAGE = 5;
const TOTAL_WAVES = STAGE_CONFIG.length * WAVES_PER_STAGE;

const getStageForWave = (globalWave: number): { stage: number; stageWave: number } => {
  const stage = Math.min(Math.ceil(globalWave / WAVES_PER_STAGE), STAGE_CONFIG.length);
  const stageWave = ((globalWave - 1) % WAVES_PER_STAGE) + 1;
  return { stage, stageWave };
};

const getWaveConfig = (globalWave: number) => {
  const { stage, stageWave } = getStageForWave(globalWave);
  const stageConfig = STAGE_CONFIG[stage - 1];
  
  const waveMultiplier = 1 + (stageWave - 1) * 0.15;
  const count = Math.floor(stageConfig.baseCount * stageConfig.countMultiplier * waveMultiplier);
  const speed = Math.floor(stageConfig.baseSpeed * stageConfig.speedMultiplier * (1 + (stageWave - 1) * 0.05));
  const delay = Math.max(150, Math.floor(stageConfig.baseDelay * (1 - (stageWave - 1) * 0.1)));
  
  const messages = [
    `${stageConfig.name} - Wave ${stageWave}/5`,
    stageWave === 5 ? `⚠️ ${stageConfig.name} BOSS WAVE!` : `${stageConfig.subtitle}...`,
  ];
  
  return { count, speed, delay, message: messages[stageWave === 5 ? 1 : 0], stage, stageWave, stageConfig };
};

const STAGE_VICTORY_MESSAGES = [
  "FUD defeated! Markets stabilizing...",
  "Bear market survived! Hope returns!",
  "Liquidation storm weathered!",
  "Protocol secured! Network safe!",
  "COSMIC PURGE COMPLETE - LEGENDARY COMMANDER!",
];

const WAVE_VICTORY_MESSAGES = [
  "The Neon Jaguar purrs with gratitude!",
  "The Cyber Serpent coils in victory!",
  "Phoenix rises from the ashes!",
  "The Wolf howls in triumph!",
  "All creature lairs are secure!",
];

const getDistance = (a: Vector2D, b: Vector2D): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const lerp = (start: number, end: number, t: number): number => {
  return start + (end - start) * Math.min(1, Math.max(0, t));
};

const getCreatureForWave = (wave: number, forceGuardian: boolean = false): CreatureType => {
  if (forceGuardian) return 'guardian';
  
  const r = Math.random();
  
  if (wave <= 3) {
    return r < 0.6 ? 'based' : 'crystal';
  }
  if (wave <= 5) {
    if (r < 0.35) return 'based';
    if (r < 0.6) return 'crystal';
    if (r < 0.8) return 'midnight';
    return 'jelly';
  }
  if (wave <= 7) {
    if (r < 0.2) return 'based';
    if (r < 0.4) return 'crystal';
    if (r < 0.55) return 'midnight';
    if (r < 0.7) return 'jelly';
    if (r < 0.85) return 'golden';
    return 'pearlescent';
  }
  if (wave <= 9) {
    if (r < 0.15) return 'based';
    if (r < 0.30) return 'crystal';
    if (r < 0.45) return 'midnight';
    if (r < 0.60) return 'jelly';
    if (r < 0.75) return 'golden';
    if (r < 0.92) return 'pearlescent';
    return 'ultra-based';
  }
  if (r < 0.08) return 'ultra-based';
  if (r < 0.25) return 'golden';
  if (r < 0.40) return 'pearlescent';
  if (r < 0.55) return 'midnight';
  if (r < 0.72) return 'jelly';
  if (r < 0.88) return 'crystal';
  return 'based';
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
  
  const abilityModifiers = useAbilityModifiers();
  const { earnPoints, earnLairPoints, resetForNewGame: resetAbilityPoints, hydrateFromDB, setConnectedWallet } = useCreatureAbilitiesStore();
  const { 
    incrementSurvives, 
    updateProgress, 
    incrementGamesPlayed, 
    checkAndAwardChallenge,
    hydrateFromDB: hydrateDailyChallenge,
    setConnectedWallet: setDailyWallet,
    survivesCount: dailySurvives,
    challengeCompleted: dailyChallengeCompleted,
  } = useDailyChallengeStore();
  
  const DAILY_CHALLENGE_GOAL = 50;

  const gameConfig = useMemo(() => getGameConfig('guardian-defense'), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastFireTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundTimeoutsRef = useRef<number[]>([]);
  const activeOscillatorsRef = useRef<OscillatorNode[]>([]);
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
    globalWave: 1,
    currentStage: 1,
    stageWave: 1,
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
    shotsRemaining: getShotsForWave(1),
    activePowerUp: null,
    survivesThisGame: 0,
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
    if (address && isConnected) {
      hydrateFromDB(address);
      setConnectedWallet(address);
      hydrateDailyChallenge(address);
      setDailyWallet(address);
    } else {
      setConnectedWallet(null);
      setDailyWallet(null);
    }
  }, [address, isConnected, hydrateFromDB, setConnectedWallet, hydrateDailyChallenge, setDailyWallet]);

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

  const stopAllSounds = useCallback(() => {
    // Clear all pending sound timeouts
    soundTimeoutsRef.current.forEach(id => clearTimeout(id));
    soundTimeoutsRef.current = [];
    
    // Stop all active oscillators
    activeOscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {
        // Oscillator may have already stopped
      }
    });
    activeOscillatorsRef.current = [];
  }, []);

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
        
        // Track oscillator for cleanup
        activeOscillatorsRef.current.push(osc);
        osc.onended = () => {
          activeOscillatorsRef.current = activeOscillatorsRef.current.filter(o => o !== osc);
        };
      };

      const scheduleSound = (fn: () => void, delay: number) => {
        const id = window.setTimeout(fn, delay);
        soundTimeoutsRef.current.push(id);
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
          scheduleSound(() => createOsc(600, 0.15), 50);
          break;
        case 'hit':
          createOsc(80, 0.4, 'sawtooth');
          break;
        case 'wave':
          [300, 400, 500, 600].forEach((f, i) => {
            scheduleSound(() => createOsc(f, 0.2), i * 80);
          });
          break;
        case 'death':
          createOsc(200, 0.6, 'sawtooth');
          break;
        case 'victory':
          [400, 500, 600, 800, 1000].forEach((f, i) => {
            scheduleSound(() => createOsc(f, 0.25), i * 100);
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
      updateProgress(state.currentStage, state.globalWave);
      trackEvent('game_complete', 'Game', `Guardian Defense - Stage ${state.currentStage} Wave ${state.stageWave} - ${finalScore} pts`);
    } catch (err) {
      console.error('Failed to submit score:', err);
    }
  }, [address, stats, gameConfig.scoring.maxScore, gameConfig.minPlayDuration, submitScore, playSound, toast, updateProgress]);

  const spawnWave = useCallback((globalWave: number) => {
    const state = gameStateRef.current;
    
    if (globalWave > TOTAL_WAVES) {
      setGameWon(true);
      setGameOver(true);
      setShowVictory(true);
      endGame(true);
      return;
    }
    
    const config = getWaveConfig(globalWave);
    
    state.globalWave = globalWave;
    state.currentStage = config.stage;
    state.stageWave = config.stageWave;
    state.wave = globalWave;
    state.waveActive = true;
    state.waveComplete = false;
    state.waveTransition = false;
    state.waveChainBonus = 0;
    state.missilesRemaining = config.count;
    state.shotsRemaining = getShotsForWave(globalWave);
    
    const isBossWave = config.stageWave === 5;
    const isFinalBoss = globalWave === TOTAL_WAVES;
    
    const waveToast = toast({
      title: isFinalBoss ? "⚠️ COSMIC PURGE - FINAL BOSS" : isBossWave ? `⚠️ ${config.stageConfig.name} BOSS` : `${config.stageConfig.name} - Wave ${config.stageWave}/5`,
      description: config.message,
      className: isBossWave 
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
        
        const isGuardianSlot = isBossWave && (i === 0 || i === Math.floor(config.count / 3) || i === Math.floor(config.count * 2 / 3));
        const creatureType = getCreatureForWave(globalWave, isGuardianSlot);
        const speedMultiplier = CREATURE_SPEEDS[creatureType];
        
        state.enemyMissiles.push({
          id: `em-${Date.now()}-${i}-${Math.random()}`,
          start: { x: startX, y: -10 },
          target,
          position: { x: startX, y: -10 },
          creatureType,
          speed: (config.speed + Math.random() * 15) * speedMultiplier,
          progress: 0,
          active: true,
          health: CREATURE_HEALTH[creatureType],
        });
      }, i * config.delay + Math.random() * 100);
    }
  }, [toast, playSound, gameOver, endGame]);

  const fireMissile = useCallback((targetX: number, targetY: number, multiBubbleChance: number = 0, reloadMultiplier: number = 1) => {
    const state = gameStateRef.current;
    if (gameOver || state.waveTransition) return;
    
    if (state.shotsRemaining <= 0) {
      return;
    }
    
    const now = Date.now();
    const effectiveFireInterval = MIN_FIRE_INTERVAL / reloadMultiplier;
    if (now - lastFireTimeRef.current < effectiveFireInterval) return;
    lastFireTimeRef.current = now;
    
    const sortedBatteries = state.batteries
      .map((b, i) => ({ battery: b, index: i, dist: Math.abs(b.position.x - targetX) }))
      .sort((a, b) => a.dist - b.dist);
    
    if (sortedBatteries.length === 0) return;
    
    const { battery, index } = sortedBatteries[0];
    state.shotsRemaining--;
    state.accuracy.shots++;
    
    state.defensiveMissiles.push({
      id: `dm-${Date.now()}-${Math.random()}`,
      start: { ...battery.position, y: battery.position.y - 15 },
      target: { x: targetX, y: Math.max(50, targetY) },
      position: { ...battery.position, y: battery.position.y - 15 },
      progress: 0,
      batteryIndex: index,
    });
    
    if (multiBubbleChance > 0 && Math.random() < multiBubbleChance && state.shotsRemaining > 0) {
      const offsetX = (Math.random() - 0.5) * 60;
      const offsetY = (Math.random() - 0.5) * 40;
      state.defensiveMissiles.push({
        id: `dm-${Date.now()}-multi-${Math.random()}`,
        start: { ...battery.position, y: battery.position.y - 15 },
        target: { x: targetX + offsetX, y: Math.max(50, targetY + offsetY) },
        position: { ...battery.position, y: battery.position.y - 15 },
        progress: 0,
        batteryIndex: index,
      });
    }
    
    playSound('launch');
  }, [playSound, gameOver]);

  const createExplosion = useCallback((position: Vector2D, isPlayer: boolean, radiusMultiplier: number = 1) => {
    const state = gameStateRef.current;
    const enhancedRadius = EXPLOSION_MAX_RADIUS * radiusMultiplier;
    state.explosions.push({
      id: `ex-${Date.now()}-${Math.random()}`,
      position: { ...position },
      radius: 0,
      maxRadius: enhancedRadius,
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
    const piercingCount = abilityModifiers.piercingCount;
    const shieldReduction = abilityModifiers.shieldReduction;
    
    const explosionHitCounts: Map<string, number> = new Map();
    
    state.explosions.forEach(explosion => {
      if (!explosion.isPlayer) return;
      
      const currentHits = explosionHitCounts.get(explosion.id) || 0;
      const maxHits = 1 + piercingCount;
      
      state.enemyMissiles.forEach(missile => {
        if (!missile.active) return;
        if (currentHits >= maxHits) return;
        
        const dist = getDistance(explosion.position, missile.position);
        if (dist < explosion.radius + 8) {
          missile.health--;
          explosionHitCounts.set(explosion.id, (explosionHitCounts.get(explosion.id) || 0) + 1);
          
          if (missile.health <= 0) {
            missile.active = false;
            state.accuracy.hits++;
            state.survivesThisGame++;
            
            incrementSurvives(1);
            
            const basePoints = CREATURE_POINTS[missile.creatureType];
            const chainBonus = state.chainReactions * 5;
            const totalPoints = basePoints + chainBonus;
            state.score += totalPoints;
            state.waveChainBonus += chainBonus;
            state.chainReactions++;
            
            createExplosion(missile.position, true, abilityModifiers.explosionRadiusMultiplier);
            
            const creatureName = CREATURE_NAMES[missile.creatureType];
            if (state.chainReactions > 1) {
              createScorePopup(`+${totalPoints} ${creatureName}`, missile.position.x, missile.position.y - 20, CREATURE_COLORS[missile.creatureType], true);
              playSound('chain');
            } else {
              createScorePopup(`+${totalPoints} ${creatureName}`, missile.position.x, missile.position.y - 20, CREATURE_COLORS[missile.creatureType], false);
            }
            
            if (checkAndAwardChallenge()) {
              createScorePopup('🏆 DAILY CHALLENGE COMPLETE! +100 PTS', CANVAS_WIDTH / 2, 100, '#fbbf24', true);
              earnPoints(0, 20);
            }
          } else {
            playSound('hit');
            createScorePopup(`HIT! (${missile.health} left)`, missile.position.x, missile.position.y - 20, CREATURE_COLORS[missile.creatureType], false);
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
            if (shieldReduction > 0 && Math.random() < shieldReduction) {
              createScorePopup('SHIELDED!', city.position.x, city.position.y - 40, '#a855f7', true);
              playSound('chain');
              return;
            }
            
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
  }, [createExplosion, createScorePopup, playSound, toast, abilityModifiers.piercingCount, abilityModifiers.shieldReduction, abilityModifiers.explosionRadiusMultiplier, incrementSurvives, checkAndAwardChallenge, earnPoints]);

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
    
    state.defensiveMissiles.forEach(missile => {
      const totalDist = getDistance(missile.start, missile.target);
      const moveAmount = (DEFENSIVE_MISSILE_SPEED * dt) / totalDist;
      missile.progress += moveAmount;
      
      missile.position.x = lerp(missile.start.x, missile.target.x, missile.progress);
      missile.position.y = lerp(missile.start.y, missile.target.y, missile.progress);
    });
    
    const arrivedMissiles = state.defensiveMissiles.filter(m => m.progress >= 1);
    arrivedMissiles.forEach(missile => {
      createExplosion(missile.target, true, abilityModifiers.explosionRadiusMultiplier);
      state.chainReactions = 0;
    });
    state.defensiveMissiles = state.defensiveMissiles.filter(m => m.progress < 1);
    
    const slowFieldStrength = abilityModifiers.slowFieldStrength;
    
    state.enemyMissiles.forEach(missile => {
      if (!missile.active) return;
      
      let effectiveSpeed = missile.speed;
      
      if (slowFieldStrength > 0) {
        state.explosions.forEach(explosion => {
          if (explosion.isPlayer) {
            const dist = getDistance(explosion.position, missile.position);
            if (dist < explosion.radius * 1.5) {
              effectiveSpeed *= (1 - slowFieldStrength);
            }
          }
        });
      }
      
      const totalDist = getDistance(missile.start, missile.target);
      const moveAmount = (effectiveSpeed * dt) / totalDist;
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
      
      const basePoints = 20;
      const comboPoints = Math.floor(chainBonus / 2);
      earnPoints(1, comboPoints);
      createScorePopup(`+${basePoints + comboPoints * 5} PTS`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60, '#fbbf24', true);
      
      if (perfectDefense) {
        createScorePopup('PERFECT DEFENSE!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40, '#10B981', true);
        createScorePopup(`+${perfectBonus} BONUS`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '#FBBF24', false);
      }
      if (chainBonus > 0) {
        createScorePopup(`CHAIN BONUS +${chainBonus}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30, '#a855f7', true);
      }
      
      const regenChance = abilityModifiers.regenChance;
      if (regenChance > 0 && savedCities < 4) {
        const destroyedCities = state.cities.filter(c => !c.active);
        destroyedCities.forEach(city => {
          if (Math.random() < regenChance) {
            city.active = true;
            createScorePopup(`${city.name} RESTORED!`, city.position.x, city.position.y - 30, '#10b981', true);
            playSound('chain');
          }
        });
      }
      
      const isStageComplete = state.stageWave === 5;
      const stageConfig = STAGE_CONFIG[state.currentStage - 1];
      const victoryMessage = isStageComplete 
        ? STAGE_VICTORY_MESSAGES[state.currentStage - 1] 
        : WAVE_VICTORY_MESSAGES[(state.stageWave - 1) % WAVE_VICTORY_MESSAGES.length] || "Well defended!";
      
      // Award bonus points for completing a stage (only if cities survived)
      if (isStageComplete && savedCities > 0) {
        earnLairPoints();
        createScorePopup('+50 STAGE BONUS', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 90, '#9333ea', true);
      }
      
      const completeToast = toast({
        title: perfectDefense 
          ? "⭐ PERFECT DEFENSE!" 
          : isStageComplete 
            ? `🏆 ${stageConfig.name} COMPLETE!` 
            : `Wave ${state.stageWave}/5 Complete!`,
        description: victoryMessage,
        className: isStageComplete 
          ? "bg-black/90 border-purple-500 text-purple-400"
          : "bg-black/90 border-green-500 text-green-400"
      });
      setTimeout(() => completeToast.dismiss(), 3000);
      
      if (state.globalWave >= TOTAL_WAVES) {
        setGameWon(true);
        setGameOver(true);
        setShowVictory(true);
        endGame(true);
        return;
      }
      
      state.waveTransition = true;
      setTimeout(() => {
        if (!gameOver) {
          state.globalWave++;
          state.wave = state.globalWave;
          const { stage, stageWave } = getStageForWave(state.globalWave);
          state.currentStage = stage;
          state.stageWave = stageWave;
          spawnWave(state.globalWave);
        }
      }, isStageComplete ? 3000 : 1500);
    }
  }, [gameOver, spawnShootingStar, checkCollisions, createExplosion, createScorePopup, spawnWave, toast, endGame, earnPoints, earnLairPoints, abilityModifiers.regenChance, abilityModifiers.explosionRadiusMultiplier, abilityModifiers.slowFieldStrength, playSound]);

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
    skyGradient.addColorStop(0, CC_COLORS.background.voidGradientEnd);
    skyGradient.addColorStop(0.2, '#050012');
    skyGradient.addColorStop(0.5, CC_COLORS.background.voidGradientStart);
    skyGradient.addColorStop(0.8, '#120028');
    skyGradient.addColorStop(1, '#0a0018');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    const time = state.gameTime / 1000;
    
    ctx.save();
    ctx.globalAlpha = 0.15;
    const nebulaGradient1 = ctx.createRadialGradient(CANVAS_WIDTH * 0.3, 100, 0, CANVAS_WIDTH * 0.3, 100, 200);
    nebulaGradient1.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
    nebulaGradient1.addColorStop(0.5, 'rgba(59, 130, 246, 0.15)');
    nebulaGradient1.addColorStop(1, 'transparent');
    ctx.fillStyle = nebulaGradient1;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT * 0.6);
    
    const nebulaGradient2 = ctx.createRadialGradient(CANVAS_WIDTH * 0.7, 180, 0, CANVAS_WIDTH * 0.7, 180, 150);
    nebulaGradient2.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
    nebulaGradient2.addColorStop(0.6, 'rgba(79, 70, 229, 0.1)');
    nebulaGradient2.addColorStop(1, 'transparent');
    ctx.fillStyle = nebulaGradient2;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT * 0.5);
    ctx.restore();
    
    ctx.save();
    ctx.strokeStyle = CC_COLORS.background.grid;
    ctx.lineWidth = CC_EFFECTS.gridLineWidth;
    for (let x = 0; x < CANVAS_WIDTH; x += CC_EFFECTS.gridSpacing) {
      const xOffset = (time * 5) % CC_EFFECTS.gridSpacing;
      ctx.beginPath();
      ctx.moveTo(x - xOffset, 0);
      ctx.lineTo(x - xOffset, GROUND_Y);
      ctx.stroke();
    }
    for (let y = 0; y < GROUND_Y; y += CC_EFFECTS.gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();
    
    state.backgroundStars.forEach(star => {
      const twinkle = Math.sin(time * 2.5 + star.twinkleOffset) * 0.4 + 0.6;
      const layerAlpha = 0.3 + star.layer * 0.25;
      const starBrightness = twinkle * layerAlpha;
      
      const starColors = ['rgba(255, 255, 255,', 'rgba(200, 220, 255,', 'rgba(255, 200, 200,'];
      const colorIndex = Math.floor(star.twinkleOffset * 3) % 3;
      ctx.fillStyle = `${starColors[colorIndex]} ${starBrightness})`;
      
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      
      if (star.layer === 2 && twinkle > 0.8) {
        ctx.save();
        ctx.globalAlpha = (twinkle - 0.8) * 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(star.x - 3, star.y);
        ctx.lineTo(star.x + 3, star.y);
        ctx.moveTo(star.x, star.y - 3);
        ctx.lineTo(star.x, star.y + 3);
        ctx.stroke();
        ctx.restore();
      }
    });
    
    state.shootingStars.forEach(star => {
      const alpha = star.opacity * (1 - star.progress);
      const gradient = ctx.createLinearGradient(
        star.x, star.y,
        star.x - Math.cos(star.angle) * star.length,
        star.y - Math.sin(star.angle) * star.length
      );
      gradient.addColorStop(0, `rgba(0, 255, 255, ${alpha})`);
      gradient.addColorStop(0.3, `rgba(168, 85, 247, ${alpha * 0.6})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(star.x, star.y);
      ctx.lineTo(
        star.x - Math.cos(star.angle) * star.length,
        star.y - Math.sin(star.angle) * star.length
      );
      ctx.stroke();
      
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    
    const mountainLayers = [
      { baseY: GROUND_Y - 50, color1: '#0a0520', color2: '#1a0840', peaks: 14, height: 70, glowColor: 'rgba(139, 92, 246, 0.1)' },
      { baseY: GROUND_Y - 25, color1: '#150a30', color2: '#251550', peaks: 10, height: 50, glowColor: 'rgba(79, 70, 229, 0.08)' },
      { baseY: GROUND_Y - 5, color1: '#1a0a35', color2: '#2a1560', peaks: 7, height: 35, glowColor: 'rgba(168, 85, 247, 0.06)' },
    ];
    
    mountainLayers.forEach((layer, layerIndex) => {
      const gradient = ctx.createLinearGradient(0, layer.baseY - layer.height, 0, GROUND_Y);
      gradient.addColorStop(0, layer.color2);
      gradient.addColorStop(0.7, layer.color1);
      gradient.addColorStop(1, '#050010');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_HEIGHT);
      
      for (let i = 0; i <= layer.peaks; i++) {
        const x = (CANVAS_WIDTH / layer.peaks) * i;
        const peakY = layer.baseY - layer.height + Math.sin(i * 1.5 + layerIndex * 0.5) * 15;
        ctx.lineTo(x, peakY);
      }
      
      ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = layer.glowColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= layer.peaks; i++) {
        const x = (CANVAS_WIDTH / layer.peaks) * i;
        const peakY = layer.baseY - layer.height + Math.sin(i * 1.5 + layerIndex * 0.5) * 15;
        if (i === 0) ctx.moveTo(x, peakY);
        else ctx.lineTo(x, peakY);
      }
      ctx.stroke();
    });
    
    const groundGradient = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_HEIGHT);
    groundGradient.addColorStop(0, '#0a0a1a');
    groundGradient.addColorStop(0.3, '#080815');
    groundGradient.addColorStop(1, '#050508');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    
    ctx.save();
    const groundLineGradient = ctx.createLinearGradient(0, GROUND_Y, CANVAS_WIDTH, GROUND_Y);
    groundLineGradient.addColorStop(0, 'rgba(0, 255, 255, 0.1)');
    groundLineGradient.addColorStop(0.3, 'rgba(0, 255, 255, 0.8)');
    groundLineGradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.9)');
    groundLineGradient.addColorStop(0.7, 'rgba(0, 255, 255, 0.8)');
    groundLineGradient.addColorStop(1, 'rgba(0, 255, 255, 0.1)');
    ctx.strokeStyle = groundLineGradient;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();
    ctx.restore();
    
    state.cities.forEach(city => {
      if (!city.active) return;
      
      const lairDesign = CC_LAIR_DESIGNS[city.name] || { shape: 'tower', accent: '#00ffff', pattern: 'angular' };
      const buildingHeight = 45;
      const buildingWidth = 40;
      const baseX = city.position.x - buildingWidth / 2;
      const baseY = city.position.y - buildingHeight;
      const glowPulse = pulseValue(time * 1000, 0.4, 0.8, CC_EFFECTS.glowPulseSpeed);
      
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = lairDesign.accent;
      
      const towerGradient = ctx.createLinearGradient(baseX, baseY, baseX, city.position.y);
      towerGradient.addColorStop(0, '#1a1a3a');
      towerGradient.addColorStop(0.3, '#252550');
      towerGradient.addColorStop(0.7, '#1e1e40');
      towerGradient.addColorStop(1, '#151530');
      
      ctx.fillStyle = towerGradient;
      ctx.beginPath();
      if (lairDesign.shape === 'pyramid') {
        ctx.moveTo(city.position.x, baseY - 10);
        ctx.lineTo(baseX + buildingWidth + 5, city.position.y);
        ctx.lineTo(baseX - 5, city.position.y);
        ctx.closePath();
      } else if (lairDesign.shape === 'spiral') {
        ctx.moveTo(baseX, city.position.y);
        ctx.lineTo(baseX + 5, baseY + 10);
        ctx.quadraticCurveTo(city.position.x, baseY - 15, baseX + buildingWidth - 5, baseY + 10);
        ctx.lineTo(baseX + buildingWidth, city.position.y);
        ctx.closePath();
      } else if (lairDesign.shape === 'fortress') {
        ctx.moveTo(baseX - 5, city.position.y);
        ctx.lineTo(baseX - 5, baseY + 5);
        ctx.lineTo(baseX + 5, baseY);
        ctx.lineTo(baseX + 15, baseY + 5);
        ctx.lineTo(city.position.x, baseY - 5);
        ctx.lineTo(baseX + buildingWidth - 15, baseY + 5);
        ctx.lineTo(baseX + buildingWidth - 5, baseY);
        ctx.lineTo(baseX + buildingWidth + 5, baseY + 5);
        ctx.lineTo(baseX + buildingWidth + 5, city.position.y);
        ctx.closePath();
      } else {
        ctx.moveTo(baseX, city.position.y);
        ctx.lineTo(baseX, baseY + 8);
        ctx.lineTo(baseX + 8, baseY);
        ctx.lineTo(baseX + buildingWidth - 8, baseY);
        ctx.lineTo(baseX + buildingWidth, baseY + 8);
        ctx.lineTo(baseX + buildingWidth, city.position.y);
        ctx.closePath();
      }
      ctx.fill();
      
      ctx.strokeStyle = lairDesign.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.strokeStyle = `${lairDesign.accent}40`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const lineY = baseY + 10 + i * 10;
        ctx.beginPath();
        ctx.moveTo(baseX + 5, lineY);
        ctx.lineTo(baseX + buildingWidth - 5, lineY);
        ctx.stroke();
      }
      
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 2; col++) {
          const windowOn = Math.sin(time * 4 + row * 2 + col + city.position.x * 0.1) > -0.2;
          if (windowOn) {
            const windowX = city.position.x - 8 + col * 16;
            const windowY = baseY + 12 + row * 11;
            
            ctx.fillStyle = `rgba(0, 255, 255, ${0.3 + glowPulse * 0.4})`;
            ctx.fillRect(windowX - 1, windowY - 1, 7, 7);
            
            ctx.fillStyle = lairDesign.accent;
            ctx.fillRect(windowX, windowY, 5, 5);
          }
        }
      }
      
      const healthGlow = ctx.createRadialGradient(
        city.position.x, city.position.y - buildingHeight / 2, 0,
        city.position.x, city.position.y - buildingHeight / 2, buildingWidth
      );
      healthGlow.addColorStop(0, `${lairDesign.accent}${Math.floor(glowPulse * 40).toString(16).padStart(2, '0')}`);
      healthGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = healthGlow;
      ctx.fillRect(baseX - 10, baseY - 10, buildingWidth + 20, buildingHeight + 20);
      
      ctx.restore();
      
      ctx.fillStyle = lairDesign.accent;
      ctx.font = 'bold 7px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 5;
      ctx.shadowColor = lairDesign.accent;
      ctx.fillText(city.name, city.position.x, city.position.y + 14);
      ctx.shadowBlur = 0;
    });
    
    state.batteries.forEach((battery, i) => {
      const batteryPulse = pulseValue(time * 1000, 0.7, 1.0, CC_EFFECTS.glowPulseSpeed * 1.5);
      
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00ffff';
      
      const batteryGradient = ctx.createLinearGradient(
        battery.position.x, battery.position.y - 25,
        battery.position.x, battery.position.y
      );
      batteryGradient.addColorStop(0, '#1e3a5f');
      batteryGradient.addColorStop(0.5, '#2a4a70');
      batteryGradient.addColorStop(1, '#152535');
      
      ctx.fillStyle = batteryGradient;
      ctx.beginPath();
      ctx.moveTo(battery.position.x - 28, battery.position.y);
      ctx.lineTo(battery.position.x - 18, battery.position.y - 25);
      ctx.lineTo(battery.position.x + 18, battery.position.y - 25);
      ctx.lineTo(battery.position.x + 28, battery.position.y);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = `rgba(0, 255, 255, ${batteryPulse})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(battery.position.x - 10, battery.position.y - 5);
      ctx.lineTo(battery.position.x + 10, battery.position.y - 5);
      ctx.moveTo(battery.position.x - 8, battery.position.y - 10);
      ctx.lineTo(battery.position.x + 8, battery.position.y - 10);
      ctx.stroke();
      
      const turretGlow = ctx.createRadialGradient(
        battery.position.x, battery.position.y - 15, 0,
        battery.position.x, battery.position.y - 15, 10
      );
      turretGlow.addColorStop(0, '#ffffff');
      turretGlow.addColorStop(0.3, '#00ffff');
      turretGlow.addColorStop(0.7, 'rgba(0, 255, 255, 0.5)');
      turretGlow.addColorStop(1, 'transparent');
      
      ctx.fillStyle = turretGlow;
      ctx.beginPath();
      ctx.arc(battery.position.x, battery.position.y - 15, 10, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#00ffff';
      ctx.beginPath();
      ctx.arc(battery.position.x, battery.position.y - 15, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
      
      ctx.fillStyle = '#00ffff';
      ctx.font = 'bold 7px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 3;
      ctx.shadowColor = '#00ffff';
      ctx.fillText(['ALPHA', 'BETA', 'GAMMA'][i], battery.position.x, battery.position.y + 14);
      ctx.shadowBlur = 0;
    });
    
    state.enemyMissiles.forEach(missile => {
      if (!missile.active) return;
      
      const creatureStyle = CC_COLORS.creatures[missile.creatureType] || CC_COLORS.creatures['based'];
      const isGuardian = missile.creatureType === 'guardian';
      const baseSize = isGuardian ? 12 : 6;
      const size = baseSize + (missile.health > 1 ? 3 : 0);
      const pulseScale = 1 + Math.sin(time * 8) * 0.1;
      
      const trailGradient = ctx.createLinearGradient(
        missile.start.x, missile.start.y,
        missile.position.x, missile.position.y
      );
      trailGradient.addColorStop(0, 'transparent');
      trailGradient.addColorStop(0.5, creatureStyle.trail);
      trailGradient.addColorStop(1, creatureStyle.glow);
      
      ctx.strokeStyle = trailGradient;
      ctx.lineWidth = isGuardian ? 4 : 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(missile.start.x, missile.start.y);
      ctx.lineTo(missile.position.x, missile.position.y);
      ctx.stroke();
      
      for (let i = 0; i < 3; i++) {
        const sparkProgress = ((time * 2 + i * 0.3) % 1);
        const sparkX = lerp(missile.start.x, missile.position.x, sparkProgress);
        const sparkY = lerp(missile.start.y, missile.position.y, sparkProgress);
        const sparkAlpha = 1 - sparkProgress;
        ctx.fillStyle = `rgba(255, 200, 100, ${sparkAlpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(sparkX + (Math.random() - 0.5) * 4, sparkY + (Math.random() - 0.5) * 4, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.save();
      ctx.shadowBlur = isGuardian ? 25 : 15;
      ctx.shadowColor = creatureStyle.core;
      
      const missileGradient = ctx.createRadialGradient(
        missile.position.x, missile.position.y, 0,
        missile.position.x, missile.position.y, size * pulseScale
      );
      missileGradient.addColorStop(0, '#ffffff');
      missileGradient.addColorStop(0.3, creatureStyle.core);
      missileGradient.addColorStop(0.7, creatureStyle.glow);
      missileGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = missileGradient;
      ctx.beginPath();
      ctx.arc(missile.position.x, missile.position.y, size * pulseScale * 1.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = creatureStyle.core;
      ctx.beginPath();
      ctx.arc(missile.position.x, missile.position.y, size * pulseScale, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(missile.position.x - size * 0.3, missile.position.y - size * 0.3, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
      
      if (missile.health > 1) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px Orbitron, monospace';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#000000';
        ctx.fillText(`${missile.health}`, missile.position.x, missile.position.y + 3);
      }
      ctx.restore();
    });
    
    state.defensiveMissiles.forEach(missile => {
      const trailGradient = ctx.createLinearGradient(
        missile.start.x, missile.start.y,
        missile.position.x, missile.position.y
      );
      trailGradient.addColorStop(0, 'transparent');
      trailGradient.addColorStop(0.4, CC_COLORS.missiles.playerTrail);
      trailGradient.addColorStop(1, CC_COLORS.missiles.playerGlow);
      
      ctx.strokeStyle = trailGradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(missile.start.x, missile.start.y);
      ctx.lineTo(missile.position.x, missile.position.y);
      ctx.stroke();
      
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = CC_COLORS.missiles.playerCore;
      
      const playerMissileGradient = ctx.createRadialGradient(
        missile.position.x, missile.position.y, 0,
        missile.position.x, missile.position.y, 8
      );
      playerMissileGradient.addColorStop(0, '#ffffff');
      playerMissileGradient.addColorStop(0.4, CC_COLORS.missiles.playerCore);
      playerMissileGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = playerMissileGradient;
      ctx.beginPath();
      ctx.arc(missile.position.x, missile.position.y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = CC_COLORS.missiles.playerCore;
      ctx.beginPath();
      ctx.arc(missile.position.x, missile.position.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    
    state.explosions.forEach(explosion => {
      const alpha = Math.min(1, explosion.lifetime / 0.6);
      const lifeRatio = explosion.lifetime / explosion.maxLifetime;
      
      if (explosion.isPlayer) {
        ctx.save();
        
        for (let ring = 0; ring < CC_EFFECTS.explosionRipples; ring++) {
          const ringDelay = ring * CC_EFFECTS.explosionRippleDelay;
          const ringProgress = Math.max(0, 1 - lifeRatio - ringDelay);
          if (ringProgress <= 0) continue;
          
          const ringRadius = explosion.radius * (0.6 + ring * 0.3) * ringProgress;
          const ringAlpha = alpha * (1 - ringProgress) * 0.5;
          
          ctx.strokeStyle = `rgba(0, 255, 255, ${ringAlpha})`;
          ctx.lineWidth = 2 - ring * 0.5;
          ctx.beginPath();
          ctx.arc(explosion.position.x, explosion.position.y, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        ctx.shadowBlur = 30;
        ctx.shadowColor = CC_COLORS.explosions.coreBlue;
        
        const outerGlow = ctx.createRadialGradient(
          explosion.position.x, explosion.position.y, 0,
          explosion.position.x, explosion.position.y, explosion.radius * 1.3
        );
        outerGlow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
        outerGlow.addColorStop(0.2, `rgba(0, 255, 255, ${alpha * 0.7})`);
        outerGlow.addColorStop(0.5, `rgba(168, 85, 247, ${alpha * 0.4})`);
        outerGlow.addColorStop(0.8, `rgba(139, 92, 246, ${alpha * 0.2})`);
        outerGlow.addColorStop(1, 'transparent');
        
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(explosion.position.x, explosion.position.y, explosion.radius * 1.3, 0, Math.PI * 2);
        ctx.fill();
        
        const innerGlow = ctx.createRadialGradient(
          explosion.position.x, explosion.position.y, 0,
          explosion.position.x, explosion.position.y, explosion.radius * 0.6
        );
        innerGlow.addColorStop(0, CC_COLORS.explosions.flareWhite);
        innerGlow.addColorStop(0.5, `rgba(0, 255, 255, ${alpha})`);
        innerGlow.addColorStop(1, 'transparent');
        
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(explosion.position.x, explosion.position.y, explosion.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        if (lifeRatio > 0.7) {
          const flareAlpha = (lifeRatio - 0.7) / 0.3;
          ctx.strokeStyle = `rgba(255, 255, 255, ${flareAlpha * 0.8})`;
          ctx.lineWidth = 1;
          for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 4) * i + time * 2;
            const length = explosion.radius * 0.8;
            ctx.beginPath();
            ctx.moveTo(explosion.position.x, explosion.position.y);
            ctx.lineTo(
              explosion.position.x + Math.cos(angle) * length,
              explosion.position.y + Math.sin(angle) * length
            );
            ctx.stroke();
          }
        }
        
        ctx.restore();
      } else {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff4444';
        
        const enemyGlow = ctx.createRadialGradient(
          explosion.position.x, explosion.position.y, 0,
          explosion.position.x, explosion.position.y, explosion.radius
        );
        enemyGlow.addColorStop(0, `rgba(255, 100, 50, ${alpha})`);
        enemyGlow.addColorStop(0.4, `rgba(255, 50, 50, ${alpha * 0.6})`);
        enemyGlow.addColorStop(0.8, `rgba(200, 0, 0, ${alpha * 0.3})`);
        enemyGlow.addColorStop(1, 'transparent');
        
        ctx.fillStyle = enemyGlow;
        ctx.beginPath();
        ctx.arc(explosion.position.x, explosion.position.y, explosion.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = `rgba(255, 100, 50, ${alpha * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(explosion.position.x, explosion.position.y, explosion.radius * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
      }
    });
    
    state.particles.forEach(particle => {
      const alpha = Math.min(1, particle.lifetime * 2);
      
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = particle.color;
      
      const particleGradient = ctx.createRadialGradient(
        particle.position.x, particle.position.y, 0,
        particle.position.x, particle.position.y, particle.size * alpha * 2
      );
      particleGradient.addColorStop(0, particle.color);
      particleGradient.addColorStop(0.5, `${particle.color}80`);
      particleGradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = particleGradient;
      ctx.beginPath();
      ctx.arc(particle.position.x, particle.position.y, particle.size * alpha * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    
    state.scorePopups.forEach(popup => {
      const alpha = Math.min(1, popup.lifetime * 2);
      const scale = popup.isSpecial ? 1.4 : 1;
      const bounceY = popup.isSpecial ? Math.sin(popup.lifetime * 10) * 3 : 0;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${Math.floor(14 * scale)}px Orbitron, monospace`;
      ctx.textAlign = 'center';
      
      ctx.shadowBlur = popup.isSpecial ? 15 : 8;
      ctx.shadowColor = popup.color;
      
      if (popup.isSpecial) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeText(popup.text, popup.x, popup.y + bounceY);
      }
      
      ctx.fillStyle = popup.color;
      ctx.fillText(popup.text, popup.x, popup.y + bounceY);
      ctx.restore();
    });
    
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 13px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CREATURE COMMAND CENTER', CANVAS_WIDTH / 2, GROUND_Y + 28);
    
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#a855f7';
    ctx.fillStyle = '#a855f7';
    ctx.font = '9px Orbitron, monospace';
    ctx.fillText('BASED CREATURES • LEGENDARY DEFENDERS', CANVAS_WIDTH / 2, GROUND_Y + 42);
    ctx.restore();
    
    if (state.waveTransition && !gameOver) {
      ctx.fillStyle = 'rgba(0, 0, 20, 0.7)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      const transitionPulse = pulseValue(time * 1000, 0.8, 1.0, 0.01);
      
      ctx.save();
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#10b981';
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 32px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.globalAlpha = transitionPulse;
      ctx.fillText(`WAVE ${state.wave} COMPLETE`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
      
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00ffff';
      ctx.fillStyle = '#00ffff';
      ctx.font = '14px Orbitron, monospace';
      ctx.globalAlpha = 0.8;
      ctx.fillText('Preparing next wave...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 25);
      
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2 - 120, CANVAS_HEIGHT / 2 + 40);
      ctx.lineTo(CANVAS_WIDTH / 2 + 120, CANVAS_HEIGHT / 2 + 40);
      ctx.stroke();
      
      ctx.restore();
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
      fireMissile(x, y, abilityModifiers.multiBubbleChance, abilityModifiers.reloadSpeedMultiplier);
    }
  }, [canvasScale, fireMissile, gameOver, abilityModifiers.multiBubbleChance, abilityModifiers.reloadSpeedMultiplier]);

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
    resetAbilityPoints();
    incrementGamesPlayed();
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
  }, [isConnected, isHolder, playsToday, gameConfig.maxPlaysPerDay, initialGameState, gameLoop, spawnWave, toast, resetAbilityPoints, incrementGamesPlayed]);

  const restartGame = useCallback(() => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }
    stopAllSounds();
    setShowVictory(false);
    startGame();
  }, [startGame, stopAllSounds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      // Clear all sound timeouts and stop oscillators
      soundTimeoutsRef.current.forEach(id => clearTimeout(id));
      soundTimeoutsRef.current = [];
      activeOscillatorsRef.current.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
      activeOscillatorsRef.current = [];
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
        onExit={() => setLocation('/games')}
      />
      </>
    );
  }

  if (!gameStarted) {
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <section className="py-8 min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black relative overflow-hidden pt-20">
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
                
                <div className="flex justify-center gap-2">
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        '0 0 20px rgba(0, 255, 255, 0.3)',
                        '0 0 40px rgba(147, 51, 234, 0.5)',
                        '0 0 20px rgba(0, 255, 255, 0.3)',
                      ],
                      y: [0, -5, 0],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-20 h-20 bg-gradient-to-br from-cyan-900/40 to-cyan-600/20 rounded-xl flex items-center justify-center border-2 border-cyan-500/50"
                  >
                    <img src={creatureBased} alt="Based" className="w-14 h-14 object-contain drop-shadow-[0_0_12px_#00FFFF]" />
                  </motion.div>
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        '0 0 25px rgba(147, 51, 234, 0.4)',
                        '0 0 50px rgba(255, 0, 255, 0.5)',
                        '0 0 25px rgba(147, 51, 234, 0.4)',
                      ],
                      y: [0, -8, 0],
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    className="w-24 h-24 bg-gradient-to-br from-purple-900/40 to-fuchsia-600/20 rounded-xl flex items-center justify-center border-2 border-purple-500/50"
                  >
                    <img src={creatureUltraBased} alt="Ultra Based" className="w-18 h-18 object-contain drop-shadow-[0_0_15px_#9333EA]" />
                  </motion.div>
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        '0 0 20px rgba(255, 215, 0, 0.3)',
                        '0 0 40px rgba(255, 215, 0, 0.5)',
                        '0 0 20px rgba(255, 215, 0, 0.3)',
                      ],
                      y: [0, -5, 0],
                    }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                    className="w-20 h-20 bg-gradient-to-br from-yellow-900/40 to-yellow-600/20 rounded-xl flex items-center justify-center border-2 border-yellow-500/50"
                  >
                    <img src={creatureGolden} alt="Golden" className="w-14 h-14 object-contain drop-shadow-[0_0_12px_#FFD700]" />
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
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-bold text-white text-lg">Creature Types</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-sm text-center">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-gradient-to-br from-cyan-900/30 to-cyan-600/10 rounded-lg p-2 border border-cyan-500/30"
                    >
                      <img src={creatureBased} alt="Based Creature" className="w-10 h-10 mx-auto mb-1 object-contain drop-shadow-[0_0_8px_#00FFFF]" />
                      <p className="text-[10px] font-bold text-cyan-400">Based</p>
                      <p className="text-[8px] text-gray-500">10 pts</p>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-gradient-to-br from-slate-900/30 to-slate-600/10 rounded-lg p-2 border border-slate-400/30"
                    >
                      <img src={creatureCrystal} alt="Crystal Creature" className="w-10 h-10 mx-auto mb-1 object-contain drop-shadow-[0_0_8px_#E0E0FF]" />
                      <p className="text-[10px] font-bold text-slate-200">Crystal</p>
                      <p className="text-[8px] text-gray-500">15 pts</p>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-gradient-to-br from-indigo-900/30 to-purple-900/10 rounded-lg p-2 border border-purple-500/30"
                    >
                      <img src={creatureMidnight} alt="Midnight Creature" className="w-10 h-10 mx-auto mb-1 object-contain drop-shadow-[0_0_8px_#4B0082]" />
                      <p className="text-[10px] font-bold text-purple-400">Midnight</p>
                      <p className="text-[8px] text-gray-500">20 pts</p>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-gradient-to-br from-pink-900/30 to-pink-600/10 rounded-lg p-2 border border-pink-400/30"
                    >
                      <img src={creatureJelly} alt="Sentient Jelly" className="w-10 h-10 mx-auto mb-1 object-contain drop-shadow-[0_0_8px_#FF69B4]" />
                      <p className="text-[10px] font-bold text-pink-400">Jelly</p>
                      <p className="text-[8px] text-gray-500">15 pts • 2HP</p>
                    </motion.div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-sm text-center mt-2">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-gradient-to-br from-yellow-900/30 to-yellow-600/10 rounded-lg p-2 border border-yellow-500/30"
                    >
                      <img src={creatureGolden} alt="Golden Creature" className="w-10 h-10 mx-auto mb-1 object-contain drop-shadow-[0_0_8px_#FFD700]" />
                      <p className="text-[10px] font-bold text-yellow-400">Golden</p>
                      <p className="text-[8px] text-gray-500">50 pts • Fast!</p>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-gradient-to-br from-rose-900/30 to-rose-600/10 rounded-lg p-2 border border-rose-300/30"
                    >
                      <img src={creaturePearlescent} alt="Pearlescent Creature" className="w-10 h-10 mx-auto mb-1 object-contain drop-shadow-[0_0_8px_#FFF0F5]" />
                      <p className="text-[10px] font-bold text-rose-200">Pearl</p>
                      <p className="text-[8px] text-gray-500">25 pts • 2HP</p>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-gradient-to-br from-purple-900/40 to-violet-600/20 rounded-lg p-2 border border-purple-400/40"
                    >
                      <img src={creatureUltraBased} alt="Ultra Based" className="w-10 h-10 mx-auto mb-1 object-contain drop-shadow-[0_0_10px_#9333EA]" />
                      <p className="text-[10px] font-bold text-purple-400">Ultra Based</p>
                      <p className="text-[8px] text-gray-500">100 pts • 2HP</p>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.08 }}
                      className="bg-gradient-to-br from-fuchsia-900/50 to-pink-600/30 rounded-lg p-2 border-2 border-fuchsia-500/50"
                    >
                      <img src={creatureUltraBased} alt="Guardian Boss" className="w-11 h-11 mx-auto mb-1 object-contain drop-shadow-[0_0_12px_#FF00FF]" />
                      <p className="text-[10px] font-bold text-fuchsia-400">GUARDIAN</p>
                      <p className="text-[8px] text-gray-400">200 pts • BOSS</p>
                    </motion.div>
                  </div>
                  <p className="text-xs text-gray-400 mt-4 text-center">
                    Chain reactions: +5 bonus per chained creature!
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
  
  return (
    <>
      <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
      <section className="py-4 min-h-screen bg-gradient-to-b from-indigo-950 via-purple-950 to-black relative overflow-y-auto pt-16 pb-24" ref={containerRef}>
      <div className="max-w-4xl mx-auto px-4">
        
        <GameHUD
          score={state.score}
          extraStats={[
            { icon: Zap, label: 'Stage', value: `${state.currentStage}/${STAGE_CONFIG.length}`, color: 'text-purple-400' },
            { icon: Target, label: 'Wave', value: `${state.stageWave}/${WAVES_PER_STAGE}`, color: 'text-cyan-400' },
            { icon: Shield, label: 'Lairs', value: `${citiesAlive}/4`, color: citiesAlive <= 1 ? 'text-red-400' : 'text-green-400' },
            { icon: Crosshair, label: 'Shots', value: state.shotsRemaining, color: state.shotsRemaining <= 1 ? 'text-red-400' : 'text-yellow-400' },
          ]}
        />
        
        {/* Daily Challenge Progress */}
        <div className="mt-2 bg-black/40 rounded-lg p-3 border border-yellow-500/30">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold text-yellow-400 flex items-center gap-1">
              <Trophy className="w-3 h-3" /> DAILY CHALLENGE
            </span>
            <span className="text-xs text-gray-400">
              {dailyChallengeCompleted ? '✓ COMPLETE' : `${dailySurvives}/${DAILY_CHALLENGE_GOAL} survives`}
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${dailyChallengeCompleted ? 'bg-green-500' : 'bg-yellow-500'}`}
              style={{ width: `${Math.min(100, (dailySurvives / DAILY_CHALLENGE_GOAL) * 100)}%` }}
            />
          </div>
          {dailyChallengeCompleted && (
            <p className="text-xs text-green-400 text-center mt-1">+100 bonus points awarded!</p>
          )}
        </div>

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
              STAGE {state.currentStage} • WAVE {state.stageWave}/{WAVES_PER_STAGE}
            </div>
            <div className="absolute top-2 right-2 text-yellow-400 text-xs font-mono opacity-70">
              {state.score.toLocaleString()} PTS
            </div>
            <div className={`absolute top-2 left-1/2 -translate-x-1/2 text-xs font-mono ${state.shotsRemaining <= 1 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
              {state.shotsRemaining > 0 ? `🎯 ${state.shotsRemaining}` : '❌ NO SHOTS'}
            </div>
          </div>
        </div>
        
        <div className="text-center mt-4 text-gray-500 text-xs">
          Tap above the ground to fire • Protect all installations
        </div>
        
        <div className="mt-4">
          <CreatureAbilityPanel />
        </div>
        
        <div className="flex justify-center gap-4 mt-6 pb-8">
          <Button
            variant="outline"
            onClick={() => setLocation('/games')}
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
