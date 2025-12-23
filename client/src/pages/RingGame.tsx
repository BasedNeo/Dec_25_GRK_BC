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
import { Play, Home, Trophy, Heart, Target, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { isMobile, haptic } from '@/lib/mobileUtils';

interface Ring {
  angle: number;
  speed: number;
  radius: number;
  gapAngle: number;
  color: string;
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

interface GameState {
  rings: Ring[];
  score: number;
  level: number;
  lives: number;
  combo: number;
  particles: Particle[];
  feedback: 'perfect' | 'good' | 'miss' | null;
  feedbackTimer: number;
  gameOver: boolean;
}

type GamePhase = 'menu' | 'playing' | 'gameover';

const CANVAS_SIZE = 350;
const CENTER = CANVAS_SIZE / 2;
const GAP_SIZE = 40;
const PERFECT_THRESHOLD = 20;
const GOOD_THRESHOLD = 40;

const RING_COLORS = ['#00FFFF', '#A855F7', '#FBBF24', '#10B981', '#F43F5E'];

function getLevelConfig(level: number) {
  if (level <= 3) return { ringCount: 2, baseSpeed: 0.8 + level * 0.2 };
  if (level <= 6) return { ringCount: 2, baseSpeed: 1.2 + (level - 3) * 0.3 };
  if (level <= 10) return { ringCount: 3, baseSpeed: 1.5 + (level - 6) * 0.2 };
  return { ringCount: 3, baseSpeed: 2 + (level - 10) * 0.15 };
}

function createRings(level: number): Ring[] {
  const config = getLevelConfig(level);
  const rings: Ring[] = [];
  const baseRadius = 50;
  const radiusStep = 35;
  
  for (let i = 0; i < config.ringCount; i++) {
    const direction = i % 2 === 0 ? 1 : -1;
    rings.push({
      angle: Math.random() * 360,
      speed: config.baseSpeed * direction * (0.8 + Math.random() * 0.4),
      radius: baseRadius + i * radiusStep,
      gapAngle: Math.random() * 360,
      color: RING_COLORS[i % RING_COLORS.length],
    });
  }
  return rings;
}

export default function RingGame() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { submitScore, myStats, refreshStats } = useGameScoresLocal();
  const { access, recordPlay, isLoading: nftLoading } = useGameAccess();

  const gameConfig = useMemo(() => getGameConfig('ring-game'), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const gameStateRef = useRef<GameState | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [gamePhase, setGamePhase] = useState<GamePhase>('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<'perfect' | 'good' | 'miss' | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [showLevelBanner, setShowLevelBanner] = useState<string | null>(null);
  const [timeFrozen, setTimeFrozen] = useState(false);

  const stats = useMemo(() => ({
    gamesPlayed: myStats.totalGames || 0,
    bestScore: myStats.bestScore || 0,
    totalScore: myStats.lifetimeScore || 0,
  }), [myStats]);

  const playSound = useCallback((type: 'perfect' | 'good' | 'miss' | 'gameover') => {
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
        case 'perfect':
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          break;
        case 'good':
          osc.frequency.setValueAtTime(500, ctx.currentTime);
          osc.frequency.setValueAtTime(700, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
          break;
        case 'miss':
          osc.frequency.setValueAtTime(200, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
          break;
        case 'gameover':
          osc.frequency.setValueAtTime(300, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
          break;
      }
    } catch (e) {}
  }, [soundEnabled]);

  const createParticles = useCallback((x: number, y: number, color: string, count: number): Particle[] => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
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
    return {
      rings: createRings(1),
      score: 0,
      level: 1,
      lives: 3,
      combo: 0,
      particles: [],
      feedback: null,
      feedbackTimer: 0,
      gameOver: false,
    };
  }, []);

  const checkAlignment = useCallback((state: GameState): 'perfect' | 'good' | 'miss' => {
    const targetAngle = 270;
    
    for (const ring of state.rings) {
      let gapStart = (ring.angle + ring.gapAngle) % 360;
      let gapEnd = (gapStart + GAP_SIZE) % 360;
      
      let inGap = false;
      if (gapStart < gapEnd) {
        inGap = targetAngle >= gapStart && targetAngle <= gapEnd;
      } else {
        inGap = targetAngle >= gapStart || targetAngle <= gapEnd;
      }
      
      if (!inGap) {
        let distance = Math.abs(targetAngle - (gapStart + GAP_SIZE / 2));
        if (distance > 180) distance = 360 - distance;
        
        if (distance <= GOOD_THRESHOLD) continue;
        return 'miss';
      }
    }
    
    let allPerfect = true;
    for (const ring of state.rings) {
      let gapCenter = (ring.angle + ring.gapAngle + GAP_SIZE / 2) % 360;
      let distance = Math.abs(270 - gapCenter);
      if (distance > 180) distance = 360 - distance;
      if (distance > PERFECT_THRESHOLD) allPerfect = false;
    }
    
    return allPerfect ? 'perfect' : 'good';
  }, []);

  const handleTap = useCallback(() => {
    const state = gameStateRef.current;
    if (!state || state.gameOver || state.feedbackTimer > 0) return;

    const result = checkAlignment(state);
    state.feedback = result;
    state.feedbackTimer = 60;

    if (result === 'perfect') {
      state.combo++;
      const points = 100 * Math.min(state.combo, 10);
      state.score += points;
      state.particles.push(...createParticles(CENTER, CENTER - state.rings[state.rings.length - 1].radius - 20, '#00FF88', 15));
      playSound('perfect');
      if (isMobile && hapticEnabled) haptic.medium?.() || haptic.light();
      setTimeFrozen(true);
      setTimeout(() => setTimeFrozen(false), 150);
    } else if (result === 'good') {
      state.combo++;
      const points = 50 * Math.min(state.combo, 10);
      state.score += points;
      state.particles.push(...createParticles(CENTER, CENTER - state.rings[state.rings.length - 1].radius - 20, '#FBBF24', 10));
      playSound('good');
      if (isMobile && hapticEnabled) haptic.light();
    } else {
      state.combo = 0;
      state.lives--;
      state.particles.push(...createParticles(CENTER, CENTER, '#EF4444', 12));
      playSound('miss');
      if (isMobile && hapticEnabled) haptic.heavy();
      
      if (state.lives <= 0) {
        state.gameOver = true;
        playSound('gameover');
        return;
      }
    }

    if (result !== 'miss') {
      state.level++;
      state.rings = createRings(state.level);
      if (state.level === 10) {
        setShowLevelBanner('ADEPT UNLOCKED');
        setTimeout(() => setShowLevelBanner(null), 2000);
      } else if (state.level === 20) {
        setShowLevelBanner('MASTER UNLOCKED');
        setTimeout(() => setShowLevelBanner(null), 2000);
      }
    }
  }, [checkAlignment, createParticles, playSound, hapticEnabled]);

  const updateFrozenRef = useRef(false);
  updateFrozenRef.current = timeFrozen;
  
  const update = useCallback(() => {
    const state = gameStateRef.current;
    if (!state || state.gameOver || updateFrozenRef.current) return;

    for (const ring of state.rings) {
      ring.angle = (ring.angle + ring.speed) % 360;
    }

    if (state.feedbackTimer > 0) {
      state.feedbackTimer--;
      if (state.feedbackTimer === 0) state.feedback = null;
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      state.particles[i].x += state.particles[i].vx;
      state.particles[i].y += state.particles[i].vy;
      state.particles[i].life -= 0.025;
      if (state.particles[i].life <= 0) state.particles.splice(i, 1);
    }

    setScore(state.score);
    setLevel(state.level);
    setLives(state.lives);
    setCombo(state.combo);
    setFeedback(state.feedback);
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const state = gameStateRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let r = 30; r < CANVAS_SIZE / 2; r += 30) {
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(CENTER, 20);
    ctx.lineTo(CENTER - 10, 40);
    ctx.lineTo(CENTER + 10, 40);
    ctx.closePath();
    ctx.fill();

    for (const ring of state.rings) {
      const gapStart = ((ring.angle + ring.gapAngle - 90) * Math.PI) / 180;
      const gapEnd = ((ring.angle + ring.gapAngle + GAP_SIZE - 90) * Math.PI) / 180;

      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.arc(CENTER, CENTER, ring.radius, gapEnd, gapStart + Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 14;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, ring.radius, gapStart, gapEnd);
      ctx.stroke();
      
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

    if (state.feedback) {
      ctx.font = 'bold 32px Orbitron, monospace';
      ctx.textAlign = 'center';
      if (state.feedback === 'perfect') {
        ctx.fillStyle = '#00FF88';
        ctx.fillText('PERFECT!', CENTER, CENTER - 10);
        if (state.combo > 1) {
          ctx.font = 'bold 20px Orbitron, monospace';
          ctx.fillStyle = '#FBBF24';
          ctx.fillText(`x${state.combo}`, CENTER, CENTER + 20);
        }
      } else if (state.feedback === 'good') {
        ctx.fillStyle = '#FBBF24';
        ctx.fillText('GOOD', CENTER, CENTER);
      } else {
        ctx.fillStyle = '#EF4444';
        ctx.fillText('MISS', CENTER, CENTER);
      }
    }

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${state.level}`, CENTER, CENTER + (state.feedback ? 60 : 15));
    ctx.font = '14px Orbitron, monospace';
    ctx.fillStyle = '#888888';
    ctx.fillText('RING', CENTER, CENTER + (state.feedback ? 80 : 35));
  }, []);

  const gameLoop = useCallback(() => {
    update();
    render();
    const state = gameStateRef.current;
    if (state && state.gameOver) {
      setGamePhase('gameover');
      const playerAddress = address || 'anonymous';
      const today = new Date().toDateString();
      const dailyData = GameStorageManager.getDailyData('ring-game', playerAddress, today);
      GameStorageManager.updateDailyData('ring-game', playerAddress, today, {
        gamesPlayed: dailyData.gamesPlayed + 1,
        pointsEarned: dailyData.pointsEarned + state.score
      });
      if (address && state.score > 0) {
        submitScore(state.score, state.level);
        refreshStats();
      }
      trackEvent('game_complete', 'ring-game', String(state.level), state.score);
      return;
    }
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [update, render, address, submitScore, refreshStats]);

  useEffect(() => {
    if (gamePhase !== 'playing') return;
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gamePhase, gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && gamePhase === 'playing') {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gamePhase, handleTap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  const startGame = useCallback(() => {
    if (!address) {
      toast({ title: "Wallet Required", description: "Connect your wallet to play", variant: "destructive" });
      return;
    }
    if (!access.canPlay) {
      toast({ title: "No Plays Left", description: access.reason || "Come back tomorrow!", variant: "destructive" });
      return;
    }
    const dailyLimits = GameStorageManager.checkDailyLimits('ring-game', address, gameConfig.maxPlaysPerDay, 50000);
    if (!dailyLimits.canPlay) {
      toast({ title: "Daily Limit Reached", description: dailyLimits.reason || "Come back tomorrow!", variant: "destructive" });
      return;
    }
    recordPlay();
    gameStateRef.current = initGame();
    setGamePhase('playing');
    setScore(0);
    setLevel(1);
    setLives(3);
    setCombo(0);
    setFeedback(null);
    trackEvent('game_start', 'ring-game', '', 0);
  }, [address, access.canPlay, access.reason, gameConfig.maxPlaysPerDay, toast, initGame, recordPlay]);

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
                RING GAME
              </h1>
              <p className="text-gray-400">Time your taps. Align the gaps. Stay focused.</p>
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
                <h3 className="text-sm font-bold text-cyan-400 mb-2">HOW TO PLAY</h3>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>• Rings rotate with gaps (bright sections)</p>
                  <p>• Tap or press SPACE when all gaps align at the top</p>
                  <p>• <span className="text-green-400">PERFECT</span> = gaps centered = 100 pts</p>
                  <p>• <span className="text-yellow-400">GOOD</span> = gaps close = 50 pts</p>
                  <p>• <span className="text-red-400">MISS</span> = gaps misaligned = lose 1 life</p>
                  <p>• Build combos for bonus multipliers!</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Sound</span>
                <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="text-cyan-400" data-testid="button-toggle-sound">
                  {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </Button>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Haptic Feedback</span>
                <Button variant="ghost" size="sm" onClick={() => setHapticEnabled(!hapticEnabled)} className={hapticEnabled ? 'text-cyan-400' : 'text-gray-500'} data-testid="button-toggle-haptic">
                  {hapticEnabled ? 'ON' : 'OFF'}
                </Button>
              </div>

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
              gameType="ring-game"
              score={score}
              stats={[
                { icon: Target, label: 'Score', value: score.toLocaleString(), color: 'text-cyan-400' },
                { icon: Trophy, label: 'Level', value: level, color: 'text-purple-400' },
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
      <section className="py-2 min-h-screen bg-black pt-16 pb-24 flex flex-col items-center">
        <div className="flex items-center justify-between w-full max-w-md px-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-mono font-bold">{score}</span>
            </div>
            {combo > 1 && <span className="text-yellow-400 font-bold text-sm animate-pulse">x{combo}</span>}
            <div className="flex items-center gap-1">
              {[...Array(lives)].map((_, i) => <Heart key={i} className="w-4 h-4 text-red-500 fill-red-500" />)}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="text-cyan-400">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            className="border border-cyan-500/30 rounded-lg cursor-pointer"
            style={{ touchAction: 'none' }}
            onClick={handleTap}
            onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
            data-testid="game-canvas"
          />
          <AnimatePresence>
            {showLevelBanner && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="text-center"
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 10 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="text-3xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-yellow-400">
                    {showLevelBanner}
                  </div>
                  <motion.div
                    className="mt-2 text-4xl"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5, repeat: 2 }}
                  >
                    ✨
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {timeFrozen && (
            <div className="absolute inset-0 border-4 border-cyan-400 rounded-lg animate-pulse pointer-events-none" />
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">Tap the screen or press SPACE when gaps align at the top</p>
        </div>

        <Button
          onClick={handleTap}
          className="mt-4 w-48 h-16 text-xl font-orbitron bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 active:scale-95 transition-transform"
          data-testid="button-tap"
        >
          TAP!
        </Button>
      </section>
    </>
  );
}
