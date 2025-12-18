import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useGameScoresLocal } from '@/hooks/useGameScoresLocal';
import { useGameAccess } from '@/hooks/useGameAccess';
import { trackEvent } from '@/lib/analytics';
import { fetchGuardianMetadata } from '@/lib/ipfs';
import { GameStorageManager, GameStats } from '@/lib/gameStorage';
import { getGameConfig } from '@/lib/gameRegistry';
import { GameHUD } from '@/components/game/GameHUD';
import { VictoryScreen } from '@/components/game/VictoryScreen';
import { 
  Play, RotateCcw, Sparkles, Info, Undo2, Lightbulb, 
  Volume2, VolumeX, Star, Flame, ChevronRight,
  Settings, Shield, Loader2, Home, Maximize2,
  Spade, Heart, Diamond, Club, Trophy, LogOut, Save
} from 'lucide-react';

function ExitConfirmationModal({ 
  isOpen, 
  onConfirm, 
  onCancel,
  moves,
  elapsedTime
}: { 
  isOpen: boolean; 
  onConfirm: () => void; 
  onCancel: () => void;
  moves: number;
  elapsedTime: number;
}) {
  if (!isOpen) return null;
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-md p-4"
        onClick={onCancel}
        data-testid="exit-modal-backdrop"
      >
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="bg-gradient-to-br from-indigo-900/90 to-purple-900/90 border-2 border-cyan-500/50 rounded-2xl p-8 text-center backdrop-blur-lg max-w-md w-full relative overflow-hidden"
          onClick={e => e.stopPropagation()}
          data-testid="exit-modal"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,255,255,0.1),transparent_50%)]" />
          
          <motion.div
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative mb-6"
          >
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center border-2 border-yellow-500/30">
              <LogOut className="w-10 h-10 text-yellow-400" />
            </div>
          </motion.div>

          <h2 className="text-2xl font-bold text-white mb-2 relative">
            Exit Game?
          </h2>
          
          <p className="text-gray-300 mb-6 relative">
            Your progress will be saved automatically. You can resume later from where you left off.
          </p>

          <div className="flex gap-4 justify-center mb-6 relative">
            <div className="bg-black/40 rounded-lg px-4 py-2 border border-white/10">
              <p className="text-cyan-400 font-bold">{moves}</p>
              <p className="text-xs text-gray-500">Moves</p>
            </div>
            <div className="bg-black/40 rounded-lg px-4 py-2 border border-white/10">
              <p className="text-purple-400 font-bold">{formatTime(elapsedTime)}</p>
              <p className="text-xs text-gray-500">Time</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center relative">
            <Button
              onClick={onCancel}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              data-testid="button-cancel-exit"
            >
              <Play className="w-4 h-4 mr-2" />
              Keep Playing
            </Button>
            <Button
              onClick={onConfirm}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold"
              data-testid="button-confirm-exit"
            >
              <Save className="w-4 h-4 mr-2" />
              Save & Exit
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

interface SolitaireCard {
  id: string;
  nftId: number;
  suit: Suit;
  rank: number;
  faceUp: boolean;
  imageUrl: string;
}

interface Pile {
  cards: SolitaireCard[];
}

interface GameState {
  deck: SolitaireCard[];
  waste: SolitaireCard[];
  foundations: Pile[];
  tableau: Pile[];
  moves: number;
  startTime: number;
  invalidAttempts: number;
}

interface GameSettings {
  soundEnabled: boolean;
  soundVolume: number;
  animationSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  particleIntensity: 'off' | 'low' | 'medium' | 'high';
}

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const MAX_UNDO_HISTORY = 5;
const COMBO_TIMEOUT = 3000;

const SUIT_ICONS = {
  hearts: Heart,
  diamonds: Diamond,
  clubs: Club,
  spades: Spade,
};

const SUIT_COLORS = {
  hearts: 'text-red-500',
  diamonds: 'text-red-500',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
};

const GLOW_COLORS = [
  'ring-4 ring-yellow-400/60 shadow-[0_0_25px_rgba(251,191,36,0.5)]',
  'ring-4 ring-blue-400/60 shadow-[0_0_25px_rgba(59,130,246,0.5)]',
  'ring-4 ring-purple-400/60 shadow-[0_0_25px_rgba(168,85,247,0.5)]',
  'ring-4 ring-pink-400/60 shadow-[0_0_25px_rgba(236,72,153,0.5)]',
];

function CardBack() {
  return (
    <div className="w-full h-full rounded-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-cyan-600 border-2 border-white/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(255,255,255,0.05)_5px,rgba(255,255,255,0.05)_10px)]" />
      <div className="absolute inset-2 border border-white/20 rounded-md flex items-center justify-center">
        <Shield className="w-8 h-8 text-white/30" />
      </div>
    </div>
  );
}

interface CardComponentProps {
  card: SolitaireCard;
  isSelected?: boolean;
  isHinted?: boolean;
  glowClass?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

function CardComponent({ 
  card, 
  isSelected, 
  isHinted, 
  glowClass,
  onClick, 
  onDoubleClick,
  onDragStart,
  onDragEnd 
}: CardComponentProps) {
  const SuitIcon = SUIT_ICONS[card.suit];
  const suitColor = SUIT_COLORS[card.suit];
  const rankLabels = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  if (!card.faceUp) {
    return (
      <motion.div
        className="w-24 h-32 rounded-lg cursor-pointer"
        whileHover={{ scale: 1.02 }}
      >
        <CardBack />
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`w-24 h-32 rounded-lg cursor-pointer bg-white relative overflow-hidden transition-all duration-200 ${
        isSelected ? glowClass : ''
      } ${isHinted ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-testid={`card-${card.id}`}
    >
      <div className="absolute top-1 left-1 flex flex-col items-center">
        <span className={`text-sm font-bold ${suitColor}`}>{rankLabels[card.rank]}</span>
        <SuitIcon className={`w-3 h-3 ${suitColor}`} />
      </div>
      <div className="absolute bottom-1 right-1 flex flex-col items-center rotate-180">
        <span className={`text-sm font-bold ${suitColor}`}>{rankLabels[card.rank]}</span>
        <SuitIcon className={`w-3 h-3 ${suitColor}`} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <img 
          src={card.imageUrl} 
          alt={`Guardian ${card.nftId}`}
          className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
          loading="lazy"
        />
      </div>
    </motion.div>
  );
}

interface FoundationPileProps {
  foundation: Pile;
  index: number;
  isTarget: boolean;
  onClick: () => void;
  onDrop: () => void;
}

function FoundationPile({ foundation, index, isTarget, onClick, onDrop }: FoundationPileProps) {
  const SuitIcon = SUIT_ICONS[SUITS[index]];
  const topCard = foundation.cards[foundation.cards.length - 1];
  
  return (
    <motion.div
      className={`w-24 h-32 rounded-lg border-2 ${
        isTarget ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/20 bg-black/20'
      } relative flex items-center justify-center transition-colors`}
      onClick={onClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      whileHover={isTarget ? { scale: 1.05 } : {}}
      data-testid={`foundation-${index}`}
    >
      {topCard ? (
        <CardComponent card={topCard} />
      ) : (
        <SuitIcon className="w-10 h-10 text-white/20" />
      )}
      {foundation.cards.length > 0 && (
        <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-black text-xs font-bold px-1.5 py-0.5 rounded">
          {foundation.cards.length}
        </div>
      )}
    </motion.div>
  );
}

interface TableauPileProps {
  pile: Pile;
  index: number;
  isTarget: boolean;
  selectedCardId?: string;
  hintedCardIds: string[];
  glowClass: string;
  onCardClick: (card: SolitaireCard) => void;
  onCardDoubleClick: (card: SolitaireCard) => void;
  onCardDragStart: (card: SolitaireCard) => void;
  onCardDragEnd: () => void;
  onPileClick: () => void;
  onDrop: () => void;
}

function TableauPile({
  pile,
  index,
  isTarget,
  selectedCardId,
  hintedCardIds,
  glowClass,
  onCardClick,
  onCardDoubleClick,
  onCardDragStart,
  onCardDragEnd,
  onPileClick,
  onDrop
}: TableauPileProps) {
  return (
    <div
      className={`min-h-[400px] rounded-lg ${
        isTarget ? 'bg-cyan-500/5' : ''
      } relative`}
      onClick={() => pile.cards.length === 0 && onPileClick()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      data-testid={`tableau-${index}`}
    >
      {pile.cards.length === 0 && (
        <div className="w-24 h-32 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center">
          <span className="text-white/20 text-xs">K</span>
        </div>
      )}
      {pile.cards.map((card, cardIdx) => (
        <motion.div
          key={card.id}
          className="absolute left-0"
          style={{ top: cardIdx * 28 }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: cardIdx * 0.02 }}
        >
          <CardComponent
            card={card}
            isSelected={card.id === selectedCardId}
            isHinted={hintedCardIds.includes(card.id)}
            glowClass={glowClass}
            onClick={() => card.faceUp && onCardClick(card)}
            onDoubleClick={() => card.faceUp && onCardDoubleClick(card)}
            onDragStart={() => card.faceUp && onCardDragStart(card)}
            onDragEnd={onCardDragEnd}
          />
        </motion.div>
      ))}
    </div>
  );
}

export default function GuardianSolitaire() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { submitScore } = useGameScoresLocal();
  const { access, recordPlay, isHolder, isLoading: accessLoading } = useGameAccess();
  const prefersReducedMotion = useReducedMotion();

  const gameConfig = useMemo(() => getGameConfig('guardian-solitaire'), []);

  const [gameStarted, setGameStarted] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  
  const [deck, setDeck] = useState<SolitaireCard[]>([]);
  const [waste, setWaste] = useState<SolitaireCard[]>([]);
  const [foundations, setFoundations] = useState<Pile[]>(
    Array(4).fill(null).map(() => ({ cards: [] }))
  );
  const [tableau, setTableau] = useState<Pile[]>(
    Array(7).fill(null).map(() => ({ cards: [] }))
  );
  
  const [moves, setMoves] = useState(0);
  const [invalidAttempts, setInvalidAttempts] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedCard, setSelectedCard] = useState<{
    card: SolitaireCard;
    from: 'waste' | 'foundation' | 'tableau';
    index: number;
  } | null>(null);
  
  const [gameHistory, setGameHistory] = useState<GameState[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [isLoadingDeck, setIsLoadingDeck] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [draggedCard, setDraggedCard] = useState<{
    card: SolitaireCard;
    from: 'waste' | 'foundation' | 'tableau';
    index: number;
  } | null>(null);

  const [stats, setStats] = useState<GameStats>(() =>
    address 
      ? GameStorageManager.loadStats('guardian-solitaire', address)
      : GameStorageManager.getDefaultStats()
  );

  const [settings, setSettings] = useState<GameSettings>(() =>
    GameStorageManager.loadSettings('guardian-solitaire', {
      soundEnabled: true,
      soundVolume: 70,
      animationSpeed: 'normal',
      particleIntensity: 'medium',
    })
  );

  const audioContextRef = useRef<AudioContext | null>(null);
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentGlow, setCurrentGlow] = useState(0);

  useEffect(() => {
    if (!address) return;
    const loadedStats = GameStorageManager.loadStats('guardian-solitaire', address);
    setStats(loadedStats);
  }, [address]);

  useEffect(() => {
    GameStorageManager.saveSettings('guardian-solitaire', settings);
  }, [settings]);

  useEffect(() => {
    if (!gameStarted || gameWon || !address || !startTime) return;

    const timeoutId = setTimeout(() => {
      const state: GameState = {
        deck,
        waste,
        foundations,
        tableau,
        moves,
        startTime,
        invalidAttempts,
      };
      GameStorageManager.saveSave('guardian-solitaire', address, state);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [deck, waste, foundations, tableau, moves, gameStarted, gameWon, address, startTime, invalidAttempts]);

  useEffect(() => {
    if (typeof window === 'undefined' || !settings.soundEnabled) return;

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (err) {
      console.error('AudioContext not supported:', err);
    }

    return () => {
      audioContextRef.current?.close();
    };
  }, [settings.soundEnabled]);

  const playSound = useCallback((type: 'flip' | 'slide' | 'snap' | 'invalid' | 'combo' | 'victory') => {
    if (!settings.soundEnabled || !audioContextRef.current) return;
    
    try {
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const volume = settings.soundVolume / 100;
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      switch (type) {
        case 'flip':
          oscillator.frequency.setValueAtTime(400, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);
          gainNode.gain.setValueAtTime(0.1 * volume, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
          oscillator.stop(ctx.currentTime + 0.08);
          break;
        case 'slide':
          oscillator.frequency.setValueAtTime(350, ctx.currentTime);
          oscillator.frequency.linearRampToValueAtTime(450, ctx.currentTime + 0.12);
          gainNode.gain.setValueAtTime(0.07 * volume, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
          oscillator.stop(ctx.currentTime + 0.12);
          break;
        case 'snap':
          oscillator.frequency.setValueAtTime(600, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.12 * volume, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
          oscillator.stop(ctx.currentTime + 0.06);
          break;
        case 'invalid':
          oscillator.frequency.setValueAtTime(180, ctx.currentTime);
          gainNode.gain.setValueAtTime(0.08 * volume, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
        case 'combo':
          oscillator.frequency.setValueAtTime(800, ctx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.18);
          gainNode.gain.setValueAtTime(0.14 * volume, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
          oscillator.stop(ctx.currentTime + 0.18);
          break;
        case 'victory':
          const frequencies = [523, 659, 784, 1047];
          frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);
            gain.gain.setValueAtTime(0.15 * volume, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.4);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.4);
          });
          return;
      }
      
      oscillator.start(ctx.currentTime);
    } catch (err) {
      console.error('Sound playback error:', err);
    }
  }, [settings.soundEnabled, settings.soundVolume]);

  const createParticles = useCallback((x: number, y: number, count: number = 10) => {
    if (settings.particleIntensity === 'off' || prefersReducedMotion) return;
    
    const intensityMultiplier = {
      low: 0.3,
      medium: 0.7,
      high: 1.0,
      off: 0,
    }[settings.particleIntensity];
    
    const adjustedCount = Math.round(count * intensityMultiplier);
    const colors = ['#fbbf24', '#60a5fa', '#a78bfa', '#f472b6'];
    const newParticles: Particle[] = [];
    
    for (let i = 0; i < adjustedCount; i++) {
      newParticles.push({
        id: `particle-${Date.now()}-${i}`,
        x: x + (Math.random() - 0.5) * 50,
        y: y + (Math.random() - 0.5) * 50,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 4 + 2,
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1000);
  }, [settings.particleIntensity, prefersReducedMotion]);

  useEffect(() => {
    if (!gameStarted || gameWon || !startTime) return;
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStarted, gameWon, startTime]);

  useEffect(() => {
    if (selectedCard) {
      setCurrentGlow(prev => (prev + 1) % GLOW_COLORS.length);
    }
  }, [selectedCard]);

  const initializeDeck = useCallback(async (): Promise<SolitaireCard[]> => {
    const newDeck: SolitaireCard[] = [];
    const usedNFTs = new Set<number>();
    const nftIds: number[] = [];
    
    // Generate 52 unique random NFT IDs
    for (let i = 0; i < 52; i++) {
      let nftId: number;
      do {
        nftId = Math.floor(Math.random() * 3732) + 1;
      } while (usedNFTs.has(nftId));
      usedNFTs.add(nftId);
      nftIds.push(nftId);
    }
    
    // Fetch metadata for all NFTs in parallel (batched)
    const BATCH_SIZE = 10;
    const guardianImages: Map<number, string> = new Map();
    
    for (let i = 0; i < nftIds.length; i += BATCH_SIZE) {
      const batch = nftIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(id => fetchGuardianMetadata(id).catch(() => null))
      );
      results.forEach((guardian, idx) => {
        if (guardian?.image) {
          guardianImages.set(batch[idx], guardian.image);
        }
      });
    }
    
    // Build deck with fetched images
    let nftIndex = 0;
    for (let suit = 0; suit < 4; suit++) {
      for (let rank = 1; rank <= 13; rank++) {
        const nftId = nftIds[nftIndex];
        const imageUrl = guardianImages.get(nftId) || `https://via.placeholder.com/400x400/1a1a2e/00ffff?text=Guardian+${nftId}`;
        
        newDeck.push({
          id: `${SUITS[suit]}-${rank}-${nftId}`,
          nftId,
          suit: SUITS[suit],
          rank,
          faceUp: false,
          imageUrl
        });
        nftIndex++;
      }
    }
    
    // Shuffle deck
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    
    return newDeck;
  }, []);

  const dealCards = useCallback(async () => {
    setIsLoadingDeck(true);
    try {
      const shuffledDeck = await initializeDeck();
      const newTableau: Pile[] = Array(7).fill(null).map(() => ({ cards: [] }));
      let deckIndex = 0;

      for (let i = 0; i < 7; i++) {
        for (let j = 0; j <= i; j++) {
          const card = { ...shuffledDeck[deckIndex++] };
          if (j === i) card.faceUp = true;
          newTableau[i].cards.push(card);
        }
      }

      const remainingDeck = shuffledDeck.slice(deckIndex).map((c: SolitaireCard) => ({ ...c, faceUp: false }));

      setTableau(newTableau);
      setDeck(remainingDeck);
      setWaste([]);
      setFoundations(Array(4).fill(null).map(() => ({ cards: [] })));
      setMoves(0);
      setInvalidAttempts(0);
      setStartTime(Date.now());
      setElapsedTime(0);
      setGameWon(false);
      setSelectedCard(null);
      setGameHistory([]);
      setComboCount(0);
      playSound('flip');
    } finally {
      setIsLoadingDeck(false);
    }
  }, [initializeDeck, playSound]);

  const saveStateToHistory = useCallback(() => {
    const state: GameState = {
      deck: JSON.parse(JSON.stringify(deck)),
      waste: JSON.parse(JSON.stringify(waste)),
      foundations: JSON.parse(JSON.stringify(foundations)),
      tableau: JSON.parse(JSON.stringify(tableau)),
      moves,
      startTime: startTime || Date.now(),
      invalidAttempts,
    };
    
    setGameHistory(prev => {
      const newHistory = [...prev, state];
      return newHistory.slice(-MAX_UNDO_HISTORY);
    });
  }, [deck, waste, foundations, tableau, moves, startTime, invalidAttempts]);

  const undoMove = useCallback(() => {
    if (gameHistory.length === 0) {
      toast({ 
        title: "⏪ No Moves to Undo", 
        description: "You're at the start of the game",
        variant: "info" 
      });
      return;
    }
    
    const previousState = gameHistory[gameHistory.length - 1];
    setDeck(previousState.deck);
    setWaste(previousState.waste);
    setFoundations(previousState.foundations);
    setTableau(previousState.tableau);
    setMoves(previousState.moves);
    setInvalidAttempts(previousState.invalidAttempts);
    setGameHistory(prev => prev.slice(0, -1));
    playSound('slide');
    
    trackEvent('game_action', 'Solitaire', 'Undo Move');
  }, [gameHistory, playSound, toast]);

  const canPlaceOnTableau = useCallback((card: SolitaireCard, targetPile: Pile): boolean => {
    if (targetPile.cards.length === 0) {
      return card.rank === 13;
    }
    const topCard = targetPile.cards[targetPile.cards.length - 1];
    const differentColor = 
      (['hearts', 'diamonds'].includes(card.suit) !== ['hearts', 'diamonds'].includes(topCard.suit));
    return differentColor && card.rank === topCard.rank - 1;
  }, []);

  const canPlaceOnFoundation = useCallback((card: SolitaireCard, foundationIndex: number): boolean => {
    const foundation = foundations[foundationIndex];
    if (foundation.cards.length === 0) {
      return card.rank === 1;
    }
    const topCard = foundation.cards[foundation.cards.length - 1];
    return card.suit === topCard.suit && card.rank === topCard.rank + 1;
  }, [foundations]);

  const drawCard = useCallback(() => {
    if (deck.length === 0) {
      if (waste.length === 0) return;
      setDeck(waste.map(c => ({ ...c, faceUp: false })).reverse());
      setWaste([]);
      playSound('flip');
      return;
    }

    saveStateToHistory();
    const newCard = { ...deck[0], faceUp: true };
    setWaste([newCard, ...waste]);
    setDeck(deck.slice(1));
    setMoves(m => m + 1);
    playSound('flip');
  }, [deck, waste, saveStateToHistory, playSound]);

  const moveToFoundation = useCallback((foundationIndex: number) => {
    if (!selectedCard) return;

    const { card, from, index } = selectedCard;

    if (!canPlaceOnFoundation(card, foundationIndex)) {
      setInvalidAttempts(a => a + 1);
      playSound('invalid');
      toast({ 
        title: "⚠️ Invalid Move",
        description: "Card can't be placed on this foundation",
        variant: "warning" 
      });
      setSelectedCard(null);
      return;
    }

    saveStateToHistory();

    if (from === 'waste') {
      setWaste(waste.slice(1));
    } else if (from === 'tableau') {
      const newTableau = [...tableau];
      const cardIndex = newTableau[index].cards.findIndex(c => c.id === card.id);
      newTableau[index] = { cards: newTableau[index].cards.slice(0, cardIndex) };
      if (newTableau[index].cards.length > 0) {
        const lastCard = newTableau[index].cards[newTableau[index].cards.length - 1];
        if (!lastCard.faceUp) {
          newTableau[index].cards[newTableau[index].cards.length - 1] = { ...lastCard, faceUp: true };
        }
      }
      setTableau(newTableau);
    }

    const newFoundations = [...foundations];
    newFoundations[foundationIndex] = {
      cards: [...newFoundations[foundationIndex].cards, card]
    };
    setFoundations(newFoundations);

    setMoves(m => m + 1);
    setSelectedCard(null);
    playSound('snap');
    createParticles(window.innerWidth / 2, 100, 15);

    if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
    setComboCount(c => c + 1);
    if (comboCount > 0) playSound('combo');
    comboTimerRef.current = setTimeout(() => setComboCount(0), COMBO_TIMEOUT);

    const totalFoundationCards = newFoundations.reduce((sum, f) => sum + f.cards.length, 0);
    if (totalFoundationCards === 52) {
      handleVictory();
    }

    trackEvent('game_action', 'Solitaire', 'Move to Foundation');
  }, [selectedCard, canPlaceOnFoundation, saveStateToHistory, waste, tableau, foundations, playSound, createParticles, comboCount, toast]);

  const moveToTableau = useCallback((pileIndex: number) => {
    if (!selectedCard) return;

    const { card, from, index } = selectedCard;
    const targetPile = tableau[pileIndex];

    if (!canPlaceOnTableau(card, targetPile)) {
      setInvalidAttempts(a => a + 1);
      playSound('invalid');
      toast({ 
        title: "⚠️ Invalid Move",
        description: card.rank === 13 && targetPile.cards.length > 0 
          ? "Kings go on empty columns"
          : "Place cards in alternating colors, descending rank",
        variant: "warning" 
      });
      setSelectedCard(null);
      return;
    }

    saveStateToHistory();

    let cardsToMove: SolitaireCard[] = [card];

    if (from === 'waste') {
      setWaste(waste.slice(1));
    } else if (from === 'foundation') {
      const newFoundations = [...foundations];
      newFoundations[index] = {
        cards: newFoundations[index].cards.slice(0, -1)
      };
      setFoundations(newFoundations);
    } else if (from === 'tableau') {
      const newTableau = [...tableau];
      const cardIndex = newTableau[index].cards.findIndex(c => c.id === card.id);
      cardsToMove = newTableau[index].cards.slice(cardIndex);
      newTableau[index] = { cards: newTableau[index].cards.slice(0, cardIndex) };
      if (newTableau[index].cards.length > 0) {
        const lastCard = newTableau[index].cards[newTableau[index].cards.length - 1];
        if (!lastCard.faceUp) {
          newTableau[index].cards[newTableau[index].cards.length - 1] = { ...lastCard, faceUp: true };
        }
      }
      setTableau(prev => {
        const updated = [...prev];
        updated[index] = newTableau[index];
        return updated;
      });
    }

    setTableau(prev => {
      const updated = [...prev];
      updated[pileIndex] = {
        cards: [...updated[pileIndex].cards, ...cardsToMove]
      };
      return updated;
    });

    setMoves(m => m + 1);
    setSelectedCard(null);
    playSound('slide');

    trackEvent('game_action', 'Solitaire', 'Move to Tableau');
  }, [selectedCard, tableau, canPlaceOnTableau, saveStateToHistory, waste, foundations, playSound, toast]);

  const handleDoubleClick = useCallback((card: SolitaireCard, from: 'waste' | 'tableau', index: number) => {
    for (let i = 0; i < 4; i++) {
      if (canPlaceOnFoundation(card, i)) {
        setSelectedCard({ card, from, index });
        setTimeout(() => moveToFoundation(i), 0);
        return;
      }
    }
  }, [canPlaceOnFoundation, moveToFoundation]);

  const findValidMoves = useCallback(() => {
    const moves: Array<{ card: SolitaireCard; from: 'waste' | 'tableau'; index: number }> = [];

    if (waste.length > 0) {
      const wasteCard = waste[0];
      for (let i = 0; i < 4; i++) {
        if (canPlaceOnFoundation(wasteCard, i)) {
          moves.push({ card: wasteCard, from: 'waste', index: 0 });
          break;
        }
      }
      for (let i = 0; i < 7; i++) {
        if (canPlaceOnTableau(wasteCard, tableau[i])) {
          moves.push({ card: wasteCard, from: 'waste', index: 0 });
          break;
        }
      }
    }

    tableau.forEach((pile, pileIdx) => {
      pile.cards.forEach((card, cardIdx) => {
        if (!card.faceUp) return;
        for (let i = 0; i < 4; i++) {
          if (canPlaceOnFoundation(card, i)) {
            moves.push({ card, from: 'tableau', index: pileIdx });
          }
        }
        for (let i = 0; i < 7; i++) {
          if (i !== pileIdx && canPlaceOnTableau(card, tableau[i])) {
            moves.push({ card, from: 'tableau', index: pileIdx });
          }
        }
      });
    });

    return moves;
  }, [waste, tableau, canPlaceOnFoundation, canPlaceOnTableau]);

  const showHintMove = useCallback(() => {
    const validMoves = findValidMoves();
    if (validMoves.length === 0) {
      toast({ 
        title: "💡 No Hints Available",
        description: "Try drawing from the deck",
        variant: "info"
      });
      return;
    }
    setShowHint(true);
    setTimeout(() => setShowHint(false), 2000);
    trackEvent('game_action', 'Solitaire', 'Hint Used');
  }, [findValidMoves, toast]);

  const handleVictory = useCallback(() => {
    setGameWon(true);
    playSound('victory');
    createParticles(window.innerWidth / 2, window.innerHeight / 2, 50);

    const finalTime = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
    const baseScore = 10000;
    const timeBonus = Math.max(0, 500 - finalTime);
    const moveBonus = Math.max(0, 1000 - (moves * 5));
    const comboBonus = comboCount * 100;
    const efficiency = moves > 0 ? Math.round((moves / (moves + invalidAttempts)) * 100) : 100;
    const efficiencyBonus = Math.round(efficiency * 2);
    const finalScore = Math.min(
      baseScore + timeBonus + moveBonus + comboBonus + efficiencyBonus,
      gameConfig.scoring.maxScore
    );

    const newStats: GameStats = {
      ...stats,
      gamesPlayed: stats.gamesPlayed + 1,
      gamesWon: stats.gamesWon + 1,
      totalScore: stats.totalScore + finalScore,
      totalTime: stats.totalTime + finalTime,
      bestScore: Math.max(stats.bestScore, finalScore),
      bestTime: stats.bestTime === 0 ? finalTime : Math.min(stats.bestTime, finalTime),
      bestMoves: stats.bestMoves === undefined || stats.bestMoves === 0 ? moves : Math.min(stats.bestMoves, moves),
      currentStreak: stats.currentStreak + 1,
      longestStreak: Math.max(stats.longestStreak, stats.currentStreak + 1),
      lastPlayed: Date.now(),
    };

    setStats(newStats);
    if (address) {
      GameStorageManager.saveStats('guardian-solitaire', address, newStats);
      GameStorageManager.deleteSave('guardian-solitaire', address);
    }

    submitScore(finalScore, 1);
    setShowVictory(true);

    trackEvent('game_complete', 'Solitaire', `Score: ${finalScore}`);
  }, [startTime, moves, comboCount, invalidAttempts, stats, address, gameConfig.scoring.maxScore, submitScore, playSound, createParticles]);

  const startGame = useCallback(async (resume: boolean = false) => {
    if (!access.canPlay) {
      toast({
        title: "🚫 Cannot Start Game",
        description: access.reason,
        variant: "destructive"
      });
      return;
    }

    recordPlay();

    if (resume && address) {
      const savedGame = GameStorageManager.loadSave<GameState>('guardian-solitaire', address);
      if (savedGame) {
        setDeck(savedGame.state.deck);
        setWaste(savedGame.state.waste);
        setFoundations(savedGame.state.foundations);
        setTableau(savedGame.state.tableau);
        setMoves(savedGame.state.moves);
        setInvalidAttempts(savedGame.state.invalidAttempts);
        setStartTime(savedGame.state.startTime);
        setElapsedTime(Math.floor((Date.now() - savedGame.state.startTime) / 1000));
        setGameStarted(true);
        return;
      }
    }

    await dealCards();
    setGameStarted(true);
    trackEvent('game_start', 'Solitaire', 'New Game');
  }, [access, recordPlay, address, dealCards, toast]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const hasSavedGame = address && GameStorageManager.hasSave('guardian-solitaire', address);

  useEffect(() => {
    if (!gameStarted || showVictory) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          drawCard();
          break;
        case 'u':
          undoMove();
          break;
        case 'h':
          showHintMove();
          break;
        case 'escape':
          setSelectedCard(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, showVictory, drawCard, undoMove, showHintMove]);

  if (accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-900 via-purple-900 to-black">
        <Card className="p-8 bg-white/5 border-cyan-500/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            <p className="text-cyan-400">Loading Guardian Solitaire...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <section className="py-8 min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-black relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none opacity-40">
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={`star-bg-${i}`}
              className="absolute w-1 h-1 bg-white rounded-full"
              initial={{ 
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920), 
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
                opacity: Math.random() * 0.5 + 0.3
              }}
              animate={{
                y: [null, (typeof window !== 'undefined' ? window.innerHeight : 1080) + 20],
                opacity: [null, 0]
              }}
              transition={{
                duration: 15 + Math.random() * 10,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 8
              }}
            />
          ))}
        </div>

        <div className="max-w-4xl mx-auto px-4 relative z-10 pt-20">
          <div className="text-center mb-8">
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-3 font-orbitron tracking-tight">
                GUARDIAN SOLITAIRE
              </h1>
              <p className="text-gray-400 text-base mb-4">
                Premium Klondike • Strategy Meets Style
              </p>
            </motion.div>

            {stats.gamesPlayed > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-8 text-sm flex-wrap mb-6"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-gray-300">
                    {Math.round(stats.winRate || 0)}% Win Rate
                  </span>
                </div>
                {stats.currentStreak > 0 && (
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span className="text-gray-300">
                      {stats.currentStreak} Streak
                    </span>
                  </div>
                )}
                {stats.bestScore > 0 && (
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-cyan-400" />
                    <span className="text-gray-300">
                      Best: {stats.bestScore.toLocaleString()} pts
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="p-10 bg-black/70 border-cyan-500/30 backdrop-blur-lg">
              <div className="space-y-8">
                <div className="flex justify-center">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 2, -2, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border-2 border-white/10"
                  >
                    <Spade className="w-16 h-16 text-cyan-400" />
                  </motion.div>
                </div>

                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-5 h-5 text-cyan-400" />
                    <h3 className="font-bold text-white text-lg">How to Play</h3>
                  </div>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span>Arrange cards in descending order, alternating red and black suits</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span>Build foundations from Ace to King in the same suit</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span>Only Kings can be placed on empty tableau columns</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <span><strong>Click or drag</strong> cards • <strong>Double-click</strong> to auto-move to foundation</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl p-6 border border-yellow-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <h3 className="font-bold text-white text-lg">Premium Features</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Undo2 className="w-4 h-4 text-cyan-400" />
                      <span>Undo last 5 moves</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Lightbulb className="w-4 h-4 text-yellow-400" />
                      <span>Smart hint system</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Shield className="w-4 h-4 text-purple-400" />
                      <span>Auto-save & resume</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-300">
                      <Star className="w-4 h-4 text-pink-400" />
                      <span>Performance tracking</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-8 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-300">
                      {access.playsRemaining} Plays Remaining
                    </span>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                    data-testid="button-toggle-sound"
                  >
                    {settings.soundEnabled ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4" />
                    )}
                    <span>Sound {settings.soundEnabled ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                <div className="flex gap-4 justify-center flex-wrap">
                  <Button
                    onClick={() => startGame(false)}
                    size="lg"
                    disabled={!access.canPlay || isLoadingDeck}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold px-10 py-6 text-lg"
                    data-testid="button-new-game"
                  >
                    {isLoadingDeck ? (
                      <>
                        <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                        LOADING GUARDIANS...
                      </>
                    ) : (
                      <>
                        <Play className="w-6 h-6 mr-2" />
                        NEW GAME
                      </>
                    )}
                  </Button>
                  
                  {hasSavedGame && (
                    <Button
                      onClick={() => startGame(true)}
                      size="lg"
                      variant="outline"
                      disabled={!access.canPlay || isLoadingDeck}
                      className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-10 py-6 text-lg"
                      data-testid="button-resume-game"
                    >
                      <RotateCcw className="w-6 h-6 mr-2" />
                      RESUME
                    </Button>
                  )}
                </div>

                {!isConnected && (
                  <p className="text-center text-yellow-400 text-sm">
                    Connect your wallet for enhanced features
                  </p>
                )}
                {!access.canPlay && access.playsRemaining <= 0 && (
                  <p className="text-center text-red-400 text-sm">
                    Daily play limit reached. Return tomorrow for more!
                  </p>
                )}
                {!access.canPlay && access.cooldownSeconds > 0 && (
                  <p className="text-center text-yellow-400 text-sm">
                    {access.reason}
                  </p>
                )}

                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={() => setLocation('/')}
                    className="text-gray-400 hover:text-white"
                    data-testid="button-back-home"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Back to Command Center
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 min-h-screen bg-gradient-to-b from-indigo-900 via-purple-900 to-black relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-30">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <AnimatePresence>
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="fixed rounded-full pointer-events-none z-50"
            style={{ 
              left: particle.x, 
              top: particle.y,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color
            }}
            initial={{ scale: 1, opacity: 1 }}
            animate={{ 
              scale: 0, 
              opacity: 0,
              y: -50,
              x: (Math.random() - 0.5) * 100
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          />
        ))}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="mb-4">
          <GameHUD
            score={moves * 10}
            time={elapsedTime}
            moves={moves}
            combo={comboCount > 0 ? comboCount : undefined}
          />
        </div>

        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={undoMove}
              disabled={gameHistory.length === 0}
              className="border-white/20 hover:border-cyan-500"
              title="Undo last move (U)"
              data-testid="button-undo"
            >
              <Undo2 className="w-4 h-4 mr-1" />
              Undo ({gameHistory.length}/{MAX_UNDO_HISTORY})
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={showHintMove}
              className="border-white/20 hover:border-yellow-500"
              title="Show hint (H)"
              data-testid="button-hint"
            >
              <Lightbulb className="w-4 h-4 mr-1" />
              Hint
            </Button>
            
            <button
              onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
              className="p-2 rounded border border-white/20 hover:border-white/40 transition-colors"
              title="Toggle sound"
              data-testid="button-sound-toggle"
            >
              {settings.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-white" />
              ) : (
                <VolumeX className="w-4 h-4 text-white" />
              )}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExitModal(true)}
            className="border-white/20 hover:border-white/40"
            data-testid="button-exit"
          >
            <Home className="w-4 h-4 mr-1" />
            Exit
          </Button>
        </div>

        <div className="bg-black/40 rounded-lg p-6 border border-white/10 backdrop-blur-md min-h-[700px]">
          <div className="flex gap-4 mb-8 flex-wrap justify-between">
            <div className="flex gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={drawCard}
                className="w-24 h-32 rounded-lg cursor-pointer relative"
                title="Draw card (Space)"
                data-testid="deck-pile"
              >
                {deck.length > 0 ? (
                  <>
                    <CardBack />
                    <div className="absolute bottom-1 right-1 text-[10px] text-white bg-black/70 px-1.5 py-0.5 rounded font-mono">
                      {deck.length}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full rounded-lg border-2 border-dashed border-white/30 bg-white/5 flex items-center justify-center">
                    <RotateCcw className="w-6 h-6 text-white/30" />
                  </div>
                )}
              </motion.div>

              <div className="w-24 h-32 rounded-lg border-2 border-white/20 bg-black/20 relative" data-testid="waste-pile">
                {waste.length > 0 && (
                  <CardComponent
                    card={waste[0]}
                    isSelected={selectedCard?.card.id === waste[0].id}
                    isHinted={showHint && findValidMoves().some(m => m.card.id === waste[0].id)}
                    glowClass={GLOW_COLORS[currentGlow]}
                    onClick={() => setSelectedCard({ card: waste[0], from: 'waste', index: 0 })}
                    onDoubleClick={() => handleDoubleClick(waste[0], 'waste', 0)}
                    onDragStart={() => setDraggedCard({ card: waste[0], from: 'waste', index: 0 })}
                    onDragEnd={() => setDraggedCard(null)}
                  />
                )}
              </div>
            </div>

            <div className="flex gap-4">
              {foundations.map((foundation, idx) => (
                <FoundationPile
                  key={idx}
                  foundation={foundation}
                  index={idx}
                  isTarget={Boolean(selectedCard || draggedCard)}
                  onClick={() => selectedCard && moveToFoundation(idx)}
                  onDrop={() => {
                    if (draggedCard) {
                      setSelectedCard(draggedCard);
                      setTimeout(() => moveToFoundation(idx), 0);
                    }
                  }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-4">
            {tableau.map((pile, pileIdx) => (
              <TableauPile
                key={pileIdx}
                pile={pile}
                index={pileIdx}
                isTarget={Boolean(selectedCard || draggedCard)}
                selectedCardId={selectedCard?.card.id}
                hintedCardIds={showHint ? findValidMoves().map(m => m.card.id) : []}
                glowClass={GLOW_COLORS[currentGlow]}
                onCardClick={(card) => setSelectedCard({ card, from: 'tableau', index: pileIdx })}
                onCardDoubleClick={(card) => handleDoubleClick(card, 'tableau', pileIdx)}
                onCardDragStart={(card) => setDraggedCard({ card, from: 'tableau', index: pileIdx })}
                onCardDragEnd={() => setDraggedCard(null)}
                onPileClick={() => {
                  if (selectedCard || draggedCard) {
                    const cardToMove = selectedCard || draggedCard;
                    if (cardToMove) {
                      setSelectedCard(cardToMove);
                      setTimeout(() => moveToTableau(pileIdx), 0);
                    }
                  }
                }}
                onDrop={() => {
                  if (draggedCard) {
                    setSelectedCard(draggedCard);
                    setTimeout(() => moveToTableau(pileIdx), 0);
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {showVictory && (
        <VictoryScreen
          gameType="guardian-solitaire"
          score={(() => {
            const finalTime = Math.floor((Date.now() - (startTime || Date.now())) / 1000);
            const baseScore = 10000;
            const timeBonus = Math.max(0, 500 - finalTime);
            const moveBonus = Math.max(0, 1000 - (moves * 5));
            const comboBonus = comboCount * 100;
            const efficiency = moves > 0 ? Math.round((moves / (moves + invalidAttempts)) * 100) : 100;
            const efficiencyBonus = Math.round(efficiency * 2);
            return Math.min(
              baseScore + timeBonus + moveBonus + comboBonus + efficiencyBonus,
              gameConfig.scoring.maxScore
            );
          })()}
          time={elapsedTime}
          moves={moves}
          playsRemaining={access.playsRemaining}
          maxPlays={20}
          isNewBest={stats.bestScore === stats.totalScore}
          onPlayAgain={() => {
            setShowVictory(false);
            dealCards();
          }}
          onExit={() => setLocation('/')}
        />
      )}

      <ExitConfirmationModal
        isOpen={showExitModal}
        onConfirm={() => {
          setShowExitModal(false);
          setLocation('/');
        }}
        onCancel={() => setShowExitModal(false)}
        moves={moves}
        elapsedTime={elapsedTime}
      />
    </section>
  );
}
