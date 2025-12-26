import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Award, Flame, Calendar, Target, Gamepad2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useArcadeLeaderboard, LeaderboardEntry, PersonalStats, DailyChallenge } from '@/hooks/useArcadeLeaderboard';

interface LeaderboardPanelProps {
  gameFilter?: string;
  showPersonalStats?: boolean;
  showDailyChallenge?: boolean;
  compact?: boolean;
}

const GAME_NAMES: Record<string, string> = {
  'ring-game': 'Ring Game',
  'asteroid-mining': 'Space Shooter',
  'cyber-breach': 'Cyber Breach',
};

const GAME_COLORS: Record<string, string> = {
  'ring-game': 'text-cyan-400',
  'asteroid-mining': 'text-purple-400',
  'cyber-breach': 'text-green-400',
};

function getRankIcon(index: number) {
  if (index === 0) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (index === 1) return <Medal className="w-5 h-5 text-gray-300" />;
  if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
  return <span className="w-5 h-5 flex items-center justify-center text-gray-500 font-mono text-sm">{index + 1}</span>;
}

function DailyChallengeCard({ challenge }: { challenge: DailyChallenge }) {
  return (
    <Card className={`p-4 border ${challenge.completed ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${challenge.completed ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
          {challenge.completed ? (
            <Trophy className="w-5 h-5 text-green-400" />
          ) : (
            <Calendar className="w-5 h-5 text-yellow-400" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Daily Challenge</p>
          <p className={`font-bold ${challenge.completed ? 'text-green-400' : 'text-yellow-400'}`}>
            {challenge.description}
          </p>
        </div>
        {challenge.completed && (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            Daily Champion 🏆
          </Badge>
        )}
      </div>
    </Card>
  );
}

function PersonalStatsCard({ stats }: { stats: PersonalStats }) {
  return (
    <Card className="p-4 bg-black/40 border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-cyan-400" />
        <h3 className="font-bold text-white">Your Stats</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <Gamepad2 className="w-5 h-5 text-purple-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{stats.totalGamesPlayed}</p>
          <p className="text-xs text-gray-400">Games Played</p>
        </div>
        
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{stats.streakDays}</p>
          <p className="text-xs text-gray-400">Day Streak</p>
        </div>
        
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">{stats.dailyChallengesCompleted}</p>
          <p className="text-xs text-gray-400">Challenges</p>
        </div>
        
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <Crown className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-white">
            {Math.max(...Object.values(stats.bestScores || { default: 0 })) || 0}
          </p>
          <p className="text-xs text-gray-400">Best Score</p>
        </div>
      </div>
      
      {Object.keys(stats.bestScores || {}).length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Best Scores by Game</p>
          <div className="space-y-2">
            {Object.entries(stats.bestScores).map(([game, score]) => (
              <div key={game} className="flex justify-between items-center">
                <span className={`text-sm ${GAME_COLORS[game] || 'text-gray-400'}`}>
                  {GAME_NAMES[game] || game}
                </span>
                <span className="font-mono font-bold text-white">{score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function LeaderboardList({ entries, compact }: { entries: LeaderboardEntry[]; compact?: boolean }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Trophy className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>No scores yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {entries.map((entry, index) => (
        <motion.div
          key={`${entry.displayName || entry.initials}-${entry.score}-${index}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`flex items-center gap-3 ${compact ? 'py-2' : 'py-3'} hover:bg-white/5 transition-colors rounded px-2`}
        >
          <div className="w-8 flex justify-center">
            {getRankIcon(index)}
          </div>
          
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="font-bold text-cyan-400 text-base tracking-wide truncate">
              {entry.displayName || entry.initials || 'Guardian'}
            </span>
            {!compact && (
              <span className={`text-xs flex-shrink-0 ${GAME_COLORS[entry.game] || 'text-gray-400'}`}>
                {GAME_NAMES[entry.game] || entry.game}
              </span>
            )}
          </div>
          
          <div className="text-right flex-shrink-0">
            <span className="font-mono font-bold text-white text-lg" style={{ textShadow: index < 3 ? '0 0 10px rgba(255,255,0,0.3)' : 'none' }}>
              {entry.score.toLocaleString()}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function LeaderboardPanel({ 
  gameFilter, 
  showPersonalStats = true, 
  showDailyChallenge = true,
  compact = false 
}: LeaderboardPanelProps) {
  const { leaderboard, personalStats, dailyChallenge, getGameLeaderboard, getTopScores } = useArcadeLeaderboard();
  
  const displayEntries = gameFilter 
    ? getGameLeaderboard(gameFilter, 10)
    : getTopScores(10);

  return (
    <div className="space-y-4">
      {showDailyChallenge && (
        <DailyChallengeCard challenge={dailyChallenge} />
      )}
      
      <Card className="bg-black/40 border-white/10 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h3 className="font-bold text-white">
              {gameFilter ? `${GAME_NAMES[gameFilter]} Leaderboard` : 'Top 10 High Scores'}
            </h3>
          </div>
        </div>
        
        <div className={compact ? 'p-2' : 'p-4'}>
          <LeaderboardList entries={displayEntries} compact={compact} />
        </div>
      </Card>
      
      {showPersonalStats && (
        <PersonalStatsCard stats={personalStats} />
      )}
    </div>
  );
}

export { DailyChallengeCard, PersonalStatsCard };
