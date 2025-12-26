import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAccount, useReadContract } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Gamepad2, Trophy, Lock, Unlock, Star, Sparkles, 
  Home, Zap, Clock, Target, ChevronRight, Crown, Medal, Award, CheckCircle2
} from 'lucide-react';
import { getArcadeGames, GameConfig } from '@/lib/gameRegistry';
import { GameStorageManager } from '@/lib/gameStorage';
import { NFT_CONTRACT } from '@/lib/constants';
import { Navbar } from '@/components/Navbar';
import { LeaderboardPanel } from '@/components/game/LeaderboardPanel';
import { PointsDisplay } from '@/components/PointsDisplay';

interface LeaderboardEntry {
  id: string;
  walletAddress: string;
  customName: string | null;
  lifetimeScore: number;
  highScore: number;
  gamesPlayed: number;
  rank: string;
}

function GlobalLeaderboard() {
  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['game-leaderboard'],
    queryFn: async () => {
      const res = await fetch('/api/game/leaderboard?limit=20');
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return res.json();
    },
    staleTime: 60000,
  });

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-300" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-gray-500 font-mono text-sm">{index + 1}</span>;
  };

  const getRankColor = (rank: string) => {
    const colors: Record<string, string> = {
      'Cadet': 'text-gray-400',
      'Ensign': 'text-green-400',
      'Lieutenant': 'text-blue-400',
      'Commander': 'text-purple-400',
      'Captain': 'text-orange-400',
      'Star Commander': 'text-pink-400',
      'Fleet Admiral': 'text-cyan-400',
      'Based Eternal': 'text-yellow-400',
    };
    return colors[rank] || 'text-gray-400';
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <motion.div
      className="mt-16"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-8 h-8 text-yellow-400" />
        <h2 className="text-2xl md:text-3xl font-orbitron font-bold text-white">
          Global Leaderboard
        </h2>
      </div>

      <Card className="bg-black/60 border-white/10 backdrop-blur-xl overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-cyan-500/10">
          <div className="grid grid-cols-12 gap-2 text-xs font-mono text-gray-400 uppercase tracking-wider">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-4">Player</div>
            <div className="col-span-2 text-right">Lifetime</div>
            <div className="col-span-2 text-right">High Score</div>
            <div className="col-span-1 text-center">Games</div>
            <div className="col-span-2 text-center">Rank</div>
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {isLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1"><div className="w-6 h-6 bg-white/10 rounded-full mx-auto" /></div>
                  <div className="col-span-4"><div className="w-24 h-4 bg-white/10 rounded" /></div>
                  <div className="col-span-2"><div className="w-16 h-4 bg-white/10 rounded ml-auto" /></div>
                  <div className="col-span-2"><div className="w-16 h-4 bg-white/10 rounded ml-auto" /></div>
                  <div className="col-span-1"><div className="w-8 h-4 bg-white/10 rounded mx-auto" /></div>
                  <div className="col-span-2"><div className="w-16 h-4 bg-white/10 rounded mx-auto" /></div>
                </div>
              </div>
            ))
          ) : leaderboard && leaderboard.length > 0 ? (
            leaderboard.map((entry, index) => (
              <motion.div
                key={entry.id}
                className={`p-4 transition-colors hover:bg-white/5 ${index < 3 ? 'bg-gradient-to-r from-yellow-500/5 to-transparent' : ''}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                data-testid={`leaderboard-row-${index}`}
              >
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 flex justify-center">
                    {getRankIcon(index)}
                  </div>
                  <div className="col-span-4">
                    <span className="text-white font-medium">
                      {entry.customName || formatAddress(entry.walletAddress)}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-cyan-400 font-mono">
                      {entry.lifetimeScore.toLocaleString()}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-yellow-400 font-mono">
                      {entry.highScore.toLocaleString()}
                    </span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-gray-400 font-mono">
                      {entry.gamesPlayed}
                    </span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`text-sm font-medium ${getRankColor(entry.rank)}`}>
                      {entry.rank}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No scores yet. Be the first to play!</p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

const ERC721_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

interface GameCardProps {
  game: GameConfig;
  isLocked: boolean;
  isConnected: boolean;
  playsToday: number;
  personalBest: number;
  onPlay: () => void;
  onConnect: () => void;
}

function GameCard({ game, isLocked, isConnected, playsToday, personalBest, onPlay, onConnect }: GameCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = game.icon;
  const maxPlays = game.maxPlaysPerDay;
  const playsRemaining = maxPlays - playsToday;
  const canPlay = !isLocked && playsRemaining > 0;
  const needsConnection = !isConnected;

  return (
    <motion.div
      className="relative group cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03, y: -8 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={needsConnection ? onConnect : canPlay ? onPlay : undefined}
    >
      <div className={`absolute -inset-1 bg-gradient-to-r ${game.thumbnailGradient} rounded-2xl blur-lg opacity-0 group-hover:opacity-70 transition-all duration-500`} />
      
      <Card className="relative bg-gradient-to-b from-gray-900 to-black border-0 rounded-2xl overflow-hidden shadow-2xl h-full min-h-[420px] flex flex-col">
        <div className={`relative h-44 bg-gradient-to-br ${game.thumbnailGradient} overflow-hidden`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
          
          <motion.div 
            className="absolute inset-0 flex items-center justify-center"
            animate={isHovered ? { scale: 1.1, rotate: [0, 2, -2, 0] } : { scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl scale-150" />
              <Icon className="w-20 h-20 text-white drop-shadow-2xl relative z-10" />
            </div>
          </motion.div>
          
          <div className="absolute top-3 left-3 flex gap-2">
            {isLocked ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md border border-red-500/50 rounded-lg text-xs font-bold text-red-400 shadow-lg">
                <Lock className="w-3 h-3" />
                NFT REQUIRED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-md border border-green-500/50 rounded-lg text-xs font-bold text-green-400 shadow-lg">
                <Unlock className="w-3 h-3" />
                ANYONE
              </span>
            )}
          </div>
          
          <div className="absolute top-3 right-3">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-md ${
              playsRemaining > 0 
                ? 'bg-cyan-500/80 text-white' 
                : 'bg-gray-700/80 text-gray-300'
            }`}>
              <Zap className="w-3 h-3" />
              {playsRemaining}/{maxPlays}
            </span>
          </div>
          
          <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-black via-black/80 to-transparent" />
          
          <motion.div 
            className="absolute bottom-3 left-3 right-3"
            initial={{ y: 10, opacity: 0 }}
            animate={isHovered ? { y: 0, opacity: 1 } : { y: 10, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3 text-xs text-white/90">
              <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                <span>{Math.round(game.averagePlayTime / 60)}min</span>
              </div>
              <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
                <Star className="w-3 h-3 text-yellow-400" />
                <span className="capitalize">{game.difficulty}</span>
              </div>
              <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full capitalize">
                {game.category}
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className="relative p-5 flex flex-col flex-1 justify-between">
          <div>
            <h3 className="text-xl font-orbitron font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all">
              {game.name}
            </h3>
            
            <p className="text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed min-h-[40px]">
              {game.description}
            </p>

            {personalBest > 0 && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-mono text-sm font-bold">
                  {personalBest.toLocaleString()} pts
                </span>
              </div>
            )}
          </div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={(e) => { e.stopPropagation(); needsConnection ? onConnect() : onPlay(); }}
              disabled={!needsConnection && !canPlay}
              className={`w-full font-bold py-4 rounded-xl transition-all text-base ${
                needsConnection
                  ? 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:shadow-xl hover:shadow-cyan-500/30 text-white'
                  : canPlay
                    ? `bg-gradient-to-r ${game.thumbnailGradient} hover:shadow-xl hover:shadow-purple-500/30 text-white`
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
              aria-label={needsConnection ? 'Connect Wallet' : `Play ${game.name}`}
              data-testid={`button-play-${game.id}`}
            >
              {needsConnection ? (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Connect & Play
                </span>
              ) : isLocked ? (
                <span className="flex items-center justify-center gap-2">
                  <Lock className="w-5 h-5" />
                  Unlock with NFT
                </span>
              ) : playsRemaining <= 0 ? (
                <span className="flex items-center justify-center gap-2">
                  <Clock className="w-5 h-5" />
                  Come Back Tomorrow
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Gamepad2 className="w-5 h-5" />
                  PLAY NOW
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </Button>
          </motion.div>
        </div>

        {isLocked && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="text-center p-6">
              <Lock className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
              <p className="text-white font-bold mb-1">NFT Holders Only</p>
              <p className="text-gray-400 text-sm">Connect wallet with Guardian NFT to unlock</p>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export default function BasedArcade() {
  const [, navigate] = useLocation();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const games = useMemo(() => getArcadeGames(), []);
  const [gameStats, setGameStats] = useState<Record<string, { playsToday: number; personalBest: number }>>({});

  const { data: nftBalance } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: ERC721_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const isHolder = nftBalance ? Number(nftBalance) > 0 : false;

  useEffect(() => {
    const loadStats = () => {
      const stats: Record<string, { playsToday: number; personalBest: number }> = {};
      const today = new Date().toDateString();
      games.forEach((game) => {
        const savedStats = address 
          ? GameStorageManager.loadStats(game.id, address)
          : GameStorageManager.getDefaultStats();
        const dailyData = address
          ? GameStorageManager.getDailyData(game.id, address, today)
          : { gamesPlayed: 0, pointsEarned: 0 };
        stats[game.id] = {
          playsToday: dailyData.gamesPlayed,
          personalBest: savedStats.bestScore,
        };
      });
      setGameStats(stats);
    };
    loadStats();
  }, [games, address]);

  const handlePlay = (game: GameConfig) => {
    if (!isHolder) return;
    navigate(game.path);
  };

  if (isConnected && !isHolder) {
    return (
      <section className="min-h-screen bg-gradient-to-b from-[#0a0015] via-[#050510] to-[#0a0020] relative overflow-hidden">
        <Navbar activeTab="game" onTabChange={() => navigate('/')} isConnected={isConnected} />
        
        <div className="min-h-screen flex items-center justify-center px-4">
          <motion.div 
            className="text-center p-8 max-w-lg"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-28 h-28 mx-auto mb-8 bg-cyan-500/20 rounded-full flex items-center justify-center border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(0,255,255,0.3)]">
              <Lock className="w-14 h-14 text-cyan-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-orbitron font-bold text-white mb-4">
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Own a Guardian NFT to Play
              </span>
            </h2>
            <p className="text-gray-400 mb-8 text-lg">
              The Arcade is exclusive to Guardian NFT holders. Mint or purchase a Guardian to unlock all games.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/#mint')}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-black font-orbitron font-bold px-8 py-4 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.3)]"
                data-testid="button-go-mint"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Mint a Guardian
              </Button>
              <Button 
                onClick={() => navigate('/')}
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-8 py-4 rounded-xl"
                data-testid="button-back-home"
              >
                <Home className="w-5 h-5 mr-2" />
                Back to Command Center
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-[#0a0015] via-[#050510] to-[#0a0020] relative overflow-y-auto pb-24">
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(80)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute w-0.5 h-0.5 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 2,
            }}
          />
        ))}
        
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <Navbar activeTab="game" onTabChange={() => navigate('/')} isConnected={isConnected} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-mono transition-colors"
            data-testid="button-back-home"
            aria-label="Back to Command Center"
          >
            <Home size={16} />
            <span>Back to Command Center</span>
          </button>
        </div>

        <div className="flex justify-center mb-8">
          <PointsDisplay compact={false} showBreakdown={true} showVesting={true} className="max-w-md w-full" />
        </div>

        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full mb-6"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-purple-400 text-sm font-mono">GIGA BRAIN GALAXY</span>
          </motion.div>
          
          <h1 className="text-4xl md:text-6xl font-orbitron font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Welcome to the
            </span>
            <br />
            <span className="text-white">Based Arcade</span>
          </h1>
          
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Where Guardians Play in the Giga Brain Galaxy
          </p>
          
          {!isConnected && (
            <motion.p 
              className="mt-4 text-cyan-400/70 text-sm"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Connect your wallet to unlock NFT holder benefits & reward points
            </motion.p>
          )}
          
          {isConnected && isHolder && (
            <motion.div 
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Target className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-sm font-mono">GUARDIAN HOLDER • ALL ACCESS</span>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {games.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <GameCard
                game={game}
                isLocked={game.nftRequired && !isHolder}
                isConnected={isConnected}
                playsToday={gameStats[game.id]?.playsToday || 0}
                personalBest={gameStats[game.id]?.personalBest || 0}
                onPlay={() => handlePlay(game)}
                onConnect={() => openConnectModal?.()}
              />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="inline-flex items-center gap-4 px-6 py-4 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-mono">{games.length} Games</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-white font-mono">10 plays/day each</span>
            </div>
            <div className="w-px h-6 bg-white/20" />
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-400" />
              <span className="text-white font-mono">Compete for glory</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <h2 className="text-2xl md:text-3xl font-orbitron font-bold text-white">
                Local High Scores
              </h2>
            </div>
            <LeaderboardPanel showPersonalStats={true} showDailyChallenge={true} />
          </motion.div>
          
          <div>
            <GlobalLeaderboard />
          </div>
        </div>
      </div>
    </section>
  );
}
