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
import { GameStorageManager, GameSettings as BaseGameSettings } from '@/lib/gameStorage';
import { getGameConfig } from '@/lib/gameRegistry';
import { GameHUD } from '@/components/game/GameHUD';
import { VictoryScreen } from '@/components/game/VictoryScreen';
import {
  Play, Home, Volume2, VolumeX, Trophy, Target, Zap, Circle
} from 'lucide-react';

interface RingGameSettings extends BaseGameSettings {}

interface Ring {
  id: string;
  angle: number;
  speed: number;
  radius: number;
  color: string;
  thickness: number;
  gapSize: number;
  gapAngle: number;
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

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  lifetime: number;
}

interface GameState {
  level: number;
  score: number;
  lives: number;
  rings: Ring[];
  targetAngle: number;
  scorePopups: ScorePopup[];
  particles: Particle[];
  isPerfect: boolean;
  combo: number;
  maxCombo: number;
}

const CANVAS_SIZE = 400;
const CENTER = CANVAS_SIZE / 2;
const MAX_LIVES = 3;

const LEVEL_CONFIG = [
  { rings: 1, baseSpeed: 1.5, gapSize: 60 },
  { rings: 1, baseSpeed: 2, gapSize: 55 },
  { rings: 1, baseSpeed: 2.5, gapSize: 50 },
  { rings: 2, baseSpeed: 2, gapSize: 50 },
  { rings: 2, baseSpeed: 2.5, gapSize: 45 },
  { rings: 2, baseSpeed: 3, gapSize: 40 },
  { rings: 3, baseSpeed: 2.5, gapSize: 45 },
  { rings: 3, baseSpeed: 3, gapSize: 40 },
  { rings: 3, baseSpeed: 3.5, gapSize: 35 },
  { rings: 4, baseSpeed: 3, gapSize: 35 },
  { rings: 4, baseSpeed: 3.5, gapSize: 30 },
  { rings: 4, baseSpeed: 4, gapSize: 25 },
  { rings: 5, baseSpeed: 3.5, gapSize: 30 },
  { rings: 5, baseSpeed: 4, gapSize: 25 },
  { rings: 5, baseSpeed: 4.5, gapSize: 20 },
];

const RING_COLORS = [
  '#00FFFF',
  '#A855F7',
  '#FBBF24',
  '#10B981',
  '#F43F5E',
];

const getColorForLevel = (level: number): string => {
  if (level <= 5) return RING_COLORS[0];
  if (level <= 10) return RING_COLORS[1];
  if (level <= 15) return RING_COLORS[2];
  return RING_COLORS[3];
};

export default function RingGame() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { submitScore, myStats, refreshStats } = useGameScoresLocal();
  const { isHolder, isLoading: nftLoading, access, recordPlay } = useGameAccess();

  const gameConfig = useMemo(() => getGameConfig('ring-game'), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [playsToday, setPlaysToday] = useState(0);
  const [showFeedback, setShowFeedback] = useState<'perfect' | 'good' | 'miss' | null>(null);

  const stats = useMemo(() => ({
    gamesPlayed: myStats.totalGames || 0,
    bestScore: myStats.bestScore || 0,
    longestStreak: myStats.bestLevel || 0,
    totalScore: myStats.lifetimeScore || 0,
  }), [myStats]);

  const [settings, setSettings] = useState<RingGameSettings>(() =>
    GameStorageManager.loadSettings<RingGameSettings>('ring-game', {
      soundEnabled: true,
      soundVolume: 70,
      animationSpeed: 'normal',
      particleIntensity: 'medium',
    })
  );

  const createRingsForLevel = useCallback((level: number): Ring[] => {
    const config = LEVEL_CONFIG[Math.min(level - 1, LEVEL_CONFIG.length - 1)];
    const rings: Ring[] = [];
    
    for (let i = 0; i < config.rings; i++) {
      const direction = i % 2 === 0 ? 1 : -1;
      const speedVariance = 0.8 + Math.random() * 0.4;
      
      rings.push({
        id: `ring-${i}`,
        angle: Math.random() * Math.PI * 2,
        speed: config.baseSpeed * direction * speedVariance,
        radius: 60 + i * 35,
        color: RING_COLORS[i % RING_COLORS.length],
        thickness: 12 - i,
        gapSize: config.gapSize * (Math.PI / 180),
        gapAngle: Math.random() * Math.PI * 2,
      });
    }
    
    return rings;
  }, []);

  const initialGameState = useCallback((): GameState => ({
    level: 1,
    score: 0,
    lives: MAX_LIVES,
    rings: createRingsForLevel(1),
    targetAngle: Math.PI / 2,
    scorePopups: [],
    particles: [],
    isPerfect: false,
    combo: 0,
    maxCombo: 0,
  }), [createRingsForLevel]);

  const gameStateRef = useRef<GameState>(initialGameState());

  const playSound = useCallback((type: 'tap' | 'perfect' | 'good' | 'miss' | 'levelup' | 'gameover') => {
    if (!settings.soundEnabled) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      const volume = (settings.soundVolume / 100) * 0.3;
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      
      switch (type) {
        case 'perfect':
          oscillator.frequency.setValueAtTime(880, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'good':
          oscillator.frequency.setValueAtTime(660, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
          break;
        case 'miss':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(200, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'levelup':
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
          oscillator.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.3);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.4);
          break;
        case 'gameover':
          oscillator.type = 'sawtooth';
          oscillator.frequency.setValueAtTime(300, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.6);
          break;
        default:
          oscillator.frequency.setValueAtTime(440, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {}
  }, [settings.soundEnabled, settings.soundVolume]);

  const createParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const state = gameStateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 50 + Math.random() * 100;
      state.particles.push({
        id: `particle-${Date.now()}-${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2 + Math.random() * 3,
        lifetime: 0.5 + Math.random() * 0.5,
      });
    }
  }, []);

  const createScorePopup = useCallback((text: string, x: number, y: number, color: string, isSpecial: boolean = false) => {
    const state = gameStateRef.current;
    state.scorePopups.push({
      id: `popup-${Date.now()}`,
      text,
      x,
      y,
      color,
      lifetime: 1,
      isSpecial,
    });
  }, []);

  const haptic = useMemo(() => ({
    light: () => navigator.vibrate?.(10),
    medium: () => navigator.vibrate?.(25),
    heavy: () => navigator.vibrate?.([30, 30, 30]),
    error: () => navigator.vibrate?.([50, 50, 100]),
  }), []);

  const normalizeAngle = (angle: number): number => {
    let normalized = angle % (Math.PI * 2);
    if (normalized < 0) normalized += Math.PI * 2;
    return normalized;
  };

  const isAngleInGap = (targetAngle: number, gapAngle: number, gapSize: number): boolean => {
    const normalizedTarget = normalizeAngle(targetAngle);
    const normalizedGap = normalizeAngle(gapAngle);
    
    let diff = Math.abs(normalizedTarget - normalizedGap);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    
    return diff <= gapSize / 2;
  };

  const handleTap = useCallback(() => {
    if (gameOver || !gameStarted) return;
    
    const state = gameStateRef.current;
    const targetAngle = state.targetAngle;
    
    let allPassed = true;
    let perfectCount = 0;
    let goodCount = 0;
    
    for (const ring of state.rings) {
      const inGap = isAngleInGap(targetAngle, ring.gapAngle + ring.angle, ring.gapSize);
      const perfectZone = ring.gapSize * 0.4;
      const isPerfect = isAngleInGap(targetAngle, ring.gapAngle + ring.angle, perfectZone);
      
      if (!inGap) {
        allPassed = false;
        break;
      }
      
      if (isPerfect) perfectCount++;
      else goodCount++;
    }
    
    if (allPassed) {
      const allPerfect = perfectCount === state.rings.length;
      
      if (allPerfect) {
        const comboMultiplier = Math.min(state.combo + 1, 5);
        const points = 100 * state.rings.length * comboMultiplier;
        state.score += points;
        state.combo++;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        
        setShowFeedback('perfect');
        playSound('perfect');
        haptic.medium();
        
        createScorePopup(`+${points}`, CENTER, CENTER - 50, '#FBBF24', true);
        createParticles(CENTER, CENTER, '#FBBF24', 20);
      } else {
        const points = 50 * state.rings.length;
        state.score += points;
        state.combo = 0;
        
        setShowFeedback('good');
        playSound('good');
        haptic.light();
        
        createScorePopup(`+${points}`, CENTER, CENTER - 50, '#10B981', false);
        createParticles(CENTER, CENTER, '#10B981', 10);
      }
      
      setTimeout(() => setShowFeedback(null), 500);
      
      state.level++;
      state.rings = createRingsForLevel(state.level);
      
      if (state.level % 5 === 0) {
        playSound('levelup');
        haptic.heavy();
      }
    } else {
      state.lives--;
      state.combo = 0;
      
      setShowFeedback('miss');
      playSound('miss');
      haptic.error();
      
      createScorePopup('MISS', CENTER, CENTER - 50, '#EF4444', false);
      
      setTimeout(() => setShowFeedback(null), 500);
      
      if (state.lives <= 0) {
        setGameOver(true);
        playSound('gameover');
        
        const playerAddress = address || 'anonymous';
        const today = new Date().toDateString();
        const dailyData = GameStorageManager.getDailyData('ring-game', playerAddress, today);
        GameStorageManager.updateDailyData('ring-game', playerAddress, today, {
          gamesPlayed: dailyData.gamesPlayed + 1,
          pointsEarned: dailyData.pointsEarned + state.score
        });
        
        recordPlay();
        
        if (address && state.score > 0) {
          submitScore(state.score, state.level);
          refreshStats();
        }
        
        trackEvent('game_complete', 'ring-game', String(state.level), state.score);
        
        setTimeout(() => setShowVictory(true), 1500);
      } else {
        state.rings = createRingsForLevel(state.level);
      }
    }
  }, [gameOver, gameStarted, address, submitScore, recordPlay, refreshStats, createRingsForLevel, playSound, haptic, createParticles, createScorePopup]);

  const update = useCallback((dt: number) => {
    if (gameOver) return;
    
    const state = gameStateRef.current;
    
    for (const ring of state.rings) {
      ring.angle += ring.speed * dt;
    }
    
    state.particles = state.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.lifetime -= dt;
      return p.lifetime > 0;
    });
    
    state.scorePopups = state.scorePopups.filter(popup => {
      popup.y -= dt * 50;
      popup.lifetime -= dt;
      return popup.lifetime > 0;
    });
  }, [gameOver]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const state = gameStateRef.current;
    
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    const gradient = ctx.createRadialGradient(CENTER, CENTER, 0, CENTER, CENTER, CANVAS_SIZE / 2);
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    for (const ring of state.rings) {
      ctx.save();
      ctx.translate(CENTER, CENTER);
      ctx.rotate(ring.angle);
      
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.thickness;
      ctx.lineCap = 'round';
      
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 15;
      
      const startAngle = ring.gapAngle + ring.gapSize / 2;
      const endAngle = ring.gapAngle + Math.PI * 2 - ring.gapSize / 2;
      
      ctx.beginPath();
      ctx.arc(0, 0, ring.radius, startAngle, endAngle);
      ctx.stroke();
      
      ctx.restore();
    }
    
    ctx.save();
    ctx.translate(CENTER, CENTER);
    
    const targetX = Math.cos(state.targetAngle) * 30;
    const targetY = Math.sin(state.targetAngle) * 30;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 8, 0, Math.PI * 2);
    ctx.fill();
    
    const arrowLength = 180;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(state.targetAngle) * arrowLength, Math.sin(state.targetAngle) * arrowLength);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.restore();
    
    state.particles.forEach(p => {
      const alpha = p.lifetime / 1;
      ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
    
    state.scorePopups.forEach(popup => {
      const alpha = popup.lifetime;
      const scale = popup.isSpecial ? 1.5 : 1.2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${Math.floor(24 * scale)}px Orbitron, monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = popup.color;
      ctx.shadowColor = popup.color;
      ctx.shadowBlur = popup.isSpecial ? 15 : 8;
      ctx.fillText(popup.text, popup.x, popup.y);
      ctx.restore();
    });
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = timestamp;
    
    update(dt);
    render();
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [update, render]);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, gameOver, gameLoop]);

  useEffect(() => {
    if (address) {
      refreshStats();
      setPlaysToday(access.playsRemaining !== undefined ? gameConfig.maxPlaysPerDay - access.playsRemaining : 0);
    }
  }, [address, access.playsRemaining, gameConfig.maxPlaysPerDay, refreshStats]);

  const startGame = useCallback(() => {
    if (!address) {
      toast({
        title: "Wallet Required",
        description: "Connect your wallet to play",
        variant: "destructive",
      });
      return;
    }
    
    if (!access.canPlay) {
      toast({
        title: "No Plays Left",
        description: access.reason || "Come back tomorrow!",
        variant: "destructive",
      });
      return;
    }
    
    const dailyLimits = GameStorageManager.checkDailyLimits('ring-game', address, gameConfig.maxPlaysPerDay, 50000);
    if (!dailyLimits.canPlay) {
      toast({
        title: "Daily Limit Reached",
        description: dailyLimits.reason || "Come back tomorrow!",
        variant: "destructive",
      });
      return;
    }
    
    gameStateRef.current = initialGameState();
    setGameStarted(true);
    setGameOver(false);
    setShowVictory(false);
    lastTimeRef.current = 0;
    
    trackEvent('game_start', 'ring-game', '', 0);
  }, [address, toast, access.canPlay, access.reason, gameConfig.maxPlaysPerDay, initialGameState]);

  const state = gameStateRef.current;

  if (nftLoading) {
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <section className="py-6 min-h-screen bg-gradient-to-b from-cyan-900 via-purple-900 to-black flex items-center justify-center pt-16">
          <div className="text-center">
            <Circle className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-spin" />
            <p className="text-cyan-400 font-orbitron">Loading Ring Game...</p>
          </div>
        </section>
      </>
    );
  }

  if (!gameStarted) {
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <section className="py-6 min-h-screen bg-gradient-to-b from-cyan-900 via-purple-900 to-black relative overflow-y-auto pt-16 pb-24">
          <div className="max-w-lg mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h1 className="text-4xl md:text-5xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2">
                RING GAME
              </h1>
              <p className="text-gray-400">Align the rings. Perfect your timing.</p>
            </motion.div>

            <Card className="bg-black/60 border-cyan-500/30 backdrop-blur-xl p-6 mb-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg mb-4">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-bold">Best: {stats.bestScore.toLocaleString()}</span>
                </div>

                <p className="text-gray-300 text-sm mb-4">
                  Tap when the gaps align! Hit the center for PERFECT timing.
                </p>

                <div className="grid grid-cols-3 gap-4 text-center mb-6">
                  <div>
                    <div className="text-2xl text-cyan-400 font-bold">{stats.gamesPlayed}</div>
                    <div className="text-xs text-gray-500">Games</div>
                  </div>
                  <div>
                    <div className="text-2xl text-purple-400 font-bold">{stats.longestStreak}</div>
                    <div className="text-xs text-gray-500">Best Streak</div>
                  </div>
                  <div>
                    <div className="text-2xl text-green-400 font-bold">{stats.totalScore.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Lifetime</div>
                  </div>
                </div>
              </div>

              <Button
                onClick={startGame}
                disabled={!access.canPlay}
                className="w-full h-16 text-xl font-orbitron bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 border-0 shadow-lg shadow-cyan-500/25"
                data-testid="button-start-game"
              >
                <Play className="w-8 h-8 mr-3" />
                {!access.canPlay ? 'NO PLAYS LEFT' : 'START GAME'}
              </Button>

              {access.playsRemaining !== undefined && (
                <p className="text-center text-sm text-gray-400 mt-3">
                  {access.playsRemaining} plays remaining today
                </p>
              )}
            </Card>

            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="border-white/20"
                data-testid="button-back-home"
              >
                <Home className="w-4 h-4 mr-2" />
                Command Center
              </Button>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (showVictory) {
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <section className="py-6 min-h-screen bg-gradient-to-b from-cyan-900 via-purple-900 to-black relative overflow-y-auto pt-16 pb-24">
          <div className="max-w-lg mx-auto px-4">
            <VictoryScreen
              gameType="ring-game"
              score={state.score}
              time={0}
              playsRemaining={gameConfig.maxPlaysPerDay - playsToday - 1}
              maxPlays={gameConfig.maxPlaysPerDay}
              isNewBest={state.score > stats.bestScore}
              personalBest={stats.bestScore}
              onPlayAgain={() => {
                setShowVictory(false);
                setGameStarted(false);
              }}
              onExit={() => navigate('/')}
              extraStats={[
                { icon: Target, label: 'Level', value: state.level, color: 'text-cyan-400' },
                { icon: Zap, label: 'Max Combo', value: state.maxCombo, color: 'text-yellow-400' },
              ]}
            />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
      <section className="py-6 min-h-screen bg-gradient-to-b from-cyan-900 via-purple-900 to-black relative overflow-y-auto pt-16 pb-24">
        <div className="max-w-lg mx-auto px-4">
          
          <div className="text-center mb-4">
            <div className="text-6xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
              RING {state.level}
            </div>
          </div>

          <div className="mb-4">
            <GameHUD
              score={state.score}
              time={0}
              combo={state.combo > 0 ? state.combo : undefined}
              extraStats={[
                { icon: Target, label: 'Lives', value: '❤️'.repeat(Math.max(0, state.lives)), color: 'text-red-400' },
              ]}
            />
          </div>

          <div className="flex justify-between items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettings(prev => {
                const newSettings = { ...prev, soundEnabled: !prev.soundEnabled };
                GameStorageManager.saveSettings('ring-game', newSettings);
                return newSettings;
              })}
              className="text-white/70 hover:text-white"
              data-testid="button-toggle-sound"
            >
              {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>

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

          <div className="relative flex justify-center">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="border-2 border-white/20 rounded-2xl bg-black/80 touch-none cursor-pointer"
              style={{ maxWidth: '100%', height: 'auto' }}
              onClick={handleTap}
              onTouchStart={(e) => {
                e.preventDefault();
                handleTap();
              }}
              data-testid="canvas-game"
            />

            <AnimatePresence>
              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.5 }}
                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-4xl font-orbitron font-bold ${
                    showFeedback === 'perfect' ? 'text-yellow-400' :
                    showFeedback === 'good' ? 'text-green-400' : 'text-red-400'
                  }`}
                  style={{ textShadow: '0 0 20px currentColor' }}
                >
                  {showFeedback === 'perfect' ? 'PERFECT!' :
                   showFeedback === 'good' ? 'GOOD!' : 'MISS!'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6 text-center text-gray-400 text-sm">
            <p>Tap when the gaps align with the target</p>
          </div>
        </div>
      </section>
    </>
  );
}
