import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Crown, Medal, Diamond, Gem } from 'lucide-react';

const DIAMOND_HANDS_LEVELS = [
  { name: 'Ice Hands', color: 'text-blue-200', bgColor: 'bg-blue-500/20', icon: '🧊' },
  { name: 'Stone Hands', color: 'text-gray-400', bgColor: 'bg-gray-500/20', icon: '🪨' },
  { name: 'Bronze Hands', color: 'text-amber-600', bgColor: 'bg-amber-500/20', icon: '🥉' },
  { name: 'Silver Hands', color: 'text-gray-300', bgColor: 'bg-gray-400/20', icon: '🥈' },
  { name: 'Platinum Hands', color: 'text-cyan-300', bgColor: 'bg-cyan-400/20', icon: '💎' },
  { name: 'Diamond Hands', color: 'text-purple-400', bgColor: 'bg-purple-500/20', icon: '💠' },
];

interface LeaderboardEntry {
  id: string;
  walletAddress: string;
  customName: string | null;
  daysHolding: number;
  retentionRate: number;
  currentHolding: number;
  level: number;
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground text-sm font-mono">{rank}</span>;
}

export function DiamondHandsLeaderboard() {
  const { data: leaderboard, isLoading, error } = useQuery<LeaderboardEntry[]>({
    queryKey: ['diamond-hands-leaderboard'],
    queryFn: async () => {
      const res = await fetch('/api/diamond-hands/leaderboard?limit=20');
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return res.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  if (error) {
    return (
      <Card className="bg-black/40 border-white/10 p-4">
        <p className="text-muted-foreground text-center text-sm">Failed to load leaderboard</p>
      </Card>
    );
  }

  return (
    <Card className="bg-black/40 border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <Diamond className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white font-orbitron flex items-center gap-2">
            DIAMOND HANDS LEADERBOARD
            <Trophy className="w-4 h-4 text-yellow-400" />
          </h3>
          <p className="text-xs text-muted-foreground">Top holders by loyalty & retention</p>
        </div>
      </div>

      <ScrollArea className="h-[400px]">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full bg-white/5" />
              ))}
            </div>
          ) : leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-1">
              {leaderboard.map((entry, index) => {
                const levelData = DIAMOND_HANDS_LEVELS[entry.level] || DIAMOND_HANDS_LEVELS[0];
                const rank = index + 1;
                const isTop3 = rank <= 3;

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isTop3 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent' : 'hover:bg-white/5'
                    }`}
                    data-testid={`leaderboard-entry-${index}`}
                  >
                    <div className="w-8 flex justify-center">
                      {getRankIcon(rank)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium truncate">
                          {entry.customName || formatAddress(entry.walletAddress)}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`${levelData.bgColor} ${levelData.color} border-0 text-xs shrink-0`}
                        >
                          {levelData.icon} {levelData.name}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{entry.daysHolding} days</span>
                        <span>•</span>
                        <span>{entry.retentionRate}% retention</span>
                        <span>•</span>
                        <span>{entry.currentHolding} NFTs</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Gem className="w-12 h-12 text-purple-400/50 mb-3" />
              <p className="text-muted-foreground text-sm">No Diamond Hands data yet</p>
              <p className="text-muted-foreground/70 text-xs mt-1">
                Visit your Stats page to appear on the leaderboard
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
