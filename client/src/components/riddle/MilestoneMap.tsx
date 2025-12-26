import { motion } from 'framer-motion';
import { Shield, Brain, Skull, Castle, Sparkles, Lock, Check } from 'lucide-react';

export interface Milestone {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  requiredPoints: number;
  requiredSolves: number;
  color: string;
  glowColor: string;
}

export const MILESTONES: Milestone[] = [
  {
    id: 'fud_veil',
    name: 'FUD Veil',
    description: 'Pierce through the darkness of doubt',
    icon: Shield,
    requiredPoints: 0,
    requiredSolves: 1,
    color: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.6)'
  },
  {
    id: 'consensus_node',
    name: 'Consensus Node',
    description: 'Join the network of truth-seekers',
    icon: Brain,
    requiredPoints: 300,
    requiredSolves: 3,
    color: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.6)'
  },
  {
    id: 'shadow_realm',
    name: 'Shadow Realm',
    description: 'Navigate the cryptic depths',
    icon: Skull,
    requiredPoints: 750,
    requiredSolves: 7,
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.6)'
  },
  {
    id: 'guardian_citadel',
    name: 'Guardian Citadel',
    description: 'Reach the fortress of knowledge',
    icon: Castle,
    requiredPoints: 1500,
    requiredSolves: 15,
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.6)'
  },
  {
    id: 'brainx_horizon',
    name: 'BrainX Horizon',
    description: 'Ascend to enlightenment',
    icon: Sparkles,
    requiredPoints: 3000,
    requiredSolves: 30,
    color: '#00ffff',
    glowColor: 'rgba(0, 255, 255, 0.6)'
  }
];

interface MilestoneMapProps {
  currentPoints: number;
  totalSolves: number;
  compact?: boolean;
}

export function MilestoneMap({ currentPoints, totalSolves, compact = false }: MilestoneMapProps) {
  const getMilestoneStatus = (milestone: Milestone): 'locked' | 'current' | 'completed' => {
    const hasPoints = currentPoints >= milestone.requiredPoints;
    const hasSolves = totalSolves >= milestone.requiredSolves;
    
    if (hasPoints && hasSolves) return 'completed';
    
    const milestoneIndex = MILESTONES.findIndex(m => m.id === milestone.id);
    if (milestoneIndex === 0) return 'current';
    
    const prevMilestone = MILESTONES[milestoneIndex - 1];
    const prevCompleted = currentPoints >= prevMilestone.requiredPoints && 
                          totalSolves >= prevMilestone.requiredSolves;
    
    return prevCompleted ? 'current' : 'locked';
  };

  const getProgress = (milestone: Milestone): number => {
    const pointsProgress = Math.min(100, (currentPoints / milestone.requiredPoints) * 100);
    const solvesProgress = Math.min(100, (totalSolves / milestone.requiredSolves) * 100);
    return Math.min(pointsProgress, solvesProgress);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-black/40 rounded-lg border border-cyan-500/20">
        {MILESTONES.map((milestone, index) => {
          const status = getMilestoneStatus(milestone);
          const Icon = milestone.icon;
          
          return (
            <div key={milestone.id} className="flex items-center">
              <motion.div
                className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  status === 'completed' 
                    ? 'bg-gradient-to-br from-cyan-500/30 to-purple-500/30' 
                    : status === 'current'
                    ? 'bg-black/60 border border-cyan-500/50'
                    : 'bg-black/40 border border-gray-700/50'
                }`}
                animate={status === 'completed' ? {
                  boxShadow: [`0 0 10px ${milestone.glowColor}`, `0 0 20px ${milestone.glowColor}`, `0 0 10px ${milestone.glowColor}`]
                } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                title={`${milestone.name}: ${milestone.requiredPoints} pts / ${milestone.requiredSolves} solves`}
              >
                {status === 'completed' ? (
                  <Check className="w-4 h-4 text-cyan-400" />
                ) : status === 'locked' ? (
                  <Lock className="w-3 h-3 text-gray-500" />
                ) : (
                  <Icon className="w-4 h-4" style={{ color: milestone.color }} />
                )}
              </motion.div>
              
              {index < MILESTONES.length - 1 && (
                <div className={`w-4 h-0.5 ${
                  getMilestoneStatus(MILESTONES[index + 1]) !== 'locked' 
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500' 
                    : 'bg-gray-700'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative p-4 bg-gradient-to-br from-black/60 to-purple-900/20 rounded-xl border border-cyan-500/30">
      <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5" />
        Journey Milestones
      </h3>
      
      <svg viewBox="0 0 500 120" className="w-full h-24 mb-4">
        <defs>
          <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="25%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="75%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#00ffff" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <path
          d="M 30 60 Q 90 20 150 60 T 270 60 T 390 60 T 470 60"
          fill="none"
          stroke="#1f2937"
          strokeWidth="4"
          strokeLinecap="round"
        />
        
        <motion.path
          d="M 30 60 Q 90 20 150 60 T 270 60 T 390 60 T 470 60"
          fill="none"
          stroke="url(#pathGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ 
            pathLength: Math.min(1, (currentPoints / 3000 + totalSolves / 30) / 2)
          }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        
        {MILESTONES.map((milestone, index) => {
          const status = getMilestoneStatus(milestone);
          const x = 30 + (index * 110);
          const y = index % 2 === 0 ? 60 : 40;
          const Icon = milestone.icon;
          
          return (
            <g key={milestone.id}>
              <motion.circle
                cx={x}
                cy={y}
                r={status === 'completed' ? 18 : 15}
                fill={status === 'completed' ? milestone.color : status === 'current' ? '#1f2937' : '#0f0f0f'}
                stroke={milestone.color}
                strokeWidth={status === 'locked' ? 1 : 2}
                opacity={status === 'locked' ? 0.4 : 1}
                animate={status === 'completed' ? {
                  filter: [`drop-shadow(0 0 5px ${milestone.glowColor})`, `drop-shadow(0 0 15px ${milestone.glowColor})`]
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
              />
              
              <foreignObject x={x - 10} y={y - 10} width={20} height={20}>
                <div className="w-full h-full flex items-center justify-center">
                  {status === 'completed' ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : status === 'locked' ? (
                    <Lock className="w-3 h-3 text-gray-500" />
                  ) : (
                    <Icon className="w-4 h-4" style={{ color: milestone.color }} />
                  )}
                </div>
              </foreignObject>
              
              <text
                x={x}
                y={y + 32}
                textAnchor="middle"
                className="text-[10px] fill-gray-400"
                style={{ fontSize: '10px' }}
              >
                {milestone.name}
              </text>
            </g>
          );
        })}
      </svg>
      
      <div className="grid grid-cols-5 gap-2">
        {MILESTONES.map((milestone) => {
          const status = getMilestoneStatus(milestone);
          const progress = getProgress(milestone);
          const Icon = milestone.icon;
          
          return (
            <motion.div
              key={milestone.id}
              className={`p-2 rounded-lg border transition-all ${
                status === 'completed'
                  ? 'bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border-cyan-500/50'
                  : status === 'current'
                  ? 'bg-black/40 border-cyan-500/30'
                  : 'bg-black/20 border-gray-700/30 opacity-50'
              }`}
              whileHover={{ scale: status !== 'locked' ? 1.02 : 1 }}
            >
              <div className="flex items-center gap-1 mb-1">
                <Icon 
                  className="w-3 h-3" 
                  style={{ color: status === 'locked' ? '#6b7280' : milestone.color }} 
                />
                <span className="text-[10px] text-gray-400 truncate">{milestone.name}</span>
              </div>
              
              {status !== 'locked' && (
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: milestone.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, progress)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              )}
              
              <div className="text-[8px] text-gray-500 mt-1">
                {status === 'completed' ? (
                  <span className="text-cyan-400">Complete!</span>
                ) : status === 'locked' ? (
                  <span>Locked</span>
                ) : (
                  <span>{milestone.requiredPoints}pts / {milestone.requiredSolves} solves</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default MilestoneMap;
