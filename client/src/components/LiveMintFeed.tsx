import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { generateMockGuardian } from "@/lib/mockData";

interface MintEvent {
  id: number;
  timestamp: number;
  guardianId: number;
}

export function LiveMintFeed() {
  const [mints, setMints] = useState<MintEvent[]>([]);

  useEffect(() => {
    // Initial population
    const initialMints = Array.from({ length: 3 }).map((_, i) => ({
      id: Date.now() - i * 5000,
      timestamp: Date.now() - i * 5000,
      guardianId: Math.floor(Math.random() * 3732) + 1
    }));
    setMints(initialMints);

    const interval = setInterval(() => {
      const newMint = {
        id: Date.now(),
        timestamp: Date.now(),
        guardianId: Math.floor(Math.random() * 3732) + 1
      };

      setMints(prev => [newMint, ...prev].slice(0, 5)); // Keep last 5
    }, 4000); // New mint every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col-reverse gap-3 pointer-events-none">
      <AnimatePresence>
        {mints.map((mint) => (
          <MintToast key={mint.id} mint={mint} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function MintToast({ mint }: { mint: MintEvent }) {
  const guardian = generateMockGuardian(mint.guardianId);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      layout
      className="pointer-events-auto"
    >
      <Card className="bg-black/80 backdrop-blur-md border-primary/30 p-3 flex items-center gap-3 w-[280px] shadow-[0_0_15px_rgba(0,255,255,0.15)] relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Animated border line */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(0,255,255,0.8)]" />

        <div className="relative w-12 h-12 rounded bg-white/5 overflow-hidden flex-shrink-0 border border-white/10">
          <img 
            src={guardian.image} 
            alt={`Guardian #${mint.guardianId}`}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-white font-orbitron">🔥 JUST MINTED!</span>
            <span className="text-[10px] text-muted-foreground font-mono">{new Date(mint.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </div>
          <span className="text-sm font-bold text-primary font-mono truncate">
            Guardian #{mint.guardianId}
          </span>
          <span className="text-[10px] text-muted-foreground truncate">
            {guardian.rarity}
          </span>
        </div>
      </Card>
    </motion.div>
  );
}
