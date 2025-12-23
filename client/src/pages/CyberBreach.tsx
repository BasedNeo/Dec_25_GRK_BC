import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
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
import { TerminalSelector } from '@/components/game/CosmeticSelector';
import { useUnlockables, TERMINAL_SKINS, TerminalSkin } from '@/hooks/useUnlockables';
import { Play, Home, Trophy, Clock, Target, Palette } from 'lucide-react';
import { useGameMusic } from '@/hooks/useGameMusic';
import { MusicControls } from '@/components/game/MusicControls';
import { isMobile, haptic } from '@/lib/mobileUtils';

interface GameCard {
  id: number;
  symbol: string;
  isFlipped: boolean;
  isMatched: boolean;
}

type GamePhase = 'menu' | 'playing' | 'gameover';

const CARD_SYMBOLS = ['⚡', '🛡️', '💾', '📡', '🔒', '🔑', '💿', '⌨️'];

const LEVEL_CONFIGS = [
  { pairs: 6, time: 90, gridCols: 4 },
  { pairs: 8, time: 90, gridCols: 4 },
  { pairs: 8, time: 75, gridCols: 4 },
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function createCards(level: number): GameCard[] {
  const config = LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)];
  const symbols = CARD_SYMBOLS.slice(0, config.pairs);
  const cards: GameCard[] = [];
  
  symbols.forEach((sym, idx) => {
    cards.push({ id: idx * 2, symbol: sym, isFlipped: false, isMatched: false });
    cards.push({ id: idx * 2 + 1, symbol: sym, isFlipped: false, isMatched: false });
  });
  
  return shuffleArray(cards);
}

export default function CyberBreach() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { submitScore, myStats, refreshStats } = useGameScoresLocal();
  const { access, recordPlay, isLoading: nftLoading } = useGameAccess();
  const { selected, updateStats } = useUnlockables();
  const [showTerminalSelector, setShowTerminalSelector] = useState(false);
  const currentTerminal = useMemo(() => TERMINAL_SKINS[selected.terminal], [selected.terminal]);
  const music = useGameMusic();

  const gameConfig = useMemo(() => getGameConfig('cyber-breach'), []);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);

  const [gamePhase, setGamePhase] = useState<GamePhase>('menu');
  const [cards, setCards] = useState<GameCard[]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [level, setLevel] = useState(1);
  const [isChecking, setIsChecking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [introText, setIntroText] = useState('');
  const [showAccessGranted, setShowAccessGranted] = useState(false);
  const [chain, setChain] = useState(0);
  const [lastMatchTime, setLastMatchTime] = useState(0);
  const [speedBonus, setSpeedBonus] = useState<string | null>(null);
  const [showLightningBreach, setShowLightningBreach] = useState(false);
  const levelStartTimeRef = useRef<number>(0);

  const stats = useMemo(() => ({
    gamesPlayed: myStats.totalGames || 0,
    bestScore: myStats.bestScore || 0,
    totalScore: myStats.lifetimeScore || 0,
  }), [myStats]);

  const currentConfig = useMemo(() => LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)], [level]);

  // Responsive card sizing - must be before conditional returns
  const [cardSize, setCardSize] = useState(80);
  
  useEffect(() => {
    const calculateCardSize = () => {
      // 92% of true viewport for ≥90% coverage
      const gap = 4;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      const cols = currentConfig.gridCols;
      const totalCards = currentConfig.pairs * 2;
      const rows = Math.ceil(totalCards / cols);
      // Use 92% of viewport
      const maxCardWidth = ((vw * 0.92) - (cols - 1) * gap) / cols;
      const maxCardHeight = ((vh * 0.92) - (rows - 1) * gap) / rows;
      setCardSize(Math.max(1, Math.min(maxCardWidth, maxCardHeight)));
    };
    
    calculateCardSize();
    window.addEventListener('resize', calculateCardSize);
    return () => window.removeEventListener('resize', calculateCardSize);
  }, [currentConfig.gridCols, currentConfig.pairs]);

  // Animated circuit background - before conditional returns
  useEffect(() => {
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;
    
    const resize = () => {
      bgCanvas.width = window.innerWidth;
      bgCanvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    
    const nodes: { x: number; y: number; pulse: number }[] = [];
    for (let i = 0; i < 30; i++) {
      nodes.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        pulse: Math.random() * Math.PI * 2
      });
    }
    
    let animId: number;
    const animate = () => {
      ctx.fillStyle = '#020208';
      ctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < bgCanvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, bgCanvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < bgCanvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(bgCanvas.width, y);
        ctx.stroke();
      }
      
      nodes.forEach(node => {
        node.pulse += 0.02;
        const intensity = Math.sin(node.pulse) * 0.3 + 0.4;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 136, ${intensity})`;
        ctx.shadowColor = '#00FF88';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      
      animId = requestAnimationFrame(animate);
    };
    animate();
    
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const playSound = useCallback((type: 'flip' | 'match' | 'nomatch' | 'victory' | 'gameover') => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      // Safari requires resume after user interaction
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      switch (type) {
        case 'flip':
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          osc.frequency.setValueAtTime(800, ctx.currentTime + 0.05);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
          break;
        case 'match':
          osc.frequency.setValueAtTime(500, ctx.currentTime);
          osc.frequency.setValueAtTime(700, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(900, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
          break;
        case 'nomatch':
          osc.frequency.setValueAtTime(300, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
          break;
        case 'victory':
          osc.frequency.setValueAtTime(400, ctx.currentTime);
          osc.frequency.setValueAtTime(600, ctx.currentTime + 0.15);
          osc.frequency.setValueAtTime(800, ctx.currentTime + 0.3);
          osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.45);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
          osc.start();
          osc.stop(ctx.currentTime + 0.6);
          break;
        case 'gameover':
          osc.frequency.setValueAtTime(300, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
          break;
      }
    } catch (e) {}
  }, [soundEnabled]);

  const endGame = useCallback((victory: boolean) => {
    const playerAddress = address || 'anonymous';
    const today = new Date().toDateString();
    const dailyData = GameStorageManager.getDailyData('cyber-breach', playerAddress, today);
    GameStorageManager.updateDailyData('cyber-breach', playerAddress, today, {
      gamesPlayed: dailyData.gamesPlayed + 1,
      pointsEarned: dailyData.pointsEarned + score
    });
    if (address && score > 0) {
      submitScore(score, level);
      refreshStats();
    }
    // Track unlocks
    updateStats('cyber-breach', { maxLevel: level });
    music.stopMusic();
    trackEvent('game_complete', 'cyber-breach', String(level), score);
  }, [address, score, level, submitScore, refreshStats, updateStats, music]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          playSound('gameover');
          if (isMobile && hapticEnabled) haptic.gameOver();
          setGamePhase('gameover');
          return 0;
        }
        
        // Dynamic music - tension builds as time drops
        const timePercent = t / currentConfig.time;
        music.setGameIntensity(1 - timePercent);
        music.setDanger(t <= 15, t <= 10 ? 0.8 : 0.5);
        
        return t - 1;
      });
    }, 1000);
  }, [playSound, currentConfig.time, music]);

  const handleCardClick = useCallback((cardId: number) => {
    if (isChecking) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    const flippedCards = cards.filter(c => c.isFlipped && !c.isMatched);
    if (flippedCards.length >= 2) return;

    playSound('flip');
    if (isMobile && hapticEnabled) haptic.cardFlip();

    const newCards = cards.map(c => c.id === cardId ? { ...c, isFlipped: true } : c);
    setCards(newCards);

    const nowFlipped = newCards.filter(c => c.isFlipped && !c.isMatched);
    
    if (nowFlipped.length === 2) {
      setIsChecking(true);
      setMoves(m => m + 1);

      const [first, second] = nowFlipped;
      
      if (first.symbol === second.symbol) {
        setTimeout(() => {
          playSound('match');
          if (isMobile && hapticEnabled) haptic.matchFound();
          
          const matchedCards = newCards.map(c => 
            c.symbol === first.symbol ? { ...c, isMatched: true } : c
          );
          setCards(matchedCards);
          setMatchedPairs(p => p + 1);
          
          // Chain system - consecutive matches
          const now = Date.now();
          const timeSinceLastMatch = now - lastMatchTime;
          setLastMatchTime(now);
          
          setChain(prevChain => {
            const newChain = prevChain + 1;
            
            // Speed bonus for matches under 2 seconds
            if (timeSinceLastMatch < 2000 && lastMatchTime > 0) {
              const speedPts = 25 + newChain * 5;
              setSpeedBonus(`SPEED BONUS +${speedPts}`);
              setScore(s => s + speedPts);
              setTimeout(() => setSpeedBonus(null), 1000);
            }
            
            return newChain;
          });
          
          const timeBonus = Math.floor(timeLeft / 10);
          const moveBonus = Math.max(0, 10 - moves);
          const chainBonus = chain * 10; // +10 per chain level
          const points = 100 + timeBonus * 10 + moveBonus * 5 + chainBonus;
          setScore(s => s + points);
          
          const newMatchedCount = matchedCards.filter(c => c.isMatched).length / 2;
          if (newMatchedCount === currentConfig.pairs) {
            if (timerRef.current) clearInterval(timerRef.current);
            const finalBonus = timeLeft * 5;
            setScore(s => s + finalBonus);
            
            // Lightning Breach bonus for fast level completion (under 15 seconds for the level)
            const levelTime = (Date.now() - levelStartTimeRef.current) / 1000;
            if (levelTime < 15) {
              setShowLightningBreach(true);
              setScore(s => s + 500);
              if (isMobile && hapticEnabled) haptic.breachComplete();
              setTimeout(() => setShowLightningBreach(false), 1500);
            }
            
            if (level < 3) {
              setTimeout(() => {
                setLevel(l => l + 1);
                const nextConfig = LEVEL_CONFIGS[Math.min(level, LEVEL_CONFIGS.length - 1)];
                setCards(createCards(level + 1));
                setTimeLeft(nextConfig.time);
                setMatchedPairs(0);
                setMoves(0);
                setChain(0);
                levelStartTimeRef.current = Date.now();
                startTimer();
              }, 1500);
            } else {
              playSound('match');
              if (isMobile && hapticEnabled) haptic.breachComplete();
              setShowAccessGranted(true);
              setTimeout(() => {
                setShowAccessGranted(false);
                setGamePhase('gameover');
              }, 2000);
            }
          }
          setIsChecking(false);
        }, 400);
      } else {
        setTimeout(() => {
          playSound('nomatch');
          if (isMobile && hapticEnabled) haptic.noMatch();
          
          // Reset chain on mismatch
          setChain(0);
          
          const resetCards = newCards.map(c => 
            (c.id === first.id || c.id === second.id) ? { ...c, isFlipped: false } : c
          );
          setCards(resetCards);
          setIsChecking(false);
        }, 800);
      }
    }
  }, [cards, isChecking, moves, timeLeft, currentConfig.pairs, level, playSound, startTimer, hapticEnabled, chain, lastMatchTime]);

  useEffect(() => {
    if (gamePhase === 'gameover') {
      endGame(score > 0);
    }
  }, [gamePhase, endGame]);

  const startGame = useCallback(() => {
    if (!address) {
      toast({ title: "Wallet Required", description: "Connect your wallet to play", variant: "destructive" });
      return;
    }
    if (!access.canPlay) {
      toast({ title: "No Plays Left", description: access.reason || "Come back tomorrow!", variant: "destructive" });
      return;
    }
    const dailyLimits = GameStorageManager.checkDailyLimits('cyber-breach', address, gameConfig.maxPlaysPerDay, 50000);
    if (!dailyLimits.canPlay) {
      toast({ title: "Daily Limit Reached", description: dailyLimits.reason || "Come back tomorrow!", variant: "destructive" });
      return;
    }
    
    recordPlay();
    setLevel(1);
    setCards(createCards(1));
    setScore(0);
    setMoves(0);
    setMatchedPairs(0);
    setChain(0);
    setLastMatchTime(0);
    setSpeedBonus(null);
    setShowLightningBreach(false);
    levelStartTimeRef.current = Date.now();
    setTimeLeft(LEVEL_CONFIGS[0].time);
    setIsChecking(false);
    setShowIntro(true);
    setIntroText('');
    setGamePhase('playing');
    
    const introMessage = 'INITIATING BREACH...';
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < introMessage.length) {
        setIntroText(introMessage.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => {
          setShowIntro(false);
          startTimer();
        }, 500);
      }
    }, 80);
    
    music.startMusic();
    trackEvent('game_start', 'cyber-breach', '', 0);
  }, [address, access.canPlay, access.reason, gameConfig.maxPlaysPerDay, toast, recordPlay, startTimer, music]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Pause timer when tab is hidden
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const handleVisibilityChange = () => {
      if (document.hidden && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      } else if (!document.hidden && !timerRef.current && timeLeft > 0) {
        startTimer();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [gamePhase, timeLeft, startTimer]);

  if (nftLoading) {
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <section className="py-6 min-h-screen bg-gradient-to-b from-black via-purple-900/20 to-black flex items-center justify-center pt-16">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-green-400 font-orbitron">Loading Game...</p>
          </div>
        </section>
      </>
    );
  }

  if (gamePhase === 'menu') {
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <section className="py-6 min-h-screen bg-gradient-to-b from-black via-green-900/20 to-black pt-16 pb-24">
          <div className="max-w-md mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
              <h1 className="text-4xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500 mb-2">
                CYBER BREACH
              </h1>
              <p className="text-gray-400">Match the codes. Breach the system. Beat the clock.</p>
            </motion.div>

            <Card className="bg-black/60 border-green-500/30 backdrop-blur-xl p-6 mb-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg mb-4">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-bold">Best: {stats.bestScore.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center mb-6">
                  <div><div className="text-2xl text-green-400 font-bold">{stats.gamesPlayed}</div><div className="text-xs text-gray-500">Games Played</div></div>
                  <div><div className="text-2xl text-cyan-400 font-bold">{stats.totalScore.toLocaleString()}</div><div className="text-xs text-gray-500">Total Score</div></div>
                </div>
              </div>

              <div className="mb-4 p-4 bg-white/5 rounded-lg">
                <h3 className="text-sm font-bold text-green-400 mb-2">HOW TO PLAY</h3>
                <div className="text-xs text-gray-400 space-y-1">
                  <p>• Tap cards to reveal symbols</p>
                  <p>• Match pairs before time runs out</p>
                  <p>• <span className="text-cyan-400">CHAIN</span> = consecutive matches (+10 pts per level)</p>
                  <p>• <span className="text-yellow-400">SPEED BONUS</span> = match within 2 sec (+25 pts)</p>
                  <p>• Complete all 3 levels to win</p>
                </div>
              </div>

              <div className="mb-4 p-4 bg-white/5 rounded-lg">
                <h3 className="text-sm font-bold text-green-400 mb-3">AUDIO</h3>
                <MusicControls
                  masterVolume={music.prefs.masterVolume}
                  musicEnabled={music.prefs.musicEnabled}
                  sfxEnabled={music.prefs.sfxEnabled}
                  onVolumeChange={music.setMasterVolume}
                  onMusicToggle={music.setMusicEnabled}
                  onSfxToggle={(enabled) => { music.setSfxEnabled(enabled); setSoundEnabled(enabled); }}
                  accentColor="green"
                />
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Haptic Feedback</span>
                <Button variant="ghost" size="sm" onClick={() => setHapticEnabled(!hapticEnabled)} className={hapticEnabled ? 'text-green-400' : 'text-gray-500'} data-testid="button-toggle-haptic">
                  {hapticEnabled ? 'ON' : 'OFF'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 flex items-center gap-2"><Palette className="w-4 h-4" /> Terminal Skin</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowTerminalSelector(true)} 
                  className="text-green-400"
                  data-testid="button-terminal-selector"
                >
                  <span className="w-3 h-3 rounded mr-2" style={{ backgroundColor: currentTerminal.colors.text }} />
                  {currentTerminal.name}
                </Button>
              </div>

              <Button onClick={startGame} disabled={!access.canPlay} className="w-full h-14 text-lg font-orbitron bg-gradient-to-r from-green-500 to-cyan-600 hover:from-green-400 hover:to-cyan-500" data-testid="button-start-game">
                <Play className="w-6 h-6 mr-2" />
                {!access.canPlay ? 'NO PLAYS LEFT' : 'START BREACH'}
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
        
        {showTerminalSelector && (
          <TerminalSelector 
            onSelect={() => setShowTerminalSelector(false)}
            onClose={() => setShowTerminalSelector(false)}
          />
        )}
      </>
    );
  }

  if (gamePhase === 'gameover') {
    return (
      <>
        <Navbar activeTab="arcade" onTabChange={() => {}} isConnected={isConnected} />
        <section className="py-6 min-h-screen bg-gradient-to-b from-black via-green-900/20 to-black pt-16 pb-24">
          <div className="max-w-md mx-auto px-4">
            <VictoryScreen
              gameType="cyber-breach"
              score={score}
              stats={[
                { icon: Target, label: 'Score', value: score.toLocaleString(), color: 'text-green-400' },
                { icon: Trophy, label: 'Level', value: level, color: 'text-cyan-400' },
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
      <section className="fixed inset-0 bg-[#020208] pt-16 flex flex-col items-center justify-center overflow-hidden">
        {/* Animated circuit background - fills entire viewport */}
        <canvas ref={bgCanvasRef} className="absolute inset-0 z-0" style={{ top: 64 }} aria-hidden="true" />
        
        {/* Floating HUD - overlays game */}
        <div className="absolute top-16 left-0 right-0 flex items-center justify-between px-4 py-2 z-20 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-mono font-bold text-lg" style={{ textShadow: '0 0 10px #00FF88' }}>{score.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 bg-green-500/10 rounded">
              <Target className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-mono font-bold">LVL {level}</span>
            </div>
            {chain > 1 && (
              <span 
                className={`font-bold px-2 py-0.5 rounded animate-pulse ${
                  chain >= 5 ? 'text-purple-400 bg-purple-400/20' :
                  chain >= 3 ? 'text-cyan-400 bg-cyan-400/15' :
                  'text-green-400 bg-green-400/10'
                }`}
                style={{ 
                  filter: chain >= 3 ? `drop-shadow(0 0 ${Math.min(chain * 2, 10)}px ${chain >= 5 ? '#A855F7' : '#00FFFF'})` : 'none'
                }}
              >
                CHAIN x{chain}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded ${timeLeft <= 10 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-cyan-400'}`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold text-lg">{timeLeft}s</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="text-green-400 h-8 w-8" aria-label={soundEnabled ? "Mute sound" : "Unmute sound"}>
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Speed bonus popup */}
        {speedBonus && (
          <div className="absolute top-24 left-0 right-0 flex justify-center z-30 pointer-events-none">
            <span className="text-yellow-400 font-bold text-lg animate-bounce" style={{ textShadow: '0 0 15px #FBBF24' }}>
              {speedBonus}
            </span>
          </div>
        )}

        {/* Progress bar - floating */}
        <div className="absolute top-28 left-0 right-0 px-6 z-10">
          <div className="max-w-md mx-auto">
            <p className="text-gray-400 text-xs text-center mb-1">
              BREACH: {matchedPairs}/{currentConfig.pairs}
            </p>
            <div className="w-full h-2 bg-gray-800/50 rounded-full">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full transition-all shadow-[0_0_10px_#00FF88]"
                style={{ width: `${(matchedPairs / currentConfig.pairs) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card grid - centered and maximized */}
        <div 
          className="relative z-10 grid gap-1 p-1"
          style={{ 
            gridTemplateColumns: `repeat(${currentConfig.gridCols}, ${cardSize}px)`,
          }}
        >
          <AnimatePresence>
            {cards.map((card) => (
              <motion.button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                disabled={card.isFlipped || card.isMatched || isChecking}
                className={`
                  rounded-lg border-2 font-bold
                  flex items-center justify-center
                  transition-all duration-150
                  ${card.isMatched 
                    ? 'bg-green-500/20 border-green-500/50 opacity-60 shadow-[0_0_15px_#00FF8840]' 
                    : card.isFlipped 
                      ? 'bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_#00FFFF40]' 
                      : 'bg-gray-900/80 border-gray-600 hover:border-cyan-500/50 hover:bg-gray-800 hover:shadow-[0_0_10px_#00FFFF20]'
                  }
                `}
                style={{ 
                  width: `${cardSize}px`,
                  height: `${cardSize}px`,
                  fontSize: `${Math.max(cardSize * 0.4, 18)}px`
                }}
                initial={{ rotateY: 0 }}
                animate={{ 
                  rotateY: card.isFlipped || card.isMatched ? 180 : 0,
                  scale: card.isMatched ? 0.9 : 1
                }}
                transition={{ duration: 0.2 }}
                data-testid={`card-${card.id}`}
              >
                {(card.isFlipped || card.isMatched) ? (
                  <span style={{ transform: 'rotateY(180deg)' }}>{card.symbol}</span>
                ) : (
                  <span className="text-gray-600">?</span>
                )}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Floating moves counter */}
        <div className="absolute bottom-4 left-0 right-0 text-center text-gray-500 text-sm z-10">
          Moves: {moves}
        </div>

        <AnimatePresence>
          {showIntro && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center">
                <div className="text-2xl md:text-4xl font-mono text-green-400 mb-4">
                  {introText}<span className="animate-pulse">_</span>
                </div>
                <div className="text-sm text-gray-500">Preparing security protocols...</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lightning Breach celebration overlay */}
        <AnimatePresence>
          {showLightningBreach && (
            <motion.div
              className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="text-center"
                initial={{ scale: 0.5, y: 30 }}
                animate={{ scale: [0.5, 1.3, 1], y: [30, -10, 0] }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <motion.div
                  className="text-3xl md:text-5xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-500"
                  animate={{ 
                    filter: ['drop-shadow(0 0 10px #FBBF24)', 'drop-shadow(0 0 25px #F59E0B)', 'drop-shadow(0 0 10px #FBBF24)']
                  }}
                  transition={{ duration: 0.3, repeat: 4 }}
                >
                  ⚡ LIGHTNING BREACH ⚡
                </motion.div>
                <motion.div
                  className="mt-2 text-xl text-yellow-300 font-mono"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  +500 BONUS
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Last pair tension effect */}
        {matchedPairs === currentConfig.pairs - 1 && currentConfig.pairs > 1 && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-10"
            animate={{
              boxShadow: ['inset 0 0 60px rgba(255,0,100,0.15)', 'inset 0 0 100px rgba(255,0,100,0.3)', 'inset 0 0 60px rgba(255,0,100,0.15)']
            }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}

        <AnimatePresence>
          {showAccessGranted && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="text-center"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <motion.div
                  className="text-4xl md:text-6xl font-orbitron font-bold text-green-400 mb-4"
                  animate={{ textShadow: ['0 0 10px #22c55e', '0 0 30px #22c55e', '0 0 10px #22c55e'] }}
                  transition={{ duration: 0.5, repeat: 3 }}
                >
                  ACCESS GRANTED
                </motion.div>
                <motion.div
                  className="text-6xl"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  🔓
                </motion.div>
                <div className="mt-4 text-cyan-400 font-mono">
                  SYSTEM BREACH COMPLETE
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );
}
