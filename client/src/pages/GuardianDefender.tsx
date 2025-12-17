import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Gamepad2, Trophy, Heart, Play, RotateCcw, ChevronLeft, ChevronRight, ChevronUp, Crosshair, ShieldCheck, Loader2 } from 'lucide-react';
import { useGameAccess } from '@/hooks/useGameAccess';
import { useGameScoresLocal, RANKS } from '@/hooks/useGameScoresLocal';
import { createGame, updateGame, applyInput, spawnAliens, getCanvasSize, GameState } from '@/lib/gameEngine';
import { render } from '@/lib/gameRenderer';

export function GuardianDefender() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const inputRef = useRef({ left: false, right: false, up: false, shoot: false });
  const [phase, setPhase] = useState<'gate' | 'menu' | 'playing' | 'ended'>('gate');
  const [displayScore, setDisplayScore] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [displayLevel, setDisplayLevel] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 360, height: 540 });

  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { checkAccess, startSession, recordPlay, isHolder, isLoading } = useGameAccess();
  const { submitScore, myStats, leaderboard } = useGameScoresLocal();

  useEffect(() => {
    const resize = () => setCanvasSize(getCanvasSize());
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (!isLoading && isConnected) {
      const access = checkAccess();
      if (access.canPlay) setPhase('menu');
    }
  }, [isLoading, isConnected, checkAccess]);

  const startGame = useCallback(async () => {
    const access = checkAccess();
    if (!access.canPlay) return;

    const started = await startSession();
    if (!started) return;

    recordPlay();
    const { width, height } = canvasSize;
    stateRef.current = createGame(width, height, isHolder);
    spawnAliens(stateRef.current, width);
    setPhase('playing');
  }, [checkAccess, startSession, recordPlay, canvasSize, isHolder]);

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

      applyInput(state, inputRef.current, width);
      updateGame(state, width, height);
      render(ctx, state, width, height, isHolder);

      setDisplayScore(state.score);
      setDisplayLives(state.lives);
      setDisplayLevel(state.level);

      if (state.gameOver || state.mode === 'complete') {
        submitScore(state.score, state.level);
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
      if (e.key === ' ') { inputRef.current.shoot = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') inputRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') inputRef.current.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w') inputRef.current.up = false;
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

  const touchStart = (btn: 'left' | 'right' | 'up' | 'shoot') => (e: React.TouchEvent) => {
    e.preventDefault();
    inputRef.current[btn] = true;
  };
  const touchEnd = (btn: 'left' | 'right' | 'up' | 'shoot') => () => {
    inputRef.current[btn] = false;
  };

  const access = checkAccess();
  const rankInfo = RANKS.find(r => myStats.lifetimeScore >= r.min) || RANKS[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f] py-8 px-4">
      <Card className="bg-black/90 border-cyan-500/30 p-4 max-w-md mx-auto relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="text-cyan-400" size={20} />
            <span className="font-orbitron text-white text-sm">GUARDIAN DEFENDER</span>
          </div>
          {phase === 'playing' && (
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-cyan-400" data-testid="text-game-score">{displayScore.toLocaleString()}</span>
              <span className="text-purple-400" data-testid="text-game-level">LV{displayLevel}</span>
              <span className="text-red-400 flex" data-testid="text-game-lives">{Array(displayLives).fill(0).map((_, i) => <Heart key={i} size={12} fill="currentColor" />)}</span>
            </div>
          )}
        </div>

        {phase === 'gate' && (
          <div className="text-center py-12">
            {isLoading ? (
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
            ) : !isConnected ? (
              <>
                <ShieldCheck className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                <p className="text-white font-orbitron mb-4">CONNECT WALLET</p>
                <Button onClick={openConnectModal} className="bg-cyan-500 text-black" data-testid="button-connect-game">CONNECT</Button>
              </>
            ) : !isHolder ? (
              <>
                <ShieldCheck className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                <p className="text-white font-orbitron mb-2">GUARDIANS ONLY</p>
                <p className="text-gray-400 text-sm mb-4">Own 1 Guardian NFT to play</p>
                <div className="flex gap-2 justify-center">
                  <a href="https://aftermint.trade/mint/based-guardians" target="_blank" rel="noopener noreferrer">
                    <Button className="bg-[#6cff61] text-black" data-testid="button-mint-nft">MINT</Button>
                  </a>
                  <Button variant="outline" className="border-cyan-500 text-cyan-400" data-testid="button-buy-nft">BUY</Button>
                </div>
              </>
            ) : !access.canPlay ? (
              <>
                <p className="text-white font-orbitron mb-2">{access.reason}</p>
                {access.cooldownSeconds > 0 && <p className="text-cyan-400 text-2xl font-mono">{access.cooldownSeconds}s</p>}
              </>
            ) : (
              <Button onClick={() => setPhase('menu')} className="bg-cyan-500 text-black" data-testid="button-continue">CONTINUE</Button>
            )}
          </div>
        )}

        {phase === 'menu' && (
          <div className="text-center py-8">
            <p className="text-[#6cff61] text-xs mb-2 flex items-center justify-center gap-1">
              <ShieldCheck size={12} /> GUARDIAN VERIFIED
            </p>
            <p className="text-white font-orbitron text-lg mb-1">READY TO LAUNCH</p>
            <p className="text-gray-400 text-xs mb-4">{access.playsRemaining} plays remaining today</p>
            
            {isHolder && (
              <div className="bg-[#6cff61]/10 border border-[#6cff61]/30 rounded p-2 mb-4 text-xs text-[#6cff61]">
                <p className="font-bold">HOLDER PERKS ACTIVE</p>
                <p>+1 Life • Green Ship • 1.5x Score</p>
              </div>
            )}

            <Button onClick={startGame} className="bg-cyan-500 text-black font-bold px-8 py-3 text-lg" data-testid="button-start-game">
              <Play size={20} className="mr-2" /> SIGN TO PLAY
            </Button>

            <p className="text-gray-500 text-[10px] mt-4">Wallet signature required to start</p>
            
            {myStats.gamesPlayed > 0 && (
              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-xs text-gray-400 mb-2">YOUR STATS</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-white/5 rounded p-2">
                    <p className="text-cyan-400 font-mono">{myStats.lifetimeScore.toLocaleString()}</p>
                    <p className="text-gray-500">Lifetime</p>
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <p className="text-yellow-400 font-mono">{myStats.bestScore.toLocaleString()}</p>
                    <p className="text-gray-500">Best</p>
                  </div>
                  <div className="bg-white/5 rounded p-2">
                    <p className="text-purple-400 font-mono">{myStats.gamesPlayed}</p>
                    <p className="text-gray-500">Games</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {(phase === 'playing' || phase === 'ended') && (
          <>
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="w-full rounded border border-cyan-500/20"
              style={{ touchAction: 'none' }}
              data-testid="canvas-game"
            />

            <div className="flex justify-between mt-3 md:hidden">
              <div className="flex gap-2">
                <Button
                  onTouchStart={touchStart('left')} onTouchEnd={touchEnd('left')}
                  className="w-14 h-14 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 active:bg-cyan-500/40"
                  data-testid="button-touch-left"
                ><ChevronLeft size={24} /></Button>
                <Button
                  onTouchStart={touchStart('right')} onTouchEnd={touchEnd('right')}
                  className="w-14 h-14 bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 active:bg-cyan-500/40"
                  data-testid="button-touch-right"
                ><ChevronRight size={24} /></Button>
              </div>
              <div className="flex gap-2">
                <Button
                  onTouchStart={touchStart('up')} onTouchEnd={touchEnd('up')}
                  className="w-14 h-14 bg-purple-500/20 border border-purple-500/50 text-purple-400 active:bg-purple-500/40"
                  data-testid="button-touch-up"
                ><ChevronUp size={24} /></Button>
                <Button
                  onTouchStart={touchStart('shoot')} onTouchEnd={touchEnd('shoot')}
                  className="w-14 h-14 bg-red-500/20 border border-red-500/50 text-red-400 active:bg-red-500/40"
                  data-testid="button-touch-shoot"
                ><Crosshair size={24} /></Button>
              </div>
            </div>
          </>
        )}

        {phase === 'ended' && (
          <div className="absolute inset-4 bg-black/95 rounded flex flex-col items-center justify-center text-center p-4">
            <p className="text-cyan-400 font-mono text-sm mb-2" data-testid="text-game-result">
              MISSION {stateRef.current?.mode === 'complete' ? 'COMPLETE' : 'FAILED'}
            </p>
            <p className="text-white font-orbitron text-2xl mb-1" data-testid="text-final-score">{displayScore.toLocaleString()}</p>
            <p className="text-gray-400 text-xs mb-4">Level {displayLevel} reached</p>
            
            <div className="bg-white/5 rounded p-3 mb-4 w-full max-w-xs">
              <p className="text-xs text-gray-400 mb-1">YOUR RANK</p>
              <p className="font-orbitron" style={{ color: rankInfo.color }} data-testid="text-player-rank">{rankInfo.title}</p>
              <p className="text-xs text-gray-500">Lifetime: {myStats.lifetimeScore.toLocaleString()}</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={startGame} disabled={!checkAccess().canPlay} className="bg-cyan-500 text-black" data-testid="button-play-again">
                <RotateCcw size={16} className="mr-1" /> AGAIN
              </Button>
              <Button variant="outline" className="border-purple-500 text-purple-400" data-testid="button-view-ranks">
                <Trophy size={16} className="mr-1" /> RANKS
              </Button>
            </div>
            
            {!checkAccess().canPlay && (
              <p className="text-red-400 text-xs mt-2">{checkAccess().reason}</p>
            )}
          </div>
        )}

        <p className="text-center text-gray-600 text-[10px] mt-2 hidden md:block">
          ← → Move • ↑ Thrust • SPACE Shoot
        </p>
      </Card>

      {leaderboard.length > 0 && phase !== 'playing' && (
        <Card className="bg-black/80 border-purple-500/30 p-4 max-w-md mx-auto mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="text-yellow-400" size={16} />
            <span className="font-orbitron text-white text-sm">LEADERBOARD</span>
          </div>
          <div className="space-y-1">
            {leaderboard.slice(0, 5).map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className={`w-5 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                    {i + 1}
                  </span>
                  <span className="text-gray-400 font-mono">
                    {entry.wallet.slice(0, 6)}...{entry.wallet.slice(-4)}
                  </span>
                </div>
                <span className="text-cyan-400 font-mono">{entry.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default GuardianDefender;
