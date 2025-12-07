import { Card } from "@/components/ui/card";
import { MOCK_POOL_BALANCE, TOTAL_SUPPLY } from "@/lib/mockData";
import { TrendingUp, DollarSign, Activity } from "lucide-react";

interface ValueEstimationProps {
  ownedCount: number;
}

export function ValueEstimation({ ownedCount }: ValueEstimationProps) {
  const valuePerNFT = MOCK_POOL_BALANCE / TOTAL_SUPPLY;
  const userTotalValue = valuePerNFT * ownedCount;

  return (
    <section className="py-12 bg-background border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <Card className="p-6 bg-card/50 border-white/10 flex flex-col items-center text-center hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Activity size={24} />
            </div>
            <p className="text-sm text-muted-foreground font-mono mb-1">BASE VALUE / NFT</p>
            <h3 className="text-3xl font-orbitron text-white">
              {Math.floor(valuePerNFT).toLocaleString()} <span className="text-sm text-primary">$BASED</span>
            </h3>
            <p className="text-xs text-green-400 mt-2 flex items-center">
              <TrendingUp size={12} className="mr-1" /> +5.2% (24h)
            </p>
          </Card>

          <Card className="p-6 bg-card/50 border-white/10 flex flex-col items-center text-center hover:border-primary/30 transition-colors relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 z-0" />
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-primary z-10">
              <DollarSign size={24} />
            </div>
            <p className="text-sm text-muted-foreground font-mono mb-1 z-10">YOUR HOLDINGS VALUE</p>
            <h3 className="text-3xl font-orbitron text-white z-10 text-glow">
              {Math.floor(userTotalValue).toLocaleString()} <span className="text-sm text-primary">$BASED</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-2 z-10">
              Based on {ownedCount} Guardians
            </p>
          </Card>

          <Card className="p-6 bg-card/50 border-white/10 flex flex-col items-center text-center hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4 text-accent">
              <TrendingUp size={24} />
            </div>
            <p className="text-sm text-muted-foreground font-mono mb-1">RARE TRAIT MULTIPLIER</p>
            <h3 className="text-3xl font-orbitron text-white">
              1.3x
            </h3>
            <p className="text-xs text-muted-foreground mt-2">
              Applied to Legendary items
            </p>
          </Card>

        </div>
      </div>
    </section>
  );
}
