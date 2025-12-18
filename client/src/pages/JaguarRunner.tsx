import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useGameAccess } from '@/hooks/useGameAccess';
import { useGameScoresLocal } from '@/hooks/useGameScoresLocal';
import { getGameConfig } from '@/lib/gameRegistry';
import { GameStorageManager } from '@/lib/gameStorage';
import { GameHUD, HUDStat } from '@/components/game/GameHUD';
import { VictoryScreen } from '@/components/game/VictoryScreen';
import { Navbar } from '@/components/Navbar';
import { Home, Play, Zap, Target, Heart, Trophy, Gamepad2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useFeatureFlags } from '@/lib/featureFlags';

const GAME_CONFIG = getGameConfig('jaguar-runner');

interface Obstacle {
  x: number;
  type: 'rock' | 'cactus' | 'bird';
  height: number;
  width: number;
  y: number;
}

interface GameState {
  playerY: number;
  playerVelY: number;
  isJumping: boolean;
  isDucking: boolean;
  distance: number;
  speed: number;
  obstacles: Obstacle[];
  score: number;
  lives: number;
  gameOver: boolean;
  obstaclesAvoided: number;
}

const GROUND_Y = 280;
const PLAYER_HEIGHT = 60;
const PLAYER_WIDTH = 40;
const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const INITIAL_SPEED = 5;
const SPEED_INCREMENT = 0.001;
const MAX_SPEED = 15;

function createInitialState(): GameState {
  return {
    playerY: GROUND_Y - PLAYER_HEIGHT,
    playerVelY: 0,
    isJumping: false,
    isDucking: false,
    distance: 0,
    speed: INITIAL_SPEED,
    obstacles: [],
    score: 0,
    lives: 3,
    gameOver: false,
    obstaclesAvoided: 0,
  };
}

export default function JaguarRunner() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef({ jump: false, duck: false });
  const [phase, setPhase] = useState<'gate' | 'menu' | 'playing' | 'ended'>('gate');
  const [displayScore, setDisplayScore] = useState(0);
  const [displayDistance, setDisplayDistance] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [isNewBest, setIsNewBest] = useState(false);
  const { flags } = useFeatureFlags();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { access, recordPlay, isHolder, cooldown, holderPerks } = useGameAccess();
  const { submitScore, myStats } = useGameScoresLocal();

  const [stats, setStats] = useState(() => 
    address ? GameStorageManager.loadStats('jaguar-runner', address) : GameStorageManager.getDefaultStats()
  );

  useEffect(() => {
    if (address) {
      const loadedStats = GameStorageManager.loadStats('jaguar-runner', address);
      setStats(loadedStats);
    }
  }, [address]);

  if (!flags.gameEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Game Temporarily Unavailable</h2>
          <p className="text-gray-400">The game is currently disabled. Please check back soon.</p>
          <Button 
            onClick={() => setLocation('/')}
            className="mt-6 bg-cyan-500 hover:bg-cyan-600 text-black"
          >
            <Home className="w-4 h-4 mr-2" /> Return Home
          </Button>
        </div>
      </div>
    );
  }

  const startGame = useCallback(async () => {
    if (!access.canPlay) return;
    recordPlay();
    stateRef.current = createInitialState();
    setPhase('playing');
  }, [access.canPlay, recordPlay]);

  const endGame = useCallback(() => {
    const state = stateRef.current;
    const baseScore = Math.floor(state.distance * 10);
    const obstacleBonus = state.obstaclesAvoided * 100;
    const finalScore = Math.min(baseScore + obstacleBonus, GAME_CONFIG.scoring.maxScore);
    
    state.score = finalScore;
    state.gameOver = true;
    setDisplayScore(finalScore);

    const previousBest = stats.bestScore;
    const newBest = finalScore > previousBest;
    setIsNewBest(newBest);

    if (address) {
      const currentStats = GameStorageManager.loadStats('jaguar-runner', address);
      const updatedStats = {
        ...currentStats,
        gamesPlayed: currentStats.gamesPlayed + 1,
        gamesWon: state.lives > 0 ? currentStats.gamesWon + 1 : currentStats.gamesWon,
        totalScore: currentStats.totalScore + finalScore,
        totalTime: currentStats.totalTime + Math.floor(state.distance / state.speed),
        bestScore: Math.max(currentStats.bestScore, finalScore),
        lastPlayed: Date.now(),
        currentStreak: state.lives > 0 ? currentStats.currentStreak + 1 : 0,
        longestStreak: state.lives > 0 
          ? Math.max(currentStats.longestStreak, currentStats.currentStreak + 1)
          : currentStats.longestStreak,
      };
      GameStorageManager.saveStats('jaguar-runner', address, updatedStats);
      setStats(updatedStats);
    }

    submitScore(finalScore, Math.floor(state.distance / 100));
    setPhase('ended');
  }, [address, stats.bestScore, submitScore]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let animId: number;
    let lastObstacleX = canvas.width;

    const spawnObstacle = () => {
      const types: Obstacle['type'][] = ['rock', 'cactus', 'bird'];
      const type = types[Math.floor(Math.random() * types.length)];
      const obstacle: Obstacle = {
        x: canvas.width + 50,
        type,
        width: type === 'bird' ? 40 : 30,
        height: type === 'bird' ? 30 : type === 'cactus' ? 50 : 35,
        y: type === 'bird' 
          ? GROUND_Y - PLAYER_HEIGHT - 20 - Math.random() * 40 
          : GROUND_Y - (type === 'cactus' ? 50 : 35),
      };
      stateRef.current.obstacles.push(obstacle);
      lastObstacleX = canvas.width + 50;
    };

    const checkCollision = (state: GameState): boolean => {
      const playerBox = {
        x: 50,
        y: state.playerY + (state.isDucking ? PLAYER_HEIGHT / 2 : 0),
        width: PLAYER_WIDTH,
        height: state.isDucking ? PLAYER_HEIGHT / 2 : PLAYER_HEIGHT,
      };

      for (const obs of state.obstacles) {
        if (
          playerBox.x < obs.x + obs.width &&
          playerBox.x + playerBox.width > obs.x &&
          playerBox.y < obs.y + obs.height &&
          playerBox.y + playerBox.height > obs.y
        ) {
          return true;
        }
      }
      return false;
    };

    const loop = () => {
      const state = stateRef.current;
      if (state.gameOver) return;

      if (inputRef.current.jump && !state.isJumping) {
        state.playerVelY = JUMP_FORCE;
        state.isJumping = true;
      }
      state.isDucking = inputRef.current.duck && !state.isJumping;

      state.playerVelY += GRAVITY;
      state.playerY += state.playerVelY;

      if (state.playerY >= GROUND_Y - PLAYER_HEIGHT) {
        state.playerY = GROUND_Y - PLAYER_HEIGHT;
        state.playerVelY = 0;
        state.isJumping = false;
      }

      state.distance += state.speed * 0.1;
      state.speed = Math.min(state.speed + SPEED_INCREMENT, MAX_SPEED);

      state.obstacles = state.obstacles.filter(obs => {
        obs.x -= state.speed;
        if (obs.x + obs.width < 0) {
          state.obstaclesAvoided++;
          return false;
        }
        return true;
      });

      const minGap = 200 + Math.random() * 150;
      if (canvas.width - lastObstacleX > minGap) {
        spawnObstacle();
      }

      if (checkCollision(state)) {
        state.lives--;
        if (state.lives <= 0) {
          endGame();
          return;
        }
        state.obstacles = [];
        lastObstacleX = canvas.width;
      }

      ctx.fillStyle = '#1a0a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0a0015');
      gradient.addColorStop(0.5, '#150030');
      gradient.addColorStop(1, '#1a0a2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.arc(
          (Math.sin(Date.now() * 0.0001 + i) * 0.5 + 0.5) * canvas.width,
          (i / 30) * canvas.height * 0.6,
          1,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.fillStyle = '#2a1a4a';
      ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

      ctx.strokeStyle = '#00ffff33';
      for (let x = (-state.distance * 2) % 50; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      const playerHeight = state.isDucking ? PLAYER_HEIGHT / 2 : PLAYER_HEIGHT;
      const playerY = state.playerY + (state.isDucking ? PLAYER_HEIGHT / 2 : 0);
      
      ctx.fillStyle = '#ff8800';
      ctx.fillRect(50, playerY, PLAYER_WIDTH, playerHeight);
      
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(55, playerY + 5, PLAYER_WIDTH - 10, 10);
      
      ctx.fillStyle = '#000';
      ctx.fillRect(80, playerY + 8, 4, 4);

      for (const obs of state.obstacles) {
        if (obs.type === 'rock') {
          ctx.fillStyle = '#666';
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.lineTo(obs.x, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();
        } else if (obs.type === 'cactus') {
          ctx.fillStyle = '#22aa44';
          ctx.fillRect(obs.x + 10, obs.y, 10, obs.height);
          ctx.fillRect(obs.x, obs.y + 15, 30, 10);
        } else {
          ctx.fillStyle = '#ff4444';
          ctx.beginPath();
          ctx.ellipse(obs.x + obs.width/2, obs.y + obs.height/2, obs.width/2, obs.height/2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffff00';
          ctx.fillRect(obs.x + obs.width - 5, obs.y + obs.height/2 - 2, 8, 4);
        }
      }

      setDisplayScore(Math.floor(state.distance * 10));
      setDisplayDistance(Math.floor(state.distance));
      setDisplayLives(state.lives);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [phase, endGame]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w') {
        inputRef.current.jump = true;
        e.preventDefault();
      }
      if (e.key === 'ArrowDown' || e.key === 's') {
        inputRef.current.duck = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w') {
        inputRef.current.jump = false;
      }
      if (e.key === 'ArrowDown' || e.key === 's') {
        inputRef.current.duck = false;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  const handleTouchStart = () => {
    inputRef.current.jump = true;
  };
  const handleTouchEnd = () => {
    inputRef.current.jump = false;
  };

  const extraStats: HUDStat[] = [
    { icon: Target, label: 'Distance', value: `${displayDistance}m`, color: 'text-orange-400' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0015] via-[#050510] to-[#0a0020]">
      <Navbar activeTab="game" onTabChange={() => setLocation('/')} isConnected={isConnected} />
      
      <div className="py-6 px-4">
        <div className="max-w-md mx-auto mb-4">
          <button 
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-mono transition-colors"
            data-testid="button-back-home"
          >
            <Home size={16} />
            <span>Back to Command Center</span>
          </button>
        </div>
        
        <Card className="bg-black/90 border-orange-500/30 backdrop-blur-xl p-5 max-w-md mx-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-orange-400" />
                <span className="font-orbitron text-white text-sm tracking-wider">{GAME_CONFIG.name.toUpperCase()}</span>
              </div>
            </div>

            {phase === 'gate' && (
              <div className="text-center py-6 relative">
                <style>{`
                  @keyframes neon-flicker {
                    0%, 100% { opacity: 1; text-shadow: 0 0 10px rgba(251, 146, 60, 0.5), 0 0 20px rgba(251, 146, 60, 0.3); }
                    92% { opacity: 1; }
                    93% { opacity: 0.4; }
                    94% { opacity: 1; }
                    96% { opacity: 0.6; }
                  }
                  @keyframes chase-line {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                  }
                  @keyframes target-pulse {
                    0%, 100% { transform: scale(1); border-color: rgba(239, 68, 68, 0.5); }
                    50% { transform: scale(1.1); border-color: rgba(239, 68, 68, 0.8); }
                  }
                `}</style>
                
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                  <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent" style={{ animation: 'chase-line 2s linear infinite' }} />
                  <div className="absolute top-3/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500 to-transparent" style={{ animation: 'chase-line 2.5s linear infinite', animationDelay: '0.5s' }} />
                </div>
                
                <div className="w-20 h-20 mx-auto mb-4 relative">
                  <div className="absolute inset-0 rounded-full border-2 border-red-500/30" style={{ animation: 'target-pulse 2s ease-in-out infinite' }} />
                  <div className="absolute inset-2 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                    <Zap className="w-8 h-8 text-orange-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-mono px-1.5 py-0.5 rounded animate-pulse">
                    LIVE
                  </div>
                </div>
                
                <p className="text-white font-orbitron text-xl mb-1" style={{ animation: 'neon-flicker 5s ease-in-out infinite' }}>
                  {GAME_CONFIG.name.toUpperCase()}
                </p>
                <p className="text-red-400/60 text-xs font-mono tracking-widest mb-4">TARGET: URBAN PURSUIT</p>
                
                {!access.canPlay ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                    <p className="text-red-400 text-sm mb-1">{access.reason}</p>
                    {access.cooldownSeconds > 0 && (
                      <p className="text-orange-400 text-2xl font-mono font-bold">{cooldown}s</p>
                    )}
                  </div>
                ) : (
                  <div className="relative inline-block group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl blur opacity-30 group-hover:opacity-60 transition-opacity" />
                    <Button 
                      onClick={() => setPhase('menu')} 
                      className="relative bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold px-8 py-3 rounded-xl border-0"
                      data-testid="button-play-now"
                    >
                      <Play className="w-5 h-5 mr-2" /> ENGAGE
                    </Button>
                  </div>
                )}
                
                <p className="text-gray-600 text-xs mt-4 font-mono">
                  {access.playsRemaining} PURSUITS AVAILABLE
                </p>
              </div>
            )}

            {phase === 'menu' && (
              <div className="text-center py-6 relative">
                <style>{`
                  @keyframes dossier-scan {
                    0%, 100% { background-position: 0% 0%; }
                    50% { background-position: 100% 100%; }
                  }
                  @keyframes threat-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                  }
                `}</style>
                
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0" />
                
                <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-1 mb-4">
                  <span className="w-2 h-2 bg-red-500 rounded-full" style={{ animation: 'threat-blink 1s ease-in-out infinite' }} />
                  <span className="text-red-400 text-xs font-mono tracking-wide">CHASE DOSSIER</span>
                </div>
                
                <p className="text-white font-orbitron text-2xl mb-1">PURSUIT ACTIVE</p>
                <p className="text-orange-400/60 text-xs font-mono mb-5">{access.playsRemaining} ATTEMPTS REMAINING</p>
                
                <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-orange-500/20 rounded-xl p-4 mb-5 text-left relative overflow-hidden">
                  <div className="absolute -top-2 left-3 bg-slate-900 px-2 py-0.5 rounded text-[10px] text-orange-400 font-mono border border-orange-500/30">
                    CONTROLS
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                    <div className="flex items-center gap-2 text-gray-300">
                      <span className="bg-orange-500/20 border border-orange-500/40 px-2 py-0.5 rounded font-mono text-orange-300">↑</span>
                      <span>Jump</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <span className="bg-orange-500/20 border border-orange-500/40 px-2 py-0.5 rounded font-mono text-orange-300">↓</span>
                      <span>Duck</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-[10px] mt-2 text-center">Tap screen to jump on mobile</p>
                </div>

                <div className="relative inline-block group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 rounded-xl blur opacity-40 group-hover:opacity-70 transition-opacity" />
                  <Button 
                    onClick={startGame} 
                    className="relative bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 text-white font-bold px-10 py-4 text-lg rounded-xl border-0 shadow-lg shadow-orange-500/20" 
                    data-testid="button-start-game"
                  >
                    <Zap className="w-5 h-5 mr-2" /> BEGIN PURSUIT
                  </Button>
                </div>

                {stats.gamesPlayed > 0 && (
                  <div className="mt-6 pt-4 border-t border-orange-500/20">
                    <p className="text-[10px] text-gray-600 mb-3 font-mono tracking-widest">PURSUIT RECORD</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-lg p-2">
                        <Target className="w-4 h-4 mx-auto mb-1 text-orange-400" />
                        <p className="text-orange-400 font-mono font-bold text-sm">{stats.totalScore.toLocaleString()}</p>
                        <p className="text-gray-600 text-[8px]">TOTAL</p>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-lg p-2">
                        <Trophy className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
                        <p className="text-yellow-400 font-mono font-bold text-sm">{stats.bestScore.toLocaleString()}</p>
                        <p className="text-gray-600 text-[8px]">BEST</p>
                      </div>
                      <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 rounded-lg p-2">
                        <Gamepad2 className="w-4 h-4 mx-auto mb-1 text-red-400" />
                        <p className="text-red-400 font-mono font-bold text-sm">{stats.gamesPlayed}</p>
                        <p className="text-gray-600 text-[8px]">RUNS</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {phase === 'playing' && (
              <>
                <div className="mb-4">
                  <GameHUD
                    score={displayScore}
                    extraStats={extraStats}
                    ariaLabel="Jaguar Runner game statistics"
                  />
                  <div className="flex justify-end mt-2">
                    <div className="flex items-center gap-0.5" data-testid="text-game-lives">
                      {Array(displayLives).fill(0).map((_, i) => (
                        <Heart key={i} className="w-4 h-4 text-red-500 fill-red-500" />
                      ))}
                    </div>
                  </div>
                </div>
                
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={360}
                  className="w-full rounded-xl border-2 border-orange-500/30 shadow-[0_0_30px_rgba(255,136,0,0.2)]"
                  style={{ touchAction: 'none' }}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  data-testid="canvas-game"
                />

                <div className="flex justify-center gap-4 mt-4 md:hidden">
                  <Button
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className="w-24 h-16 bg-orange-500/20 border-2 border-orange-500/50 rounded-xl text-orange-400 active:bg-orange-500/40"
                    data-testid="button-touch-jump"
                  >
                    JUMP
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {phase === 'ended' && (
        <VictoryScreen
          gameType="jaguar-runner"
          score={displayScore}
          extraStats={[
            { icon: Target, label: 'Distance', value: `${displayDistance}m`, color: 'text-orange-400' },
            { icon: Zap, label: 'Avoided', value: stateRef.current.obstaclesAvoided, color: 'text-cyan-400' },
          ]}
          playsRemaining={access.playsRemaining}
          maxPlays={GAME_CONFIG.maxPlaysPerDay}
          isNewBest={isNewBest}
          personalBest={stats.bestScore}
          onPlayAgain={startGame}
          onExit={() => setLocation('/')}
        />
      )}
    </div>
  );
}
