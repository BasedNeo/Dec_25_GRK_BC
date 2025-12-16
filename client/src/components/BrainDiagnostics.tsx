import { motion } from 'framer-motion';
import { ExternalLink, RefreshCw, Activity, Wifi, WifiOff } from 'lucide-react';
import { useSubnetEmissions, BRAIN_CONFIG } from '@/hooks/useSubnetEmissions';
import { Button } from '@/components/ui/button';

// Animated Brain SVG Component
const BrainIcon = ({ status }: { status: 'active' | 'delayed' | 'inactive' }) => {
  const color = status === 'active' ? '#22d3ee' : status === 'delayed' ? '#fbbf24' : '#ef4444';
  
  return (
    <div className="relative">
      {/* Glow effect */}
      <div 
        className="absolute inset-0 blur-xl opacity-50 rounded-full"
        style={{ background: `radial-gradient(circle, ${color}40, transparent)` }}
      />
      
      {/* Brain SVG */}
      <motion.svg
        width="120"
        height="120"
        viewBox="0 0 100 100"
        className="relative z-10"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Brain outline */}
        <motion.path
          d="M50 10 C20 10 15 35 15 50 C15 70 30 85 50 90 C70 85 85 70 85 50 C85 35 80 10 50 10"
          fill="none"
          stroke={color}
          strokeWidth="2"
          animate={{ pathLength: [0.95, 1, 0.95] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        {/* Brain folds */}
        <motion.path
          d="M30 40 Q40 35 50 40 Q60 45 70 40"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          opacity="0.7"
        />
        <motion.path
          d="M25 55 Q40 50 50 55 Q60 60 75 55"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          opacity="0.7"
        />
        <motion.path
          d="M35 70 Q45 65 50 70 Q55 75 65 70"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          opacity="0.7"
        />
        
        {/* Center pulse */}
        <motion.circle
          cx="50"
          cy="50"
          r="8"
          fill={color}
          opacity="0.3"
          animate={{ r: [8, 12, 8], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <circle cx="50" cy="50" r="4" fill={color} />
        
        {/* Neural connection dots */}
        {[
          { cx: 30, cy: 35 }, { cx: 70, cy: 35 },
          { cx: 25, cy: 55 }, { cx: 75, cy: 55 },
          { cx: 35, cy: 75 }, { cx: 65, cy: 75 }
        ].map((pos, i) => (
          <motion.circle
            key={i}
            cx={pos.cx}
            cy={pos.cy}
            r="3"
            fill={color}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.svg>
    </div>
  );
};

// Mini Bar Chart for daily emissions
const MiniChart = ({ data }: { data: { dayOfWeek: string; amount: number }[] }) => {
  const maxAmount = Math.max(...data.map(d => d.amount), 1);
  
  return (
    <div className="flex items-end justify-between gap-2 h-20 px-2">
      {data.map((day, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <motion.div
            className="w-full bg-gradient-to-t from-cyan-500 to-purple-500 rounded-t"
            initial={{ height: 0 }}
            animate={{ height: `${(day.amount / maxAmount) * 60}px` }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            title={`${day.amount.toFixed(2)} $BASED`}
          />
          <span className="text-[8px] text-muted-foreground font-mono">
            {day.dayOfWeek}
          </span>
        </div>
      ))}
    </div>
  );
};

// Progress Bar Component
const ProgressBar = ({ 
  value, 
  max, 
  color = 'cyan',
  label 
}: { 
  value: number; 
  max: number; 
  color?: string;
  label?: string;
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const colors: Record<string, string> = {
    cyan: 'from-cyan-500 to-cyan-400',
    purple: 'from-purple-500 to-purple-400',
    green: 'from-green-500 to-green-400',
    amber: 'from-amber-500 to-amber-400'
  };
  
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>{label}</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${colors[color]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

export function BrainDiagnostics() {
  const emissions = useSubnetEmissions();
  
  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };
  
  const formatTimeAgo = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const statusConfig = {
    active: { color: 'text-green-400', bg: 'bg-green-400', label: 'ACTIVE', icon: Wifi },
    delayed: { color: 'text-yellow-400', bg: 'bg-yellow-400', label: 'DELAYED', icon: Activity },
    inactive: { color: 'text-red-400', bg: 'bg-red-400', label: 'INACTIVE', icon: WifiOff }
  };
  
  const currentStatus = statusConfig[emissions.status];
  const StatusIcon = currentStatus.icon;

  return (
    <section className="py-16 border-t border-white/5 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }} />

      <div className="max-w-5xl mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Header */}
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-white font-orbitron uppercase tracking-tight mb-2">
              🧠 Brain Diagnostics
            </h2>
            <p className="text-sm text-muted-foreground font-mono">
              Live metrics from {BRAIN_CONFIG.name}
            </p>
          </div>

          {/* Brain Icon + Status */}
          <div className="flex flex-col items-center mb-10">
            <BrainIcon status={emissions.status} />
            
            <div className="flex items-center gap-2 mt-4">
              <motion.div
                className={`w-2 h-2 rounded-full ${currentStatus.bg}`}
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <StatusIcon size={14} className={currentStatus.color} />
              <span className={`text-sm font-bold font-mono ${currentStatus.color}`}>
                {currentStatus.label}
              </span>
              <span className="text-xs text-muted-foreground">
                • Last emission: {formatTimeAgo(emissions.lastEmissionTime)}
              </span>
            </div>
          </div>

          {/* Emission Flow Diagram */}
          <div className="bg-black/40 border border-purple-500/20 rounded-xl p-6 mb-8">
            <h3 className="text-xs font-bold text-white font-orbitron uppercase mb-4 text-center">
              Emission Flow
            </h3>
            <div className="flex items-center justify-center gap-2 md:gap-4 flex-wrap">
              <div className="flex flex-col items-center p-3 bg-white/5 rounded-lg min-w-[100px]">
                <span className="text-[10px] text-muted-foreground mb-1">Network</span>
                <span className="text-sm font-mono font-bold text-white">BasedAI</span>
                <span className="text-[10px] text-purple-400">100%</span>
              </div>
              
              <motion.div 
                className="text-cyan-400 font-mono"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →→→
              </motion.div>
              
              <div className="flex flex-col items-center p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg min-w-[100px]">
                <span className="text-[10px] text-muted-foreground mb-1">Brain Wallet</span>
                <span className="text-sm font-mono font-bold text-cyan-400">
                  {formatNumber(emissions.brainBalance, 0)}
                </span>
                <span className="text-[10px] text-cyan-400">$BASED</span>
              </div>
              
              <motion.div 
                className="text-green-400 font-mono"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              >
                →→→
              </motion.div>
              
              <div className="flex flex-col items-center p-3 bg-green-500/10 border border-green-500/30 rounded-lg min-w-[100px]">
                <span className="text-[10px] text-muted-foreground mb-1">Community</span>
                <span className="text-sm font-mono font-bold text-green-400">
                  ~{formatNumber(emissions.dailyRate, 0)}/day
                </span>
                <span className="text-[10px] text-green-400">10% share</span>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <motion.div
              className="bg-black/40 border border-purple-500/30 rounded-xl p-4 text-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <span className="text-[10px] text-muted-foreground font-mono uppercase">Brain Annual Output</span>
              <div className="text-xl font-mono font-bold text-purple-400 mt-1">
                {emissions.loading ? '...' : (emissions.brainAnnualOutput / 1000000).toFixed(1) + 'M'}
              </div>
              <span className="text-[10px] text-purple-500/70">$BASED/year (100%)</span>
            </motion.div>

            <motion.div
              className="bg-black/40 border border-green-500/30 rounded-xl p-4 text-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="text-[10px] text-muted-foreground font-mono uppercase">Community Daily (10%)</span>
              <div className="text-xl font-mono font-bold text-green-400 mt-1">
                ~{emissions.loading ? '...' : formatNumber(emissions.dailyRate, 0)}
              </div>
              <span className="text-[10px] text-green-500/70">$BASED/day</span>
            </motion.div>

            <motion.div
              className="bg-black/40 border border-amber-500/30 rounded-xl p-4 text-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-[10px] text-muted-foreground font-mono uppercase">Passive Emissions</span>
              <div className="text-xl font-mono font-bold text-amber-400 mt-1">
                {emissions.loading ? '...' : formatNumber(emissions.totalReceived, 0)}
              </div>
              <span className="text-[10px] text-amber-500/70">since Dec 1 ({emissions.daysActive} days)</span>
            </motion.div>

            <motion.div
              className="bg-black/40 border border-cyan-500/30 rounded-xl p-4 text-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <span className="text-[10px] text-muted-foreground font-mono uppercase">Wallet Balance</span>
              <div className="text-xl font-mono font-bold text-cyan-400 mt-1">
                {emissions.loading ? '...' : formatNumber(emissions.brainBalance, 0)}
              </div>
              <span className="text-[10px] text-cyan-500/70">incl. {formatNumber(emissions.initialDeposit, 0)} deposit</span>
            </motion.div>

            <motion.div
              className="bg-black/40 border border-red-500/30 rounded-xl p-4 text-center"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <span className="text-[10px] text-muted-foreground font-mono uppercase">Next Halving</span>
              <div className="text-xl font-mono font-bold text-red-400 mt-1">
                {emissions.daysUntilHalving} days
              </div>
              <span className="text-[10px] text-red-500/70">~Dec 31, 2025</span>
            </motion.div>

            <motion.div
              className="bg-black/40 border border-orange-500/30 rounded-xl p-4 text-center opacity-60"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 0.6, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <span className="text-[10px] text-muted-foreground font-mono uppercase">Brain Staking</span>
              <div className="text-xl font-mono font-bold text-orange-400 mt-1">
                🔒
              </div>
              <span className="text-[9px] text-orange-400 font-mono">COMING SOON</span>
            </motion.div>
          </div>

          {/* 7-Day Chart */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-5 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-white font-orbitron uppercase">
                7-Day Emissions
              </h3>
              <span className="text-[10px] text-muted-foreground font-mono">
                Total: {formatNumber(emissions.weeklyTotal, 1)} $BASED
              </span>
            </div>
            {emissions.loading ? (
              <div className="h-20 flex items-center justify-center text-muted-foreground">
                Loading chart...
              </div>
            ) : (
              <MiniChart data={emissions.dailyBreakdown} />
            )}
          </div>

          {/* Progress Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <ProgressBar 
                value={emissions.daysSinceStart} 
                max={365} 
                color="cyan"
                label={`Operating for ${Math.floor(emissions.daysSinceStart)} days`}
              />
            </div>
            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <ProgressBar 
                value={emissions.communityShare} 
                max={emissions.totalReceived || 1} 
                color="green"
                label="Community share accumulated"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={emissions.refresh}
              disabled={emissions.loading}
              className="border-white/10 hover:bg-white/5 text-xs font-mono"
            >
              <RefreshCw size={12} className={`mr-2 ${emissions.loading ? 'animate-spin' : ''}`} />
              {emissions.loading ? 'SYNCING...' : 'REFRESH'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-cyan-500/30 hover:bg-cyan-500/10 text-xs font-mono text-cyan-400"
            >
              <a 
                href={`https://etherscan.io/token/${BRAIN_CONFIG.token}?a=${BRAIN_CONFIG.wallet}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={12} className="mr-2" />
                VIEW ON ETHERSCAN
              </a>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-purple-500/30 hover:bg-purple-500/10 text-xs font-mono text-purple-400"
            >
              <a 
                href={BRAIN_CONFIG.networkUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={12} className="mr-2" />
                VIEW ON BASEDAI
              </a>
            </Button>
          </div>

          {/* Last Updated */}
          {emissions.lastUpdated && (
            <p className="mt-6 text-center text-[10px] text-muted-foreground/50 font-mono">
              Last synced: {emissions.lastUpdated.toLocaleTimeString()} • Updates every 60s
            </p>
          )}

        </motion.div>
      </div>
    </section>
  );
}
