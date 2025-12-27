import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import p5 from 'p5';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useGuardianProfile } from '@/hooks/useGuardianProfile';
import { useGamePoints } from '@/hooks/useGamePoints';
import { logActivity } from '@/hooks/useActivityHistory';
import { useOwnedNFTs } from '@/hooks/useOwnedNFTs';
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
  Rocket, Play, Home, Trophy, Timer, Shield, Zap, Wind, Target, Star, ChevronLeft
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

  const [gamePhase, setGamePhase] = useState<'menu' | 'select' | 'countdown' | 'racing' | 'finished'>('menu');
  const [selectedCraft, setSelectedCraft] = useState<Craft>(CRAFTS[0]);
  const [timeLeft, setTimeLeft] = useState(RACE_DURATION);
  const [distance, setDistance] = useState(0);
  const [score, setScore] = useState(0);
  const [raceWon, setRaceWon] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [fps, setFps] = useState(60);

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
  const touchRef = useRef<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
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
    setTimeLeft(RACE_DURATION);
    setDistance(0);
    setScore(0);
    setRaceWon(false);
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
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length > 0 && touchRef.current) {
      const touch = e.touches[0];
      touchRef.current.currentX = touch.clientX;
      touchRef.current.currentY = touch.clientY;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    touchRef.current = null;
  }, []);

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
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setGamePhase('finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gamePhase]);

  useEffect(() => {
    if (gamePhase !== 'racing' || !canvasRef.current) return;

    const sketch = (p: p5) => {
      let canvasWidth = window.innerWidth;
      let canvasHeight = window.innerHeight;
      let timeLeftLocal = RACE_DURATION;

      p.setup = () => {
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
        frameCountRef.current++;
        const state = gameStateRef.current;
        const craft = selectedCraft;
        const craftVisual = CRAFT_VISUALS[craft.id] || CRAFT_VISUALS.neon_fox;

        if (frameCountRef.current % 30 === 0) {
          setFps(Math.round(p.frameRate()));
          timeLeftLocal = timeLeft;
        }

        const accel = 0.15 * (craft.speed / 3);
        const turnSpeed = 0.08 * (craft.agility / 3);
        const friction = 0.98;
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

        if (touchRef.current) {
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
          if (dx < -30) {
            state.angle -= turnSpeed;
          }
          if (dx > 30) {
            state.angle += turnSpeed;
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
          
          const dx = state.x - obs.x;
          const dy = state.y - obs.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
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
        trailPointsRef.current = updateTrail(
          trailPointsRef.current,
          state.x - Math.cos(state.angle) * 20,
          state.y - Math.sin(state.angle) * 20,
          speed,
          maxTrailPoints
        );

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

        if (touchRef.current) {
          p.noFill();
          p.stroke(255, 255, 255, 100);
          p.strokeWeight(2);
          p.ellipse(touchRef.current.startX, touchRef.current.startY, 80, 80);
          p.fill(255, 255, 255, 100);
          p.noStroke();
          p.ellipse(touchRef.current.currentX, touchRef.current.currentY, 30, 30);
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
    }
  }, [gamePhase, raceWon, address, score, distance, selectedCraft.name, earnPoints]);

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
                    onClick={() => setGamePhase('select')}
                    className="w-full py-6 text-lg font-orbitron bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-[0_0_30px_rgba(0,255,255,0.3)] hover:shadow-[0_0_40px_rgba(0,255,255,0.5)] transition-all"
                    data-testid="button-start-race"
                  >
                    <Play className="w-6 h-6 mr-2" />
                    Start Race
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
              </div>
            </Card>
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
              <h2 className="text-3xl font-orbitron font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Select Your Craft
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {CRAFTS.map((craft) => {
                  const visual = CRAFT_VISUALS[craft.id];
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
                              {[...Array(5)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full ${i < craft.speed ? 'bg-yellow-400' : 'bg-gray-700'}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500 mt-1">Speed</span>
                          </div>
                          <div className="flex flex-col items-center p-2 rounded bg-black/40">
                            <Wind className="w-4 h-4 text-blue-400 mb-1" />
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full ${i < craft.agility ? 'bg-blue-400' : 'bg-gray-700'}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500 mt-1">Agility</span>
                          </div>
                          <div className="flex flex-col items-center p-2 rounded bg-black/40">
                            <Shield className="w-4 h-4 text-green-400 mb-1" />
                            <div className="flex gap-0.5">
                              {[...Array(6)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full ${i < craft.shield ? 'bg-green-400' : 'bg-gray-700'}`}
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
                  onClick={() => setGamePhase('countdown')}
                  className="px-12 font-orbitron bg-gradient-to-r from-cyan-500 to-purple-500 shadow-[0_0_30px_rgba(0,255,255,0.3)]"
                  data-testid="button-launch"
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  Launch
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
          <div
            ref={canvasRef}
            className="fixed inset-0 w-screen h-screen touch-none"
            data-testid="race-canvas"
          />
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
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => setGamePhase('select')}
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
