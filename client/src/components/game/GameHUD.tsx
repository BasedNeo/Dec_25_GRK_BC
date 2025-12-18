import { Clock, Target, Flame, Pause, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Additional stat to display in HUD
 */
export interface HUDStat {
  icon: LucideIcon;
  label?: string;
  value: string | number;
  color: string;
}

/**
 * Game HUD Props
 */
export interface GameHUDProps {
  // Core stats
  score: number;
  time?: number;
  moves?: number;
  combo?: number;
  
  // Controls
  onPause?: () => void;
  
  // Customization
  formatTime?: (seconds: number) => string;
  formatScore?: (score: number) => string;
  extraStats?: HUDStat[];
  
  // Accessibility
  ariaLabel?: string;
}

/**
 * GAME HUD COMPONENT
 * Reusable heads-up display for all games
 * 
 * Shows: Time, Score, Moves, Combo, Custom Stats
 * Responsive and accessible
 */
export function GameHUD({ 
  score,
  time, 
  moves, 
  combo, 
  onPause,
  formatTime = defaultFormatTime,
  formatScore = defaultFormatScore,
  extraStats = [],
  ariaLabel = "Game statistics"
}: GameHUDProps) {
  return (
    <div 
      className="flex justify-between items-center bg-black/60 rounded-lg p-4 border border-white/10 backdrop-blur-md flex-wrap gap-4"
      role="region"
      aria-label={ariaLabel}
      data-testid="game-hud"
    >
      <div className="flex items-center gap-6 flex-wrap">
        {/* Time */}
        {time !== undefined && (
          <div className="flex items-center gap-2" aria-label="Time elapsed" data-testid="hud-time">
            <Clock className="w-4 h-4 text-cyan-400" aria-hidden="true" />
            <span className="text-white font-mono text-lg">
              {formatTime(time)}
            </span>
          </div>
        )}
        
        {/* Score */}
        <div className="flex items-center gap-2" aria-label="Current score" data-testid="hud-score">
          <Target className="w-4 h-4 text-purple-400" aria-hidden="true" />
          <span className="text-white font-mono text-lg">
            {formatScore(score)}
          </span>
        </div>
        
        {/* Moves */}
        {moves !== undefined && (
          <div className="flex items-center gap-2" aria-label="Moves made" data-testid="hud-moves">
            <Target className="w-4 h-4 text-blue-400" aria-hidden="true" />
            <span className="text-white font-mono text-lg">
              {moves} {moves === 1 ? 'move' : 'moves'}
            </span>
          </div>
        )}
        
        {/* Combo */}
        {combo !== undefined && combo > 0 && (
          <div 
            className="flex items-center gap-2 animate-pulse" 
            aria-label={`${combo} times combo`}
            data-testid="hud-combo"
          >
            <Flame className="w-4 h-4 text-orange-400" aria-hidden="true" />
            <span className="text-orange-400 font-bold">
              {combo}x Combo
            </span>
          </div>
        )}
        
        {/* Extra Stats */}
        {extraStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx} 
              className="flex items-center gap-2"
              aria-label={stat.label ? `${stat.label}: ${stat.value}` : String(stat.value)}
              data-testid={`hud-stat-${idx}`}
            >
              <Icon className={`w-4 h-4 ${stat.color}`} aria-hidden="true" />
              <span className="text-white font-mono text-lg">
                {stat.label && `${stat.label}: `}{stat.value}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Pause Button */}
      {onPause && (
        <Button
          variant="outline"
          size="sm"
          onClick={onPause}
          className="border-white/20 hover:border-white/40 transition-colors"
          aria-label="Pause game"
          data-testid="button-pause"
        >
          <Pause className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Default time formatter
 */
function defaultFormatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Default score formatter
 */
function defaultFormatScore(score: number): string {
  return score.toLocaleString();
}
