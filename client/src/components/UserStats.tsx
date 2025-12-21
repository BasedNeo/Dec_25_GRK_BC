import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Rocket, Shield, Crown, Pickaxe, 
  BookOpen, Vote, Map, Lock, CheckCircle,
  Sparkles, Users, Flame, Calendar, TrendingUp,
  Star, Award, Compass, Swords, Diamond, Gem, Edit3, Check, X, AlertCircle, Gamepad2, Trophy
} from 'lucide-react';
import { useFeatureFlags } from '@/lib/featureFlags';
import { useGuardianProfileContext } from './GuardianProfileProvider';
import { ClientValidator } from '@/lib/clientValidator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ethers } from 'ethers';
import { RPC_URL, NFT_CONTRACT } from '@/lib/constants';
import confetti from 'canvas-confetti';
import { useGameScoresLocal, RANKS as GAME_RANKS_DATA } from '@/hooks/useGameScoresLocal';
import { Link } from 'wouter';

const NFT_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function tokenOfOwnerByIndex(address, uint256) view returns (uint256)'
];

const PAGES = [
  'hub', 'universe', 'mint', 'gallery', 'escrow', 'voting', 'pool', 'stats', 'activity', 'inbox',
  'terms', 'privacy', 'odyssey', 'creators', 'saga', 'disclaimer'
];

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

const DIAMOND_HANDS_LEVELS = [
  { name: 'Ice Hands', color: 'text-blue-300', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-400/50', icon: '🧊', minDays: 0, minRetention: 0, description: 'Holding at least 1 NFT' },
  { name: 'Bronze Hands', color: 'text-amber-600', bgColor: 'bg-amber-700/20', borderColor: 'border-amber-600/50', icon: '🥉', minDays: 30, minRetention: 25, description: '30+ days, 25%+ retention' },
  { name: 'Silver Hands', color: 'text-gray-300', bgColor: 'bg-gray-400/20', borderColor: 'border-gray-400/50', icon: '🥈', minDays: 60, minRetention: 50, description: '60+ days, 50%+ retention' },
  { name: 'Gold Hands', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-400/50', icon: '🥇', minDays: 90, minRetention: 75, description: '90+ days, 75%+ retention' },
  { name: 'Platinum Hands', color: 'text-cyan-300', bgColor: 'bg-cyan-400/20', borderColor: 'border-cyan-300/50', icon: '💎', minDays: 90, minRetention: 80, description: '90+ days, 80%+ retention' },
  { name: 'Diamond Hands', color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-400/50', icon: '💠', minDays: 90, minRetention: 100, description: '90+ days, 100% retention' },
];

function SpeedRaceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M4 20L8 12H16L20 8L28 16L24 20H16L12 24L4 20Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 16L14 14L18 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="22" cy="16" r="2" fill="currentColor"/>
      <path d="M6 22L3 25" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2"/>
      <path d="M10 24L8 27" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2"/>
      <path d="M14 25L13 28" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2"/>
      <path d="M26 10L29 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M28 14L31 12" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

function BrainBattleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="16" cy="14" rx="10" ry="8" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 10C12 10 14 8 16 10C18 12 20 10 20 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 14C10 14 12 16 16 16C20 16 22 14 22 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M12 18L14 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M20 18L18 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1"/>
      <circle cx="24" cy="8" r="2" stroke="currentColor" strokeWidth="1"/>
      <path d="M8 10L10 12" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <path d="M24 10L22 12" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <path d="M14 22L16 26L18 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="16" cy="28" r="1.5" fill="currentColor"/>
    </svg>
  );
}

function BasedHuntIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4L19 10L26 11L21 16L22 23L16 20L10 23L11 16L6 11L13 10L16 4Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="16" cy="14" r="3" fill="currentColor"/>
      <path d="M16 18V22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13 25H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 28H18" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1"/>
      <circle cx="26" cy="6" r="1.5" stroke="currentColor" strokeWidth="1"/>
      <path d="M7 7L10 10" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeDasharray="1 2"/>
      <path d="M25 7L22 10" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeDasharray="1 2"/>
    </svg>
  );
}

const GAME_RANKS_STYLE: Record<string, { color: string; bg: string }> = {
  'Cadet': { color: 'text-gray-400', bg: 'bg-gray-500/20' },
  'Pilot': { color: 'text-green-400', bg: 'bg-green-500/20' },
  'Void Walker': { color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  'Star Commander': { color: 'text-purple-400', bg: 'bg-purple-500/20' },
  'Fleet Admiral': { color: 'text-orange-400', bg: 'bg-orange-500/20' },
  'Based Eternal': { color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
};

function GameStatsSection() {
  const { myStats, leaderboard } = useGameScoresLocal();
  const hasGameData = myStats.gamesPlayed > 0;
  const displayRank = myStats.effectiveRank || myStats.rank;
  const rankStyle = GAME_RANKS_STYLE[displayRank] || GAME_RANKS_STYLE['Cadet'];
  const isLocked = myStats.rankLocked;

  return (
    <>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="mt-8"
      >
        <Card className="bg-black/60 border-cyan-500/30 p-5 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Gamepad2 className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="font-orbitron font-bold text-white">Retro Defender Stats</h3>
              </div>
              <Link href="/game">
                <Button size="sm" variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10" data-testid="button-play-minigame">
                  <Rocket className="w-3 h-3 mr-1" />
                  Play
                </Button>
              </Link>
            </div>
            
            {hasGameData ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/20 text-center">
                    <div className="text-2xl font-orbitron text-cyan-400">{myStats.lifetimeScore.toLocaleString()}</div>
                    <p className="text-[10px] text-cyan-400/60 mt-1 font-mono">LIFETIME SCORE</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3 border border-yellow-500/20 text-center">
                    <div className="text-2xl font-orbitron text-yellow-400">{myStats.bestScore.toLocaleString()}</div>
                    <p className="text-[10px] text-yellow-400/60 mt-1 font-mono">HIGH SCORE</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3 border border-purple-500/20 text-center">
                    <div className="text-2xl font-orbitron text-purple-400">{myStats.gamesPlayed}</div>
                    <p className="text-[10px] text-purple-400/60 mt-1 font-mono">GAMES PLAYED</p>
                  </div>
                  <div className="bg-black/40 rounded-lg p-3 border border-green-500/20 text-center relative">
                    <div className={`text-lg font-orbitron ${rankStyle.color}`}>{displayRank}</div>
                    <p className="text-[10px] text-green-400/60 mt-1 font-mono">PILOT RANK</p>
                    {isLocked && (
                      <div className="absolute -top-1 -right-1">
                        <Lock className="w-3 h-3 text-orange-400" />
                      </div>
                    )}
                  </div>
                </div>
                
                {isLocked && myStats.lockReason && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <Lock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-orange-300 text-xs font-medium mb-1">Rank Locked</p>
                        <p className="text-orange-300/70 text-[11px]">{myStats.lockReason}</p>
                        {myStats.rank !== displayRank && (
                          <p className="text-orange-300/50 text-[10px] mt-1">
                            Score qualifies for {myStats.rank} - unlock by exploring lore!
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="text-center text-xs text-white/40">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  Race-to-Base Minigame - Full P2E coming Q1 2025
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Gamepad2 className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm mb-2">No game stats yet</p>
                <p className="text-white/30 text-xs mb-4">Play Retro Defender to unlock higher ranks!</p>
                <Link href="/game">
                  <Button size="sm" className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30">
                    <Rocket className="w-4 h-4 mr-1" />
                    Start Playing
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
      
      {leaderboard.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-6"
        >
          <Card className="bg-black/60 border-purple-500/30 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="text-yellow-400" size={16} />
              <span className="font-orbitron text-white text-sm">GAME LEADERBOARD</span>
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
        </motion.div>
      )}
    </>
  );
}

export function UserStats() {
  const { t } = useTranslation();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { profile, getDisplayName, setCustomName, checkNameAvailable, walletSuffix } = useGuardianProfileContext();
  const { flags } = useFeatureFlags();
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
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [checkingName, setCheckingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [showSocialDisclaimer, setShowSocialDisclaimer] = useState(false);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [diamondHandsData, setDiamondHandsData] = useState<{
    daysHolding: number;
    totalAcquired: number;
    totalSold: number;
    retentionRate: number;
    currentHolding: number;
    loading: boolean;
  }>({ daysHolding: 0, totalAcquired: 0, totalSold: 0, retentionRate: 0, currentHolding: 0, loading: true });

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
      } catch {
        // Failed to fetch NFT data
      }
      setLoading(false);
    };

    fetchNFTData();
  }, [address, isConnected]);

  // Fetch Diamond Hands data from Transfer events
  useEffect(() => {
    if (!isConnected || !address) {
      setDiamondHandsData(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchDiamondHandsData = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(NFT_CONTRACT, [
          'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
          'function balanceOf(address) view returns (uint256)'
        ], provider);

        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 2000000); // ~2M blocks back
        
        // Get transfers TO user (acquisitions)
        const incomingFilter = contract.filters.Transfer(null, address);
        const incomingEvents = await contract.queryFilter(incomingFilter, fromBlock, currentBlock).catch(() => []);
        
        // Get transfers FROM user (sales/transfers out)
        const outgoingFilter = contract.filters.Transfer(address, null);
        const outgoingEvents = await contract.queryFilter(outgoingFilter, fromBlock, currentBlock).catch(() => []);
        
        const totalAcquired = incomingEvents.length;
        const totalSold = outgoingEvents.length;
        const currentBalance = await contract.balanceOf(address);
        const currentHolding = Number(currentBalance);
        
        // Calculate retention rate
        const retentionRate = totalAcquired > 0 ? Math.round((currentHolding / totalAcquired) * 100) : (currentHolding > 0 ? 100 : 0);
        
        // Calculate days holding from first acquisition
        let daysHolding = 0;
        if (incomingEvents.length > 0 && currentHolding > 0) {
          const firstEvent = incomingEvents[0];
          const firstBlock = await provider.getBlock(firstEvent.blockNumber);
          if (firstBlock) {
            const firstDate = new Date(firstBlock.timestamp * 1000);
            daysHolding = Math.floor((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
          }
        }
        
        setDiamondHandsData({
          daysHolding,
          totalAcquired,
          totalSold,
          retentionRate: Math.min(100, retentionRate),
          currentHolding,
          loading: false
        });
      } catch {
        setDiamondHandsData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchDiamondHandsData();
  }, [address, isConnected]);

  // Calculate Diamond Hands level
  const getDiamondHandsLevel = () => {
    if (diamondHandsData.currentHolding === 0) return -1;
    
    let level = 0; // Ice Hands by default if holding any NFT
    for (let i = DIAMOND_HANDS_LEVELS.length - 1; i >= 0; i--) {
      const req = DIAMOND_HANDS_LEVELS[i];
      if (diamondHandsData.daysHolding >= req.minDays && diamondHandsData.retentionRate >= req.minRetention) {
        level = i;
        break;
      }
    }
    return level;
  };

  const diamondHandsLevel = getDiamondHandsLevel();
  const diamondHandsLevelData = diamondHandsLevel >= 0 ? DIAMOND_HANDS_LEVELS[diamondHandsLevel] : null;

  useEffect(() => {
    if (!address || diamondHandsData.loading || diamondHandsData.currentHolding === 0) return;
    
    const updateLeaderboard = async () => {
      try {
        await fetch('/api/diamond-hands/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: address,
            customName: profile?.customName || null,
            daysHolding: diamondHandsData.daysHolding,
            retentionRate: diamondHandsData.retentionRate,
            currentHolding: diamondHandsData.currentHolding,
            totalAcquired: diamondHandsData.totalAcquired,
            totalSold: diamondHandsData.totalSold,
            level: Math.max(0, diamondHandsLevel),
          }),
        });
      } catch {
        // Silently fail - leaderboard is not critical
      }
    };
    
    updateLeaderboard();
  }, [address, diamondHandsData, diamondHandsLevel, profile?.customName]);

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

  const handleNameChange = async (value: string) => {
    const cleaned = value.replace(/[^a-zA-Z0-9_\s-]/g, '').slice(0, 16);
    setNameInput(cleaned);
    setNameError(null);
    setNameAvailable(null);
    
    const validation = ClientValidator.validateCustomName(cleaned);
    if (!validation.valid && cleaned.length > 0) {
      setNameError(validation.error || 'Invalid name');
      return;
    }
    
    if (cleaned.length >= 2) {
      setCheckingName(true);
      const result = await checkNameAvailable(cleaned);
      setNameAvailable(result.available);
      if (result.error) {
        setNameError(result.error);
      }
      setCheckingName(false);
    }
  };

  const handleSaveName = async () => {
    if (nameInput.length < 2) {
      setNameError(t('profile.nameRules', 'Name must be at least 2 characters'));
      return;
    }
    if (!nameAvailable) {
      setNameError(t('profile.nameTaken', 'This name is already taken'));
      return;
    }
    
    // Check if this is the first time setting a name
    const isFirstTime = !profile?.customName;
    
    if (isFirstTime) {
      // Show disclaimer for first-time users
      setPendingName(nameInput);
      setShowSocialDisclaimer(true);
    } else {
      // Just save directly if they're changing an existing name
      await saveNameDirectly(nameInput);
    }
  };

  const saveNameDirectly = async (name: string) => {
    setSavingName(true);
    const result = await setCustomName(name);
    setSavingName(false);
    
    if (result.success) {
      setEditingName(false);
      setNameInput('');
      setNameError(null);
    } else {
      setNameError(result.error || t('errors.generic', 'Failed to save name'));
    }
  };

  const handleDisclaimerAccept = async () => {
    setShowSocialDisclaimer(false);
    if (pendingName) {
      await saveNameDirectly(pendingName);
      setPendingName(null);
    }
  };

  const handleDisclaimerCancel = () => {
    setShowSocialDisclaimer(false);
    setPendingName(null);
  };

  const startEditing = () => {
    setNameInput(profile?.customName || '');
    setEditingName(true);
    setNameError(null);
    setNameAvailable(profile?.customName ? true : null);
  };

  const cancelEditing = () => {
    setEditingName(false);
    setNameInput('');
    setNameError(null);
    setNameAvailable(null);
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

        {/* Guardian Name Card */}
        <motion.div 
          className="mb-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="bg-gradient-to-r from-purple-900/30 via-black/60 to-cyan-900/30 border-purple-500/30 p-4 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-purple-400" />
                </div>
                
                {editingName ? (
                  <div className="flex-1 max-w-md">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          value={nameInput}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder={t('profile.nameRules', '2-16 characters, letters/numbers only')}
                          className="bg-gray-800/50 border-gray-700 text-white pr-10"
                          maxLength={16}
                          data-testid="input-edit-name"
                        />
                        {nameInput.length >= 2 && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {checkingName ? (
                              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            ) : nameAvailable ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : nameAvailable === false ? (
                              <AlertCircle className="w-4 h-4 text-red-400" />
                            ) : null}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={handleSaveName}
                        disabled={nameInput.length < 2 || !nameAvailable || savingName}
                        className="bg-purple-600 hover:bg-purple-500"
                        data-testid="button-save-edit-name"
                      >
                        {savingName ? '...' : t('common.save', 'Save')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditing}
                        className="text-gray-400 hover:text-white"
                        data-testid="button-cancel-edit-name"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    {nameInput.length >= 2 && (
                      <div className="text-xs text-gray-400 mt-1">
                        Preview: <span className="text-white font-orbitron">{nameInput}<span className="text-cyan-400">#{walletSuffix}</span></span>
                      </div>
                    )}
                    {nameError && <p className="text-xs text-red-400 mt-1">{nameError}</p>}
                    {nameAvailable === false && !nameError && <p className="text-xs text-red-400 mt-1">{t('profile.nameTaken', 'Name already taken')}</p>}
                  </div>
                ) : (
                  <div className="flex-1">
                    {getDisplayName() ? (
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Guardian Name</div>
                        <div className="text-xl md:text-2xl font-orbitron font-bold text-white">
                          {profile?.customName}<span className="text-cyan-400">#{walletSuffix}</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-gray-400 text-sm">No custom name set</div>
                        <div className="text-xs text-gray-500">Your name may appear on social for leaderboards</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {!editingName && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startEditing}
                  disabled={!flags.customNamesEnabled}
                  className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 disabled:opacity-50"
                  data-testid="button-edit-name"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  {!flags.customNamesEnabled 
                    ? t('profile.namesDisabled', 'Names Disabled') 
                    : getDisplayName() 
                      ? t('profile.editName', 'Edit Name') 
                      : t('profile.setName', 'Set Name')}
                </Button>
              )}
            </div>
          </Card>
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

        {/* Diamond Hands Status */}
        <motion.div 
          className="mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          <Card className="bg-black/60 border-cyan-500/30 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Diamond className="w-5 h-5 text-cyan-400" />
              <h3 className="font-orbitron font-bold text-white">Diamond Hands Status</h3>
              {diamondHandsLevelData && (
                <Badge className={`ml-auto ${diamondHandsLevelData.bgColor} ${diamondHandsLevelData.color} ${diamondHandsLevelData.borderColor}`}>
                  {diamondHandsLevelData.icon} {diamondHandsLevelData.name}
                </Badge>
              )}
            </div>
            
            {diamondHandsData.loading ? (
              <div className="text-center py-8 text-gray-400">Loading blockchain data...</div>
            ) : diamondHandsData.currentHolding === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Diamond className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No NFTs currently held</p>
                <p className="text-xs mt-1">Mint or buy an NFT to start tracking</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Current Status Display */}
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center text-4xl ${
                    diamondHandsLevelData ? `${diamondHandsLevelData.borderColor} ${diamondHandsLevelData.bgColor}` : 'border-gray-700 bg-gray-900'
                  }`}>
                    {diamondHandsLevelData?.icon || '🧊'}
                  </div>
                  
                  <div className="flex-1 text-center md:text-left">
                    <div className={`text-2xl font-orbitron font-bold mb-1 ${diamondHandsLevelData?.color || 'text-gray-400'}`}>
                      {diamondHandsLevelData?.name || 'No Status'}
                    </div>
                    <p className="text-gray-400 text-sm mb-2">
                      {diamondHandsLevelData?.description || 'Hold NFTs to earn status'}
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {diamondHandsData.daysHolding} days holding
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> {diamondHandsData.retentionRate}% retention
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-orbitron font-bold text-cyan-400">{diamondHandsData.currentHolding}</div>
                    <div className="text-xs text-gray-500">Currently Holding</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-orbitron font-bold text-green-400">{diamondHandsData.totalAcquired}</div>
                    <div className="text-xs text-gray-500">Total Acquired</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-orbitron font-bold text-red-400">{diamondHandsData.totalSold}</div>
                    <div className="text-xs text-gray-500">Sold/Transferred</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                    <div className="text-xl font-orbitron font-bold text-purple-400">{diamondHandsData.retentionRate}%</div>
                    <div className="text-xs text-gray-500">Retention Rate</div>
                  </div>
                </div>

                {/* Level Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Progress to next level</span>
                    {diamondHandsLevel < DIAMOND_HANDS_LEVELS.length - 1 && (
                      <span className={DIAMOND_HANDS_LEVELS[diamondHandsLevel + 1].color}>
                        {DIAMOND_HANDS_LEVELS[diamondHandsLevel + 1].name}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {DIAMOND_HANDS_LEVELS.map((level, i) => (
                      <div 
                        key={level.name}
                        className={`flex-1 h-2 rounded-full transition-all ${
                          i <= diamondHandsLevel 
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-500' 
                            : 'bg-gray-800'
                        }`}
                        title={`${level.name}: ${level.description}`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600">
                    {DIAMOND_HANDS_LEVELS.map((level) => (
                      <span key={level.name} title={level.description}>{level.icon}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

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

        <GameStatsSection />

        <motion.div 
          className="mt-6 text-center text-gray-500 text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <p>Your progress saves automatically. Keep exploring the Based Guardians universe!</p>
        </motion.div>
      </div>

      {/* Social Communications Disclaimer */}
      <AlertDialog open={showSocialDisclaimer} onOpenChange={setShowSocialDisclaimer}>
        <AlertDialogContent className="bg-black/95 border-cyan-500/50 backdrop-blur-md max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-orbitron text-cyan-400 flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Public Guardian Name
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300 space-y-3 pt-2">
              <p>
                Your Guardian name <span className="text-white font-bold">{pendingName}#{walletSuffix}</span> will be visible in:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                <li>Leaderboards & Rankings</li>
                <li>Social media posts & announcements</li>
                <li>Community communications</li>
                <li>Public activity feeds</li>
              </ul>
              <p className="text-cyan-400 text-sm bg-cyan-500/10 border border-cyan-500/30 rounded p-2">
                Choose a name you're comfortable sharing publicly
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel 
              onClick={handleDisclaimerCancel}
              className="bg-transparent border-gray-600 text-gray-400 hover:bg-gray-800"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDisclaimerAccept}
              className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90"
            >
              I Understand, Save Name
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
