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
const CANVAS_ASPECT = 16 / 9;

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

  const racerName = useMemo(() => {
    const displayName = getDisplayName();
    if (displayName) return displayName;
    if (address) return `Racer#${walletSuffix || address.slice(-4).toUpperCase()}`;
    return 'Anonymous Racer';
  }, [getDisplayName, walletSuffix, address]);

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
    for (let i = 0; i < 5; i++) {
      const segmentStart = (TRACK_LENGTH / 6) * (i + 1);
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
  }, []);

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

      p.setup = () => {
        const canvas = p.createCanvas(canvasWidth, canvasHeight);
        canvas.parent(canvasRef.current!);
        p.frameRate(60);
        generateTrack(p);
      };

      p.windowResized = () => {
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;
        p.resizeCanvas(canvasWidth, canvasHeight);
      };

      p.draw = () => {
        const state = gameStateRef.current;
        const craft = selectedCraft;

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
          const finalScore = Math.floor((RACE_DURATION - timeLeft) * 10 + state.shieldHp * 100);
          setScore(finalScore);
          setGamePhase('finished');
          return;
        }

        for (const obs of obstaclesRef.current) {
          const dx = state.x - obs.x;
          const dy = state.y - obs.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < obs.radius + 15) {
            state.shieldHp -= 1;
            state.velocity.x = -state.velocity.x * 0.5;
            state.velocity.y = -state.velocity.y * 0.5;
            obs.x = -9999;

            if (state.shieldHp <= 0) {
              setRaceWon(false);
              setScore(Math.floor(state.distance / 10));
              setGamePhase('finished');
              return;
            }
          }
        }

        p.background(10, 10, 20);

        p.push();
        p.translate(canvasWidth / 2 - state.x, canvasHeight / 2);

        p.stroke(30, 30, 50);
        p.strokeWeight(1);
        for (let gx = Math.floor((state.x - canvasWidth) / 100) * 100; gx < state.x + canvasWidth; gx += 100) {
          p.line(gx, -500, gx, 500);
        }
        for (let gy = -500; gy <= 500; gy += 100) {
          p.line(state.x - canvasWidth, gy, state.x + canvasWidth, gy);
        }

        p.noFill();
        p.stroke(0, 255, 255, 80);
        p.strokeWeight(80);
        p.beginShape();
        for (const pt of trackPointsRef.current) {
          if (pt.x > state.x - canvasWidth && pt.x < state.x + canvasWidth) {
            p.vertex(pt.x, pt.y);
          }
        }
        p.endShape();

        p.stroke(0, 255, 0, 150);
        p.strokeWeight(4);
        p.line(TRACK_LENGTH, -200, TRACK_LENGTH, 200);
        p.fill(0, 255, 0);
        p.noStroke();
        p.textSize(16);
        p.textAlign(p.CENTER);
        p.text('FINISH', TRACK_LENGTH, -220);

        for (const obs of obstaclesRef.current) {
          if (obs.x > state.x - canvasWidth / 2 && obs.x < state.x + canvasWidth / 2) {
            p.push();
            p.translate(obs.x, obs.y);
            p.rotate(obs.rotation);
            
            if (obs.type === 'asteroid') {
              p.fill(100, 80, 60);
              p.stroke(60, 50, 40);
              p.strokeWeight(2);
              p.ellipse(0, 0, obs.radius * 2, obs.radius * 1.8);
            } else if (obs.type === 'shadow_hack') {
              p.fill(80, 0, 120, 200);
              p.noStroke();
              for (let i = 0; i < 6; i++) {
                p.ellipse(Math.cos(i) * 10, Math.sin(i) * 10, obs.radius, obs.radius);
              }
            } else if (obs.type === 'debris') {
              p.fill(80, 80, 80);
              p.stroke(50, 50, 50);
              p.rect(-obs.radius / 2, -obs.radius / 2, obs.radius, obs.radius);
            } else if (obs.type === 'pulse_mine') {
              p.fill(255, 50, 50, 150);
              p.noStroke();
              p.ellipse(0, 0, obs.radius * 2, obs.radius * 2);
              p.fill(255, 100, 100);
              p.ellipse(0, 0, obs.radius, obs.radius);
            } else {
              p.fill(30, 0, 60, 180);
              p.noStroke();
              p.ellipse(0, 0, obs.radius * 2.5, obs.radius * 2.5);
            }
            p.pop();
          }
        }

        p.push();
        p.translate(state.x, state.y);
        p.rotate(state.angle);
        
        const craftColor = p.color(craft.color);
        p.fill(craftColor);
        p.stroke(255);
        p.strokeWeight(2);
        p.triangle(20, 0, -15, -12, -15, 12);
        
        if (speed > 2) {
          p.noStroke();
          p.fill(255, 150, 50, 150);
          p.triangle(-15, 0, -25 - speed * 2, -5, -25 - speed * 2, 5);
        }
        p.pop();

        p.pop();

        p.fill(255);
        p.noStroke();
        p.textSize(14);
        p.textAlign(p.LEFT);
        p.text(racerName, 20, 30);
        p.text(`Distance: ${Math.floor(state.distance)} / ${TRACK_LENGTH}`, 20, 50);
        p.text(`Time: ${timeLeft}s`, 20, 70);
        
        p.fill(craft.color);
        for (let i = 0; i < state.shieldHp; i++) {
          p.rect(20 + i * 25, 80, 20, 10);
        }

        const progress = state.distance / TRACK_LENGTH;
        p.fill(50);
        p.rect(canvasWidth / 2 - 150, 20, 300, 10);
        p.fill(0, 255, 255);
        p.rect(canvasWidth / 2 - 150, 20, 300 * progress, 10);

        if (touchRef.current) {
          p.noFill();
          p.stroke(255, 255, 255, 100);
          p.strokeWeight(2);
          p.ellipse(touchRef.current.startX, touchRef.current.startY, 80, 80);
          p.fill(255, 255, 255, 100);
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
  }, [gamePhase, selectedCraft, generateTrack, racerName, timeLeft]);

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
            className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4"
          >
            <Card className="p-8 bg-black/80 border-cyan-500/30 text-center max-w-lg">
              <div className="mb-6">
                <Rocket className="w-20 h-20 text-cyan-400 mx-auto mb-4" />
                <h1 className="text-4xl font-orbitron font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  INFINITY RACE
                </h1>
                <p className="text-gray-400 mt-2">
                  Procedural tracks. 60 seconds. One goal: Finish.
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={() => setGamePhase('select')}
                  className="w-full py-6 text-lg bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
                  data-testid="button-start-race"
                >
                  <Play className="w-6 h-6 mr-2" />
                  Start Race
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/games')}
                  className="w-full border-gray-600 text-gray-400 hover:text-white"
                  data-testid="button-back-arcade"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Back to Arcade
                </Button>
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
            className="min-h-[calc(100vh-4rem)] p-4"
          >
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-orbitron font-bold text-white text-center mb-8">
                Select Your Craft
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {CRAFTS.map((craft) => (
                  <Card
                    key={craft.id}
                    onClick={() => setSelectedCraft(craft)}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedCraft.id === craft.id
                        ? 'border-2 border-cyan-400 bg-cyan-500/10'
                        : 'border-gray-700 bg-black/60 hover:border-gray-500'
                    }`}
                    data-testid={`craft-${craft.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: craft.color + '30' }}
                      >
                        <Rocket className="w-6 h-6" style={{ color: craft.color }} />
                      </div>
                      <div>
                        <h3 className="font-orbitron font-bold text-white">{craft.name}</h3>
                        <p className="text-sm text-gray-400">{craft.description}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <span className="text-gray-300">{craft.speed}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Wind className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-300">{craft.agility}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="w-4 h-4 text-green-400" />
                        <span className="text-gray-300">{craft.shield}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  variant="outline"
                  onClick={() => setGamePhase('menu')}
                  className="border-gray-600"
                  data-testid="button-back-menu"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={() => setGamePhase('countdown')}
                  className="px-8 bg-gradient-to-r from-cyan-500 to-purple-500"
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
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="text-center"
            >
              <div className="text-9xl font-orbitron font-bold text-cyan-400">
                {countdown > 0 ? countdown : 'GO!'}
              </div>
              <p className="text-2xl text-gray-400 mt-4">{selectedCraft.name}</p>
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
            className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4"
          >
            <Card className="p-8 bg-black/80 border-cyan-500/30 text-center max-w-md">
              {raceWon ? (
                <>
                  <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-orbitron font-bold text-yellow-400 mb-2">
                    VICTORY!
                  </h2>
                  <p className="text-gray-400 mb-4">
                    You crossed the finish line!
                  </p>
                </>
              ) : (
                <>
                  <Target className="w-20 h-20 text-red-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-orbitron font-bold text-red-400 mb-2">
                    RACE OVER
                  </h2>
                  <p className="text-gray-400 mb-4">
                    {timeLeft <= 0 ? 'Time ran out!' : 'Shield depleted!'}
                  </p>
                </>
              )}

              <div className="space-y-2 mb-6 text-left bg-black/40 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-gray-400">Racer:</span>
                  <span className="text-white font-mono">{racerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Craft:</span>
                  <span className="text-white">{selectedCraft.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Distance:</span>
                  <span className="text-cyan-400">{distance} / {TRACK_LENGTH}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Score:</span>
                  <span className="text-purple-400">{score}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => setGamePhase('select')}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500"
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
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
