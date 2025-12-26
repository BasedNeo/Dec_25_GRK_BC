import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Rocket, Shield, Crown, Star, Sparkles, 
  Trophy, Flame, Share2, ChevronRight, Lock, Check,
  X, Lightbulb, Zap, Target, Award, Users, Bot, MessageCircle, Loader2,
  Calendar, Scroll
} from 'lucide-react';
import MindWarpStrategist from '@/assets/mind-warp-strategist.png';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { triggerConfetti } from '@/lib/dynamicImports';
import { useOwnedNFTs } from '@/hooks/useOwnedNFTs';
import { 
  canUseOracle, 
  getOracleInteractionsRemaining, 
  generateOracleRiddle, 
  evaluateOracleAnswer, 
  getOracleHint,
  resetOracleSession
} from '@/lib/oracleClient';
import { RiddleLeaderboard } from '@/components/RiddleLeaderboard';
import { useDailyRiddles, useDailyProgress, useSubmitRiddleAttempt, useRiddleStats } from '@/hooks/useRiddleQuest';
import { TypewriterText, MilestoneMap } from '@/components/riddle';
import { useRiddleMilestoneStore } from '@/store/riddleMilestoneStore';

const RIDDLES = [
  { level: 1, question: "I am the token mined from rare ore, powering the entire galaxy. What am I?", answers: ["based", "$based", "basedai"], hint: "The native token of the ecosystem" },
  { level: 1, question: "How many Brain-Planets exist in the Giga Brain Galaxy?", answers: ["1024"], hint: "A power of 2, think binary" },
  { level: 1, question: "Who is the official X handle for the project behind this universe?", answers: ["@getbasedai", "getbasedai"], hint: "Get the base of AI" },
  { level: 2, question: "What percentage of each mint goes to the community pool?", answers: ["51", "fifty one", "fifty-one", "51%"], hint: "More than half, a majority" },
  { level: 2, question: "How much $BASED does one Guardian NFT cost to mint?", answers: ["69420", "69,420"], hint: "A legendary meme number" },
  { level: 2, question: "The emissions halving is estimated for what date?", answers: ["december 31 2025", "dec 31 2025", "12/31/2025", "31/12/2025"], hint: "New Year's Eve 2025" },
  { level: 3, question: "How many total NFTs are in the Based Guardians collection?", answers: ["3732", "3,732"], hint: "Frogs + Guardians + Creatures" },
  { level: 3, question: "How many heroic Guardians (not Frogs or Creatures) exist?", answers: ["1776"], hint: "A significant year in American history" },
  { level: 3, question: "How many resilient Frog Wranglers are there?", answers: ["1319", "1320", "1,319", "1,320"], hint: "Between 1300 and 1350" },
  { level: 4, question: "How many fierce Creatures roam the galaxy?", answers: ["636"], hint: "Less than 700, more than 600" },
  { level: 4, question: "The rarest tier of Guardians is called what?", answers: ["rarest-legendary", "rarest legendary", "legendary"], hint: "The most epic tier name" },
  { level: 4, question: "What trait in metadata determines rarity?", answers: ["rarity level", "rarity", "raritylevel"], hint: "It's in the trait name itself" },
  { level: 5, question: "Who crafted the entire Based Universe from nothing?", answers: ["basedgod", "based god"], hint: "A divine creator figure" },
  { level: 5, question: "The master architect of the Based-Bridge is who?", answers: ["wizard committer", "committer", "wizardcommitter"], hint: "A magical developer" },
  { level: 5, question: "The Neonstrike Hacker leading the rescue is named?", answers: ["vex"], hint: "Three letters, sounds like trouble" },
  { level: 6, question: "The shadowy enemies from the parallel dimension are called?", answers: ["fud", "the fud"], hint: "Fear, Uncertainty, and..." },
  { level: 6, question: "What do the FUD appear as in the sky?", answers: ["blackened storms", "cyborg fowl", "storms"], hint: "Dark weather or mechanical birds" },
  { level: 6, question: "What treasure do the FUD seek to steal?", answers: ["$based", "based tokens", "based", "tokens"], hint: "The native currency" },
  { level: 7, question: "The main staking and mining planet is known as?", answers: ["brain-planet x", "brain planet 106", "brain-planet 106", "brainplanet"], hint: "Named after the organ of intelligence" },
  { level: 7, question: "The massive structure to connect all planets is called?", answers: ["based-bridge", "based bridge", "the bridge"], hint: "A connection based on the token name" },
  { level: 7, question: "The gladiatorial arena for AI agents and Creatures is named?", answers: ["agent arena", "the arena"], hint: "Where AI agents compete" },
  { level: 8, question: "The monthly competition events are called?", answers: ["race-to-base", "race to base", "racetobase"], hint: "A competition to reach the foundation" },
  { level: 8, question: "What currency rewards Race-to-Base winners?", answers: ["brainx", "brain x", "$brainx"], hint: "Brain + X" },
  { level: 8, question: "Voting in the community council is described as what kind?", answers: ["advisory"], hint: "Non-binding, suggestive" },
  { level: 9, question: "The project was created by a father and who?", answers: ["daughter", "his daughter"], hint: "A family member" },
  { level: 9, question: "Who has final decision power in the saga?", answers: ["admin", "the admin"], hint: "The system administrator" },
  { level: 9, question: "The drink toasted to survival was called?", answers: ["flare whiskey", "flarewhiskey"], hint: "A fiery alcoholic beverage" },
  { level: 10, question: "Staking is expected to launch in what year?", answers: ["2026"], hint: "Next year after 2025" },
  { level: 10, question: "The long-term ecosystem vision includes what expansion?", answers: ["p2e", "play to earn", "play-to-earn"], hint: "Gaming where you earn rewards" },
  { level: 10, question: "What do active Guardians inherit, according to the creators?", answers: ["the stars", "stars"], hint: "Celestial bodies in the galaxy" },
  { level: 11, question: "The number of Frog Wrangler clans is?", answers: ["7", "seven"], hint: "A lucky number" },
  { level: 11, question: "The number of Guardian lineages is?", answers: ["32", "thirty two", "thirty-two"], hint: "2 to the power of 5" },
  { level: 11, question: "The number of Creature broods is?", answers: ["7", "seven"], hint: "Same as the Frog clans" },
];

const BADGES_DATA = [
  { id: 'apprentice', name: 'Apprentice', icon: Rocket, color: 'cyan', description: 'Complete Level 1', levelReq: 1 },
  { id: 'seeker', name: 'Seeker', icon: Target, color: 'green', description: 'Complete Level 3', levelReq: 3 },
  { id: 'scholar', name: 'Scholar', icon: Brain, color: 'blue', description: 'Complete Level 5', levelReq: 5 },
  { id: 'sage', name: 'Sage', icon: Lightbulb, color: 'purple', description: 'Complete Level 7', levelReq: 7 },
  { id: 'oracle', name: 'Oracle', icon: Star, color: 'amber', description: 'Complete Level 9', levelReq: 9 },
  { id: 'master', name: 'Riddle Master', icon: Crown, color: 'yellow', description: 'Complete Level 10', levelReq: 10 },
  { id: 'eternal', name: 'Eternal Sage', icon: Sparkles, color: 'pink', description: 'Complete Bonus Level 11', levelReq: 11 },
  { id: 'streak', name: 'Streak Champion', icon: Flame, color: 'orange', description: '7+ day streak', levelReq: 0 },
];

interface QuestProgress {
  currentLevel: number;
  currentRiddle: number;
  points: number;
  streak: number;
  lastPlayDate: string;
  completedLevels: number[];
  unlockedBadges: string[];
  failedAttempts: number;
}

const getStoredProgress = (address: string): QuestProgress => {
  const stored = localStorage.getItem(`riddle_quest_${address.toLowerCase()}`);
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    currentLevel: 1,
    currentRiddle: 0,
    points: 0,
    streak: 0,
    lastPlayDate: '',
    completedLevels: [],
    unlockedBadges: [],
    failedAttempts: 0,
  };
};

const saveProgress = (address: string, progress: QuestProgress) => {
  localStorage.setItem(`riddle_quest_${address.toLowerCase()}`, JSON.stringify(progress));
};

const getLeaderboard = (): Array<{ address: string; points: number; level: number }> => {
  const stored = localStorage.getItem('riddle_quest_leaderboard');
  if (stored) {
    return JSON.parse(stored);
  }
  return [];
};

const updateLeaderboard = (address: string, points: number, level: number) => {
  const leaderboard = getLeaderboard();
  const existingIndex = leaderboard.findIndex(e => e.address.toLowerCase() === address.toLowerCase());
  if (existingIndex >= 0) {
    leaderboard[existingIndex] = { address, points, level };
  } else {
    leaderboard.push({ address, points, level });
  }
  leaderboard.sort((a, b) => b.points - a.points);
  localStorage.setItem('riddle_quest_leaderboard', JSON.stringify(leaderboard.slice(0, 100)));
};

export function RiddleQuest() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { balance: nftBalance } = useOwnedNFTs();
  const isNftHolder = useMemo(() => nftBalance > 0, [nftBalance]);
  
  const [gameState, setGameState] = useState<'hero' | 'playing' | 'level_complete' | 'game_complete'>('hero');
  const [progress, setProgress] = useState<QuestProgress | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Array<{ address: string; points: number; level: number }>>([]);
  
  // Game Mode State (campaign vs daily)
  const [gameMode, setGameMode] = useState<'campaign' | 'daily'>('campaign');
  const [dailyRiddleIndex, setDailyRiddleIndex] = useState(0);
  const [dailyStartTime, setDailyStartTime] = useState<number | null>(null);
  
  // Oracle Mode State
  const [oracleMode, setOracleMode] = useState(false);
  const [oracleRiddle, setOracleRiddle] = useState<string | null>(null);
  const [oracleResponse, setOracleResponse] = useState<string | null>(null);
  const [oracleLoading, setOracleLoading] = useState(false);
  const [oracleConversation, setOracleConversation] = useState<Array<{ role: string; content: string }>>([]);
  const [oracleInteractionsLeft, setOracleInteractionsLeft] = useState(3);
  
  // Daily Challenge Hooks
  const { data: dailySet, isLoading: dailyLoading } = useDailyRiddles();
  const { data: dailyProgress } = useDailyProgress(address);
  const { data: riddleStats } = useRiddleStats(address);
  const submitAttempt = useSubmitRiddleAttempt();

  useEffect(() => {
    if (address) {
      const storedProgress = getStoredProgress(address);
      const today = new Date().toDateString();
      if (storedProgress.lastPlayDate && storedProgress.lastPlayDate !== today) {
        const lastDate = new Date(storedProgress.lastPlayDate);
        const dayDiff = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) {
          storedProgress.streak += 1;
          storedProgress.points += 50;
          if (storedProgress.streak >= 7 && !storedProgress.unlockedBadges.includes('streak')) {
            storedProgress.unlockedBadges.push('streak');
          }
        } else if (dayDiff > 1) {
          storedProgress.streak = 1;
        }
        storedProgress.lastPlayDate = today;
        saveProgress(address, storedProgress);
      } else if (!storedProgress.lastPlayDate) {
        storedProgress.lastPlayDate = today;
        storedProgress.streak = 1;
        saveProgress(address, storedProgress);
      }
      setProgress(storedProgress);
      setOracleInteractionsLeft(getOracleInteractionsRemaining(isNftHolder));
    }
    setLeaderboard(getLeaderboard());
  }, [address]);

  // Update oracle interactions remaining when mode or NFT holder status changes
  useEffect(() => {
    setOracleInteractionsLeft(getOracleInteractionsRemaining(isNftHolder));
  }, [oracleMode, isNftHolder]);

  const currentLevelRiddles = RIDDLES.filter(r => r.level === (progress?.currentLevel || 1));
  const currentRiddle = currentLevelRiddles[progress?.currentRiddle || 0];
  const totalLevels = 11;

  const checkAnswer = useCallback(() => {
    if (!currentRiddle || !progress || !address) return;
    
    const normalizedAnswer = answer.toLowerCase().trim();
    const isCorrect = currentRiddle.answers.some(a => a.toLowerCase() === normalizedAnswer);
    
    if (isCorrect) {
      setFeedback('correct');
      triggerConfetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00ffff', '#bf00ff', '#ffffff']
      });
      
      const pointsEarned = 100 + (progress.streak > 3 ? 25 : 0);
      const newProgress = { ...progress, points: progress.points + pointsEarned };
      
      const isLastRiddleInLevel = (progress.currentRiddle || 0) >= currentLevelRiddles.length - 1;
      
      if (isLastRiddleInLevel) {
        if (!newProgress.completedLevels.includes(progress.currentLevel)) {
          newProgress.completedLevels.push(progress.currentLevel);
        }
        
        const badge = BADGES_DATA.find(b => b.levelReq === progress.currentLevel);
        if (badge && !newProgress.unlockedBadges.includes(badge.id)) {
          newProgress.unlockedBadges.push(badge.id);
          triggerConfetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.5 },
            colors: ['#ffd700', '#ff6b6b', '#00ffff']
          });
        }
        
        if (progress.currentLevel >= totalLevels) {
          setGameState('game_complete');
        } else {
          setGameState('level_complete');
        }
        
        newProgress.currentLevel = Math.min(progress.currentLevel + 1, totalLevels);
        newProgress.currentRiddle = 0;
      } else {
        newProgress.currentRiddle = (progress.currentRiddle || 0) + 1;
      }
      
      newProgress.failedAttempts = 0;
      saveProgress(address, newProgress);
      updateLeaderboard(address, newProgress.points, newProgress.currentLevel);
      setProgress(newProgress);
      setLeaderboard(getLeaderboard());
      
      setTimeout(() => {
        setFeedback(null);
        setAnswer('');
        setShowHint(false);
      }, 1500);
    } else {
      setFeedback('wrong');
      setIsShaking(true);
      const newProgress = { ...progress, failedAttempts: progress.failedAttempts + 1 };
      if (newProgress.failedAttempts >= 2) {
        setShowHint(true);
      }
      saveProgress(address, newProgress);
      setProgress(newProgress);
      setTimeout(() => {
        setFeedback(null);
        setIsShaking(false);
      }, 600);
    }
  }, [answer, currentRiddle, progress, address, currentLevelRiddles.length]);

  const startQuest = async () => {
    setGameState('playing');
    if (oracleMode && canUseOracle(isNftHolder)) {
      await fetchOracleRiddle();
    }
  };

  const continueToNextLevel = async () => {
    setGameState('playing');
    setAnswer('');
    setShowHint(false);
    setOracleRiddle(null);
    setOracleResponse(null);
    setOracleConversation([]);
    if (oracleMode && canUseOracle(isNftHolder)) {
      await fetchOracleRiddle();
    }
  };

  const fetchOracleRiddle = async () => {
    if (!progress) return;
    setOracleLoading(true);
    setOracleResponse(null);
    
    const difficulty = progress.currentLevel <= 3 ? 'easy' : progress.currentLevel <= 7 ? 'medium' : 'hard';
    const result = await generateOracleRiddle(progress.currentLevel, difficulty, isNftHolder);
    
    setOracleInteractionsLeft(getOracleInteractionsRemaining(isNftHolder));
    
    if (result.success && result.message) {
      setOracleRiddle(result.message);
      setOracleConversation([{ role: 'assistant', content: result.message }]);
    } else {
      // Fallback: disable Oracle mode and reset state - static riddle will render automatically
      setOracleMode(false);
      setOracleRiddle(null);
      setOracleConversation([]);
      setOracleResponse(null);
      console.log('[RiddleQuest] Oracle unavailable, falling back to static riddles');
    }
    setOracleLoading(false);
  };

  const handleOracleAnswer = async () => {
    if (!oracleRiddle || !answer.trim()) return;
    setOracleLoading(true);
    
    const result = await evaluateOracleAnswer(oracleRiddle, answer, oracleConversation, isNftHolder);
    setOracleInteractionsLeft(getOracleInteractionsRemaining(isNftHolder));
    
    if (result.success) {
      setOracleResponse(result.message);
      setOracleConversation(prev => [...prev, 
        { role: 'user', content: answer },
        { role: 'assistant', content: result.message }
      ]);
      
      if (result.isCorrect) {
        setFeedback('correct');
        triggerConfetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#00ffff', '#bf00ff', '#ffffff']
        });
        
        if (progress && address) {
          const pointsEarned = 150 + (progress.streak > 3 ? 25 : 0);
          const newProgress = { ...progress, points: progress.points + pointsEarned };
          
          const isLastRiddleInLevel = (progress.currentRiddle || 0) >= currentLevelRiddles.length - 1;
          
          if (isLastRiddleInLevel) {
            if (!newProgress.completedLevels.includes(progress.currentLevel)) {
              newProgress.completedLevels.push(progress.currentLevel);
            }
            
            const badge = BADGES_DATA.find(b => b.levelReq === progress.currentLevel);
            if (badge && !newProgress.unlockedBadges.includes(badge.id)) {
              newProgress.unlockedBadges.push(badge.id);
            }
            
            if (progress.currentLevel >= totalLevels) {
              setGameState('game_complete');
            } else {
              setGameState('level_complete');
            }
            
            newProgress.currentLevel = Math.min(progress.currentLevel + 1, totalLevels);
            newProgress.currentRiddle = 0;
          } else {
            newProgress.currentRiddle = (progress.currentRiddle || 0) + 1;
          }
          
          newProgress.failedAttempts = 0;
          saveProgress(address, newProgress);
          updateLeaderboard(address, newProgress.points, newProgress.currentLevel);
          setProgress(newProgress);
          setLeaderboard(getLeaderboard());
          
          setTimeout(() => {
            setFeedback(null);
            setAnswer('');
            setOracleRiddle(null);
            setOracleResponse(null);
            setOracleConversation([]);
          }, 2000);
        }
      } else {
        setFeedback('wrong');
        setIsShaking(true);
        setTimeout(() => {
          setFeedback(null);
          setIsShaking(false);
        }, 600);
      }
    } else {
      // API error - fallback to static riddles
      if (result.fallback) {
        setOracleMode(false);
        setOracleRiddle(null);
        setOracleConversation([]);
        setOracleResponse(null);
        setAnswer('');
        console.log('[RiddleQuest] Oracle evaluation failed, falling back to static riddles');
      }
    }
    setOracleLoading(false);
  };

  const handleOracleHint = async () => {
    if (!oracleRiddle) return;
    setOracleLoading(true);
    
    const result = await getOracleHint(oracleRiddle, oracleConversation, isNftHolder);
    setOracleInteractionsLeft(getOracleInteractionsRemaining(isNftHolder));
    
    if (result.success) {
      setOracleResponse(result.message);
      setOracleConversation(prev => [...prev, { role: 'assistant', content: result.message }]);
      setShowHint(true);
    }
    setOracleLoading(false);
  };

  const shareProgress = () => {
    if (!progress) return;
    const text = `I just reached Level ${progress.currentLevel} in Riddle Quest on @getbasedai! 🧠✨ Can you solve the mysteries of the Giga Brain Galaxy? #BasedGuardians #RiddleQuest`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  
  const startDailyChallenge = () => {
    setGameMode('daily');
    setDailyRiddleIndex(0);
    setDailyStartTime(Date.now());
    setGameState('playing');
    setAnswer('');
    setFeedback(null);
    setShowHint(false);
  };
  
  const currentDailyRiddle = dailySet?.riddles?.[dailyRiddleIndex];
  const isDailyRiddleSolved = useMemo(() => {
    if (!currentDailyRiddle || !dailyProgress) return false;
    return dailyProgress.attempts.some(a => a.riddleEntryId === currentDailyRiddle.id && a.solved);
  }, [currentDailyRiddle, dailyProgress]);
  
  const handleDailySubmit = async () => {
    if (!currentDailyRiddle || !address || isDailyRiddleSolved) return;
    
    const solveTimeMs = dailyStartTime ? Date.now() - dailyStartTime : undefined;
    
    try {
      const result = await submitAttempt.mutateAsync({
        riddleEntryId: currentDailyRiddle.id,
        answer: answer.trim(),
        solveTimeMs,
        isOracle: currentDailyRiddle.isOracle
      });
      
      if (result.isCorrect) {
        setFeedback('correct');
        triggerConfetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: currentDailyRiddle.isOracle 
            ? ['#a855f7', '#d946ef', '#ffffff']
            : ['#00ffff', '#bf00ff', '#ffffff']
        });
        
        setTimeout(() => {
          setFeedback(null);
          setAnswer('');
          if (dailyRiddleIndex < (dailySet?.riddleCount || 5) - 1) {
            setDailyRiddleIndex(prev => prev + 1);
            setDailyStartTime(Date.now());
          } else {
            setGameState('game_complete');
          }
        }, 1500);
      } else {
        setFeedback('wrong');
        setIsShaking(true);
        setTimeout(() => {
          setFeedback(null);
          setIsShaking(false);
        }, 600);
      }
    } catch (error) {
      console.error('[RiddleQuest] Daily submit error:', error);
    }
  };
  
  const toggleOracleMode = () => {
    const newMode = !oracleMode;
    setOracleMode(newMode);
    if (!newMode) {
      setOracleRiddle(null);
      setOracleResponse(null);
      setOracleConversation([]);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.05)_0%,transparent_70%)]" />
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(80)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.2,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
        
        <motion.div 
          className="text-center p-8 relative z-10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6">
            <Lock className="w-20 h-20 text-cyan-500 mx-auto mb-4 animate-pulse" />
          </div>
          <h2 className="text-3xl font-orbitron font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Connect Wallet to Begin Quest
            </span>
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Unlock the secrets of the Giga Brain Galaxy. Your journey awaits, Guardian.
          </p>
          <Button 
            onClick={openConnectModal}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-black font-orbitron font-bold px-8 py-4 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.3)] hover:shadow-[0_0_40px_rgba(0,255,255,0.5)] transition-all"
            data-testid="button-connect-riddle"
          >
            Connect Wallet
          </Button>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'hero') {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.08)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(191,0,255,0.06)_0%,transparent_40%)]" />
        
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(100)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-0.5 h-0.5 bg-white rounded-full"
              initial={{ opacity: 0.2 }}
              animate={{ 
                opacity: [0.2, 0.8, 0.2],
                y: [0, -10, 0]
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>
        
        <motion.div 
          className="text-center max-w-2xl mx-auto relative z-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div
            animate={{ 
              textShadow: [
                '0 0 20px rgba(0,255,255,0.8)',
                '0 0 40px rgba(0,255,255,1)',
                '0 0 20px rgba(0,255,255,0.8)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <h1 className="text-5xl md:text-7xl font-orbitron font-bold mb-6">
              <span 
                className="bg-gradient-to-r from-cyan-400 via-white to-cyan-400 bg-clip-text text-transparent"
                style={{
                  backgroundSize: '200% 100%',
                  animation: 'gradientShift 3s ease-in-out infinite',
                }}
              >
                RIDDLE QUEST
              </span>
            </h1>
          </motion.div>
          
          <style>{`
            @keyframes gradientShift {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
            @keyframes glitch {
              0%, 100% { transform: translate(0); }
              20% { transform: translate(-2px, 2px); }
              40% { transform: translate(-2px, -2px); }
              60% { transform: translate(2px, 2px); }
              80% { transform: translate(2px, -2px); }
            }
          `}</style>
          
          <motion.p 
            className="text-xl md:text-2xl text-purple-300 mb-4 font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ textShadow: '0 0 20px rgba(191,0,255,0.5)' }}
          >
            Unlock the Secrets of the Giga Brain Galaxy
          </motion.p>
          
          <motion.p 
            className="text-gray-400 mb-8 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Wizard Committer is missing. Solve riddles to save the Based Universe.
          </motion.p>
          
          {progress && progress.currentLevel > 1 && (
            <motion.div 
              className="mb-8 p-4 rounded-xl border border-cyan-500/30 bg-black/40 backdrop-blur-sm inline-block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-cyan-400 font-mono text-sm">
                Continue from Level {progress.currentLevel} • {progress.points} Points • {progress.streak} Day Streak {progress.streak > 3 && '🔥'}
              </p>
            </motion.div>
          )}
          
          {/* Game Mode Tabs */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            <Tabs defaultValue="campaign" className="w-full max-w-lg mx-auto">
              <TabsList className="grid w-full grid-cols-2 bg-black/50 border border-cyan-500/30">
                <TabsTrigger 
                  value="campaign" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/30 data-[state=active]:to-purple-500/30 data-[state=active]:text-cyan-400"
                  data-testid="tab-campaign"
                >
                  <Scroll className="w-4 h-4 mr-2" />
                  Campaign
                </TabsTrigger>
                <TabsTrigger 
                  value="daily"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/30 data-[state=active]:to-cyan-500/30 data-[state=active]:text-purple-400"
                  data-testid="tab-daily"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Daily Challenge
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="campaign" className="mt-6">
                {/* Oracle Mode Toggle */}
                <div className="mb-6">
                  <div className="inline-flex items-center gap-4 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30">
                    <Bot className={`w-5 h-5 ${oracleMode ? 'text-purple-400' : 'text-gray-500'}`} />
                    <span className="text-sm font-mono text-gray-300">Guardian Oracle Mode</span>
                    <Switch
                      checked={oracleMode}
                      onCheckedChange={toggleOracleMode}
                      className="data-[state=checked]:bg-purple-500"
                      data-testid="switch-oracle-mode"
                    />
                    {oracleMode && (
                      <span className="text-xs text-purple-400 font-mono">
                        {oracleInteractionsLeft} uses left
                      </span>
                    )}
                  </div>
                  {oracleMode && (
                    <p className="text-xs text-purple-300/60 mt-2">
                      AI-powered dynamic riddles • More challenging • +50% bonus points
                    </p>
                  )}
                </div>
                
                <Button
                  onClick={startQuest}
                  className="group bg-gradient-to-r from-cyan-500 via-cyan-400 to-purple-500 text-black font-orbitron font-bold text-xl px-12 py-6 rounded-2xl shadow-[0_0_40px_rgba(0,255,255,0.4)] hover:shadow-[0_0_60px_rgba(0,255,255,0.6)] transition-all transform hover:scale-105"
                  data-testid="button-begin-quest"
                >
                  <motion.span
                    animate={{ opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex items-center gap-3"
                  >
                    {progress && progress.currentLevel > 1 ? 'Continue Quest' : 'Begin Quest'}
                    <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </motion.span>
                </Button>
              </TabsContent>
              
              <TabsContent value="daily" className="mt-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-cyan-500/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">Today's Progress</span>
                      <span className="text-lg font-bold text-purple-400">
                        {dailyProgress?.solved || 0} / {dailySet?.riddleCount || 5}
                      </span>
                    </div>
                    <Progress 
                      value={((dailyProgress?.solved || 0) / (dailySet?.riddleCount || 5)) * 100} 
                      className="h-2 bg-black/30"
                    />
                    {dailySet?.generatedViaOracle && (
                      <div className="flex items-center gap-2 mt-3 text-xs text-purple-300">
                        <Bot className="w-3 h-3" />
                        <span>Oracle-generated riddles (+50% points)</span>
                      </div>
                    )}
                  </div>
                  
                  {riddleStats?.stats && (
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-black/30 border border-cyan-500/20">
                        <div className="text-lg font-bold text-cyan-400">{riddleStats.stats.totalSolves}</div>
                        <div className="text-[10px] text-gray-500 uppercase">Total Solved</div>
                      </div>
                      <div className="p-3 rounded-lg bg-black/30 border border-purple-500/20">
                        <div className="text-lg font-bold text-purple-400">{riddleStats.stats.points}</div>
                        <div className="text-[10px] text-gray-500 uppercase">Points</div>
                      </div>
                      <div className="p-3 rounded-lg bg-black/30 border border-orange-500/20">
                        <div className="text-lg font-bold text-orange-400">{riddleStats.stats.currentStreak}</div>
                        <div className="text-[10px] text-gray-500 uppercase">Streak</div>
                      </div>
                    </div>
                  )}
                  
                  <Button
                    onClick={startDailyChallenge}
                    disabled={dailyLoading || (dailyProgress?.solved || 0) >= (dailySet?.riddleCount || 5)}
                    className="w-full group bg-gradient-to-r from-purple-500 via-fuchsia-500 to-cyan-500 text-white font-orbitron font-bold text-lg px-8 py-5 rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_50px_rgba(168,85,247,0.6)] transition-all disabled:opacity-50"
                    data-testid="button-start-daily"
                  >
                    {dailyLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (dailyProgress?.solved || 0) >= (dailySet?.riddleCount || 5) ? (
                      <span className="flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        All Completed!
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        <Calendar className="w-5 h-5" />
                        Start Daily Challenge
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
          
          <motion.div 
            className="mt-12 grid grid-cols-3 gap-4 max-w-md mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-400">{totalLevels}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Levels</p>
            </div>
            <div className="text-center border-x border-cyan-500/20">
              <p className="text-2xl font-bold text-purple-400">{RIDDLES.length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Riddles</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{BADGES_DATA.length}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Badges</p>
            </div>
          </motion.div>
          
          {/* Leaderboard Section */}
          <motion.div
            className="mt-12 max-w-md mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
          >
            <div className="p-4 rounded-xl border border-cyan-500/20 bg-black/30 backdrop-blur-sm">
              <RiddleLeaderboard compact limit={5} />
            </div>
          </motion.div>
          
          {/* Milestone Journey Map */}
          <motion.div
            className="mt-8 max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
          >
            <MilestoneMap 
              currentPoints={riddleStats?.stats?.points || progress?.points || 0}
              totalSolves={riddleStats?.stats?.totalSolves || progress?.completedLevels?.length || 0}
            />
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'level_complete' || gameState === 'game_complete') {
    const completedLevel = (progress?.currentLevel || 2) - 1;
    const earnedBadge = BADGES_DATA.find(b => b.levelReq === completedLevel);
    
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.1)_0%,transparent_50%)]" />
        
        <motion.div 
          className="text-center max-w-lg mx-auto relative z-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', duration: 0.8 }}
        >
          {gameState === 'game_complete' ? (
            <>
              <Crown className="w-24 h-24 text-yellow-400 mx-auto mb-6 animate-bounce" />
              <h2 className="text-4xl font-orbitron font-bold text-white mb-4">
                <span className="bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                  QUEST COMPLETE!
                </span>
              </h2>
              <p className="text-gray-300 mb-6">
                You've mastered all riddles of the Giga Brain Galaxy! The Based Universe is saved!
              </p>
            </>
          ) : (
            <>
              <Trophy className="w-20 h-20 text-cyan-400 mx-auto mb-6" />
              <h2 className="text-3xl font-orbitron font-bold text-white mb-4">
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Level {completedLevel} Complete!
                </span>
              </h2>
              <p className="text-gray-400 mb-6">
                Excellent work, Guardian! The mysteries of the galaxy reveal themselves to you.
              </p>
            </>
          )}
          
          {earnedBadge && (
            <motion.div 
              className="mb-8 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Award className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-amber-400 font-bold">Badge Unlocked: {earnedBadge.name}</p>
              <p className="text-amber-300/60 text-sm">{earnedBadge.description}</p>
            </motion.div>
          )}
          
          <div className="flex gap-4 justify-center">
            <Button
              onClick={shareProgress}
              variant="outline"
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
              data-testid="button-share-riddle"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            
            {gameState !== 'game_complete' && (
              <Button
                onClick={continueToNextLevel}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 text-black font-bold"
                data-testid="button-continue-riddle"
              >
                Next Level
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] px-4 py-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,255,255,0.03)_0%,transparent_70%)]" />
      
      <div className="fixed top-20 left-0 right-0 z-40 bg-gradient-to-b from-black/95 via-black/90 to-transparent backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,255,255,0.15)]">
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 rounded-lg border border-cyan-500/40">
                <Brain className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 font-orbitron font-bold text-sm">
                  LVL {progress?.currentLevel || 1}
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 flex-1 max-w-[200px]">
                <span className="text-xs text-gray-500 font-mono">{(progress?.currentRiddle || 0) + 1}/{currentLevelRiddles.length}</span>
                <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden border border-cyan-500/30">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((progress?.currentRiddle || 0) / currentLevelRiddles.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 rounded-lg border border-amber-500/40">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 font-mono font-bold text-sm">{progress?.points || 0}</span>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 bg-black/60 rounded-lg border ${(progress?.streak || 0) > 3 ? 'border-orange-500/50' : 'border-gray-700/50'}`}>
                <Flame className={`w-4 h-4 ${(progress?.streak || 0) > 3 ? 'text-orange-400 animate-pulse' : 'text-gray-500'}`} />
                <span className={`font-mono font-bold text-sm ${(progress?.streak || 0) > 3 ? 'text-orange-400' : 'text-gray-400'}`}>
                  {progress?.streak || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto pt-20 relative z-10">
        {/* Oracle Loading State */}
        {oracleMode && oracleLoading && (
          <motion.div
            className="flex flex-col items-center justify-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-xl animate-pulse" />
              <Bot className="w-16 h-16 text-purple-400 relative z-10 animate-bounce" />
            </div>
            <p className="mt-6 text-purple-300 font-mono text-sm animate-pulse">
              The Oracle contemplates your fate...
            </p>
          </motion.div>
        )}
        
        <AnimatePresence mode="wait">
          {/* Oracle Mode Riddle Display */}
          {oracleMode && oracleRiddle && !oracleLoading && (
            <motion.div
              key="oracle-riddle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/50 via-cyan-500/50 to-purple-500/50 rounded-2xl blur-lg opacity-60 animate-pulse" />
                
                <Card 
                  className={`relative bg-gradient-to-b from-purple-900/30 to-black/95 border-0 p-6 md:p-8 rounded-2xl overflow-hidden ${isShaking ? 'animate-[shake_0.1s_ease-in-out_infinite]' : ''}`}
                  style={{
                    boxShadow: feedback === 'correct' 
                      ? '0 0 60px rgba(0,255,255,0.5), inset 0 0 40px rgba(0,255,255,0.1)' 
                      : feedback === 'wrong'
                      ? '0 0 60px rgba(255,0,0,0.5), inset 0 0 40px rgba(255,0,0,0.1)'
                      : '0 0 40px rgba(191,0,255,0.25), inset 0 0 30px rgba(191,0,255,0.05)'
                  }}
                >
                  <style>{`
                    @keyframes shake {
                      0%, 100% { transform: translateX(0); }
                      25% { transform: translateX(-5px); }
                      75% { transform: translateX(5px); }
                    }
                  `}</style>
                  
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-500 to-purple-500" />
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-6 relative">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full blur-md opacity-70 animate-pulse" />
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-500/30 flex items-center justify-center relative border-2 border-purple-500/50 shadow-[0_0_25px_rgba(191,0,255,0.4)]">
                          <Bot className="w-6 h-6 text-purple-300" />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-purple-400 font-mono uppercase tracking-wider">Guardian Oracle</p>
                        <Badge variant="outline" className="border-purple-500/50 text-cyan-400 bg-purple-500/10 font-mono text-xs">
                          {oracleInteractionsLeft} uses remaining
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">Level</p>
                      <p className="text-purple-400 font-orbitron font-bold">{progress?.currentLevel || 1}</p>
                    </div>
                  </div>
                  
                  <div className="mb-6 py-4 relative">
                    <p className="text-lg md:text-xl text-gray-200 font-medium leading-relaxed text-center italic">
                      <TypewriterText 
                        text={oracleRiddle} 
                        delay={50}
                        className="text-gray-200"
                      />
                    </p>
                  </div>
                  
                  {/* Oracle Response Display */}
                  <AnimatePresence>
                    {oracleResponse && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`mb-4 p-4 rounded-lg border ${
                          feedback === 'correct' 
                            ? 'bg-cyan-500/10 border-cyan-500/30' 
                            : 'bg-purple-500/10 border-purple-500/30'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <MessageCircle className={`w-5 h-5 mt-0.5 ${feedback === 'correct' ? 'text-cyan-400' : 'text-purple-400'}`} />
                          <p className={`text-sm ${feedback === 'correct' ? 'text-cyan-300' : 'text-purple-300'}`}>
                            {oracleResponse}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="flex gap-3">
                    <Input
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !oracleLoading && handleOracleAnswer()}
                      placeholder="Speak your answer to the Oracle..."
                      className="flex-1 bg-black/40 border-purple-500/30 text-white placeholder:text-gray-500 focus:border-purple-400 focus:ring-purple-400/20"
                      data-testid="input-oracle-answer"
                      disabled={oracleLoading}
                    />
                    <Button
                      onClick={handleOracleAnswer}
                      disabled={!answer.trim() || oracleLoading}
                      className="bg-gradient-to-r from-purple-500 to-cyan-500 text-black font-bold px-6 disabled:opacity-50 shadow-[0_0_20px_rgba(191,0,255,0.3)] hover:shadow-[0_0_30px_rgba(191,0,255,0.5)]"
                      data-testid="button-submit-oracle"
                    >
                      {oracleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit'}
                    </Button>
                  </div>
                  
                  {/* Oracle Hint Button */}
                  {oracleInteractionsLeft > 0 && !showHint && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        onClick={handleOracleHint}
                        variant="ghost"
                        size="sm"
                        className="text-purple-400/60 hover:text-purple-400 hover:bg-purple-500/10"
                        disabled={oracleLoading}
                        data-testid="button-oracle-hint"
                      >
                        <Lightbulb className="w-4 h-4 mr-2" />
                        Request Oracle Guidance
                      </Button>
                    </div>
                  )}
                  
                  {/* Feedback Display */}
                  <AnimatePresence>
                    {feedback === 'correct' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 p-4 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center gap-3"
                      >
                        <Check className="w-6 h-6 text-cyan-400" />
                        <span className="text-cyan-400 font-bold">The Oracle acknowledges your wisdom! +{150 + ((progress?.streak || 0) > 3 ? 25 : 0)} points</span>
                      </motion.div>
                    )}
                    
                    {feedback === 'wrong' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center gap-3"
                      >
                        <X className="w-6 h-6 text-red-400" />
                        <span className="text-red-400">The Oracle awaits a different answer...</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </div>
            </motion.div>
          )}
          
          {/* Daily Challenge Mode Display */}
          {gameMode === 'daily' && currentDailyRiddle && (
            <motion.div
              key={`daily-${dailyRiddleIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="relative">
                <div className={`absolute -inset-1 rounded-2xl blur-lg opacity-60 animate-pulse ${
                  currentDailyRiddle.isOracle 
                    ? 'bg-gradient-to-r from-purple-500/50 via-fuchsia-500/50 to-purple-500/50'
                    : 'bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-cyan-500/50'
                }`} />
                
                <Card 
                  className={`relative bg-gradient-to-b ${
                    currentDailyRiddle.isOracle ? 'from-purple-900/30' : 'from-gray-900/95'
                  } to-black/95 border-0 p-6 md:p-8 rounded-2xl overflow-hidden ${isShaking ? 'animate-[shake_0.1s_ease-in-out_infinite]' : ''}`}
                  style={{
                    boxShadow: feedback === 'correct' 
                      ? '0 0 60px rgba(0,255,255,0.5), inset 0 0 40px rgba(0,255,255,0.1)' 
                      : feedback === 'wrong'
                      ? '0 0 60px rgba(255,0,0,0.5), inset 0 0 40px rgba(255,0,0,0.1)'
                      : currentDailyRiddle.isOracle
                      ? '0 0 40px rgba(168,85,247,0.25), inset 0 0 30px rgba(168,85,247,0.05)'
                      : '0 0 40px rgba(0,255,255,0.25), inset 0 0 30px rgba(0,255,255,0.05)'
                  }}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                    currentDailyRiddle.isOracle 
                      ? 'from-purple-500 via-fuchsia-500 to-purple-500' 
                      : 'from-cyan-500 via-purple-500 to-cyan-500'
                  }`} />
                  
                  <div className="flex items-center justify-between mb-6 relative">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`absolute -inset-1 rounded-full blur-md opacity-70 animate-pulse ${
                          currentDailyRiddle.isOracle ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500' : 'bg-gradient-to-r from-cyan-500 to-purple-500'
                        }`} />
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center relative border-2 shadow-lg ${
                          currentDailyRiddle.isOracle 
                            ? 'bg-gradient-to-br from-purple-500/30 to-fuchsia-500/30 border-purple-500/50' 
                            : 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-cyan-500/50'
                        }`}>
                          <Calendar className={`w-6 h-6 ${currentDailyRiddle.isOracle ? 'text-purple-300' : 'text-cyan-300'}`} />
                        </div>
                      </div>
                      <div>
                        <p className={`text-xs font-mono uppercase tracking-wider ${currentDailyRiddle.isOracle ? 'text-purple-400' : 'text-cyan-400'}`}>
                          Daily Challenge
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`font-mono text-xs ${
                            currentDailyRiddle.isOracle 
                              ? 'border-purple-500/50 text-fuchsia-400 bg-purple-500/10'
                              : 'border-cyan-500/50 text-purple-400 bg-purple-500/10'
                          }`}>
                            {dailyRiddleIndex + 1} / {dailySet?.riddleCount || 5}
                          </Badge>
                          {currentDailyRiddle.isOracle && (
                            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50 text-[10px]">
                              <Bot className="w-3 h-3 mr-1" />
                              Oracle
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">Difficulty</p>
                      <p className={`font-bold capitalize ${
                        currentDailyRiddle.difficulty === 'hard' ? 'text-red-400' :
                        currentDailyRiddle.difficulty === 'medium' ? 'text-yellow-400' :
                        'text-green-400'
                      }`}>{currentDailyRiddle.difficulty}</p>
                    </div>
                  </div>
                  
                  <div className="mb-8 py-4 relative">
                    <p className="text-xl md:text-2xl text-white font-medium leading-relaxed text-center">
                      "<TypewriterText 
                        text={currentDailyRiddle.question} 
                        delay={50}
                        className="text-white"
                      />"
                    </p>
                  </div>
                  
                  <AnimatePresence>
                    {showHint && currentDailyRiddle.hint && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
                      >
                        <div className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400 text-sm">Hint: {currentDailyRiddle.hint}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="flex gap-3">
                    <Input
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !submitAttempt.isPending && handleDailySubmit()}
                      placeholder="Enter your answer..."
                      className={`flex-1 bg-black/40 text-white placeholder:text-gray-500 ${
                        currentDailyRiddle.isOracle 
                          ? 'border-purple-500/30 focus:border-purple-400 focus:ring-purple-400/20'
                          : 'border-cyan-500/30 focus:border-cyan-400 focus:ring-cyan-400/20'
                      }`}
                      data-testid="input-daily-answer"
                      disabled={submitAttempt.isPending || isDailyRiddleSolved}
                    />
                    <Button
                      onClick={handleDailySubmit}
                      disabled={!answer.trim() || submitAttempt.isPending || isDailyRiddleSolved}
                      className={`font-bold px-6 disabled:opacity-50 ${
                        currentDailyRiddle.isOracle
                          ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]'
                          : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-black shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)]'
                      }`}
                      data-testid="button-submit-daily"
                    >
                      {submitAttempt.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : isDailyRiddleSolved ? <Check className="w-5 h-5" /> : 'Submit'}
                    </Button>
                  </div>
                  
                  {currentDailyRiddle.hint && !showHint && !isDailyRiddleSolved && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        onClick={() => setShowHint(true)}
                        variant="ghost"
                        size="sm"
                        className="text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10"
                        data-testid="button-daily-hint"
                      >
                        <Lightbulb className="w-4 h-4 mr-2" />
                        Show Hint
                      </Button>
                    </div>
                  )}
                  
                  <AnimatePresence>
                    {feedback === 'correct' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 p-4 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center gap-3"
                      >
                        <Check className="w-6 h-6 text-cyan-400" />
                        <span className="text-cyan-400 font-bold">Correct! Points earned!</span>
                      </motion.div>
                    )}
                    
                    {feedback === 'wrong' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center gap-3"
                      >
                        <X className="w-6 h-6 text-red-400" />
                        <span className="text-red-400">Not quite right. Try again!</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </div>
              
              {/* Back to Menu Button */}
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={() => {
                    setGameState('hero');
                    setGameMode('campaign');
                    setAnswer('');
                    setFeedback(null);
                  }}
                  variant="outline"
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                  data-testid="button-back-daily"
                >
                  Back to Menu
                </Button>
              </div>
            </motion.div>
          )}
          
          {/* Standard Mode Riddle Display */}
          {gameMode === 'campaign' && !oracleMode && currentRiddle && (
            <motion.div
              key={`${progress?.currentLevel}-${progress?.currentRiddle}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/50 via-purple-500/50 to-cyan-500/50 rounded-2xl blur-lg opacity-60 animate-pulse" />
                
                <Card 
                  className={`relative bg-gradient-to-b from-gray-900/95 to-black/95 border-0 p-6 md:p-8 rounded-2xl overflow-hidden ${isShaking ? 'animate-[shake_0.1s_ease-in-out_infinite]' : ''}`}
                  style={{
                    boxShadow: feedback === 'correct' 
                      ? '0 0 60px rgba(0,255,255,0.5), inset 0 0 40px rgba(0,255,255,0.1)' 
                      : feedback === 'wrong'
                      ? '0 0 60px rgba(255,0,0,0.5), inset 0 0 40px rgba(255,0,0,0.1)'
                      : '0 0 40px rgba(0,255,255,0.25), inset 0 0 30px rgba(0,255,255,0.05)'
                  }}
                >
                  <style>{`
                    @keyframes shake {
                      0%, 100% { transform: translateX(0); }
                      25% { transform: translateX(-5px); }
                      75% { transform: translateX(5px); }
                    }
                  `}</style>
                  
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500" />
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
                  <div className="absolute top-0 left-0 w-20 h-20 bg-cyan-500/10 rounded-br-full pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-20 h-20 bg-purple-500/10 rounded-tl-full pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-6 relative">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-md opacity-70 animate-pulse" />
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 p-0.5 relative border-2 border-cyan-500/50 shadow-[0_0_25px_rgba(0,255,255,0.4)]">
                          <img 
                            src={MindWarpStrategist} 
                            alt="Mind Warp Strategist" 
                            className="w-full h-full rounded-full object-cover"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-cyan-400 font-mono uppercase tracking-wider">Mind Warp Strategist</p>
                        <Badge variant="outline" className="border-purple-500/50 text-purple-400 bg-purple-500/10 font-mono text-xs">
                          {(progress?.currentRiddle || 0) + 1} / {currentLevelRiddles.length}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 font-mono uppercase tracking-wider">Level</p>
                      <p className="text-cyan-400 font-orbitron font-bold">{progress?.currentLevel || 1}</p>
                    </div>
                  </div>
                  
                  <div className="mb-8 py-4 relative">
                    <p className="text-xl md:text-2xl text-white font-medium leading-relaxed text-center">
                      "<TypewriterText 
                        text={currentRiddle.question} 
                        delay={50}
                        className="text-white"
                      />"
                    </p>
                  </div>
                
                <AnimatePresence>
                  {showHint && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
                    >
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-400 text-sm">Hint: {currentRiddle.hint}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="flex gap-3">
                  <Input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                    placeholder="Enter your answer..."
                    className="flex-1 bg-black/40 border-cyan-500/30 text-white placeholder:text-gray-500 focus:border-cyan-400 focus:ring-cyan-400/20"
                    data-testid="input-riddle-answer"
                  />
                  <Button
                    onClick={checkAnswer}
                    disabled={!answer.trim()}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500 text-black font-bold px-6 disabled:opacity-50 shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)]"
                    data-testid="button-submit-riddle"
                  >
                    Submit
                  </Button>
                </div>
                
                <AnimatePresence>
                  {feedback === 'correct' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 p-4 rounded-lg bg-cyan-500/20 border border-cyan-500/50 flex items-center gap-3"
                    >
                      <Check className="w-6 h-6 text-cyan-400" />
                      <span className="text-cyan-400 font-bold">Passage Unlocked! +{100 + ((progress?.streak || 0) > 3 ? 25 : 0)} points</span>
                    </motion.div>
                  )}
                  
                  {feedback === 'wrong' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center gap-3"
                    >
                      <X className="w-6 h-6 text-red-400" />
                      <span className="text-red-400">Try again, Guardian...</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <Card className="bg-black/40 border-cyan-500/20 p-5 backdrop-blur-sm">
            <h3 className="text-lg font-orbitron font-bold text-cyan-400 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Badges
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {BADGES_DATA.map((badge) => {
                const isUnlocked = progress?.unlockedBadges.includes(badge.id);
                const Icon = badge.icon;
                return (
                  <div 
                    key={badge.id}
                    className={`aspect-square rounded-lg border flex items-center justify-center relative group ${
                      isUnlocked 
                        ? `border-${badge.color}-500/50 bg-${badge.color}-500/10` 
                        : 'border-gray-700/50 bg-gray-900/50'
                    }`}
                    title={`${badge.name}: ${badge.description}`}
                  >
                    <Icon className={`w-6 h-6 ${isUnlocked ? `text-${badge.color}-400` : 'text-gray-600'}`} />
                    {!isUnlocked && (
                      <Lock className="w-3 h-3 text-gray-600 absolute bottom-1 right-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
          
          <Card className="bg-black/40 border-purple-500/20 p-5 backdrop-blur-sm">
            <h3 className="text-lg font-orbitron font-bold text-purple-400 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Leaderboard
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {leaderboard.slice(0, 10).map((entry, idx) => (
                <div 
                  key={entry.address}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                    entry.address.toLowerCase() === address?.toLowerCase() 
                      ? 'bg-cyan-500/20 border border-cyan-500/30' 
                      : 'bg-black/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${idx < 3 ? 'text-amber-400' : 'text-gray-500'}`}>
                      #{idx + 1}
                    </span>
                    <span className="text-gray-300 font-mono text-sm">
                      {formatAddress(entry.address)}
                    </span>
                  </div>
                  <span className="text-cyan-400 font-mono">{entry.points}</span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-gray-500 text-center py-4">Be the first to conquer the quest!</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
