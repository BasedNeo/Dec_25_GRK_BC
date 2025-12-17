/**
 * ActivityFeed Component
 * 
 * ⚠️ LOCKED - Do NOT modify without explicit user request
 * See replit.md "LOCKED CALCULATIONS" section for details
 * 
 * Displays real-time activity from the blockchain:
 * - Mints, Sales, Listings, Transfers
 * - Auto-refreshes every 30 seconds
 * - Links to block explorer
 * - Shows REAL contract stats (not just event counts)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  ExternalLink, 
  Activity as ActivityIcon,
  Coins,
  ScrollText,
  Orbit,
  TrendingUp,
  ShoppingCart,
  Tag,
  ArrowRightLeft,
  X,
  Gavel,
  Swords,
  Gem,
  Sparkles,
  Crown
} from 'lucide-react';
import { 
  useActivityFeed, 
  Activity, 
  ActivityType,
  getActivityDisplay, 
  formatTimeAgo 
} from '@/hooks/useActivityFeed';
import { BLOCK_EXPLORER } from '@/lib/constants';
import { DiamondHandsLeaderboard } from './DiamondHandsLeaderboard';

interface ActivityFeedProps {
  limit?: number;
  showStats?: boolean;
  compact?: boolean;
  title?: string;
}

export function ActivityFeed({ 
  limit = 20, 
  showStats = true, 
  compact = false,
  title = "LIVE ACTIVITY"
}: ActivityFeedProps) {
  const { activities, isLoading, error, stats, refresh, lastBlock } = useActivityFeed({ limit });
  const [filterType, setFilterType] = useState<ActivityType | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredActivities = filterType === 'all' 
    ? activities 
    : activities.filter(a => a.type === filterType);

  return (
    <section className="py-8">
      <div className="max-w-4xl mx-auto px-4">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ActivityIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white font-orbitron flex items-center gap-2">
                {title}
                <span className="flex items-center gap-1 text-xs font-normal text-[#6cff61]">
                  <span className="w-2 h-2 rounded-full bg-[#6cff61] animate-pulse" />
                  LIVE
                </span>
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Block #{lastBlock.toLocaleString()} • {stats.totalMinted} / 3,732 Minted • Auto-refreshes
              </p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-white/10 text-muted-foreground hover:text-white"
            data-testid="activity-refresh-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {showStats && !compact && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {/* Total Mints - FROM CONTRACT (accurate) */}
            <StatCard 
              label="Total Minted" 
              value={stats.totalMinted || 0} 
              icon={<GuardianMintIcon className="w-6 h-6 text-[#6cff61]" />} 
              color="text-[#6cff61]" 
            />
            
            {/* Sales - From recent events */}
            <StatCard 
              label="Recent Sales" 
              value={stats.totalSales} 
              icon={<Coins className="w-5 h-5 text-yellow-400" />} 
              color="text-yellow-400" 
            />
            
            {/* Listings - From recent events */}
            <StatCard 
              label="Recent Listings" 
              value={stats.totalListings} 
              icon={<ScrollText className="w-5 h-5 text-cyan-400" />} 
              color="text-cyan-400" 
            />
            
            {/* Transfers - From recent events */}
            <StatCard 
              label="Transfers" 
              value={stats.totalTransfers} 
              icon={<Orbit className="w-5 h-5 text-blue-400" />} 
              color="text-blue-400" 
            />
            
            {/* Volume - From recent on-chain sales ONLY (not historical baseline) */}
            <StatCard 
              label="Volume" 
              value={stats.recentVolume > 0 ? stats.recentVolume.toLocaleString() : '0'} 
              suffix="$BASED" 
              icon={<TrendingUp className="w-5 h-5 text-purple-400" />} 
              color="text-purple-400" 
            />
          </div>
        )}

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {(['all', 'mint', 'sale', 'list', 'transfer'] as const).map((type) => (
            <Badge
              key={type}
              variant="outline"
              className={`cursor-pointer capitalize whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterType === type 
                  ? 'bg-primary/20 text-primary border-primary' 
                  : 'text-muted-foreground hover:text-white border-white/10'
              }`}
              onClick={() => setFilterType(type)}
              data-testid={`activity-filter-${type}`}
            >
              {type === 'all' ? (
                <><ActivityIcon className="w-3 h-3" /> All</>
              ) : type === 'mint' ? (
                <><GuardianMintIcon className="w-4 h-4" /> Mint</>
              ) : type === 'sale' ? (
                <><ShoppingCart className="w-3 h-3" /> Sale</>
              ) : type === 'list' ? (
                <><Tag className="w-3 h-3" /> List</>
              ) : (
                <><ArrowRightLeft className="w-3 h-3" /> Transfer</>
              )}
            </Badge>
          ))}
        </div>

        <Card className="bg-black/40 border-white/10 overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <ActivitySkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-400 mb-4">Failed to load activity</p>
              <Button variant="outline" onClick={refresh} data-testid="activity-retry-btn">Try Again</Button>
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-8 text-center">
              <ActivityIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No activity yet</p>
              <p className="text-xs text-muted-foreground/50 mt-2">
                Activity will appear here when NFTs are minted, listed, or sold
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ActivityRow activity={activity} compact={compact} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </Card>

        {!compact && (
          <div className="mt-8">
            <DiamondHandsLeaderboard />
          </div>
        )}

        {!compact && (
          <div className="mt-8">
            <Card className="bg-black/60 border-purple-500/30 p-6 backdrop-blur-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Swords className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-orbitron font-bold text-white text-lg">Race-to-Based P2E Games</h3>
                      <p className="text-xs text-muted-foreground">Play-to-Earn Gaming Leaderboard</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 animate-pulse">
                    COMING SOON
                  </Badge>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
                      <div className="relative p-4 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-full border border-purple-500/30">
                        <Gem className="w-12 h-12 text-purple-400" />
                      </div>
                    </div>
                    
                    <h4 className="font-orbitron text-white text-xl mb-2">Compete. Earn. Dominate.</h4>
                    <p className="text-muted-foreground text-sm max-w-md mb-4">
                      Race against other Guardians in exciting P2E mini-games. Earn $BASED rewards and climb the leaderboard!
                    </p>
                    
                    <div className="grid grid-cols-3 gap-4 w-full max-w-sm mt-4">
                      <div className="bg-black/40 rounded-lg p-3 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors group">
                        <div className="flex justify-center mb-2">
                          <SpeedRaceIcon className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                        </div>
                        <p className="text-[10px] text-cyan-400/80 font-mono text-center">SPEED RACE</p>
                      </div>
                      <div className="bg-black/40 rounded-lg p-3 border border-purple-500/20 hover:border-purple-500/40 transition-colors group">
                        <div className="flex justify-center mb-2">
                          <BrainBattleIcon className="w-8 h-8 text-purple-400 group-hover:text-purple-300 transition-colors" />
                        </div>
                        <p className="text-[10px] text-purple-400/80 font-mono text-center">BRAIN BATTLE</p>
                      </div>
                      <div className="bg-black/40 rounded-lg p-3 border border-pink-500/20 hover:border-pink-500/40 transition-colors group">
                        <div className="flex justify-center mb-2">
                          <BasedHuntIcon className="w-8 h-8 text-pink-400 group-hover:text-pink-300 transition-colors" />
                        </div>
                        <p className="text-[10px] text-pink-400/80 font-mono text-center">BASED HUNT</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex items-center gap-2 text-xs text-purple-400/80">
                      <Sparkles className="w-4 h-4" />
                      <span>Launching - 2026</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-lg p-3 border border-purple-500/20">
                  <div className="flex items-center gap-2 text-xs">
                    <Crown className="w-4 h-4 text-yellow-400" />
                    <span className="text-gray-300">Top players will earn exclusive NFT rewards and $BASED prizes!</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value, icon, color, suffix }: { label: string; value: number | string; icon: React.ReactNode; color: string; suffix?: string }) {
  return (
    <Card className="bg-white/5 border-white/10 p-4">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground font-mono uppercase">{label}</span>
      </div>
      <div className={`text-2xl font-bold font-orbitron ${color}`}>
        {value}
      </div>
      {suffix && <div className="text-sm text-muted-foreground mt-0.5">{suffix}</div>}
    </Card>
  );
}

function GuardianMintIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z" 
        fill="currentColor" 
        fillOpacity="0.2"
        stroke="currentColor" 
        strokeWidth="1.5"
      />
      <path 
        d="M12 6L9 8V10.5C9 12.5 10.5 14.5 12 15C13.5 14.5 15 12.5 15 10.5V8L12 6Z" 
        fill="currentColor"
      />
      <circle cx="12" cy="10" r="1.5" fill="black" />
      <path d="M10 17H14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M9 19H15" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" />
    </svg>
  );
}

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

function getActivityIcon(type: ActivityType): React.ReactNode {
  switch (type) {
    case 'mint':
      return <GuardianMintIcon className="w-7 h-7 text-[#6cff61]" />;
    case 'sale':
      return <ShoppingCart className="w-6 h-6 text-yellow-400" />;
    case 'list':
      return <Tag className="w-6 h-6 text-cyan-400" />;
    case 'delist':
      return <X className="w-6 h-6 text-red-400" />;
    case 'offer':
      return <Gavel className="w-6 h-6 text-purple-400" />;
    case 'transfer':
      return <ArrowRightLeft className="w-6 h-6 text-blue-400" />;
    default:
      return <ActivityIcon className="w-6 h-6 text-gray-400" />;
  }
}

function ActivityRow({ activity, compact }: { activity: Activity; compact: boolean }) {
  const display = getActivityDisplay(activity.type);
  const shortenAddress = (addr: string) => 
    addr.length > 20 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  return (
    <div className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors group" data-testid={`activity-row-${activity.id}`}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
          {getActivityIcon(activity.type)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-bold ${display.color}`}>{display.label}</span>
            <Badge variant="outline" className="text-xs border-white/20">#{activity.tokenId}</Badge>
          </div>
          {!compact && (
            <div className="text-xs text-muted-foreground mt-1 font-mono">
              {activity.type === 'mint' ? (
                <span>Minted by <span className="text-white">{shortenAddress(activity.to)}</span></span>
              ) : activity.type === 'sale' ? (
                <span><span className="text-white">{shortenAddress(activity.from)}</span> → <span className="text-white">{shortenAddress(activity.to)}</span></span>
              ) : activity.type === 'list' ? (
                <span>Listed by <span className="text-white">{shortenAddress(activity.from)}</span></span>
              ) : (
                <span><span className="text-white">{shortenAddress(activity.from)}</span> → <span className="text-white">{shortenAddress(activity.to)}</span></span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        {activity.price && (
          <div className="text-right">
            <div className="text-sm font-bold text-white font-mono">{Number(activity.price).toLocaleString()}</div>
            <div className="text-xs text-primary">$BASED</div>
          </div>
        )}
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{formatTimeAgo(activity.timestamp)}</div>
          <a
            href={`${BLOCK_EXPLORER}/tx/${activity.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            View <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border-b border-white/5">
      <div className="flex items-center gap-4">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="text-right">
        <Skeleton className="h-4 w-16 mb-2" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

export default ActivityFeed;
