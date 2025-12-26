import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Award, Zap, Lock, Unlock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAccount } from 'wagmi';

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  totalEarned: number;
  brainXLocked: number;
  brainXUnlocked: number;
}

interface PointsLeaderboardProps {
  limit?: number;
  className?: string;
  showTitle?: boolean;
}

export function PointsLeaderboard({ 
  limit = 10, 
  className = '',
  showTitle = true 
}: PointsLeaderboardProps) {
  const { address } = useAccount();
  
  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['points-leaderboard', limit],
    queryFn: async () => {
      const res = await fetch(`/api/points/leaderboard?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return res.json();
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-gray-500 font-mono text-sm">{rank}</span>;
  };

  const formatAddress = (addr: string) => {
    if (addr.startsWith('anon:')) {
      return `Guest ${addr.slice(-6)}`;
    }
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isCurrentUser = (addr: string) => {
    return address && addr.toLowerCase() === address.toLowerCase();
  };

  if (isLoading) {
    return (
      <Card className={`bg-black/60 border-purple-500/30 backdrop-blur-xl overflow-hidden ${className}`}>
        {showTitle && (
          <div className="p-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-cyan-500/10">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="font-orbitron text-white">Points Leaderboard</span>
            </div>
          </div>
        )}
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-6 h-6 bg-white/10 rounded-full" />
              <div className="flex-1 h-4 bg-white/10 rounded" />
              <div className="w-16 h-4 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card className={`bg-black/60 border-purple-500/30 backdrop-blur-xl p-6 text-center ${className}`}>
        <Zap className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">No points earned yet</p>
        <p className="text-gray-500 text-sm mt-1">Be the first to earn points!</p>
      </Card>
    );
  }

  return (
    <Card className={`bg-black/60 border-purple-500/30 backdrop-blur-xl overflow-hidden ${className}`}>
      {showTitle && (
        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-cyan-500/10">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="font-orbitron text-white">Points Leaderboard</span>
          </div>
        </div>
      )}

      <div className="divide-y divide-white/5">
        {leaderboard.map((entry, index) => (
          <motion.div
            key={entry.walletAddress}
            className={`p-3 flex items-center gap-3 ${isCurrentUser(entry.walletAddress) ? 'bg-cyan-500/10' : ''}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="w-8 flex justify-center">
              {getRankIcon(entry.rank)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-sm truncate ${isCurrentUser(entry.walletAddress) ? 'text-cyan-400' : 'text-gray-300'}`}>
                  {formatAddress(entry.walletAddress)}
                </span>
                {isCurrentUser(entry.walletAddress) && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">YOU</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <div className="flex items-center gap-1 text-cyan-400 font-mono text-sm">
                  <Zap className="w-3 h-3" />
                  {entry.totalEarned.toLocaleString()}
                </div>
                <p className="text-[10px] text-gray-500">points</p>
              </div>

              {(entry.brainXLocked > 0 || entry.brainXUnlocked > 0) && (
                <div className="flex items-center gap-2">
                  {entry.brainXLocked > 0 && (
                    <div className="flex items-center gap-1 text-purple-400">
                      <Lock className="w-3 h-3" />
                      <span className="font-mono text-xs">{entry.brainXLocked}</span>
                    </div>
                  )}
                  {entry.brainXUnlocked > 0 && (
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Unlock className="w-3 h-3" />
                      <span className="font-mono text-xs">{entry.brainXUnlocked}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
