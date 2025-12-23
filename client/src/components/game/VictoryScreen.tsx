import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, Clock, Target, TrendingUp, Play, Home, Share2, 
  Award, Zap, Trophy, Crown, LucideIcon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  GameType, 
  getGameConfig, 
  getScorePerformanceTier,
  PerformanceTier 
} from '@/lib/gameRegistry';
import { InitialsEntry } from './InitialsEntry';
import { useArcadeLeaderboard } from '@/hooks/useArcadeLeaderboard';

/**
 * Additional stat to display in victory screen
 */
export interface VictoryStat {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
}

/**
 * Victory Screen Props
 */
export interface VictoryScreenProps {
  // Game info
  gameType: GameType;
  
  // Performance
  score: number;
  time?: number;
  moves?: number;
  extraStats?: VictoryStat[];
  
  // Context
  playsRemaining: number;
  maxPlays: number;
  isNewBest: boolean;
  personalBest?: number;
  
  // Actions
  onPlayAgain: () => void;
  onExit: () => void;
  onViewLeaderboard?: () => void;
  onShare?: () => void;
  
  // Customization
  formatTime?: (seconds: number) => string;
  
  // Leaderboard integration
  showInitialsEntry?: boolean;
  onInitialsSubmit?: (initials: string, rank: number | null) => void;
}

/**
 * Performance-based messaging
 */
const PERFORMANCE_MESSAGES: Record<PerformanceTier, {
  title: string;
  message: string;
  gradient: string;
  icon: LucideIcon;
}> = {
  legendary: {
    title: "LEGENDARY!",
    message: "Absolute mastery! You're among the elite.",
    gradient: "from-yellow-400 via-orange-400 to-red-500",
    icon: Crown,
  },
  great: {
    title: "OUTSTANDING!",
    message: "Exceptional performance! Keep pushing!",
    gradient: "from-cyan-400 via-blue-400 to-purple-500",
    icon: Trophy,
  },
  good: {
    title: "IMPRESSIVE!",
    message: "Strong showing! Room for growth.",
    gradient: "from-green-400 via-cyan-400 to-blue-500",
    icon: Zap,
  },
  beginner: {
    title: "COMPLETE!",
    message: "Well done! Practice makes perfect.",
    gradient: "from-gray-400 via-gray-300 to-gray-400",
    icon: Award,
  },
};

/**
 * VICTORY SCREEN COMPONENT
 * Reusable end-game celebration screen
 * 
 * Features:
 * - Performance-based messaging
 * - Animated entrance
 * - Stats breakdown
 * - Personal best indication
 * - Call-to-action buttons
 * - Responsive layout
 * - Accessible
 */
export function VictoryScreen({
  gameType,
  score,
  time,
  moves,
  extraStats = [],
  playsRemaining,
  maxPlays,
  isNewBest,
  personalBest,
  onPlayAgain,
  onExit,
  onViewLeaderboard,
  onShare,
  formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
  showInitialsEntry = true,
  onInitialsSubmit
}: VictoryScreenProps) {
  const config = getGameConfig(gameType);
  const tier = getScorePerformanceTier(gameType, score);
  const message = PERFORMANCE_MESSAGES[tier];
  const MessageIcon = message.icon;
  const { submitScore, playerInitials, saveInitials } = useArcadeLeaderboard();
  
  const [showingInitials, setShowingInitials] = useState(showInitialsEntry);
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  
  // Calculate improvement percentage
  const improvement = personalBest && personalBest > 0
    ? ((score - personalBest) / personalBest) * 100
    : 0;
  
  const handleInitialsSubmit = (initials: string) => {
    saveInitials(initials);
    const result = submitScore(gameType, score, initials);
    setLeaderboardRank(result.rank);
    setShowingInitials(false);
    onInitialsSubmit?.(initials, result.rank);
  };
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-md p-4 overflow-y-auto"
        role="dialog"
        aria-labelledby="victory-title"
        aria-describedby="victory-message"
        data-testid="victory-screen"
      >
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-4 border-cyan-400 rounded-2xl p-6 md:p-12 text-center backdrop-blur-lg max-w-lg w-full relative max-h-[95vh] overflow-y-auto my-auto"
        >
          {/* Celebration Icon */}
          <motion.div 
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
            className="mb-6"
          >
            <MessageIcon className="w-20 h-20 mx-auto text-yellow-400" data-testid="victory-icon" />
          </motion.div>
          
          {/* Game Name */}
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2" data-testid="game-name">
            {config.name}
          </p>
          
          {/* Title */}
          <h2 
            id="victory-title"
            className={`text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${message.gradient} mb-2 font-orbitron`}
            data-testid="victory-title"
          >
            {message.title}
          </h2>
          <p id="victory-message" className="text-gray-300 text-lg mb-6" data-testid="victory-message">
            {message.message}
          </p>
          
          {/* Score */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mb-6"
          >
            <div className="flex items-center justify-center gap-3 text-4xl mb-2">
              <Star className="w-10 h-10 text-yellow-400" aria-hidden="true" />
              <span className="text-yellow-400 font-bold" data-testid="victory-score">
                {score.toLocaleString()}
              </span>
              <span className="text-white text-2xl">pts</span>
            </div>
            
            {isNewBest && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50 animate-pulse" data-testid="new-best-badge">
                NEW PERSONAL BEST!
              </Badge>
            )}
            
            {!isNewBest && improvement > 0 && (
              <p className="text-sm text-cyan-400" data-testid="improvement-text">
                +{improvement.toFixed(1)}% improvement!
              </p>
            )}
            
            {leaderboardRank && leaderboardRank <= 10 && !showingInitials && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 mt-2" data-testid="leaderboard-rank-badge">
                🏆 Leaderboard Rank #{leaderboardRank}
              </Badge>
            )}
          </motion.div>
          
          {showingInitials ? (
            <div className="mb-6">
              <InitialsEntry 
                onSubmit={handleInitialsSubmit}
                score={score}
                defaultInitials={playerInitials}
              />
            </div>
          ) : (
          <>
          {/* Stats Grid */}
          {(time !== undefined || moves !== undefined || extraStats.length > 0) && (
            <div className="grid grid-cols-2 gap-3 mb-6" data-testid="stats-grid">
              {time !== undefined && (
                <div className="bg-black/40 rounded-lg p-4 border border-white/10" data-testid="stat-time">
                  <Clock className="w-5 h-5 text-cyan-400 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-cyan-400 font-bold text-lg">{formatTime(time)}</p>
                  <p className="text-xs text-gray-500">Time</p>
                </div>
              )}
              
              {moves !== undefined && (
                <div className="bg-black/40 rounded-lg p-4 border border-white/10" data-testid="stat-moves">
                  <Target className="w-5 h-5 text-purple-400 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-purple-400 font-bold text-lg">{moves}</p>
                  <p className="text-xs text-gray-500">Moves</p>
                </div>
              )}
              
              {extraStats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div 
                    key={idx} 
                    className="bg-black/40 rounded-lg p-4 border border-white/10"
                    data-testid={`stat-extra-${idx}`}
                  >
                    <Icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} aria-hidden="true" />
                    <p className={`${stat.color} font-bold text-lg`}>{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Plays Remaining */}
          <div className="mb-6 text-sm text-gray-400" data-testid="plays-remaining">
            <p>
              {playsRemaining === 0 ? (
                <span className="text-red-400 font-bold">No plays remaining today</span>
              ) : (
                <span>
                  {playsRemaining} of {maxPlays} plays remaining today
                </span>
              )}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 justify-center flex-wrap">
            <Button
              onClick={onPlayAgain}
              disabled={playsRemaining === 0}
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-play-again"
            >
              <Play className="w-5 h-5 mr-2" />
              Play Again
            </Button>
            
            {onViewLeaderboard && (
              <Button
                onClick={onViewLeaderboard}
                size="lg"
                variant="outline"
                className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                data-testid="button-leaderboard"
              >
                <TrendingUp className="w-5 h-5 mr-2" />
                Leaderboard
              </Button>
            )}
            
            {onShare && (
              <Button
                onClick={onShare}
                size="lg"
                variant="outline"
                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                data-testid="button-share"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share
              </Button>
            )}
            
            <Button
              onClick={onExit}
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              data-testid="button-exit"
            >
              <Home className="w-5 h-5 mr-2" />
              Exit
            </Button>
          </div>
          </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
