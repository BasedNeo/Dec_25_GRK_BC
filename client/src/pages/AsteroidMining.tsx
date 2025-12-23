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
import { Play, Home, Trophy, Heart, Zap, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { isMobile, haptic } from '@/lib/mobileUtils';

interface Vector2D {
  x: number;
  y: number;
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Bullet {
  x: number;
  y: number;
  speed: number;
}

interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
  points: number;
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
  particles: Particle[];
  scorePopups: ScorePopup[];
  score: number;
  lives: number;
  gameOver: boolean;
  enemiesDestroyed: number;
}

type GamePhase = 'menu' | 'playing' | 'gameover';

const PLAYER_SPEED = 8;
const BULLET_SPEED = 12;
const ENEMY_BASE_SPEED = 2;
const SHOOT_COOLDOWN = 150;

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

  const [gamePhase, setGamePhase] = useState<GamePhase>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 600 });

  const stats = useMemo(() => ({
    gamesPlayed: myStats.totalGames || 0,
    bestScore: myStats.bestScore || 0,
    totalScore: myStats.lifetimeScore || 0,
  }), [myStats]);

  const playSound = useCallback((type: 'shoot' | 'hit' | 'explosion' | 'gameover') => {
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
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
          break;
        case 'hit':
          osc.frequency.setValueAtTime(300, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
          break;
        case 'explosion':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          break;
        case 'gameover':
          osc.frequency.setValueAtTime(400, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
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
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        size: 2 + Math.random() * 3,
      });
    }
    return particles;
  }, []);

  const createScorePopup = useCallback((x: number, y: number, text: string, color: string): ScorePopup => {
    return { x, y, text, life: 1, color };
  }, []);

  const initGame = useCallback((): GameState => {
    const { width, height } = canvasSize;
    return {
      player: {
        x: width / 2 - 20,
        y: height - 80,
        width: 40,
        height: 40,
      },
      bullets: [],
      enemies: [],
      particles: [],
      scorePopups: [],
      score: 0,
      lives: 3,
      gameOver: false,
      enemiesDestroyed: 0,
    };
  }, [canvasSize]);

  const spawnEnemy = useCallback((state: GameState) => {
    const { width } = canvasSize;
    const enemyWidth = 30 + Math.random() * 20;
    const x = Math.random() * (width - enemyWidth);
    const colors = ['#EF4444', '#F97316', '#FBBF24', '#A855F7', '#3B82F6'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const speed = ENEMY_BASE_SPEED + Math.random() * 2 + (state.enemiesDestroyed * 0.05);
    const points = Math.floor(50 + Math.random() * 100);

    state.enemies.push({
      x,
      y: -50,
      width: enemyWidth,
      height: 30,
      speed,
      color,
      points,
    });
  }, [canvasSize]);

  const shoot = useCallback(() => {
    const state = gameStateRef.current;
    if (!state || state.gameOver) return;

    const now = Date.now();
    if (now - lastShootRef.current < SHOOT_COOLDOWN) return;
    lastShootRef.current = now;

    state.bullets.push({
      x: state.player.x + state.player.width / 2 - 3,
      y: state.player.y,
      speed: BULLET_SPEED,
    });

    playSound('shoot');
    if (isMobile) haptic.light();
  }, [playSound]);

  const update = useCallback(() => {
    const state = gameStateRef.current;
    if (!state || state.gameOver) return;

    const { width, height } = canvasSize;
    const keys = keysRef.current;
    const touch = touchRef.current;

    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A') || touch.left) {
      state.player.x -= PLAYER_SPEED;
    }
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D') || touch.right) {
      state.player.x += PLAYER_SPEED;
    }
    if (keys.has(' ') || touch.shoot) {
      shoot();
    }

    state.player.x = Math.max(0, Math.min(width - state.player.width, state.player.x));

    for (let i = state.bullets.length - 1; i >= 0; i--) {
      state.bullets[i].y -= state.bullets[i].speed;
      if (state.bullets[i].y < -10) {
        state.bullets.splice(i, 1);
      }
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      state.enemies[i].y += state.enemies[i].speed;
      
      if (state.enemies[i].y > height + 50) {
        state.enemies.splice(i, 1);
        continue;
      }

      const enemy = state.enemies[i];
      if (
        state.player.x < enemy.x + enemy.width &&
        state.player.x + state.player.width > enemy.x &&
        state.player.y < enemy.y + enemy.height &&
        state.player.y + state.player.height > enemy.y
      ) {
        state.lives--;
        state.particles.push(...createParticles(
          state.player.x + state.player.width / 2,
          state.player.y + state.player.height / 2,
          '#00FFFF',
          15
        ));
        state.enemies.splice(i, 1);
        playSound('explosion');
        if (isMobile) haptic.heavy();

        if (state.lives <= 0) {
          state.gameOver = true;
          playSound('gameover');
        }
        continue;
      }

      for (let j = state.bullets.length - 1; j >= 0; j--) {
        const bullet = state.bullets[j];
        if (
          bullet.x < enemy.x + enemy.width &&
          bullet.x + 6 > enemy.x &&
          bullet.y < enemy.y + enemy.height &&
          bullet.y + 10 > enemy.y
        ) {
          state.score += enemy.points;
          state.enemiesDestroyed++;
          state.particles.push(...createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 10));
          state.scorePopups.push(createScorePopup(enemy.x + enemy.width / 2, enemy.y, `+${enemy.points}`, enemy.color));
          state.bullets.splice(j, 1);
          state.enemies.splice(i, 1);
          playSound('hit');
          if (isMobile) haptic.light();
          break;
        }
      }
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      state.particles[i].x += state.particles[i].vx;
      state.particles[i].y += state.particles[i].vy;
      state.particles[i].life -= 0.02;
      if (state.particles[i].life <= 0) {
        state.particles.splice(i, 1);
      }
    }

    for (let i = state.scorePopups.length - 1; i >= 0; i--) {
      state.scorePopups[i].y -= 1;
      state.scorePopups[i].life -= 0.02;
      if (state.scorePopups[i].life <= 0) {
        state.scorePopups.splice(i, 1);
      }
    }

    setScore(state.score);
    setLives(state.lives);
  }, [canvasSize, shoot, createParticles, createScorePopup, playSound]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const state = gameStateRef.current;
    if (!canvas || !state) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSize;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + Math.random() * 0.3})`;
      ctx.fillRect(
        (i * 37 + Date.now() * 0.01) % width,
        (i * 71 + Date.now() * 0.02) % height,
        1, 1
      );
    }

    ctx.fillStyle = '#00FFFF';
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(state.player.x + state.player.width / 2, state.player.y);
    ctx.lineTo(state.player.x + state.player.width, state.player.y + state.player.height);
    ctx.lineTo(state.player.x + state.player.width / 2, state.player.y + state.player.height - 10);
    ctx.lineTo(state.player.x, state.player.y + state.player.height);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#FBBF24';
    ctx.shadowColor = '#FBBF24';
    ctx.shadowBlur = 8;
    for (const bullet of state.bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x + 3, bullet.y + 5, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    for (const enemy of state.enemies) {
      ctx.fillStyle = enemy.color;
      ctx.shadowColor = enemy.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
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

    ctx.font = 'bold 16px Orbitron, monospace';
    ctx.textAlign = 'center';
    for (const popup of state.scorePopups) {
      ctx.fillStyle = popup.color;
      ctx.globalAlpha = popup.life;
      ctx.fillText(popup.text, popup.x, popup.y);
    }
    ctx.globalAlpha = 1;
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
  }, [update, render, address, recordPlay, submitScore, refreshStats]);

  useEffect(() => {
    if (gamePhase !== 'playing') return;

    const enemyInterval = setInterval(() => {
      const state = gameStateRef.current;
      if (state && !state.gameOver) {
        spawnEnemy(state);
      }
    }, 1500);

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      clearInterval(enemyInterval);
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gamePhase, gameLoop, spawnEnemy]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', ' ', 'a', 'd', 'A', 'D'].includes(e.key)) {
        e.preventDefault();
        keysRef.current.add(e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

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
      const aspectRatio = 2 / 3;

      let width = maxWidth;
      let height = width / aspectRatio;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
      }

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
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, [canvasSize]);

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

    const dailyLimits = GameStorageManager.checkDailyLimits('asteroid-mining', address, gameConfig.maxPlaysPerDay, 50000);
    if (!dailyLimits.canPlay) {
      toast({
        title: "Daily Limit Reached",
        description: dailyLimits.reason || "Come back tomorrow!",
        variant: "destructive",
      });
      return;
    }

    recordPlay();
    
    gameStateRef.current = initGame();
    setGamePhase('playing');
    setScore(0);
    setLives(3);
    keysRef.current.clear();
    
    trackEvent('game_start', 'asteroid-mining', '', 0);
  }, [address, access.canPlay, access.reason, gameConfig.maxPlaysPerDay, toast, initGame, recordPlay]);

  const handleTouchStart = useCallback((zone: 'left' | 'right' | 'shoot') => {
    if (zone === 'left') touchRef.current.left = true;
    if (zone === 'right') touchRef.current.right = true;
    if (zone === 'shoot') {
      touchRef.current.shoot = true;
      shoot();
    }
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
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h1 className="text-4xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2">
                SPACE SHOOTER
              </h1>
              <p className="text-gray-400">Destroy asteroids. Survive. Get high scores.</p>
            </motion.div>

            <Card className="bg-black/60 border-cyan-500/30 backdrop-blur-xl p-6 mb-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg mb-4">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-bold">Best: {stats.bestScore.toLocaleString()}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center mb-6">
                  <div>
                    <div className="text-2xl text-cyan-400 font-bold">{stats.gamesPlayed}</div>
                    <div className="text-xs text-gray-500">Games Played</div>
                  </div>
                  <div>
                    <div className="text-2xl text-purple-400 font-bold">{stats.totalScore.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Total Score</div>
                  </div>
                </div>
              </div>

              <div className="mb-4 p-4 bg-white/5 rounded-lg">
                <h3 className="text-sm font-bold text-cyan-400 mb-2">CONTROLS</h3>
                <div className="text-xs text-gray-400 space-y-1">
                  <p><span className="text-white">Desktop:</span> Arrow keys or A/D to move, Spacebar to shoot</p>
                  <p><span className="text-white">Mobile:</span> Use the on-screen buttons below</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Sound</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="text-cyan-400"
                  data-testid="button-toggle-sound"
                >
                  {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </Button>
              </div>

              <Button
                onClick={startGame}
                disabled={!access.canPlay}
                className="w-full h-14 text-lg font-orbitron bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500"
                data-testid="button-start-game"
              >
                <Play className="w-6 h-6 mr-2" />
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
            <div className="flex items-center gap-1">
              {[...Array(lives)].map((_, i) => (
                <Heart key={i} className="w-4 h-4 text-red-500 fill-red-500" />
              ))}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-cyan-400"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        </div>

        <canvas
          ref={canvasRef}
          className="border border-cyan-500/30 rounded-lg"
          style={{ touchAction: 'none' }}
          data-testid="game-canvas"
        />

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
              >
                ←
              </Button>
              <Button
                className="w-24 h-16 bg-red-500/20 border border-red-500/50 text-red-400 text-lg font-bold active:bg-red-500/40"
                onTouchStart={() => handleTouchStart('shoot')}
                onTouchEnd={() => handleTouchEnd('shoot')}
                onMouseDown={() => handleTouchStart('shoot')}
                onMouseUp={() => handleTouchEnd('shoot')}
                onMouseLeave={() => handleTouchEnd('shoot')}
                data-testid="button-shoot"
              >
                FIRE
              </Button>
              <Button
                className="w-20 h-16 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 text-2xl font-bold active:bg-cyan-500/40"
                onTouchStart={() => handleTouchStart('right')}
                onTouchEnd={() => handleTouchEnd('right')}
                onMouseDown={() => handleTouchStart('right')}
                onMouseUp={() => handleTouchEnd('right')}
                onMouseLeave={() => handleTouchEnd('right')}
                data-testid="button-move-right"
              >
                →
              </Button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
