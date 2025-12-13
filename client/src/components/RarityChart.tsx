import { motion } from "framer-motion";
import { useMemo } from "react";
import { Guardian } from "@/lib/mockData";

interface RarityChartProps {
  mintedCount: number;
  totalMinted: number; // This might be redundant if mintedCount is the same, but keeping for clarity
  distribution: Record<string, number>;
}

const RARITY_CONFIG = [
  { name: 'Rarest-Legendary', color: 'linear-gradient(90deg, #ffd700, #ff8c00)' },
  { name: 'Very Rare', color: '#9333ea' },
  { name: 'More Rare', color: '#dc2626' },
  { name: 'Rare', color: '#f59e0b' },
  { name: 'Less Rare', color: '#3b82f6' },
  { name: 'Less Common', color: '#22c55e' },
  { name: 'Common', color: '#6b7280' },
  { name: 'Most Common', color: '#374151' }
];

export function RarityChart({ mintedCount, totalMinted, distribution }: RarityChartProps) {
  
  const totalClassified = useMemo(() => {
    return Object.values(distribution).reduce((acc, val) => acc + val, 0);
  }, [distribution]);

  return (
    <div className="w-full bg-black/40 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm mb-6">
      <div className="p-3 border-b border-white/10 flex justify-between items-center bg-black/60">
        <h3 className="font-orbitron text-white text-sm flex items-center gap-2">
           📊 Rarity Distribution
           <span className="text-muted-foreground text-xs font-mono">({totalClassified} Minted)</span>
        </h3>
      </div>
      
      <div className="p-4 space-y-3">
        {RARITY_CONFIG.map((config, index) => {
          const count = distribution[config.name] || 0;
          const percentage = totalClassified > 0 ? ((count / totalClassified) * 100).toFixed(1) : "0.0";
          
          return (
            <div key={config.name} className="space-y-1">
              <div className="flex justify-between text-[10px] uppercase font-mono text-muted-foreground">
                <span className="text-white">{config.name}</span>
                <span>{count} ({percentage}%)</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                 <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${totalClassified > 0 ? (count / totalClassified) * 100 : 0}%` }}
                    transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.05 }}
                    className="h-full rounded-full shadow-[0_0_5px_rgba(255,255,255,0.1)]"
                    style={{ background: config.color }}
                 />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
