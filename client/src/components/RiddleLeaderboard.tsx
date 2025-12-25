import { motion } from 'framer-motion';
import { Trophy, Clock, Flame, Zap, Medal, Crown, Star } from 'lucide-react';
import { useRiddleLeaderboard, usePlayerRank, type RiddleLeaderboardEntry } from '@/hooks/useRiddleQuest';
import { useAccount } from 'wagmi';
import { Skeleton } from '@/components/ui/skeleton';

interface RiddleLeaderboardProps {
  limit?: number;
  compact?: boolean;
}

function formatTime(ms: number | null): string {
  if (!ms) return '--';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  return `${minutes}m ${remainingSec}s`;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-cyan-400/60 font-mono text-sm">#{rank}</span>;
}

function getRankBadge(points: number): { label: string; color: string; icon: React.ReactNode } {
  if (points >= 5000) return { label: 'Oracle Master', color: 'from-purple-500 to-fuchsia-500', icon: <Star className="w-3 h-3" /> };
  if (points >= 2500) return { label: 'Sage', color: 'from-cyan-400 to-blue-500', icon: <Zap className="w-3 h-3" /> };
  if (points >= 1000) return { label: 'Seeker', color: 'from-green-400 to-emerald-500', icon: <Flame className="w-3 h-3" /> };
  if (points >= 500) return { label: 'Initiate', color: 'from-yellow-400 to-orange-500', icon: <Trophy className="w-3 h-3" /> };
  return { label: 'Novice', color: 'from-gray-400 to-gray-500', icon: null };
}

function LeaderboardRow({ entry, rank, isCurrentUser }: { 
  entry: RiddleLeaderboardEntry; 
  rank: number; 
  isCurrentUser: boolean;
}) {
  const badge = getRankBadge(entry.points);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-all
        ${isCurrentUser 
          ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/20' 
          : 'bg-black/30 border-cyan-500/20 hover:border-cyan-500/40'
        }
      `}
      data-testid={`leaderboard-row-${rank}`}
    >
      <div className="w-10 flex justify-center">
        {getRankIcon(rank)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-sm ${isCurrentUser ? 'text-cyan-400' : 'text-gray-300'}`}>
            {shortenAddress(entry.walletAddress)}
          </span>
          {isCurrentUser && (
            <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded uppercase">You</span>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r ${badge.color} text-white flex items-center gap-1`}>
            {badge.icon}
            {badge.label}
          </span>
          {entry.currentStreak > 0 && (
            <span className="text-[10px] text-orange-400 flex items-center gap-0.5">
              <Flame className="w-3 h-3" />
              {entry.currentStreak}
            </span>
          )}
        </div>
      </div>
      
      <div className="text-right">
        <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
          {entry.points.toLocaleString()}
        </div>
        <div className="text-[10px] text-gray-500 flex items-center justify-end gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(entry.bestTimeMs)}
        </div>
      </div>
    </motion.div>
  );
}

export function RiddleLeaderboard({ limit = 20, compact = false }: RiddleLeaderboardProps) {
  const { data: leaderboard, isLoading, error } = useRiddleLeaderboard(limit);
  const { address } = useAccount();
  const playerRank = usePlayerRank(address);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(compact ? 5 : 10)].map((_, i) => (
          <Skeleton key={i} className="h-16 bg-cyan-500/10" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        Failed to load leaderboard
      </div>
    );
  }

  if (!leaderboard?.length) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-12 h-12 mx-auto text-cyan-500/30 mb-3" />
        <p className="text-gray-400">No riddle masters yet</p>
        <p className="text-sm text-gray-500 mt-1">Be the first to solve riddles!</p>
      </div>
    );
  }

  const displayedEntries = compact ? leaderboard.slice(0, 5) : leaderboard;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
          <Trophy className="w-5 h-5 text-cyan-400" />
          Riddle Masters
        </h3>
        {playerRank && (
          <div className="text-sm text-gray-400">
            Your Rank: <span className="text-cyan-400 font-bold">#{playerRank}</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {displayedEntries.map((entry, index) => (
          <LeaderboardRow
            key={entry.id}
            entry={entry}
            rank={index + 1}
            isCurrentUser={address?.toLowerCase() === entry.walletAddress.toLowerCase()}
          />
        ))}
      </div>

      {compact && leaderboard.length > 5 && (
        <div className="text-center text-sm text-cyan-400/60 pt-2">
          +{leaderboard.length - 5} more riddle masters
        </div>
      )}
    </div>
  );
}
