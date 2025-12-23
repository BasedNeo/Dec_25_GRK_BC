import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useGameAccess } from '@/hooks/useGameAccess';
import { useGameScoresLocal, RANKS } from '@/hooks/useGameScoresLocal';
import { createGame, updateGame, applyInput, spawnWave, updateLander, applyLanderInput, getCanvasSize, GameState } from '@/lib/gameEngine';
import { render } from '@/lib/gameRenderer';
import { 
  RocketIcon, TrophyIcon, HeartIcon, PlayIcon, RestartIcon, 
  ShieldIcon, ControlLeftIcon, ControlRightIcon, ControlUpIcon, 
  FireIcon, GamepadIcon, LoadingIcon, LevelIcon, ScoreIcon, StarIcon 
} from '@/game/components/GameIcons';
import { Navbar } from '@/components/Navbar';
import { Home, Shield } from 'lucide-react';
import { useLocation } from 'wouter';
import rocketShip from '@assets/Untitled.png';
import { useFeatureFlags } from '@/lib/featureFlags';
import { isMobile, haptic } from '@/lib/mobileUtils';

const LoadingScreen = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-gradient-to-b from-indigo-900 via-purple-900 to-black flex items-center justify-center z-50"
  >
    <div className="text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-20 h-20 mx-auto mb-6"
      >
        <Shield className="w-full h-full text-cyan-400" />
      </motion.div>
      <motion.h2
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-2xl font-bold text-cyan-400 font-orbitron"
      >
        LOADING GAME...
      </motion.h2>
      <div className="mt-4 flex gap-2 justify-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            className="w-2 h-2 bg-cyan-400 rounded-full"
          />
        ))}
      </div>
    </div>
  </motion.div>
);

const AnimatedScore = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (value === displayValue) return;
    const duration = 500;
    const steps = 20;
    const stepValue = (value - displayValue) / steps;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    const startValue = displayValue;
    const interval = setInterval(() => {
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.round(startValue + stepValue * currentStep));
        currentStep++;
      }
    }, stepDuration);
    
    return () => clearInterval(interval);
  }, [value]);
  
  return <span>{displayValue.toLocaleString()}</span>;
};

export function GuardianDefender() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const inputRef = useRef({ left: false, right: false, up: false, down: false, shoot: false });
  const shipImageRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [phase, setPhase] = useState<'gate' | 'menu' | 'playing' | 'ended'>('gate');
  const [displayScore, setDisplayScore] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [displayLevel, setDisplayLevel] = useState(1);
  const [showLanderControls, setShowLanderControls] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 360, height: 540 });
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0 });
  const [gameLoading, setGameLoading] = useState(true);
  const { flags } = useFeatureFlags();

  useEffect(() => {
    loadingTimerRef.current = setTimeout(() => setGameLoading(false), 800);
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
    };
  }, []);

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

  // Load ship image
  useEffect(() => {
    const img = new Image();
    img.src = rocketShip;
    shipImageRef.current = img;
  }, []);

  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { access, recordPlay, isHolder, isLoading, cooldown, holderPerks } = useGameAccess();
  const { submitScore, myStats, leaderboard } = useGameScoresLocal();

  useEffect(() => {
    const resize = () => setCanvasSize(getCanvasSize());
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const startGame = useCallback(async () => {
    if (!access.canPlay) return;

    recordPlay();
    const { width, height } = canvasSize;
    stateRef.current = createGame(width, height, holderPerks?.extraLife || false);
    spawnWave(stateRef.current, width);
    setPhase('playing');
  }, [access.canPlay, recordPlay, canvasSize, holderPerks]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;
    
    // High DPI canvas scaling for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = canvasSize;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
    
    // Premium rendering settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let animId: number;

    const loop = () => {
      const state = stateRef.current;
      if (!state) return;

      if (state.phase === 'landerReady') {
        render(ctx, state, width, height, isHolder, shipImageRef.current || undefined);
        setShowLanderControls(true);
        setDisplayScore(state.score);
        setDisplayLives(state.player.lives);
        setDisplayLevel(state.wave);
        animId = requestAnimationFrame(loop);
        return;
      }

      if (state.phase === 'lander') {
        applyLanderInput(state, inputRef.current, width);
        updateLander(state, width, height);
      } else {
        applyInput(state, inputRef.current, width);
        updateGame(state, width, height);
      }
      render(ctx, state, width, height, isHolder, shipImageRef.current || undefined);

      setDisplayScore(state.score);
      setDisplayLives(state.player.lives);
      setDisplayLevel(state.wave);

      if (state.phase === 'gameOver' || state.phase === 'complete') {
        submitScore(state.score, state.wave);
        setPhase('ended');
        animationFrameRef.current = null;
        return;
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [phase, canvasSize, isHolder, submitScore]);

  const landerCheatRef = useRef<{ lastL: number; count: number }>({ lastL: 0, count: 0 });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') inputRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') inputRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w') inputRef.current.up = true;
      if (e.key === 'ArrowDown' || e.key === 's') inputRef.current.down = true;
      if (e.key === ' ') { inputRef.current.shoot = true; e.preventDefault(); }
      if ((e.key === 'l' || e.key === 'L') && e.shiftKey) {
        const now = Date.now();
        if (now - landerCheatRef.current.lastL < 500) {
          landerCheatRef.current.count++;
        } else {
          landerCheatRef.current.count = 1;
        }
        landerCheatRef.current.lastL = now;
        if (landerCheatRef.current.count >= 2) {
          const state = stateRef.current;
          if (state && state.phase === 'playing') {
            state.phase = 'landerReady';
            state.wave = 4;
            state.player.pos = { x: canvasSize.width / 2, y: 60 };
            state.player.vel = { x: 0, y: 0 };
            state.player.fuel = 100;
            state.aliens = [];
            state.bullets = [];
          }
          landerCheatRef.current.count = 0;
        }
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') inputRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') inputRef.current.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w') inputRef.current.up = false;
      if (e.key === 'ArrowDown' || e.key === 's') inputRef.current.down = false;
      if (e.key === ' ') inputRef.current.shoot = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    if (phase === 'playing') {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
    return () => { document.body.style.overflow = ''; document.body.style.touchAction = ''; };
  }, [phase]);

  const touchStart = (btn: 'left' | 'right' | 'up' | 'down' | 'shoot') => (e: React.TouchEvent) => {
    e.preventDefault();
    inputRef.current[btn] = true;
    if (btn === 'shoot') {
      haptic.medium();
    } else {
      haptic.light();
    }
  };
  const touchEnd = (btn: 'left' | 'right' | 'up' | 'down' | 'shoot') => () => {
    inputRef.current[btn] = false;
  };

  const rankInfo = RANKS.find(r => myStats.lifetimeScore >= r.min) || RANKS[0];

  const startLander = useCallback(() => {
    const state = stateRef.current;
    if (state && state.phase === 'landerReady') {
      state.phase = 'lander';
      setShowLanderControls(false);
    }
  }, []);

  return (
    <>
      <AnimatePresence mode="wait">
        {gameLoading && <LoadingScreen />}
      </AnimatePresence>
      <motion.div 
        key="game-screen"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="min-h-screen bg-gradient-to-b from-[#0a0015] via-[#050510] to-[#0a0020] overflow-y-auto pb-24"
        style={{ transform: `translate(${screenShake.x}px, ${screenShake.y}px)` }}
      >
        <div className="absolute top-4 left-4 z-20">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-cyan-500/30">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-400 font-orbitron">GUARDIAN</span>
          </div>
        </div>
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
        
        <Card className="bg-black/90 border-cyan-500/30 backdrop-blur-xl p-5 max-w-md mx-auto relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RocketIcon size={24} />
              <span className="font-orbitron text-white text-sm tracking-wider">RETRO DEFENDER</span>
            </div>
            {phase === 'playing' && (
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1">
                  <ScoreIcon size={14} />
                  <span className="text-cyan-400" data-testid="text-game-score"><AnimatedScore value={displayScore} /></span>
                </div>
                <div className="flex items-center gap-1">
                  <LevelIcon size={14} />
                  <span className="text-purple-400" data-testid="text-game-level">LV{displayLevel}</span>
                </div>
                <div className="flex items-center gap-0.5" data-testid="text-game-lives">
                  {Array(displayLives).fill(0).map((_, i) => <HeartIcon key={i} size={14} />)}
                </div>
              </div>
            )}
          </div>

          {phase === 'gate' && (
            <div className="text-center py-6 relative">
              <style>{`
                @keyframes hangar-sweep {
                  0% { transform: translateX(-100%) skewX(-15deg); }
                  100% { transform: translateX(200%) skewX(-15deg); }
                }
                @keyframes ship-hover {
                  0%, 100% { transform: translateY(0) rotate(-2deg); }
                  50% { transform: translateY(-5px) rotate(2deg); }
                }
                @keyframes status-blink {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.4; }
                }
                @keyframes hangar-lights {
                  0%, 100% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                }
              `}</style>
              
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-500/40 to-cyan-500/0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400 to-transparent w-1/4" style={{ animation: 'hangar-sweep 3s linear infinite' }} />
              </div>
              
              <div className="w-24 h-20 mx-auto mb-4 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/30" />
                <div className="absolute inset-2 flex items-center justify-center" style={{ animation: 'ship-hover 3s ease-in-out infinite' }}>
                  <img src={rocketShip} alt="Ship" className="w-10 h-10 object-contain" loading="lazy" decoding="async" />
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-cyan-500/20 text-cyan-400 text-[8px] font-mono px-2 py-0.5 rounded border border-cyan-500/30" style={{ animation: 'status-blink 2s ease-in-out infinite' }}>
                  HANGAR A7
                </div>
              </div>
              
              <p className="text-white font-orbitron text-xl mb-1">RETRO DEFENDER</p>
              <p className="text-cyan-400/60 text-xs font-mono tracking-widest mb-4">HANGAR READINESS • STANDBY</p>
              
              {!access.canPlay ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
                  <p className="text-red-400 text-sm mb-1">{access.reason}</p>
                  {access.cooldownSeconds > 0 && (
                    <p className="text-cyan-400 text-2xl font-mono font-bold">{cooldown}s</p>
                  )}
                </div>
              ) : (
                <motion.div 
                  className="relative inline-block"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    onClick={() => setPhase('menu')} 
                    className="relative bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold px-8 py-3 rounded-xl border-0"
                    data-testid="button-play-now"
                  >
                    <PlayIcon size={20} className="mr-2" /> ENTER HANGAR
                  </Button>
                </motion.div>
              )}
              
              <p className="text-gray-600 text-xs mt-4 font-mono">
                {access.playsRemaining} PLAYS REMAINING
              </p>
              
              {isConnected && isHolder && (
                <div className="mt-4 bg-[#6cff61]/10 border border-[#6cff61]/30 rounded-lg p-2.5 text-xs text-[#6cff61] max-w-xs mx-auto">
                  <div className="flex items-center justify-center gap-2">
                    <ShieldIcon size={12} />
                    <span className="font-bold">ELITE CLEARANCE</span>
                  </div>
                  <p className="text-[10px] opacity-80 mt-1">+1 Life • 1.5x Score • Green Ship</p>
                </div>
              )}
              
              {!isConnected && (
                <p className="text-gray-500 text-[10px] mt-4 font-mono">
                  Wallet + Guardian NFT = Elite Perks
                </p>
              )}
              
              <div className="mt-5 pt-4 border-t border-purple-500/20">
                <p className="text-purple-400/60 text-[10px] font-mono mb-1">UPCOMING MISSION</p>
                <p className="text-white font-bold text-sm">Race-to-Base</p>
                <p className="text-cyan-400/50 text-[10px]">2026</p>
              </div>
            </div>
          )}

          {phase === 'menu' && (
            <div className="text-center py-6 relative">
              <style>{`
                @keyframes launch-ready {
                  0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.2); }
                  50% { box-shadow: 0 0 40px rgba(0, 255, 255, 0.4); }
                }
                @keyframes systems-check {
                  0% { width: 0%; }
                  100% { width: 100%; }
                }
              `}</style>
              
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              
              {holderPerks && (
                <div className="inline-flex items-center gap-2 bg-[#6cff61]/10 border border-[#6cff61]/30 rounded-full px-3 py-1 mb-4">
                  <span className="w-1.5 h-1.5 bg-[#6cff61] rounded-full animate-pulse" />
                  <span className="text-[#6cff61] text-[10px] font-mono tracking-wide">ELITE PILOT</span>
                </div>
              )}
              
              <p className="text-white font-orbitron text-2xl mb-1">SYSTEMS READY</p>
              <p className="text-cyan-400/60 text-xs font-mono mb-5">{access.playsRemaining} SORTIES REMAINING</p>
              
              {holderPerks && (
                <div className="bg-gradient-to-r from-[#6cff61]/5 to-[#00ffff]/5 border border-[#6cff61]/20 rounded-xl p-3 mb-5 max-w-xs mx-auto">
                  <div className="flex items-center justify-center gap-3 text-[10px]">
                    <div className="flex flex-col items-center">
                      <HeartIcon size={14} />
                      <span className="text-[#6cff61] mt-0.5">+1 LIFE</span>
                    </div>
                    <div className="w-px h-6 bg-[#6cff61]/30" />
                    <div className="flex flex-col items-center">
                      <RocketIcon size={14} />
                      <span className="text-[#6cff61] mt-0.5">ELITE SHIP</span>
                    </div>
                    <div className="w-px h-6 bg-[#6cff61]/30" />
                    <div className="flex flex-col items-center">
                      <ScoreIcon size={14} />
                      <span className="text-[#6cff61] mt-0.5">1.5x PTS</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="relative inline-block group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 rounded-xl blur opacity-40 group-hover:opacity-70 transition-opacity" />
                <Button 
                  onClick={startGame} 
                  className="relative bg-gradient-to-r from-cyan-600 via-purple-600 to-cyan-600 text-white font-bold px-10 py-4 text-lg rounded-xl border-0 shadow-lg shadow-cyan-500/20" 
                  style={{ animation: 'launch-ready 2s ease-in-out infinite' }}
                  data-testid="button-start-game"
                >
                  <RocketIcon size={20} className="mr-2" /> LAUNCH
                </Button>
              </div>

              <p className="text-gray-600 text-[10px] mt-4 font-mono">Defend the Based Galaxy!</p>
              
              {myStats.gamesPlayed > 0 && (
                <div className="mt-6 pt-4 border-t border-cyan-500/20">
                  <p className="text-[10px] text-gray-600 mb-3 font-mono tracking-widest">PILOT RECORD</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-lg p-2">
                      <ScoreIcon size={16} className="mx-auto mb-1" />
                      <p className="text-cyan-400 font-mono font-bold text-sm">{myStats.lifetimeScore.toLocaleString()}</p>
                      <p className="text-gray-600 text-[8px]">TOTAL</p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-lg p-2">
                      <TrophyIcon size={16} className="mx-auto mb-1" />
                      <p className="text-yellow-400 font-mono font-bold text-sm">{myStats.bestScore.toLocaleString()}</p>
                      <p className="text-gray-600 text-[8px]">BEST</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-lg p-2">
                      <GamepadIcon size={16} className="mx-auto mb-1" />
                      <p className="text-purple-400 font-mono font-bold text-sm">{myStats.gamesPlayed}</p>
                      <p className="text-gray-600 text-[8px]">SORTIES</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {(phase === 'playing' || phase === 'ended') && (
            <>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  className="w-full rounded-xl border-2 border-cyan-500/30 shadow-[0_0_30px_rgba(0,255,255,0.2)]"
                  style={{ touchAction: 'none' }}
                  data-testid="canvas-game"
                />
                
                {showLanderControls && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl z-10">
                    <div className="bg-gradient-to-b from-[#1a0040] to-[#0a0020] border-2 border-cyan-500/50 rounded-xl p-6 max-w-xs mx-4 text-center shadow-[0_0_40px_rgba(0,255,255,0.3)]">
                      <h2 className="text-cyan-400 font-orbitron text-xl mb-4">LUNAR LANDER</h2>
                      
                      <div className="bg-black/50 rounded-lg p-4 mb-4 text-left">
                        <p className="text-white text-sm font-bold mb-3">CONTROLS:</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-3">
                            <span className="bg-purple-500/30 border border-purple-500/50 px-2 py-1 rounded text-purple-300 font-mono text-xs">↑ / W</span>
                            <span className="text-gray-300">Thrust (slow down)</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="bg-cyan-500/30 border border-cyan-500/50 px-2 py-1 rounded text-cyan-300 font-mono text-xs">← →</span>
                            <span className="text-gray-300">Move left/right</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                        <p className="text-yellow-400 text-xs">
                          <strong>GOAL:</strong> Land slowly on the pad!<br/>
                          <span className="text-yellow-300/70">Keep velocity under 1.5 to survive</span>
                        </p>
                      </div>
                      
                      <Button
                        onClick={startLander}
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-all w-full"
                        data-testid="button-start-lander"
                      >
                        START LANDING
                      </Button>
                    </div>
                  </div>
                )}
                
              </div>

              <div className="flex justify-between mt-4 md:hidden">
                <div className="flex gap-2">
                  <Button
                    onTouchStart={touchStart('left')} onTouchEnd={touchEnd('left')}
                    className="w-16 h-16 bg-cyan-500/10 border-2 border-cyan-500/40 rounded-xl text-cyan-400 active:bg-cyan-500/30 active:scale-95 transition-all"
                    data-testid="button-touch-left"
                  >
                    <ControlLeftIcon size={28} />
                  </Button>
                  <Button
                    onTouchStart={touchStart('right')} onTouchEnd={touchEnd('right')}
                    className="w-16 h-16 bg-cyan-500/10 border-2 border-cyan-500/40 rounded-xl text-cyan-400 active:bg-cyan-500/30 active:scale-95 transition-all"
                    data-testid="button-touch-right"
                  >
                    <ControlRightIcon size={28} />
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onTouchStart={touchStart('up')} onTouchEnd={touchEnd('up')}
                    className="w-16 h-12 bg-purple-500/10 border-2 border-purple-500/40 rounded-xl text-purple-400 active:bg-purple-500/30 active:scale-95 transition-all"
                    data-testid="button-touch-up"
                  >
                    <ControlUpIcon size={24} />
                  </Button>
                  <Button
                    onTouchStart={touchStart('down')} onTouchEnd={touchEnd('down')}
                    className="w-16 h-12 bg-purple-500/10 border-2 border-purple-500/40 rounded-xl text-purple-400 active:bg-purple-500/30 active:scale-95 transition-all"
                    data-testid="button-touch-down"
                  >
                    <ControlUpIcon size={24} className="rotate-180" />
                  </Button>
                </div>
                <Button
                  onTouchStart={touchStart('shoot')} onTouchEnd={touchEnd('shoot')}
                  className="w-16 h-16 bg-red-500/10 border-2 border-red-500/40 rounded-xl text-red-400 active:bg-red-500/30 active:scale-95 transition-all"
                  data-testid="button-touch-shoot"
                >
                  <FireIcon size={28} />
                </Button>
              </div>
            </>
          )}

          {phase === 'ended' && (
            <div className="absolute inset-4 bg-black/98 backdrop-blur-xl rounded-2xl flex flex-col items-center justify-center text-center p-6 border border-cyan-500/20">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-cyan-500/30">
                {stateRef.current?.phase === 'complete' ? <TrophyIcon size={32} /> : <RocketIcon size={32} />}
              </div>
              
              <p className="text-cyan-400 font-mono text-sm mb-1 tracking-wider" data-testid="text-game-result">
                MISSION {stateRef.current?.phase === 'complete' ? 'COMPLETE' : 'FAILED'}
              </p>
              <p className="text-white font-orbitron text-3xl mb-1" data-testid="text-final-score">{displayScore.toLocaleString()}</p>
              <p className="text-gray-500 text-sm mb-5">Wave {displayLevel} reached</p>
              
              <div className="bg-gradient-to-r from-white/5 to-white/10 border border-white/10 rounded-xl p-4 mb-5 w-full max-w-xs">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Your Rank</p>
                <div className="flex items-center justify-center gap-2">
                  <StarIcon size={20} />
                  <p className="font-orbitron text-lg" style={{ color: rankInfo.color }} data-testid="text-player-rank">{rankInfo.title}</p>
                  <StarIcon size={20} />
                </div>
                <p className="text-xs text-gray-600 mt-1">Lifetime: {myStats.lifetimeScore.toLocaleString()}</p>
              </div>

              <div className="flex gap-3 flex-wrap justify-center">
                <Button 
                  onClick={startGame} 
                  disabled={!access.canPlay} 
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 text-black font-bold px-6 py-3 rounded-xl disabled:opacity-50" 
                  data-testid="button-play-again"
                >
                  <RestartIcon size={18} className="mr-2" /> PLAY AGAIN
                </Button>
                <Button 
                  variant="outline" 
                  className="border-purple-500/50 text-purple-400 px-5 py-3 rounded-xl hover:bg-purple-500/10" 
                  data-testid="button-view-ranks"
                >
                  <TrophyIcon size={18} className="mr-2" /> RANKS
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/games')}
                  className="border-white/30 text-white px-5 py-3 rounded-xl hover:bg-white/10" 
                  data-testid="button-return-arcade"
                >
                  <Home size={18} className="mr-2" /> RETURN TO ARCADE
                </Button>
              </div>
              
              {!access.canPlay && (
                <p className="text-red-400 text-xs mt-3">{access.reason}</p>
              )}
            </div>
          )}

          <p className="text-center text-gray-500 text-sm mt-3 hidden md:block font-mono">
            ← → MOVE  •  ↑ THRUST  •  SPACE FIRE
          </p>
        </div>
      </Card>

      {leaderboard.length > 0 && phase !== 'playing' && (
        <Card className="bg-black/80 border-purple-500/30 backdrop-blur-xl p-5 max-w-md mx-auto mt-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-yellow-500/5 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <TrophyIcon size={20} />
              <span className="font-orbitron text-white text-sm tracking-wider">TOP PILOTS</span>
            </div>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-2 px-3 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' : 
                      i === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/50' : 
                      i === 2 ? 'bg-amber-600/20 text-amber-500 border border-amber-500/50' : 
                      'bg-white/5 text-gray-500 border border-white/10'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-gray-400 font-mono text-xs">
                      {entry.wallet.slice(0, 6)}...{entry.wallet.slice(-4)}
                    </span>
                  </div>
                  <span className="text-cyan-400 font-mono font-bold">{entry.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
        </div>
      </motion.div>
    </>
  );
}

export default GuardianDefender;
