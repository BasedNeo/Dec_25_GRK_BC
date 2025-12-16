import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { 
  Rocket, Shield, Crown, Pickaxe, 
  BookOpen, Vote, Map, Lock, CheckCircle,
  Sparkles, Users, Flame, Calendar, TrendingUp,
  Star, Award, Compass, Swords
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ethers } from 'ethers';
import { RPC_URL, NFT_CONTRACT } from '@/lib/constants';
import confetti from 'canvas-confetti';

const NFT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function tokenOfOwnerByIndex(address, uint256) view returns (uint256)'
];

const PAGES = ['hub', 'universe', 'mint', 'gallery', 'escrow', 'voting', 'pool'];

interface LevelRequirement {
  nfts: number;
  votes: number;
  pagesPercent: number;
  allPages: boolean;
  story: boolean;
  hasAllTypes: boolean;
}

const LEVELS: Array<{
  name: string;
  quote: string;
  icon: typeof Rocket;
  color: string;
  bgGradient: string;
  requirements: LevelRequirement;
}> = [
  { 
    name: 'Greenhorn Guardian', 
    quote: "You've stepped into the Giga Brain Galaxy. The journey begins.",
    icon: Rocket, 
    color: 'text-gray-400',
    bgGradient: 'from-gray-600/20 to-gray-800/20',
    requirements: { nfts: 1, votes: 1, pagesPercent: 25, allPages: false, story: false, hasAllTypes: false }
  },
  { 
    name: 'Cadet Guardian', 
    quote: "Your voice echoes in the advisory council.",
    icon: Vote, 
    color: 'text-green-400',
    bgGradient: 'from-green-600/20 to-green-800/20',
    requirements: { nfts: 2, votes: 1, pagesPercent: 50, allPages: false, story: false, hasAllTypes: false }
  },
  { 
    name: 'Working Class Guardian', 
    quote: "Exploring the Brain-Planets, learning the ways of the Based.",
    icon: Pickaxe, 
    color: 'text-cyan-400',
    bgGradient: 'from-cyan-600/20 to-cyan-800/20',
    requirements: { nfts: 2, votes: 2, pagesPercent: 50, allPages: false, story: false, hasAllTypes: false }
  },
  { 
    name: 'Guardian Officer', 
    quote: "Leading the front lines against FUD.",
    icon: Shield, 
    color: 'text-blue-400',
    bgGradient: 'from-blue-600/20 to-blue-800/20',
    requirements: { nfts: 6, votes: 2, pagesPercent: 100, allPages: true, story: true, hasAllTypes: false }
  },
  { 
    name: 'Guardian Lieutenant', 
    quote: "Master of the Based Universe's secrets.",
    icon: Map, 
    color: 'text-purple-400',
    bgGradient: 'from-purple-600/20 to-purple-800/20',
    requirements: { nfts: 8, votes: 2, pagesPercent: 100, allPages: true, story: true, hasAllTypes: true }
  },
  { 
    name: 'Guardian Squad Leader', 
    quote: "Co-creator of the epic — your ideas shape the cosmos.",
    icon: BookOpen, 
    color: 'text-amber-400',
    bgGradient: 'from-amber-600/20 to-amber-800/20',
    requirements: { nfts: 10, votes: 2, pagesPercent: 100, allPages: true, story: true, hasAllTypes: true }
  },
  { 
    name: 'Guardian Captain', 
    quote: "Commander of a diverse legion — unity in strength.",
    icon: Users, 
    color: 'text-pink-400',
    bgGradient: 'from-pink-600/20 to-pink-800/20',
    requirements: { nfts: 15, votes: 2, pagesPercent: 100, allPages: true, story: true, hasAllTypes: true }
  },
  { 
    name: 'Guardian Commander', 
    quote: "Legend of the Based Life Community. The stars are yours.",
    icon: Crown, 
    color: 'text-yellow-400',
    bgGradient: 'from-yellow-500/20 to-amber-600/20',
    requirements: { nfts: 20, votes: 2, pagesPercent: 100, allPages: true, story: true, hasAllTypes: true }
  },
];

const BADGES = [
  { id: 'greenhorn', name: 'Greenhorn', icon: Rocket, color: 'cyan', description: '1 NFT + 1 Vote + 25% pages', levelReq: 0 },
  { id: 'cadet', name: 'Cadet', icon: Vote, color: 'green', description: '2 NFTs + 50% pages', levelReq: 1 },
  { id: 'worker', name: 'Working Class', icon: Pickaxe, color: 'cyan', description: '2 NFTs + 2 Votes', levelReq: 2 },
  { id: 'officer', name: 'Officer', icon: Shield, color: 'blue', description: '6 NFTs + Story + All Pages', levelReq: 3 },
  { id: 'lieutenant', name: 'Lieutenant', icon: Map, color: 'purple', description: '8 NFTs + All Types', levelReq: 4 },
  { id: 'squad_leader', name: 'Squad Leader', icon: BookOpen, color: 'amber', description: '10 NFTs collected', levelReq: 5 },
  { id: 'captain', name: 'Captain', icon: Users, color: 'pink', description: '15 NFTs collected', levelReq: 6 },
  { id: 'commander', name: 'Commander', icon: Crown, color: 'yellow', description: '20 NFTs - Legendary', levelReq: 7 },
];

export function UserStats() {
  const { address, isConnected } = useAccount();
  const [nftCount, setNftCount] = useState(0);
  const [nftBreakdown, setNftBreakdown] = useState({ guardians: 0, frogs: 0, creatures: 0 });
  const [votesCount, setVotesCount] = useState(0);
  const [pagesVisited, setPagesVisited] = useState<string[]>([]);
  const [hasSubmittedStory, setHasSubmittedStory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previousLevel, setPreviousLevel] = useState(-1);
  const [loginStreak, setLoginStreak] = useState(0);
  const [daysAsGuardian, setDaysAsGuardian] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    const visited = JSON.parse(localStorage.getItem('pagesVisited') || '[]');
    setPagesVisited(visited);
    
    const storySubmitted = localStorage.getItem('storySubmitted') === 'true';
    setHasSubmittedStory(storySubmitted);
    
    const savedVotes = parseInt(localStorage.getItem('userVotesCount') || '0');
    setVotesCount(savedVotes);

    const firstVisit = localStorage.getItem('firstVisitDate');
    if (!firstVisit) {
      localStorage.setItem('firstVisitDate', new Date().toISOString());
      setDaysAsGuardian(1);
    } else {
      const days = Math.ceil((Date.now() - new Date(firstVisit).getTime()) / (1000 * 60 * 60 * 24));
      setDaysAsGuardian(Math.max(1, days));
    }

    const lastLogin = localStorage.getItem('lastLoginDate');
    const today = new Date().toDateString();
    const streak = parseInt(localStorage.getItem('loginStreak') || '0');
    
    if (lastLogin) {
      const lastDate = new Date(lastLogin);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastDate.toDateString() === yesterday.toDateString()) {
        const newStreak = streak + 1;
        setLoginStreak(newStreak);
        localStorage.setItem('loginStreak', newStreak.toString());
      } else if (lastDate.toDateString() !== today) {
        setLoginStreak(1);
        localStorage.setItem('loginStreak', '1');
      } else {
        setLoginStreak(streak);
      }
    } else {
      setLoginStreak(1);
      localStorage.setItem('loginStreak', '1');
    }
    localStorage.setItem('lastLoginDate', today);
  }, []);

  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    const fetchNFTData = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(NFT_CONTRACT, NFT_ABI, provider);
        
        const balance = await contract.balanceOf(address);
        const count = Number(balance);
        setNftCount(count);

        let guardians = 0, frogs = 0, creatures = 0;
        for (let i = 0; i < Math.min(count, 50); i++) {
          try {
            const tokenId = await contract.tokenOfOwnerByIndex(address, i);
            const id = Number(tokenId);
            if (id <= 1776) guardians++;
            else if (id <= 1776 + 1320) frogs++;
            else creatures++;
          } catch {
            break;
          }
        }
        
        if (count > 50) {
          const ratio = count / 50;
          guardians = Math.round(guardians * ratio);
          frogs = Math.round(frogs * ratio);
          creatures = Math.round(creatures * ratio);
        }
        
        setNftBreakdown({ guardians, frogs, creatures });
      } catch (e) {
        console.error('Failed to fetch NFT data:', e);
      }
      setLoading(false);
    };

    fetchNFTData();
  }, [address, isConnected]);

  const hasAllTypes = nftBreakdown.guardians > 0 && nftBreakdown.frogs > 0 && nftBreakdown.creatures > 0;
  const pagesPercent = (pagesVisited.length / PAGES.length) * 100;
  const allPagesVisited = pagesVisited.length >= PAGES.length;

  const getCurrentLevel = () => {
    let level = -1;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      const req = LEVELS[i].requirements;
      const meetsNfts = nftCount >= req.nfts;
      const meetsVotes = votesCount >= req.votes;
      const meetsPages = req.allPages ? allPagesVisited : pagesPercent >= req.pagesPercent;
      const meetsStory = !req.story || hasSubmittedStory;
      const meetsTypes = !req.hasAllTypes || hasAllTypes;
      
      if (meetsNfts && meetsVotes && meetsPages && meetsStory && meetsTypes) {
        level = i;
        break;
      }
    }
    return level;
  };

  const currentLevel = getCurrentLevel();
  const currentLevelData = currentLevel >= 0 ? LEVELS[currentLevel] : null;
  const nextLevel = currentLevel < LEVELS.length - 1 ? LEVELS[currentLevel + 1] : null;

  useEffect(() => {
    if (currentLevel > previousLevel && previousLevel >= 0) {
      setShowLevelUp(true);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.4 },
        colors: ['#00ffff', '#bf00ff', '#ffd700', '#ffffff']
      });
      setTimeout(() => setShowLevelUp(false), 3000);
    }
    setPreviousLevel(currentLevel);
  }, [currentLevel, previousLevel]);

  const getProgressToNextLevel = () => {
    if (!nextLevel) return 100;
    const req = nextLevel.requirements;
    
    const nftProgress = req.nfts > 0 ? Math.min(100, (nftCount / req.nfts) * 100) : 100;
    const voteProgress = req.votes > 0 ? Math.min(100, (votesCount / req.votes) * 100) : 100;
    const pageProgress = req.allPages ? (allPagesVisited ? 100 : (pagesPercent / 100) * 100) : 100;
    const storyProgress = req.story ? (hasSubmittedStory ? 100 : 0) : 100;
    const typeProgress = req.hasAllTypes ? (hasAllTypes ? 100 : ((nftBreakdown.guardians > 0 ? 33 : 0) + (nftBreakdown.frogs > 0 ? 33 : 0) + (nftBreakdown.creatures > 0 ? 34 : 0))) : 100;
    
    return Math.min(nftProgress, voteProgress, pageProgress, storyProgress, typeProgress);
  };

  if (!isConnected) {
    return (
      <section className="py-8 min-h-screen" data-testid="user-stats-locked">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <motion.div 
              className="relative mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100 }}
            >
              <div className="w-40 h-40 rounded-full border-2 border-cyan-500/30 flex items-center justify-center bg-gradient-to-br from-black to-gray-900">
                <Lock className="w-20 h-20 text-cyan-400/50" />
              </div>
              <div className="absolute inset-0 border-t-2 border-cyan-400 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-2 border-b-2 border-purple-400 rounded-full animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }} />
            </motion.div>
            <h2 className="text-3xl font-orbitron font-bold text-white mb-4 text-center">Connect to View Your Stats</h2>
            <p className="text-gray-400 text-center max-w-md mb-6">
              Link your wallet to unlock your Guardian journey and track your progress through the Giga Brain Galaxy.
            </p>
            <div className="flex gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2"><Rocket className="w-4 h-4 text-cyan-500" /> 8 Levels</div>
              <div className="flex items-center gap-2"><Award className="w-4 h-4 text-purple-500" /> 8 Badges</div>
              <div className="flex items-center gap-2"><Flame className="w-4 h-4 text-amber-500" /> Streaks</div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 min-h-screen relative overflow-hidden" data-testid="user-stats-page">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,255,255,0.08)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(191,0,255,0.08)_0%,transparent_50%)]" />
      
      {showLevelUp && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.5 }}
        >
          <div className="text-center">
            <motion.div 
              className="text-6xl md:text-8xl font-orbitron font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500"
              animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: 3 }}
            >
              LEVEL UP!
            </motion.div>
            <motion.div 
              className="text-2xl md:text-3xl font-orbitron text-yellow-400 mt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {currentLevelData?.name}
            </motion.div>
          </div>
        </motion.div>
      )}
      
      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <motion.div 
          className="text-center mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1 className="text-3xl md:text-5xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-2">
            Your Guardian Journey
          </h1>
          <p className="text-gray-400 font-mono text-sm">Your Role in the Saga</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
            <Card className="bg-black/60 border-cyan-500/30 p-4 text-center backdrop-blur-sm">
              <Calendar className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl font-orbitron font-bold text-white">{daysAsGuardian}</div>
              <p className="text-xs text-gray-400">Days as Guardian</p>
            </Card>
          </motion.div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
            <Card className="bg-black/60 border-amber-500/30 p-4 text-center backdrop-blur-sm">
              <Flame className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <div className="text-2xl font-orbitron font-bold text-white">{loginStreak}</div>
              <p className="text-xs text-gray-400">Day Streak</p>
              {loginStreak >= 3 && <p className="text-[10px] text-amber-400 mt-1">Keep it alive!</p>}
            </Card>
          </motion.div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card className="bg-black/60 border-purple-500/30 p-4 text-center backdrop-blur-sm">
              <Vote className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-orbitron font-bold text-white">{votesCount}</div>
              <p className="text-xs text-gray-400">Votes Cast</p>
            </Card>
          </motion.div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
            <Card className="bg-black/60 border-green-500/30 p-4 text-center backdrop-blur-sm">
              <Compass className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-orbitron font-bold text-white">{pagesVisited.length}/{PAGES.length}</div>
              <p className="text-xs text-gray-400">Pages Found</p>
            </Card>
          </motion.div>
        </div>

        <motion.div 
          className="mb-8"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className={`bg-gradient-to-br ${currentLevelData?.bgGradient || 'from-gray-600/20 to-gray-800/20'} border-2 ${currentLevel >= 5 ? 'border-yellow-500/50' : 'border-cyan-500/30'} p-6 backdrop-blur-sm relative overflow-hidden`}>
            {currentLevel >= 7 && (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.1)_0%,transparent_70%)]" />
            )}
            <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
              <div className="relative">
                <div className={`w-28 h-28 rounded-full border-4 ${currentLevel >= 7 ? 'border-yellow-400 shadow-[0_0_30px_rgba(255,215,0,0.5)]' : currentLevel >= 5 ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)]' : 'border-cyan-500'} flex items-center justify-center bg-gradient-to-br from-black to-gray-900`}>
                  {currentLevelData ? (
                    (() => {
                      const Icon = currentLevelData.icon;
                      return <Icon className={`w-14 h-14 ${currentLevelData.color}`} />;
                    })()
                  ) : (
                    <Lock className="w-14 h-14 text-gray-600" />
                  )}
                </div>
                <div className={`absolute -bottom-1 -right-1 ${currentLevel >= 7 ? 'bg-yellow-500' : 'bg-cyan-500'} text-black text-sm font-bold px-3 py-1 rounded-full shadow-lg`}>
                  Lv.{currentLevel + 1}
                </div>
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <p className="text-gray-400 text-sm font-mono mb-1">Current Rank</p>
                <h2 className={`text-2xl md:text-4xl font-orbitron font-bold ${currentLevelData?.color || 'text-gray-500'} mb-2`}>
                  {currentLevelData?.name || 'Not Yet a Guardian'}
                </h2>
                <p className="text-gray-300 text-sm italic mb-4">
                  "{currentLevelData?.quote || 'Own an NFT to begin your journey...'}"
                </p>
                {nextLevel && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>Progress to <span className={nextLevel.color}>{nextLevel.name}</span></span>
                      <span>{Math.round(getProgressToNextLevel())}%</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${getProgressToNextLevel()}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}
                {!nextLevel && currentLevel >= 0 && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-sm px-3 py-1">
                    <Crown className="w-4 h-4 mr-1" /> MAX LEVEL ACHIEVED
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <Card className="bg-black/60 border-cyan-500/30 p-5 backdrop-blur-sm h-full">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="font-orbitron font-bold text-white">NFT Holdings</h3>
                <span className="ml-auto text-xs text-gray-500 font-mono">{loading ? '...' : `${nftCount} total`}</span>
              </div>
              
              <div className="text-center mb-6">
                <div className="text-5xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                  {loading ? '...' : nftCount}
                </div>
                <p className="text-gray-400 text-sm">NFTs Owned</p>
              </div>
              
              {nftCount > 0 && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-purple-400 flex items-center gap-1">
                        <Swords className="w-3 h-3" /> Guardians
                      </span>
                      <span className="text-white font-mono">{nftBreakdown.guardians}</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-purple-600 to-purple-400" 
                        initial={{ width: 0 }}
                        animate={{ width: `${(nftBreakdown.guardians / nftCount) * 100}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-green-400 flex items-center gap-1">
                        <span className="text-lg">🐸</span> Frogs
                      </span>
                      <span className="text-white font-mono">{nftBreakdown.frogs}</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-green-600 to-green-400" 
                        initial={{ width: 0 }}
                        animate={{ width: `${(nftBreakdown.frogs / nftCount) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-amber-400 flex items-center gap-1">
                        <span className="text-lg">👾</span> Creatures
                      </span>
                      <span className="text-white font-mono">{nftBreakdown.creatures}</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400" 
                        initial={{ width: 0 }}
                        animate={{ width: `${(nftBreakdown.creatures / nftCount) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      />
                    </div>
                  </div>

                  {hasAllTypes && (
                    <div className="text-center pt-2">
                      <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/50">
                        <Users className="w-3 h-3 mr-1" /> Diverse Collector!
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {nftCount === 0 && !loading && (
                <div className="text-center text-gray-500 py-4">
                  <p className="text-sm">No NFTs yet</p>
                  <p className="text-xs mt-1">Visit the Mint page to get started!</p>
                </div>
              )}
            </Card>
          </motion.div>

          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
            <Card className="bg-black/60 border-purple-500/30 p-5 backdrop-blur-sm h-full">
              <div className="flex items-center gap-2 mb-4">
                <Map className="w-5 h-5 text-blue-400" />
                <h3 className="font-orbitron font-bold text-white">Page Exploration</h3>
              </div>
              
              <div className="text-center mb-4">
                <div className="text-4xl font-orbitron font-bold text-blue-400">
                  {pagesVisited.length} / {PAGES.length}
                </div>
                <p className="text-gray-400 text-sm">Pages Discovered</p>
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border border-blue-500/20" />
                  <div className="absolute w-24 h-24 rounded-full border border-purple-500/20" />
                  <div className="absolute w-16 h-16 rounded-full border border-cyan-500/20" />
                </div>
                
                <div className="relative flex flex-wrap justify-center gap-3">
                  {PAGES.map((page, i) => {
                    const isVisited = pagesVisited.includes(page);
                    const angle = (i / PAGES.length) * Math.PI * 2 - Math.PI / 2;
                    const radius = 50;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    
                    return (
                      <motion.div
                        key={page}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-mono uppercase transition-all cursor-default ${
                          isVisited 
                            ? 'bg-blue-500/30 border-2 border-blue-400 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.6)]' 
                            : 'bg-gray-800/50 border border-gray-700 text-gray-600'
                        }`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6 + i * 0.05 }}
                        title={page}
                      >
                        {isVisited ? '✓' : '?'}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mt-4 justify-center">
                {PAGES.map((page) => (
                  <span 
                    key={page} 
                    className={`text-[10px] px-2 py-0.5 rounded ${
                      pagesVisited.includes(page) 
                        ? 'text-blue-400 bg-blue-500/10' 
                        : 'text-gray-600'
                    }`}
                  >
                    {page}
                  </span>
                ))}
              </div>

              {allPagesVisited && (
                <div className="text-center mt-4">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                    <Compass className="w-3 h-3 mr-1" /> Explorer Complete!
                  </Badge>
                </div>
              )}
            </Card>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="md:col-span-2">
            <Card className="bg-black/60 border-amber-500/30 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="font-orbitron font-bold text-white">Storytelling Contribution</h3>
              </div>
              
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center ${
                  hasSubmittedStory 
                    ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.4)]' 
                    : 'border-gray-700 bg-gray-900/50'
                }`}>
                  {hasSubmittedStory ? (
                    <CheckCircle className="w-10 h-10 text-amber-400" />
                  ) : (
                    <BookOpen className="w-10 h-10 text-gray-600" />
                  )}
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <div className="text-xl font-orbitron font-bold mb-1">
                    {hasSubmittedStory ? (
                      <span className="text-amber-400">Story Idea Submitted!</span>
                    ) : (
                      <span className="text-gray-400">No Story Submitted Yet</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-3">
                    {hasSubmittedStory 
                      ? "You're shaping the Based Guardians saga. Your ideas may become canon!"
                      : "Visit the Universe tab to submit your chapter idea and unlock the Lore Keeper badge."}
                  </p>
                  {hasSubmittedStory && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
                      <BookOpen className="w-3 h-3 mr-1" /> Lore Keeper
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div 
          className="mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-black/60 border-purple-500/30 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-purple-400" />
              <h3 className="font-orbitron font-bold text-white">Badges Earned</h3>
              <span className="text-xs text-gray-400 ml-auto">{Math.min(currentLevel + 1, BADGES.length)}/{BADGES.length}</span>
            </div>
            
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
              {BADGES.map((badge, index) => {
                const isEarned = currentLevel >= badge.levelReq;
                const Icon = badge.icon;
                return (
                  <motion.div
                    key={badge.id}
                    className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-2 transition-all relative group ${
                      isEarned 
                        ? `border-${badge.color}-500/50 bg-gradient-to-br from-${badge.color}-500/20 to-transparent shadow-[0_0_20px_rgba(0,255,255,0.2)]` 
                        : 'border-gray-700/50 bg-gray-900/30 opacity-40'
                    }`}
                    whileHover={isEarned ? { scale: 1.1, y: -5 } : { scale: 1.02 }}
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.8 + index * 0.05 }}
                  >
                    <Icon className={`w-6 h-6 md:w-8 md:h-8 ${isEarned ? `text-${badge.color}-400` : 'text-gray-600'}`} />
                    <span className="text-[8px] md:text-[10px] text-center mt-1 text-gray-400 line-clamp-1">{badge.name}</span>
                    
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/90 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {badge.description}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="bg-black/60 border-cyan-500/30 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <h3 className="font-orbitron font-bold text-white">Level Progression</h3>
            </div>
            
            <div className="space-y-2">
              {LEVELS.map((level, index) => {
                const Icon = level.icon;
                const isCurrentLevel = index === currentLevel;
                const isUnlocked = index <= currentLevel;
                const req = level.requirements;
                
                return (
                  <motion.div 
                    key={level.name}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      isCurrentLevel 
                        ? `bg-gradient-to-r ${level.bgGradient} border border-${level.color.replace('text-', '')}/50` 
                        : isUnlocked 
                          ? 'bg-white/5 border border-white/5' 
                          : 'opacity-40 bg-gray-900/30'
                    }`}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.9 + index * 0.05 }}
                  >
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isUnlocked ? `border-${level.color.replace('text-', '')} bg-${level.color.replace('text-', '')}/10` : 'border-gray-700 bg-gray-900'
                    }`}>
                      <Icon className={`w-5 h-5 md:w-6 md:h-6 ${isUnlocked ? level.color : 'text-gray-600'}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-orbitron font-bold text-sm md:text-base ${isUnlocked ? level.color : 'text-gray-500'}`}>
                          {level.name}
                        </span>
                        {isCurrentLevel && (
                          <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px] px-2">Current</Badge>
                        )}
                        {isUnlocked && !isCurrentLevel && (
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-gray-500">
                        {req.nfts > 0 && <span className={isUnlocked ? 'text-cyan-400/70' : ''}>• {req.nfts}+ NFTs</span>}
                        {req.votes > 0 && <span className={isUnlocked ? 'text-purple-400/70' : ''}>• {req.votes}+ votes</span>}
                        {req.allPages && <span className={isUnlocked ? 'text-blue-400/70' : ''}>• All pages</span>}
                        {req.pagesPercent > 0 && !req.allPages && <span className={isUnlocked ? 'text-blue-400/70' : ''}>• {req.pagesPercent}% pages</span>}
                        {req.story && <span className={isUnlocked ? 'text-amber-400/70' : ''}>• Story</span>}
                        {req.hasAllTypes && <span className={isUnlocked ? 'text-pink-400/70' : ''}>• All types</span>}
                      </div>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs font-mono ${isCurrentLevel ? level.color : 'text-gray-500'}`}>Lv.{index + 1}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        <motion.div 
          className="mt-6 text-center text-gray-500 text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <p>Your progress saves automatically. Keep exploring the Based Guardians universe!</p>
        </motion.div>
      </div>
    </section>
  );
}
