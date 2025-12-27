import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import p5 from 'p5';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { useGuardianProfile } from '@/hooks/useGuardianProfile';
import { useGamePoints } from '@/hooks/useGamePoints';
import { logActivity } from '@/hooks/useActivityHistory';
import { useOwnedNFTs } from '@/hooks/useOwnedNFTs';
import { useInfinityRace } from '@/hooks/useInfinityRace';
import { useInfinityRaceProgressStore, type Achievement, type ColorPalette } from '@/store/infinityRaceProgressStore';
import { AchievementPopup } from '@/components/infinity-race/AchievementPopup';
import { LevelProgressBar } from '@/components/infinity-race/LevelProgressBar';
import { PaletteSelector } from '@/components/infinity-race/PaletteSelector';
import {
  CRAFT_VISUALS,
  renderBackground,
  renderGrid,
  renderTrack,
  renderObstacles,
  renderCraft,
  renderParticles,
  renderTrail,
  renderHUD,
  updateParticles,
  updateTrail,
  spawnCollisionParticles,
  spawnFinishParticles,
  initGraphicsCache,
  type Particle,
  type TrailPoint,
  type RenderContext,
} from '@/game/infinity-race/renderLayers';
import {
  Rocket, Play, Home, Trophy, Timer, Shield, Zap, Wind, Target, Star, ChevronLeft,
  Store, Lock, Coins, ArrowUp, TrendingUp, Pause
} from 'lucide-react';

interface Craft {
  id: string;
  name: string;
  speed: number;
  agility: number;
  shield: number;
  color: string;
  description: string;
}

interface Obstacle {
  x: number;
  y: number;
  radius: number;
  type: 'asteroid' | 'shadow_hack' | 'debris' | 'pulse_mine' | 'void_rift';
  rotation: number;
}

interface GameState {
  x: number;
  y: number;
  velocity: { x: number; y: number };
  angle: number;
  distance: number;
  shieldHp: number;
  boosting: boolean;
}

const CRAFTS: Craft[] = [
  { id: 'neon_fox', name: 'Neon Fox', speed: 3, agility: 3, shield: 4, color: '#00ffff', description: 'Balanced all-rounder' },
  { id: 'dust_hawk', name: 'Dust Hawk', speed: 2, agility: 5, shield: 3, color: '#f59e0b', description: 'Maximum maneuverability' },
  { id: 'crystal_owl', name: 'Crystal Owl', speed: 2, agility: 2, shield: 6, color: '#a855f7', description: 'Heavy armor plating' },
  { id: 'jelly_wisp', name: 'Jelly Wisp', speed: 5, agility: 3, shield: 2, color: '#22c55e', description: 'Pure velocity' },
  { id: 'ultra_falcon', name: 'Ultra Falcon', speed: 4, agility: 4, shield: 2, color: '#ef4444', description: 'Power and precision' },
];

const OBSTACLE_TYPES = ['asteroid', 'shadow_hack', 'debris', 'pulse_mine', 'void_rift'] as const;

const RACE_DURATION = 60;
const TRACK_LENGTH = 10000;

export default function InfinityRace() {
  const { address, isConnected } = useAccount();
  const [, navigate] = useLocation();
  const { getDisplayName, walletSuffix } = useGuardianProfile();
  const { earnPoints } = useGamePoints();
  const { nfts } = useOwnedNFTs();
  const isNftHolder = nfts.length > 0;
  
  const { 
    progress, 
    fetchProgress, 
    updateProgressFromRace,
    getStatBonus 
  } = useInfinityRaceProgressStore();
  
  const infinityRace = useInfinityRace();
  const { 
    state: raceState, 
    oreBalance, 
    nftCount,
    buyCraft, 
    upgradeCraft, 
    startRace, 
    completeRace,
    hasCraft,
    getCraftUpgrades,
    canAfford,
    meetsNftRequirement,
    loading: economyLoading
  } = infinityRace;

  const [gamePhase, setGamePhase] = useState<'menu' | 'shop' | 'select' | 'countdown' | 'racing' | 'finished'>('menu');
  const [betAmount, setBetAmount] = useState(0);
  const [activeRaceId, setActiveRaceId] = useState<string | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [launchLoading, setLaunchLoading] = useState(false);
  const [brainXWon, setBrainXWon] = useState(0);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [selectedCraft, setSelectedCraft] = useState<Craft>(CRAFTS[0]);
  const [timeLeft, setTimeLeft] = useState(RACE_DURATION);
  const [distance, setDistance] = useState(0);
  const [score, setScore] = useState(0);
  const [raceWon, setRaceWon] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [fps, setFps] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);

  const canvasRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<p5 | null>(null);
  const gameStateRef = useRef<GameState>({
    x: 0,
    y: 0,
    velocity: { x: 0, y: 0 },
    angle: 0,
    distance: 0,
    shieldHp: 3,
    boosting: false,
  });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const trackPointsRef = useRef<{ x: number; y: number }[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const touchRef = useRef<{ 
    startX: number; 
    startY: number; 
    currentX: number; 
    currentY: number;
    startTime: number;
    isTap: boolean;
  } | null>(null);
  const boostTriggerRef = useRef<boolean>(false);
  const swipeDirectionRef = useRef<'left' | 'right' | null>(null);
  const pausedRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const trailPointsRef = useRef<TrailPoint[]>([]);
  const frameCountRef = useRef(0);
  const lastCollisionRef = useRef<number>(-1);

  const racerName = useMemo(() => {
    const displayName = getDisplayName();
    if (displayName) return displayName;
    if (address) return `Racer#${walletSuffix || address.slice(-4).toUpperCase()}`;
    return 'Anonymous Racer';
  }, [getDisplayName, walletSuffix, address]);

  const isMobile = useMemo(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  const generateTrack = useCallback((p: p5) => {
    const points: { x: number; y: number }[] = [];
    const seed = Date.now();
    p.noiseSeed(seed);

    for (let i = 0; i <= TRACK_LENGTH; i += 50) {
      const noiseVal = p.noise(i * 0.002) * 2 - 1;
      points.push({
        x: i,
        y: noiseVal * 200,
      });
    }
    trackPointsRef.current = points;

    const obstacles: Obstacle[] = [];
    const obstacleCount = isMobile ? 4 : 6;
    for (let i = 0; i < obstacleCount; i++) {
      const segmentStart = (TRACK_LENGTH / (obstacleCount + 1)) * (i + 1);
      const ox = segmentStart + p.random(-200, 200);
      const trackY = p.noise(ox * 0.002) * 2 - 1;
      obstacles.push({
        x: ox,
        y: trackY * 200 + p.random(-100, 100),
        radius: 30 + p.random(20),
        type: OBSTACLE_TYPES[Math.floor(p.random(5))],
        rotation: p.random(p.TWO_PI),
      });
    }
    obstaclesRef.current = obstacles;
  }, [isMobile]);

  const initGame = useCallback(() => {
    const craft = selectedCraft;
    gameStateRef.current = {
      x: 100,
      y: 0,
      velocity: { x: 0, y: 0 },
      angle: 0,
      distance: 0,
      shieldHp: craft.shield,
      boosting: false,
    };
    particlesRef.current = [];
    trailPointsRef.current = [];
    frameCountRef.current = 0;
    lastCollisionRef.current = -1;
    boostTriggerRef.current = false;
    swipeDirectionRef.current = null;
    setTimeLeft(RACE_DURATION);
    setDistance(0);
    setScore(0);
    setRaceWon(false);
    setIsPaused(false);
  }, [selectedCraft]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
      keysRef.current.add(e.code);
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.code);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: Date.now(),
        isTap: true,
      };
      swipeDirectionRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0 && touchRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - touchRef.current.startX;
      const dy = touch.clientY - touchRef.current.startY;
      const moveDistance = Math.sqrt(dx * dx + dy * dy);
      
      if (moveDistance > 15) {
        touchRef.current.isTap = false;
      }
      
      const SWIPE_THRESHOLD = 40;
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        swipeDirectionRef.current = dx > 0 ? 'right' : 'left';
      }
      
      touchRef.current.currentX = touch.clientX;
      touchRef.current.currentY = touch.clientY;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchRef.current) {
      const elapsed = Date.now() - touchRef.current.startTime;
      if (touchRef.current.isTap && elapsed < 200) {
        boostTriggerRef.current = true;
      }
    }
    touchRef.current = null;
    swipeDirectionRef.current = null;
  }, []);

  useEffect(() => {
    if (address) {
      fetchProgress(address);
    }
  }, [address, fetchProgress]);

  useEffect(() => {
    const handleOrientationChange = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (gamePhase !== 'racing') return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gamePhase, handleKeyDown, handleKeyUp, handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    if (gamePhase !== 'countdown') return;

    setCountdown(3);
    initGame();

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setGamePhase('racing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase, initGame]);

  useEffect(() => {
    if (gamePhase !== 'racing') return;

    const timer = setInterval(() => {
      if (!pausedRef.current) {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setGamePhase('finished');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase]);

  useEffect(() => {
    if (gamePhase !== 'racing' || !canvasRef.current) return;

    const sketch = (p: p5) => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      let canvasWidth = window.innerWidth;
      let canvasHeight = window.innerHeight;
      let timeLeftLocal = RACE_DURATION;
      let lastFrameTime = performance.now();

      p.setup = () => {
        p.pixelDensity(pixelRatio);
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent(canvasRef.current!);
        p.frameRate(60);
        initGraphicsCache(p);
        generateTrack(p);
      };

      p.windowResized = () => {
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;
        p.resizeCanvas(canvasWidth, canvasHeight);
      };

      p.draw = () => {
        const now = performance.now();
        const deltaTime = Math.min((now - lastFrameTime) / 16.67, 2);
        lastFrameTime = now;
        
        const state = gameStateRef.current;
        const craft = selectedCraft;
        const craftVisual = CRAFT_VISUALS[craft.id] || CRAFT_VISUALS.neon_fox;
        const isPaused = pausedRef.current;

        if (!isPaused) {
          frameCountRef.current++;

          if (frameCountRef.current % 30 === 0) {
            setFps(Math.round(p.frameRate()));
            timeLeftLocal = timeLeft;
          }

          const accel = 0.15 * (craft.speed / 3) * deltaTime;
          const turnSpeed = 0.08 * (craft.agility / 3) * deltaTime;
          const friction = Math.pow(0.98, deltaTime);
          const maxSpeed = 8 + craft.speed * 2;

          if (keysRef.current.has('ArrowUp')) {
            state.velocity.x += Math.cos(state.angle) * accel;
            state.velocity.y += Math.sin(state.angle) * accel;
          }
          if (keysRef.current.has('ArrowDown')) {
            state.velocity.x -= Math.cos(state.angle) * accel * 0.5;
            state.velocity.y -= Math.sin(state.angle) * accel * 0.5;
          }
          if (keysRef.current.has('ArrowLeft')) {
            state.angle -= turnSpeed;
          }
          if (keysRef.current.has('ArrowRight')) {
            state.angle += turnSpeed;
          }

          if (boostTriggerRef.current || keysRef.current.has('Space')) {
            state.velocity.x += Math.cos(state.angle) * accel * 2;
            state.velocity.y += Math.sin(state.angle) * accel * 2;
            state.boosting = true;
            boostTriggerRef.current = false;
          } else {
            state.boosting = false;
          }

          if (swipeDirectionRef.current === 'left') {
            state.angle -= turnSpeed * 1.5;
          }
          if (swipeDirectionRef.current === 'right') {
            state.angle += turnSpeed * 1.5;
          }

          if (touchRef.current && !swipeDirectionRef.current) {
            const dx = touchRef.current.currentX - touchRef.current.startX;
            const dy = touchRef.current.currentY - touchRef.current.startY;
            
            if (dy < -30) {
              state.velocity.x += Math.cos(state.angle) * accel;
              state.velocity.y += Math.sin(state.angle) * accel;
            }
            if (dy > 30) {
              state.velocity.x -= Math.cos(state.angle) * accel * 0.5;
              state.velocity.y -= Math.sin(state.angle) * accel * 0.5;
            }
            if (Math.abs(dx) > 30) {
              state.angle += (dx > 0 ? turnSpeed : -turnSpeed);
            }
          }

          state.velocity.x *= friction;
          state.velocity.y *= friction;

          const speed = Math.sqrt(state.velocity.x ** 2 + state.velocity.y ** 2);
          if (speed > maxSpeed) {
            state.velocity.x = (state.velocity.x / speed) * maxSpeed;
            state.velocity.y = (state.velocity.y / speed) * maxSpeed;
          }

          state.x += state.velocity.x;
          state.y += state.velocity.y;

          if (state.x < 0) state.x = 0;
          if (state.y < -400) state.y = -400;
          if (state.y > 400) state.y = 400;

          state.distance = state.x;
          setDistance(Math.floor(state.distance));

          if (state.distance >= TRACK_LENGTH) {
            setRaceWon(true);
            const finalScore = Math.floor((RACE_DURATION - timeLeftLocal) * 10 + state.shieldHp * 100);
            setScore(finalScore);
            particlesRef.current = spawnFinishParticles(particlesRef.current, state.x, state.y, isMobile);
            setGamePhase('finished');
            return;
          }

          for (let i = 0; i < obstaclesRef.current.length; i++) {
            const obs = obstaclesRef.current[i];
            if (obs.x < 0) continue;
            
            const odx = state.x - obs.x;
            const ody = state.y - obs.y;
            const dist = Math.sqrt(odx * odx + ody * ody);
            
            if (dist < obs.radius + 20 && lastCollisionRef.current !== i) {
              lastCollisionRef.current = i;
              state.shieldHp -= 1;
              state.velocity.x = -state.velocity.x * 0.5;
              state.velocity.y = -state.velocity.y * 0.5;
              
              particlesRef.current = spawnCollisionParticles(
                particlesRef.current,
                obs.x,
                obs.y,
                craftVisual.accentColor,
                isMobile
              );
              
              obs.x = -9999;

              if (state.shieldHp <= 0) {
                setRaceWon(false);
                setScore(Math.floor(state.distance / 10));
                setGamePhase('finished');
                return;
              }
            }
          }

          particlesRef.current = updateParticles(particlesRef.current);
          
          const maxTrailPoints = isMobile ? 20 : 30;
          const trailSpeed = Math.sqrt(state.velocity.x ** 2 + state.velocity.y ** 2);
          trailPointsRef.current = updateTrail(
            trailPointsRef.current,
            state.x - Math.cos(state.angle) * 20,
            state.y - Math.sin(state.angle) * 20,
            trailSpeed,
            maxTrailPoints
          );
        }

        const renderCtx: RenderContext = {
          cameraX: state.x,
          cameraY: state.y,
          canvasWidth,
          canvasHeight,
          craftVisual,
          gameState: {
            x: state.x,
            y: state.y,
            angle: state.angle,
            velocity: state.velocity,
            shieldHp: state.shieldHp,
            boosting: state.boosting,
          },
          trackPoints: trackPointsRef.current,
          obstacles: obstaclesRef.current,
          particles: particlesRef.current,
          trailPoints: trailPointsRef.current,
          time: p.millis(),
          timeLeft: timeLeftLocal,
          trackLength: TRACK_LENGTH,
          racerName,
          frameCount: frameCountRef.current,
          isMobile,
        };

        renderBackground(p, renderCtx);
        renderGrid(p, renderCtx);
        renderTrack(p, renderCtx);
        renderObstacles(p, renderCtx);
        renderTrail(p, renderCtx);
        renderParticles(p, renderCtx);
        renderCraft(p, renderCtx);
        renderHUD(p, renderCtx);

        if (touchRef.current && !isPaused) {
          p.noFill();
          p.stroke(255, 255, 255, 100);
          p.strokeWeight(2);
          p.ellipse(touchRef.current.startX, touchRef.current.startY, 80, 80);
          p.fill(255, 255, 255, 100);
          p.noStroke();
          p.ellipse(touchRef.current.currentX, touchRef.current.currentY, 30, 30);
        }

        if (isPaused) {
          p.fill(0, 0, 0, 180);
          p.noStroke();
          p.rect(0, 0, canvasWidth, canvasHeight);
          p.fill(255);
          p.textSize(Math.min(48, canvasWidth / 10));
          p.textAlign(p.CENTER, p.CENTER);
          p.text('PAUSED', canvasWidth / 2, canvasHeight / 2);
          p.textSize(Math.min(16, canvasWidth / 25));
          p.fill(150);
          p.text('Tap play to resume', canvasWidth / 2, canvasHeight / 2 + 50);
        }
      };
    };

    p5Ref.current = new p5(sketch);

    return () => {
      if (p5Ref.current) {
        p5Ref.current.remove();
        p5Ref.current = null;
      }
    };
  }, [gamePhase, selectedCraft, generateTrack, racerName, isMobile, timeLeft]);

  useEffect(() => {
    if (gamePhase === 'finished' && address) {
      const eventType = raceWon ? 'game_completed' : 'wave_failed';
      const details = raceWon 
        ? `Won Infinity Race with ${selectedCraft.name}, score: ${score}`
        : `Failed Infinity Race at distance ${distance} with ${selectedCraft.name}`;
      
      logActivity({
        walletAddress: address,
        eventType,
        details,
        pointsEarned: raceWon ? 50 : 10,
        gameType: 'riddle_quest',
      });

      if (raceWon) {
        earnPoints('riddle-quest', 'challenge', 50);
      } else if (distance > TRACK_LENGTH * 0.5) {
        earnPoints('riddle-quest', 'riddle', 10);
      }
      
      if (activeRaceId) {
        completeRace(activeRaceId, raceWon, Math.floor(distance)).then((result) => {
          if (result.brainxAwarded) {
            setBrainXWon(result.brainxAwarded);
          }
          if (result.progress) {
            const validAchievements: Achievement[] = ['first_win', '10_races', '25_races', '10_wins'];
            const validPalettes: ColorPalette[] = ['default', 'neon_cyan', 'neon_pink', 'neon_green', 'neon_orange'];
            const p = result.progress;
            
            const typedProgress = {
              totalRaces: typeof p.totalRaces === 'number' ? p.totalRaces : 0,
              totalWins: typeof p.totalWins === 'number' ? p.totalWins : 0,
              level: typeof p.level === 'number' && p.level >= 1 && p.level <= 10 ? p.level : 1,
              statBonus: typeof p.statBonus === 'number' && p.statBonus >= 0 ? p.statBonus : 0,
              achievements: (p.achievements || []).filter((a: string) => 
                validAchievements.includes(a as Achievement)) as Achievement[],
              unlockedPalettes: (p.unlockedPalettes || ['default']).filter((pa: string) => 
                validPalettes.includes(pa as ColorPalette)) as ColorPalette[],
              selectedPalette: validPalettes.includes(p.selectedPalette as ColorPalette) 
                ? p.selectedPalette as ColorPalette 
                : 'default',
            };
            const filteredNewAchievements = (result.newAchievements || []).filter((a: string) => 
              validAchievements.includes(a as Achievement)) as Achievement[];
            
            updateProgressFromRace(typedProgress, filteredNewAchievements, result.levelUp || false);
          }
        });
      }
    }
  }, [gamePhase, raceWon, address, score, distance, selectedCraft.name, earnPoints, activeRaceId, completeRace, updateProgressFromRace]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black">
        <div className="flex items-center justify-center min-h-screen">
          <Card className="p-8 bg-black/80 border-cyan-500/30 text-center max-w-md">
            <Rocket className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <h2 className="text-2xl font-orbitron font-bold text-white mb-4">
              Connect Wallet to Race
            </h2>
            <p className="text-gray-400 mb-6">
              Join the Infinity Race and compete for glory in the Based Galaxy!
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      <AchievementPopup />

      <AnimatePresence mode="wait">
        {gamePhase === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center min-h-screen p-4"
          >
            <Card className="p-8 bg-black/90 border-2 border-cyan-500/50 text-center max-w-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />
              <div className="relative z-10">
                <div className="mb-6">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-pulse" />
                    <div className="absolute inset-2 bg-cyan-500/10 rounded-full" />
                    <Rocket className="absolute inset-0 w-full h-full p-4 text-cyan-400" />
                  </div>
                  <h1 className="text-4xl font-orbitron font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,255,255,0.5)]">
                    INFINITY RACE
                  </h1>
                  <p className="text-gray-400 mt-3 text-lg">
                    Procedural tracks. 60 seconds. One goal: <span className="text-cyan-400">Finish.</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={() => setGamePhase('shop')}
                    className="w-full py-6 text-lg font-orbitron bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_30px_rgba(0,255,255,0.3)] hover:shadow-[0_0_40px_rgba(0,255,255,0.5)] transition-all"
                    data-testid="button-start-race"
                  >
                    <Store className="w-6 h-6 mr-2" />
                    Enter Hangar
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => navigate('/games')}
                    className="w-full border-gray-600 text-gray-400 hover:text-white hover:border-cyan-500/50"
                    data-testid="button-back-arcade"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Back to Arcade
                  </Button>
                </div>
                
                {raceState && (
                  <div className="mt-6 pt-4 border-t border-cyan-500/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Races Today:</span>
                      <span className="text-cyan-400 font-mono">{raceState.racesToday}/{raceState.dailyLimit}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-gray-400">Ore Balance:</span>
                      <span className="text-green-400 font-mono">{oreBalance.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {gamePhase === 'shop' && (
          <motion.div
            key="shop"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="min-h-screen p-4 pt-8 pb-20"
          >
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-orbitron font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Craft Hangar
                </h2>
                <div className="flex items-center gap-4">
                  <div className="px-3 py-1.5 bg-green-500/20 rounded-lg border border-green-500/30">
                    <span className="text-green-400 font-mono text-sm">{oreBalance.toLocaleString()} Ore</span>
                  </div>
                  <div className="px-3 py-1.5 bg-purple-500/20 rounded-lg border border-purple-500/30">
                    <span className="text-purple-400 font-mono text-sm">{nftCount} NFTs</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {CRAFTS.map((craft) => {
                  const owned = hasCraft(craft.id);
                  const craftDef = raceState?.craftDefinitions[craft.id];
                  const cost = craftDef?.cost || 100000;
                  const nftReq = craftDef?.nftRequired || 0;
                  const tier = craftDef?.tier || 'basic';
                  const upgrades = getCraftUpgrades(craft.id);
                  const affordable = canAfford(cost);
                  const hasNfts = meetsNftRequirement(nftReq);
                  const canBuy = !owned && affordable && hasNfts;
                  const isLoading = purchaseLoading === craft.id;

                  return (
                    <Card
                      key={craft.id}
                      className={`p-4 transition-all duration-300 relative overflow-hidden ${
                        owned
                          ? 'border-2 border-cyan-500/50 bg-gradient-to-br from-black/80 to-cyan-900/10'
                          : 'border-gray-700 bg-black/60'
                      }`}
                      data-testid={`shop-craft-${craft.id}`}
                    >
                      {tier === 'premium' && (
                        <div className="absolute top-0 right-0 px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs font-bold rounded-bl">
                          PREMIUM
                        </div>
                      )}
                      {tier === 'cooler' && (
                        <div className="absolute top-0 right-0 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-bl">
                          RARE
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: craft.color + '20' }}
                        >
                          <Rocket className="w-6 h-6" style={{ color: craft.color }} />
                        </div>
                        <div>
                          <h3 className="font-orbitron font-bold text-white">{craft.name}</h3>
                          <p className="text-xs text-gray-400">{craft.description}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
                        <div className="p-2 bg-black/40 rounded">
                          <Zap className="w-3 h-3 mx-auto text-yellow-400 mb-1" />
                          <span className="text-gray-300">{craft.speed + (owned ? upgrades.engineLevel : 0)}</span>
                        </div>
                        <div className="p-2 bg-black/40 rounded">
                          <Wind className="w-3 h-3 mx-auto text-blue-400 mb-1" />
                          <span className="text-gray-300">{craft.agility + (owned ? upgrades.thrusterLevel : 0)}</span>
                        </div>
                        <div className="p-2 bg-black/40 rounded">
                          <Shield className="w-3 h-3 mx-auto text-green-400 mb-1" />
                          <span className="text-gray-300">{craft.shield + (owned ? upgrades.shieldLevel : 0)}</span>
                        </div>
                      </div>

                      {owned ? (
                        <div className="space-y-2">
                          <div className="text-center py-1 text-cyan-400 text-sm font-medium">
                            ✓ Owned
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {(['engine', 'thruster', 'shield'] as const).map((type) => {
                              const level = upgrades[`${type}Level` as keyof typeof upgrades] || 0;
                              const upgradeDef = raceState?.upgradeDefinitions[type];
                              const upgradeCost = upgradeDef?.cost || 100000;
                              const maxed = level >= 10;
                              const canUpgrade = !maxed && canAfford(upgradeCost);
                              const upgrading = upgradeLoading === `${craft.id}-${type}`;
                              
                              return (
                                <Button
                                  key={type}
                                  size="sm"
                                  variant="outline"
                                  disabled={maxed || !canUpgrade || upgrading}
                                  onClick={async () => {
                                    setUpgradeLoading(`${craft.id}-${type}`);
                                    await upgradeCraft(craft.id, type);
                                    setUpgradeLoading(null);
                                  }}
                                  className={`text-xs px-1 ${
                                    maxed ? 'opacity-50' : canUpgrade ? 'border-cyan-500/50' : 'opacity-30'
                                  }`}
                                  data-testid={`upgrade-${craft.id}-${type}`}
                                >
                                  {upgrading ? '...' : maxed ? '✓' : <ArrowUp className="w-3 h-3" />}
                                  <span className="ml-1">{level}/10</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <Button
                          className="w-full"
                          disabled={!canBuy || isLoading}
                          onClick={async () => {
                            setPurchaseLoading(craft.id);
                            await buyCraft(craft.id);
                            setPurchaseLoading(null);
                          }}
                          data-testid={`buy-${craft.id}`}
                        >
                          {isLoading ? (
                            'Purchasing...'
                          ) : !hasNfts ? (
                            <>
                              <Lock className="w-4 h-4 mr-1" />
                              Need {nftReq} NFTs
                            </>
                          ) : !affordable ? (
                            <>
                              <Coins className="w-4 h-4 mr-1" />
                              {cost.toLocaleString()} Ore
                            </>
                          ) : (
                            <>
                              <Coins className="w-4 h-4 mr-1" />
                              Buy: {cost.toLocaleString()} Ore
                            </>
                          )}
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>

              {raceState && raceState.racesRemaining > 0 && (
                <Card className="p-6 bg-black/80 border-cyan-500/30 mb-6">
                  <h3 className="text-lg font-orbitron text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    Place Your Bet (Optional)
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Win and earn 2x your bet as BrainX Credits (1-year vest). Lose and forfeit your bet.
                  </p>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[betAmount]}
                      onValueChange={(val) => setBetAmount(val[0])}
                      max={Math.min(raceState.maxBet, oreBalance)}
                      step={100}
                      className="flex-1"
                      data-testid="bet-slider"
                    />
                    <div className="w-28 text-right">
                      <span className="text-cyan-400 font-mono text-lg">{betAmount.toLocaleString()}</span>
                      <span className="text-gray-500 text-sm ml-1">Ore</span>
                    </div>
                  </div>
                  {betAmount > 0 && (
                    <div className="mt-3 text-sm text-purple-400">
                      Potential win: <span className="font-mono">{(betAmount * 2).toLocaleString()}</span> BrainX Credits
                    </div>
                  )}
                </Card>
              )}

              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setGamePhase('menu')}
                  className="border-gray-600 px-8"
                  data-testid="button-back-menu"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setGamePhase('select')}
                  disabled={!raceState || raceState.crafts.length === 0}
                  className="px-12 font-orbitron bg-gradient-to-r from-cyan-500 to-purple-500 shadow-[0_0_30px_rgba(0,255,255,0.3)] disabled:opacity-50"
                  data-testid="button-select-craft"
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  {raceState?.crafts.length === 0 ? 'Buy a Craft First' : 'Select Craft'}
                </Button>
              </div>
              
              {raceState && raceState.racesRemaining === 0 && (
                <div className="mt-6 text-center text-yellow-400">
                  <Timer className="w-5 h-5 inline mr-2" />
                  Daily race limit reached. Come back tomorrow!
                </div>
              )}
            </div>
          </motion.div>
        )}

        {gamePhase === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="min-h-screen p-4 pt-8"
          >
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-orbitron font-bold text-center mb-4 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Select Your Craft
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <LevelProgressBar />
                <PaletteSelector />
              </div>

              {betAmount > 0 && (
                <div className="mb-6 p-4 bg-purple-500/20 border border-purple-500/30 rounded-lg text-center">
                  <span className="text-purple-400">Betting: </span>
                  <span className="text-white font-mono font-bold">{betAmount.toLocaleString()} Ore</span>
                  <span className="text-gray-400 text-sm ml-2">(Win to earn {(betAmount * 2).toLocaleString()} BrainX)</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {CRAFTS.filter(craft => hasCraft(craft.id)).map((craft) => {
                  const upgrades = getCraftUpgrades(craft.id);
                  const statBonus = getStatBonus();
                  const effectiveSpeed = craft.speed + upgrades.engineLevel + statBonus;
                  const effectiveAgility = craft.agility + upgrades.thrusterLevel + statBonus;
                  const effectiveShield = craft.shield + upgrades.shieldLevel + statBonus;
                  
                  return (
                    <Card
                      key={craft.id}
                      onClick={() => setSelectedCraft(craft)}
                      className={`p-4 cursor-pointer transition-all duration-300 relative overflow-hidden ${
                        selectedCraft.id === craft.id
                          ? 'border-2 bg-gradient-to-br from-black/80 to-cyan-900/20'
                          : 'border-gray-700 bg-black/60 hover:border-gray-500'
                      }`}
                      style={{
                        borderColor: selectedCraft.id === craft.id ? craft.color : undefined,
                        boxShadow: selectedCraft.id === craft.id ? `0 0 30px ${craft.color}40` : undefined,
                      }}
                      data-testid={`craft-${craft.id}`}
                    >
                      {selectedCraft.id === craft.id && (
                        <div 
                          className="absolute inset-0 opacity-20"
                          style={{ background: `radial-gradient(circle at center, ${craft.color}, transparent 70%)` }}
                        />
                      )}
                      <div className="relative z-10">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-14 h-14 rounded-lg flex items-center justify-center relative"
                            style={{ 
                              backgroundColor: craft.color + '20',
                              boxShadow: `inset 0 0 20px ${craft.color}30`
                            }}
                          >
                            <Rocket className="w-7 h-7" style={{ color: craft.color }} />
                            <div 
                              className="absolute inset-0 rounded-lg"
                              style={{ boxShadow: `0 0 15px ${craft.color}40` }}
                            />
                          </div>
                          <div>
                            <h3 className="font-orbitron font-bold text-white text-lg">{craft.name}</h3>
                            <p className="text-sm text-gray-400">{craft.description}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div className="flex flex-col items-center p-2 rounded bg-black/40">
                            <Zap className="w-4 h-4 text-yellow-400 mb-1" />
                            <div className="flex gap-0.5">
                              {[...Array(10)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-1.5 rounded-full ${i < effectiveSpeed ? 'bg-yellow-400' : 'bg-gray-700'}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500 mt-1">Speed</span>
                          </div>
                          <div className="flex flex-col items-center p-2 rounded bg-black/40">
                            <Wind className="w-4 h-4 text-blue-400 mb-1" />
                            <div className="flex gap-0.5">
                              {[...Array(10)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-1.5 rounded-full ${i < effectiveAgility ? 'bg-blue-400' : 'bg-gray-700'}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500 mt-1">Agility</span>
                          </div>
                          <div className="flex flex-col items-center p-2 rounded bg-black/40">
                            <Shield className="w-4 h-4 text-green-400 mb-1" />
                            <div className="flex gap-0.5">
                              {[...Array(10)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-1.5 rounded-full ${i < effectiveShield ? 'bg-green-400' : 'bg-gray-700'}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500 mt-1">Shield</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {CRAFTS.filter(craft => hasCraft(craft.id)).length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Rocket className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No crafts owned. Go back to the hangar to purchase one.</p>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setGamePhase('shop')}
                  className="border-gray-600 px-8"
                  data-testid="button-back-shop"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Back to Hangar
                </Button>
                <Button
                  onClick={async () => {
                    if (!hasCraft(selectedCraft.id) || launchLoading) return;
                    setLaunchLoading(true);
                    try {
                      const result = await startRace(selectedCraft.id, betAmount);
                      if (result.success && result.raceId) {
                        setActiveRaceId(result.raceId);
                        setGamePhase('countdown');
                      }
                    } finally {
                      setLaunchLoading(false);
                    }
                  }}
                  disabled={!hasCraft(selectedCraft.id) || launchLoading}
                  className="px-12 font-orbitron bg-gradient-to-r from-cyan-500 to-purple-500 shadow-[0_0_30px_rgba(0,255,255,0.3)] disabled:opacity-50"
                  data-testid="button-launch"
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  {launchLoading ? 'Launching...' : 'Launch'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {gamePhase === 'countdown' && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black flex items-center justify-center z-50"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-black to-purple-900/20" />
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-center relative z-10"
            >
              <div 
                className="text-9xl font-orbitron font-bold"
                style={{
                  color: countdown > 0 ? '#00ffff' : '#22c55e',
                  textShadow: `0 0 60px ${countdown > 0 ? 'rgba(0,255,255,0.8)' : 'rgba(34,197,94,0.8)'}`,
                }}
              >
                {countdown > 0 ? countdown : 'GO!'}
              </div>
              <p className="text-2xl text-gray-400 mt-4 font-orbitron">{selectedCraft.name}</p>
            </motion.div>
          </motion.div>
        )}

        {gamePhase === 'racing' && (
          <>
            <div
              ref={canvasRef}
              className="fixed inset-0 w-screen h-screen touch-none"
              data-testid="race-canvas"
            />
            <div className={`fixed z-50 flex gap-2 ${isLandscape ? 'top-4 right-4' : 'top-2 right-2'}`}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPaused(!isPaused)}
                className="bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/20"
                data-testid="button-pause"
              >
                {isPaused ? <Play className="w-5 h-5 text-white" /> : <Pause className="w-5 h-5 text-white" />}
              </Button>
            </div>
            {isMobile && !isPaused && (
              <div className={`fixed z-40 pointer-events-none ${isLandscape ? 'bottom-4 left-4' : 'bottom-20 left-4'}`}>
                <div className="text-white/40 text-xs space-y-1 bg-black/30 p-2 rounded backdrop-blur-sm">
                  <div>Swipe L/R: Steer</div>
                  <div>Tap: Boost</div>
                  <div>Drag Up: Accelerate</div>
                </div>
              </div>
            )}
          </>
        )}

        {gamePhase === 'finished' && (
          <motion.div
            key="finished"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center min-h-screen p-4"
          >
            <Card className="p-8 bg-black/90 border-2 text-center max-w-md relative overflow-hidden"
              style={{
                borderColor: raceWon ? '#22c55e' : '#ef4444',
                boxShadow: `0 0 40px ${raceWon ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}
            >
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  background: `radial-gradient(circle at center, ${raceWon ? '#22c55e' : '#ef4444'}, transparent 70%)`
                }}
              />
              <div className="relative z-10">
                {raceWon ? (
                  <>
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      <div className="absolute inset-0 bg-yellow-500/30 rounded-full animate-pulse" />
                      <Trophy className="w-full h-full p-4 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
                    </div>
                    <h2 className="text-3xl font-orbitron font-bold text-yellow-400 mb-2 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                      VICTORY!
                    </h2>
                    <p className="text-gray-400 mb-4">
                      You crossed the finish line!
                    </p>
                  </>
                ) : (
                  <>
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      <div className="absolute inset-0 bg-red-500/30 rounded-full animate-pulse" />
                      <Target className="w-full h-full p-4 text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
                    </div>
                    <h2 className="text-3xl font-orbitron font-bold text-red-400 mb-2">
                      RACE OVER
                    </h2>
                    <p className="text-gray-400 mb-4">
                      {timeLeft <= 0 ? 'Time ran out!' : 'Shield depleted!'}
                    </p>
                  </>
                )}

                <div className="space-y-3 mb-6 text-left bg-black/60 p-4 rounded-lg border border-gray-800">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Racer:</span>
                    <span className="text-white font-mono">{racerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Craft:</span>
                    <span style={{ color: selectedCraft.color }}>{selectedCraft.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Distance:</span>
                    <span className="text-cyan-400 font-mono">{distance} / {TRACK_LENGTH}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Score:</span>
                    <span className="text-purple-400 font-mono text-lg">{score}</span>
                  </div>
                  {betAmount > 0 && (
                    <div className="flex justify-between pt-2 border-t border-gray-700">
                      <span className="text-gray-400">Bet Result:</span>
                      {raceWon ? (
                        <span className="text-green-400 font-mono">
                          +{brainXWon > 0 ? brainXWon.toLocaleString() : (betAmount * 2).toLocaleString()} BrainX ✓
                        </span>
                      ) : (
                        <span className="text-red-400 font-mono">
                          -{betAmount.toLocaleString()} Ore
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      setBetAmount(0);
                      setActiveRaceId(null);
                      setBrainXWon(0);
                      setGamePhase('shop');
                    }}
                    className="w-full font-orbitron bg-gradient-to-r from-cyan-500 to-purple-500 shadow-[0_0_20px_rgba(0,255,255,0.3)]"
                    data-testid="button-race-again"
                  >
                    <Rocket className="w-5 h-5 mr-2" />
                    Race Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/games')}
                    className="w-full border-gray-600"
                    data-testid="button-exit-arcade"
                  >
                    <Home className="w-5 h-5 mr-2" />
                    Back to Arcade
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
