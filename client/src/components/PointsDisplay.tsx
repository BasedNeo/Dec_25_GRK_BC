import { useGamePoints } from '@/hooks/useGamePoints';
import { motion } from 'framer-motion';
import { Zap, Lock, Unlock, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PointsDisplayProps {
  showBreakdown?: boolean;
  compact?: boolean;
  showVesting?: boolean;
  className?: string;
}

export function PointsDisplay({ 
  showBreakdown = false, 
  compact = false,
  showVesting = true,
  className = ''
}: PointsDisplayProps) {
  const { balance, isLoading, formatPoints, isConnected } = useGamePoints();

  if (isLoading || !balance) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-gray-700 rounded w-24" />
      </div>
    );
  }

  const vestingProgress = balance.totalEarned > 0 
    ? Math.min(100, (balance.totalEarned / 10000) * 100) 
    : 0;
  const pointsToNextBrainX = Math.max(0, 1000 - (balance.totalEarned % 1000));
  const dailyProgress = (balance.dailyEarnedTotal / balance.globalDailyCap) * 100;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Zap className="w-4 h-4 text-cyan-400" />
        <span className="text-cyan-400 font-bold font-mono">
          {formatPoints(balance.totalEarned)}
        </span>
        {balance.dailyEarnedTotal > 0 && (
          <span className="text-green-400 text-xs">
            +{formatPoints(balance.dailyEarnedTotal)} today
          </span>
        )}
        {isConnected && (
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Live sync" />
        )}
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl border border-cyan-500/30 bg-black/40 backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          <span className="text-gray-400 text-sm">Points Balance</span>
        </div>
        {isConnected && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-2xl font-bold text-cyan-400 font-mono">
            {formatPoints(balance.totalEarned)}
          </p>
          <p className="text-xs text-gray-500">Total Earned</p>
        </div>
        <div>
          <p className="text-lg font-bold text-green-400 font-mono">
            +{formatPoints(balance.dailyEarnedTotal)}
          </p>
          <p className="text-xs text-gray-500">
            Today ({balance.dailyEarnedTotal}/{balance.globalDailyCap})
          </p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Daily Cap</span>
          <span className="text-gray-400">{Math.round(dailyProgress)}%</span>
        </div>
        <Progress 
          value={dailyProgress} 
          className="h-1.5 bg-gray-800"
        />
      </div>

      {showVesting && (
        <div className="pt-3 border-t border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-400">BrainX Vesting</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-lg font-bold text-purple-400 font-mono">
                  {balance.brainXLocked}
                </p>
                <p className="text-xs text-gray-500">Locked</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Unlock className="w-4 h-4 text-yellow-400" />
              <div>
                <p className="text-lg font-bold text-yellow-400 font-mono">
                  {balance.brainXUnlocked}
                </p>
                <p className="text-xs text-gray-500">Unlocked</p>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-400 mb-2">
            Progress to next brainX: {formatPoints(1000 - pointsToNextBrainX)} / 1,000 points
          </div>
          <Progress 
            value={((1000 - pointsToNextBrainX) / 1000) * 100} 
            className="h-2 bg-gray-800"
          />
          
          {balance.vestingEndDate && (
            <p className="text-xs text-purple-300 mt-2 text-center">
              Unlocks: {new Date(balance.vestingEndDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {showBreakdown && balance.games.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-700/50">
          <p className="text-xs text-gray-400 mb-2">By Game</p>
          <div className="space-y-2">
            {balance.games.map(game => (
              <div key={game.game} className="flex justify-between text-sm">
                <span className="text-gray-300 capitalize">
                  {game.game.replace('-', ' ')}
                </span>
                <div className="flex gap-2">
                  <span className="text-cyan-400 font-mono">
                    {formatPoints(game.earned)}
                  </span>
                  <span className="text-green-400 text-xs">
                    (+{game.dailyEarned}/{game.dailyCap})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function PointsBadge({ className = '' }: { className?: string }) {
  const { balance, formatPoints } = useGamePoints();
  
  if (!balance) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 ${className}`}>
      <Zap className="w-3 h-3 text-cyan-400" />
      <span className="text-xs font-bold text-cyan-400 font-mono">
        {formatPoints(balance.totalEarned)}
      </span>
    </div>
  );
}

export function VestingProgressBar({ className = '' }: { className?: string }) {
  const { balance, formatPoints } = useGamePoints();
  
  if (!balance) return null;

  const availablePoints = balance.totalEarned - balance.totalVested;
  const progress = (availablePoints / 10000) * 100;
  const yearsRemaining = balance.vestingEndDate 
    ? Math.max(0, Math.ceil((new Date(balance.vestingEndDate).getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000)))
    : 1;

  return (
    <div className={`p-3 rounded-lg border border-purple-500/30 bg-purple-500/10 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-purple-300">Vesting for brainX</span>
        <span className="text-xs text-gray-400">
          {yearsRemaining > 0 ? `Unlocks in ~${yearsRemaining} year${yearsRemaining > 1 ? 's' : ''}` : 'Ready to claim!'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Progress value={Math.min(100, progress)} className="flex-1 h-2 bg-gray-800" />
        <span className="text-sm font-mono text-purple-400">
          {formatPoints(availablePoints)} / 10,000
        </span>
      </div>
    </div>
  );
}
