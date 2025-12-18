import React, { useRef, useEffect, useState, useCallback } from 'react';
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
import { Home } from 'lucide-react';
import { useLocation } from 'wouter';
import rocketShip from '@assets/Untitled.png';
import { useFeatureFlags } from '@/lib/featureFlags';

export function GuardianDefender() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const inputRef = useRef({ left: false, right: false, up: false, down: false, shoot: false });
  const shipImageRef = useRef<HTMLImageElement | null>(null);
  const [phase, setPhase] = useState<'gate' | 'menu' | 'playing' | 'ended'>('gate');
  const [displayScore, setDisplayScore] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [displayLevel, setDisplayLevel] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 360, height: 540 });
  const { flags } = useFeatureFlags();

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
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let animId: number;
    const { width, height } = canvasSize;

    const loop = () => {
      const state = stateRef.current;
      if (!state) return;

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
        return;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [phase, canvasSize, isHolder, submitScore]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') inputRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') inputRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w') inputRef.current.up = true;
      if (e.key === 'ArrowDown' || e.key === 's') inputRef.current.down = true;
      if (e.key === ' ') { inputRef.current.shoot = true; e.preventDefault(); }
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
  };
  const touchEnd = (btn: 'left' | 'right' | 'up' | 'down' | 'shoot') => () => {
    inputRef.current[btn] = false;
  };

  const rankInfo = RANKS.find(r => myStats.lifetimeScore >= r.min) || RANKS[0];

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
                  <span className="text-cyan-400" data-testid="text-game-score">{displayScore.toLocaleString()}</span>
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
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-2 border-cyan-500/50 flex items-center justify-center">
                <GamepadIcon size={40} />
              </div>
              <p className="text-white font-orbitron text-xl mb-2">RETRO DEFENDER</p>
              <p className="text-gray-400 text-sm mb-4">Defend the Based Galaxy!</p>
              
              {!access.canPlay ? (
                <>
                  <p className="text-red-400 text-sm mb-2">{access.reason}</p>
                  {access.cooldownSeconds > 0 && (
                    <p className="text-cyan-400 text-3xl font-mono font-bold">{cooldown}s</p>
                  )}
                </>
              ) : (
                <Button 
                  onClick={() => setPhase('menu')} 
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold px-8 py-3 rounded-xl"
                  data-testid="button-play-now"
                >
                  <PlayIcon size={20} className="mr-2" /> PLAY NOW
                </Button>
              )}
              
              <p className="text-gray-600 text-xs mt-4">
                {access.playsRemaining} plays remaining today
              </p>
              
              {isConnected && isHolder && (
                <div className="mt-4 bg-[#6cff61]/10 border border-[#6cff61]/30 rounded-lg p-3 text-xs text-[#6cff61] max-w-xs mx-auto">
                  <p className="font-bold">HOLDER PERKS ACTIVE</p>
                  <p>+1 Life • 1.5x Score • Green Ship</p>
                </div>
              )}
              
              {!isConnected && (
                <p className="text-gray-500 text-[10px] mt-4">
                  Connect wallet & own a Guardian for bonus perks!
                </p>
              )}
              
              <div className="mt-6 pt-4 border-t border-purple-500/20">
                <p className="text-purple-400 text-xs font-orbitron mb-1">COMING 2026</p>
                <p className="text-white font-bold">Race-to-Base</p>
                <p className="text-cyan-400 text-[10px]">It will be incredible.</p>
              </div>
            </div>
          )}

          {phase === 'menu' && (
            <div className="text-center py-10">
              {holderPerks && (
                <div className="inline-flex items-center gap-2 bg-[#6cff61]/10 border border-[#6cff61]/30 rounded-full px-4 py-1.5 mb-5">
                  <ShieldIcon size={14} />
                  <span className="text-[#6cff61] text-xs font-bold tracking-wide">GUARDIAN HOLDER</span>
                </div>
              )}
              
              <p className="text-white font-orbitron text-2xl mb-2">READY TO LAUNCH</p>
              <p className="text-gray-500 text-sm mb-6">{access.playsRemaining} plays remaining today</p>
              
              {holderPerks && (
                <div className="bg-gradient-to-r from-[#6cff61]/10 to-[#00ffff]/10 border border-[#6cff61]/30 rounded-xl p-4 mb-6 max-w-xs mx-auto">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <StarIcon size={16} />
                    <p className="text-[#6cff61] font-bold text-sm">HOLDER PERKS ACTIVE</p>
                    <StarIcon size={16} />
                  </div>
                  <div className="flex justify-center gap-4 text-xs text-[#6cff61]/80">
                    <span>+1 Life</span>
                    <span>•</span>
                    <span>Green Ship</span>
                    <span>•</span>
                    <span>1.5x Score</span>
                  </div>
                </div>
              )}

              <Button 
                onClick={startGame} 
                className="bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 bg-[length:200%_100%] animate-pulse text-white font-bold px-10 py-4 text-lg rounded-xl hover:opacity-90 transition-all" 
                data-testid="button-start-game"
              >
                <PlayIcon size={24} className="mr-2" /> START GAME
              </Button>

              <p className="text-gray-600 text-[10px] mt-4">Defend the galaxy from alien invaders!</p>
              
              {myStats.gamesPlayed > 0 && (
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Your Stats</p>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
                      <ScoreIcon size={20} className="mx-auto mb-1" />
                      <p className="text-cyan-400 font-mono font-bold">{myStats.lifetimeScore.toLocaleString()}</p>
                      <p className="text-gray-600 text-[10px]">LIFETIME</p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
                      <TrophyIcon size={20} className="mx-auto mb-1" />
                      <p className="text-yellow-400 font-mono font-bold">{myStats.bestScore.toLocaleString()}</p>
                      <p className="text-gray-600 text-[10px]">BEST</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-3">
                      <GamepadIcon size={20} className="mx-auto mb-1" />
                      <p className="text-purple-400 font-mono font-bold">{myStats.gamesPlayed}</p>
                      <p className="text-gray-600 text-[10px]">GAMES</p>
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

              <div className="flex gap-3">
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
              </div>
              
              {!access.canPlay && (
                <p className="text-red-400 text-xs mt-3">{access.reason}</p>
              )}
            </div>
          )}

          <p className="text-center text-gray-700 text-[10px] mt-3 hidden md:block font-mono">
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
    </div>
  );
}

export default GuardianDefender;
