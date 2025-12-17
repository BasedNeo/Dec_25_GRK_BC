import { motion } from 'framer-motion';
import { Trophy, Gamepad2, Crown, Medal, Rocket, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useGameLeaderboard, usePlayerGameStats } from '@/hooks/useGameScores';
import { useAccount } from 'wagmi';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

const RANK_COLORS: Record<string, string> = {
  'Cadet': 'text-gray-400',
  'Pilot': 'text-green-400',
  'Void Walker': 'text-cyan-400',
  'Star Commander': 'text-purple-400',
  'Fleet Admiral': 'text-orange-400',
  'Based Eternal': 'text-yellow-400',
};

const RANK_BG: Record<string, string> = {
  'Cadet': 'bg-gray-500/20',
  'Pilot': 'bg-green-500/20',
  'Void Walker': 'bg-cyan-500/20',
  'Star Commander': 'bg-purple-500/20',
  'Fleet Admiral': 'bg-orange-500/20',
  'Based Eternal': 'bg-yellow-500/20',
};

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground text-sm font-mono">{rank}</span>;
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function RaceToBaseLeaderboard() {
  const { address, isConnected } = useAccount();
  const { data: leaderboard, isLoading, error } = useGameLeaderboard(20);
  const { data: playerStats } = usePlayerGameStats();

  if (error) {
    return (
      <Card className="bg-black/40 border-white/10 p-4">
        <p className="text-muted-foreground text-center text-sm">Failed to load leaderboard</p>
      </Card>
    );
  }

  return (
    <Card className="bg-black/40 border-white/10 overflow-hidden" data-testid="race-to-base-leaderboard">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Gamepad2 className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-orbitron flex items-center gap-2">
              RACE-TO-BASE
              <Trophy className="w-4 h-4 text-yellow-400" />
            </h3>
            <p className="text-xs text-muted-foreground">Guardian Defender Minigame Leaderboard</p>
          </div>
        </div>
        <Link href="/game">
          <Button size="sm" variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10" data-testid="button-play-game">
            <Rocket className="w-4 h-4 mr-1" />
            Play
          </Button>
        </Link>
      </div>

      {isConnected && playerStats?.exists && playerStats.stats && (
        <div className="p-3 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-white/80">Your Stats</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-white/60">Lifetime: <span className="text-cyan-400 font-bold">{playerStats.stats.lifetimeScore.toLocaleString()}</span></span>
              <span className="text-white/60">High: <span className="text-yellow-400 font-bold">{playerStats.stats.highScore.toLocaleString()}</span></span>
              <span className={`font-bold ${RANK_COLORS[playerStats.stats.rank] || 'text-gray-400'}`}>{playerStats.stats.rank}</span>
            </div>
          </div>
        </div>
      )}

      <ScrollArea className="h-[350px]">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full bg-white/5" />
              ))}
            </div>
          ) : leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-1">
              {leaderboard.map((entry, index) => {
                const rank = index + 1;
                const isTop3 = rank <= 3;
                const isCurrentUser = address?.toLowerCase() === entry.walletAddress.toLowerCase();
                const displayName = entry.customName 
                  ? `${entry.customName}#${entry.walletAddress.slice(-3).toUpperCase()}`
                  : formatAddress(entry.walletAddress);

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      isCurrentUser 
                        ? 'bg-cyan-500/20 border border-cyan-500/30' 
                        : isTop3 
                          ? 'bg-white/5 hover:bg-white/10' 
                          : 'hover:bg-white/5'
                    }`}
                    data-testid={`leaderboard-entry-${entry.id}`}
                  >
                    <div className="w-8 flex justify-center">
                      {getRankIcon(rank)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium truncate ${isCurrentUser ? 'text-cyan-400' : 'text-white'}`}>
                          {displayName}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${RANK_BG[entry.rank] || 'bg-gray-500/20'} ${RANK_COLORS[entry.rank] || 'text-gray-400'}`}>
                          {entry.rank}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/50">
                        <span>Games: {entry.gamesPlayed}</span>
                        <span>Best: {entry.highScore.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-cyan-400 font-mono">
                        {entry.lifetimeScore.toLocaleString()}
                      </div>
                      <div className="text-xs text-white/40">lifetime</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gamepad2 className="w-12 h-12 text-white/20 mb-3" />
              <p className="text-white/40 text-sm mb-2">No scores yet!</p>
              <p className="text-white/30 text-xs">Be the first to play Guardian Defender</p>
              <Link href="/game">
                <Button size="sm" className="mt-4 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30">
                  <Rocket className="w-4 h-4 mr-1" />
                  Start Playing
                </Button>
              </Link>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
