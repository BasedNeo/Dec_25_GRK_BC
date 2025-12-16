import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Star, Rocket, Shield, Crown, Zap, 
  Target, BookOpen, Vote, Map, Lock, CheckCircle,
  ChevronRight, Sparkles, Award, Users
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

const LEVELS = [
  { name: 'Greenhorn', minNfts: 0, minVotes: 0, icon: Rocket, color: 'text-gray-400', requirement: 'Connect wallet' },
  { name: 'Guardian Cadet', minNfts: 1, minVotes: 0, icon: Star, color: 'text-green-400', requirement: 'Own 1 NFT' },
  { name: 'Guardian Officer', minNfts: 3, minVotes: 1, icon: Shield, color: 'text-cyan-400', requirement: 'Own 3 NFTs + 1 vote' },
  { name: 'Guardian Captain', minNfts: 5, minVotes: 3, icon: Award, color: 'text-blue-400', requirement: 'Own 5 NFTs + 3 votes' },
  { name: 'Guardian Commander', minNfts: 10, minVotes: 5, icon: Trophy, color: 'text-purple-400', requirement: 'Own 10 NFTs + 5 votes' },
  { name: 'Guardian Elite', minNfts: 20, minVotes: 10, icon: Crown, color: 'text-amber-400', requirement: 'Own 20 NFTs + 10 votes' },
  { name: 'Galaxy Sentinel', minNfts: 50, minVotes: 20, icon: Zap, color: 'text-pink-400', requirement: 'Own 50 NFTs + 20 votes' },
  { name: 'Cosmic Overlord', minNfts: 100, minVotes: 50, icon: Sparkles, color: 'text-cyan-300', requirement: 'Own 100 NFTs + 50 votes' },
];

const BADGES = [
  { id: 'first_nft', name: 'First Guardian', icon: Rocket, color: 'cyan', description: 'Own your first NFT' },
  { id: 'voter', name: 'Voice of the Galaxy', icon: Vote, color: 'purple', description: 'Cast your first vote' },
  { id: 'explorer', name: 'Cosmic Explorer', icon: Map, color: 'blue', description: 'Visit all pages' },
  { id: 'storyteller', name: 'Lore Keeper', icon: BookOpen, color: 'amber', description: 'Submit a story' },
  { id: 'collector_5', name: 'Collector', icon: Users, color: 'green', description: 'Own 5+ NFTs' },
  { id: 'collector_10', name: 'Hoarder', icon: Trophy, color: 'pink', description: 'Own 10+ NFTs' },
];

const PAGES = ['hub', 'universe', 'mint', 'gallery', 'escrow', 'voting', 'pool'];

export function UserStats() {
  const { address, isConnected } = useAccount();
  const [nftCount, setNftCount] = useState(0);
  const [nftBreakdown, setNftBreakdown] = useState({ guardians: 0, frogs: 0, creatures: 0 });
  const [votesCount, setVotesCount] = useState(0);
  const [pagesVisited, setPagesVisited] = useState<string[]>([]);
  const [hasSubmittedStory, setHasSubmittedStory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previousLevel, setPreviousLevel] = useState(0);

  useEffect(() => {
    const visited = JSON.parse(localStorage.getItem('pagesVisited') || '[]');
    setPagesVisited(visited);
    
    const storySubmitted = localStorage.getItem('storySubmitted') === 'true';
    setHasSubmittedStory(storySubmitted);
    
    const savedVotes = parseInt(localStorage.getItem('userVotesCount') || '0');
    setVotesCount(savedVotes);
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

  const getCurrentLevel = () => {
    let level = 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (nftCount >= LEVELS[i].minNfts && votesCount >= LEVELS[i].minVotes) {
        level = i;
        break;
      }
    }
    return level;
  };

  const currentLevel = getCurrentLevel();
  const currentLevelData = LEVELS[currentLevel];
  const nextLevel = currentLevel < LEVELS.length - 1 ? LEVELS[currentLevel + 1] : null;

  useEffect(() => {
    if (currentLevel > previousLevel && previousLevel > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00ffff', '#bf00ff', '#ffffff']
      });
    }
    setPreviousLevel(currentLevel);
  }, [currentLevel]);

  const getProgressToNextLevel = () => {
    if (!nextLevel) return 100;
    const nftProgress = Math.min(100, (nftCount / nextLevel.minNfts) * 100);
    const voteProgress = nextLevel.minVotes > 0 ? Math.min(100, (votesCount / nextLevel.minVotes) * 100) : 100;
    return Math.min(nftProgress, voteProgress);
  };

  const earnedBadges = [
    nftCount >= 1 ? 'first_nft' : null,
    votesCount >= 1 ? 'voter' : null,
    pagesVisited.length >= PAGES.length ? 'explorer' : null,
    hasSubmittedStory ? 'storyteller' : null,
    nftCount >= 5 ? 'collector_5' : null,
    nftCount >= 10 ? 'collector_10' : null,
  ].filter(Boolean);

  if (!isConnected) {
    return (
      <section className="py-8 min-h-screen">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="relative mb-8">
              <div className="w-32 h-32 rounded-full border-2 border-cyan-500/30 flex items-center justify-center bg-black/50">
                <Lock className="w-16 h-16 text-cyan-400/50" />
              </div>
              <div className="absolute inset-0 border-t-2 border-cyan-400 rounded-full animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <h2 className="text-2xl font-orbitron font-bold text-white mb-4">Connect to View Your Stats</h2>
            <p className="text-gray-400 text-center max-w-md">
              Link your wallet to unlock your Guardian journey and track your progress across the galaxy.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,255,255,0.05)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(191,0,255,0.05)_0%,transparent_50%)]" />
      
      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <motion.h1 
          className="text-3xl md:text-4xl font-orbitron font-bold text-center mb-8 text-cyan-400"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          Your Guardian Journey
        </motion.h1>

        <motion.div 
          className="mb-8"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-black/60 border-cyan-500/30 p-6 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <div className={`w-24 h-24 rounded-full border-4 ${currentLevel >= 4 ? 'border-purple-500' : 'border-cyan-500'} flex items-center justify-center bg-gradient-to-br from-black to-gray-900`}>
                  {(() => {
                    const Icon = currentLevelData.icon;
                    return <Icon className={`w-12 h-12 ${currentLevelData.color}`} />;
                  })()}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                  Lv.{currentLevel + 1}
                </div>
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <p className="text-gray-400 text-sm font-mono mb-1">Current Rank</p>
                <h2 className={`text-2xl md:text-3xl font-orbitron font-bold ${currentLevelData.color}`}>
                  {currentLevelData.name}
                </h2>
                {nextLevel && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>Progress to {nextLevel.name}</span>
                      <span>{Math.round(getProgressToNextLevel())}%</span>
                    </div>
                    <Progress value={getProgressToNextLevel()} className="h-2 bg-gray-800" />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Need: {nextLevel.minNfts} NFTs, {nextLevel.minVotes} votes
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card className="bg-black/60 border-cyan-500/30 p-5 backdrop-blur-sm h-full">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-cyan-400" />
                <h3 className="font-orbitron font-bold text-white">NFT Holdings</h3>
              </div>
              
              <div className="text-center mb-4">
                <div className="text-4xl font-orbitron font-bold text-cyan-400">{loading ? '...' : nftCount}</div>
                <p className="text-gray-400 text-sm">Total NFTs Owned</p>
              </div>
              
              {nftCount > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-400">Guardians</span>
                    <span className="text-white font-mono">{nftBreakdown.guardians}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${(nftBreakdown.guardians / nftCount) * 100}%` }} />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-400">Frogs</span>
                    <span className="text-white font-mono">{nftBreakdown.frogs}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${(nftBreakdown.frogs / nftCount) * 100}%` }} />
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-400">Creatures</span>
                    <span className="text-white font-mono">{nftBreakdown.creatures}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${(nftBreakdown.creatures / nftCount) * 100}%` }} />
                  </div>
                </div>
              )}
            </Card>
          </motion.div>

          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <Card className="bg-black/60 border-cyan-500/30 p-5 backdrop-blur-sm h-full">
              <div className="flex items-center gap-2 mb-4">
                <Vote className="w-5 h-5 text-purple-400" />
                <h3 className="font-orbitron font-bold text-white">Voting Activity</h3>
              </div>
              
              <div className="text-center mb-4">
                <div className="text-4xl font-orbitron font-bold text-purple-400">{votesCount}</div>
                <p className="text-gray-400 text-sm">Proposals Voted On</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Next milestone: {votesCount < 5 ? 5 : votesCount < 10 ? 10 : votesCount < 25 ? 25 : 50} votes</span>
                  <span>{Math.round((votesCount / (votesCount < 5 ? 5 : votesCount < 10 ? 10 : votesCount < 25 ? 25 : 50)) * 100)}%</span>
                </div>
                <Progress 
                  value={(votesCount / (votesCount < 5 ? 5 : votesCount < 10 ? 10 : votesCount < 25 ? 25 : 50)) * 100} 
                  className="h-2 bg-gray-800" 
                />
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <Card className="bg-black/60 border-cyan-500/30 p-5 backdrop-blur-sm h-full">
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
              
              <div className="grid grid-cols-7 gap-2">
                {PAGES.map((page) => (
                  <div 
                    key={page}
                    className={`aspect-square rounded-full flex items-center justify-center text-[8px] font-mono uppercase transition-all ${
                      pagesVisited.includes(page) 
                        ? 'bg-blue-500/30 border border-blue-400 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                        : 'bg-gray-800/50 border border-gray-700 text-gray-600'
                    }`}
                  >
                    {pagesVisited.includes(page) ? '✓' : '?'}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-1 mt-2 justify-center">
                {PAGES.map((page) => (
                  <span key={page} className={`text-[8px] ${pagesVisited.includes(page) ? 'text-blue-400' : 'text-gray-600'}`}>
                    {page}
                  </span>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
            <Card className="bg-black/60 border-cyan-500/30 p-5 backdrop-blur-sm h-full">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="font-orbitron font-bold text-white">Storytelling</h3>
              </div>
              
              <div className="text-center">
                <div className={`text-4xl mb-2 ${hasSubmittedStory ? 'text-green-400' : 'text-gray-500'}`}>
                  {hasSubmittedStory ? '✓' : '○'}
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  {hasSubmittedStory ? 'Story Submitted!' : 'No story submitted yet'}
                </p>
                
                {hasSubmittedStory ? (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
                    <BookOpen className="w-3 h-3 mr-1" /> Lore Keeper
                  </Badge>
                ) : (
                  <p className="text-xs text-gray-500">
                    Visit the Universe page to submit your story idea!
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div 
          className="mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-black/60 border-purple-500/30 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-purple-400" />
              <h3 className="font-orbitron font-bold text-white">Badges Earned</h3>
              <span className="text-xs text-gray-400 ml-auto">{earnedBadges.length}/{BADGES.length}</span>
            </div>
            
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {BADGES.map((badge) => {
                const isEarned = earnedBadges.includes(badge.id);
                const Icon = badge.icon;
                return (
                  <motion.div
                    key={badge.id}
                    className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-2 transition-all ${
                      isEarned 
                        ? `border-${badge.color}-500 bg-${badge.color}-500/10 shadow-[0_0_15px_rgba(0,255,255,0.3)]` 
                        : 'border-gray-700 bg-gray-900/50 opacity-40'
                    }`}
                    whileHover={isEarned ? { scale: 1.05 } : {}}
                  >
                    <Icon className={`w-6 h-6 ${isEarned ? `text-${badge.color}-400` : 'text-gray-600'}`} />
                    <span className="text-[8px] text-center mt-1 text-gray-400 line-clamp-2">{badge.name}</span>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-black/60 border-cyan-500/30 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-cyan-400" />
              <h3 className="font-orbitron font-bold text-white">Level Progression</h3>
            </div>
            
            <div className="space-y-3">
              {LEVELS.map((level, index) => {
                const Icon = level.icon;
                const isCurrentLevel = index === currentLevel;
                const isUnlocked = index <= currentLevel;
                
                return (
                  <div 
                    key={level.name}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      isCurrentLevel 
                        ? 'bg-cyan-500/10 border border-cyan-500/30' 
                        : isUnlocked 
                          ? 'bg-white/5' 
                          : 'opacity-50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                      isUnlocked ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700 bg-gray-900'
                    }`}>
                      <Icon className={`w-5 h-5 ${isUnlocked ? level.color : 'text-gray-600'}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-orbitron font-bold ${isUnlocked ? level.color : 'text-gray-500'}`}>
                          {level.name}
                        </span>
                        {isCurrentLevel && (
                          <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px]">Current</Badge>
                        )}
                        {isUnlocked && !isCurrentLevel && (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{level.requirement}</p>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-xs text-gray-400 font-mono">Lv.{index + 1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
