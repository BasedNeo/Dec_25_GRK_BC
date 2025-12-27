import { motion } from 'framer-motion';
import { useInfinityRaceProgressStore, LEVEL_THRESHOLDS } from '../../store/infinityRaceProgressStore';

export function LevelProgressBar() {
  const { progress, isLoading } = useInfinityRaceProgressStore();
  
  if (isLoading || !progress) {
    return (
      <div className="bg-black/40 backdrop-blur-sm rounded-lg p-2 border border-cyan-500/30">
        <div className="animate-pulse bg-cyan-500/20 h-8 rounded" />
      </div>
    );
  }
  
  const { level, totalRaces, statBonus } = progress;
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || 100;
  const racesInLevel = totalRaces - currentThreshold;
  const racesNeeded = nextThreshold - currentThreshold;
  const progressPercent = level >= 10 ? 100 : Math.min(100, (racesInLevel / racesNeeded) * 100);
  
  return (
    <div 
      className="bg-black/40 backdrop-blur-sm rounded-lg p-3 border border-cyan-500/30"
      data-testid="level-progress-bar"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="bg-cyan-500 text-black font-bold px-2 py-0.5 rounded text-sm">
            LVL {level}
          </div>
          {statBonus > 0 && (
            <div className="text-xs text-green-400" data-testid="stat-bonus">
              +{statBonus} Stats
            </div>
          )}
        </div>
        <div className="text-xs text-gray-400">
          {level >= 10 ? 'MAX' : `${totalRaces}/${nextThreshold} races`}
        </div>
      </div>
      
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
        />
      </div>
    </div>
  );
}
