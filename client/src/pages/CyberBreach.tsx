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
import { Play, Home, Trophy, Clock, Target, Volume2, VolumeX } from 'lucide-react';
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
  { pairs: 6, time: 60, gridCols: 4 },
  { pairs: 8, time: 75, gridCols: 4 },
  { pairs: 8, time: 60, gridCols: 4 },
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

  const gameConfig = useMemo(() => getGameConfig('cyber-breach'), []);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [gamePhase, setGamePhase] = useState<GamePhase>('menu');
  const [cards, setCards] = useState<GameCard[]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [level, setLevel] = useState(1);
  const [isChecking, setIsChecking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const stats = useMemo(() => ({
    gamesPlayed: myStats.totalGames || 0,
    bestScore: myStats.bestScore || 0,
    totalScore: myStats.lifetimeScore || 0,
  }), [myStats]);

  const currentConfig = useMemo(() => LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)], [level]);

  const playSound = useCallback((type: 'flip' | 'match' | 'nomatch' | 'victory' | 'gameover') => {
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
    trackEvent('game_complete', 'cyber-breach', String(level), score);
  }, [address, score, level, submitScore, refreshStats]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          playSound('gameover');
          setGamePhase('gameover');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [playSound]);

  const handleCardClick = useCallback((cardId: number) => {
    if (isChecking) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;

    const flippedCards = cards.filter(c => c.isFlipped && !c.isMatched);
    if (flippedCards.length >= 2) return;

    playSound('flip');
    if (isMobile) haptic.light();

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
          if (isMobile) haptic.medium?.() || haptic.light();
          
          const matchedCards = newCards.map(c => 
            c.symbol === first.symbol ? { ...c, isMatched: true } : c
          );
          setCards(matchedCards);
          setMatchedPairs(p => p + 1);
          
          const timeBonus = Math.floor(timeLeft / 10);
          const moveBonus = Math.max(0, 10 - moves);
          const points = 100 + timeBonus * 10 + moveBonus * 5;
          setScore(s => s + points);
          
          const newMatchedCount = matchedCards.filter(c => c.isMatched).length / 2;
          if (newMatchedCount === currentConfig.pairs) {
            if (timerRef.current) clearInterval(timerRef.current);
            const finalBonus = timeLeft * 5;
            setScore(s => s + finalBonus);
            
            if (level < 3) {
              setTimeout(() => {
                setLevel(l => l + 1);
                const nextConfig = LEVEL_CONFIGS[Math.min(level, LEVEL_CONFIGS.length - 1)];
                setCards(createCards(level + 1));
                setTimeLeft(nextConfig.time);
                setMatchedPairs(0);
                setMoves(0);
                startTimer();
              }, 1500);
            } else {
              playSound('victory');
              setGamePhase('gameover');
            }
          }
          setIsChecking(false);
        }, 400);
      } else {
        setTimeout(() => {
          playSound('nomatch');
          if (isMobile) haptic.heavy();
          
          const resetCards = newCards.map(c => 
            (c.id === first.id || c.id === second.id) ? { ...c, isFlipped: false } : c
          );
          setCards(resetCards);
          setIsChecking(false);
        }, 800);
      }
    }
  }, [cards, isChecking, moves, timeLeft, currentConfig.pairs, level, playSound, startTimer]);

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
    setTimeLeft(LEVEL_CONFIGS[0].time);
    setIsChecking(false);
    setGamePhase('playing');
    
    setTimeout(() => startTimer(), 100);
    trackEvent('game_start', 'cyber-breach', '', 0);
  }, [address, access.canPlay, access.reason, gameConfig.maxPlaysPerDay, toast, recordPlay, startTimer]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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
                  <p>• Faster matches = higher score</p>
                  <p>• Complete all 3 levels to win</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400">Sound</span>
                <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="text-green-400" data-testid="button-toggle-sound">
                  {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
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
      <section className="py-2 min-h-screen bg-black pt-16 pb-24 flex flex-col items-center">
        <div className="flex items-center justify-between w-full max-w-md px-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-white font-mono font-bold">{score}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-mono">LVL {level}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold">{timeLeft}s</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="text-green-400">
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="text-center mb-4">
          <p className="text-gray-400 text-sm">
            BREACH: {matchedPairs}/{currentConfig.pairs} COMPLETE
          </p>
          <div className="w-48 h-2 bg-gray-800 rounded-full mt-2 mx-auto">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-cyan-500 rounded-full transition-all"
              style={{ width: `${(matchedPairs / currentConfig.pairs) * 100}%` }}
            />
          </div>
        </div>

        <div 
          className="grid gap-2 p-4"
          style={{ 
            gridTemplateColumns: `repeat(${currentConfig.gridCols}, minmax(0, 1fr))`,
            maxWidth: isMobile ? '100%' : '400px'
          }}
        >
          <AnimatePresence>
            {cards.map((card) => (
              <motion.button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                disabled={card.isFlipped || card.isMatched || isChecking}
                className={`
                  aspect-square rounded-lg border-2 font-bold text-2xl
                  flex items-center justify-center
                  transition-all duration-200
                  ${card.isMatched 
                    ? 'bg-green-500/20 border-green-500/50 opacity-60' 
                    : card.isFlipped 
                      ? 'bg-cyan-500/20 border-cyan-500/50' 
                      : 'bg-gray-900 border-gray-700 hover:border-cyan-500/50 hover:bg-gray-800'
                  }
                `}
                style={{ 
                  minWidth: isMobile ? '60px' : '70px',
                  minHeight: isMobile ? '60px' : '70px'
                }}
                initial={{ rotateY: 0 }}
                animate={{ 
                  rotateY: card.isFlipped || card.isMatched ? 180 : 0,
                  scale: card.isMatched ? 0.9 : 1
                }}
                transition={{ duration: 0.3 }}
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

        <div className="mt-4 text-center text-gray-500 text-xs">
          Moves: {moves}
        </div>
      </section>
    </>
  );
}
