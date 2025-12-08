import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MOCK_POOL_BALANCE, TOTAL_SUPPLY } from "@/lib/mockData";
import { TrendingUp, DollarSign, Activity, RefreshCw } from "lucide-react";
import { useBalance } from "wagmi";
import { useGuardians } from "@/hooks/useGuardians";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function ValueEstimation() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  
  // Fetch Pool Balance
  const { data: poolBalance, refetch: refetchBalance } = useBalance({
    address: import.meta.env.VITE_POOL_WALLET as `0x${string}` || undefined,
    token: import.meta.env.VITE_BASED_TOKEN as `0x${string}` || undefined, // Use specific token if env set
    query: {
      staleTime: 30000,
    }
  });

  // FUTURE INTEGRATION: Fetch Average Floor Price from Aftermint.trade API
  // Currently manual admin update via VITE_FLOOR_PRICE env var or admin dashboard
  // const { data: floorPrice } = useQuery(...)

  // Fetch User Guardians
  const { data, refetch: refetchGuardians } = useGuardians();
  
  // Flatten pages from infinite query
  const guardians = data?.pages.flatMap((page: any) => page.nfts) || [];

  // Debounced Refresh
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await Promise.all([refetchBalance(), refetchGuardians()]);
    // Simulate a min delay for visual feedback and debounce
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  const currentPoolBalance = poolBalance 
    ? parseFloat(poolBalance.formatted) 
    : MOCK_POOL_BALANCE;
    
  const baseValuePerNFT = currentPoolBalance / TOTAL_SUPPLY;
  
  // Calculate User Total Value with Boosts
  // Boost logic: 30% boost if Rarity Level is 'Rarest', 'Legendary', or contains 'Rare'
  const userTotalValue = (guardians || []).reduce((total: number, guardian: any) => {
    // Explicit check for Rarity Level from CSV or fallback
    // CSV field is "Rarity Level" (mapped to guardian.rarity in loader if simple, or in traits)
    
    // Check traits first for "Rarity Level"
    const rarityTrait = guardian.traits?.find((t: any) => t.type === 'Rarity Level')?.value || guardian.rarity || '';
    const r = rarityTrait.toLowerCase();
    
    // Boost conditions: "rarest-legendary", "rarest", "rare"
    const isRare = r.includes('rare') || r.includes('legendary') || r.includes('epic');
    const multiplier = isRare ? 1.3 : 1.0;
    
    return total + (baseValuePerNFT * multiplier);
  }, 0);

  const ownedCount = guardians?.length || 0;

  return (
    <section className="py-12 bg-background border-y border-white/5 relative group">
      <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-muted-foreground hover:text-primary min-h-[44px]"
        >
          <RefreshCw size={14} className={cn("mr-2", isRefreshing && "animate-spin")} />
          REFRESH RATES
        </Button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <Card className="p-6 bg-card/50 border-white/10 flex flex-col items-center text-center hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
              <Activity size={24} />
            </div>
            <p className="text-sm text-muted-foreground font-mono mb-1">BACKED BY / NFT</p>
            <h3 className="text-3xl font-orbitron text-white">
              {Math.floor(baseValuePerNFT).toLocaleString()} <span className="text-sm text-primary">$BASED</span>
            </h3>
            <p className="text-xs text-green-400 mt-2 flex items-center">
              <TrendingUp size={12} className="mr-1" /> +30% FOR RARE+
            </p>
          </Card>

          <Card className="p-6 bg-card/50 border-white/10 flex flex-col items-center text-center hover:border-primary/30 transition-colors relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 z-0" />
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-primary z-10">
              <DollarSign size={24} />
            </div>
            <p className="text-sm text-muted-foreground font-mono mb-1 z-10">YOUR TOTAL HOLDINGS</p>
            <h3 className="text-3xl font-orbitron text-white z-10 text-glow">
              {Math.floor(userTotalValue).toLocaleString()} <span className="text-sm text-primary">$BASED</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-2 z-10">
              {ownedCount} Guardians (Includes Rarity Boosts)
            </p>
          </Card>

          <Card className="p-6 bg-card/50 border-white/10 flex flex-col items-center text-center hover:border-primary/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4 text-accent">
              <TrendingUp size={24} />
            </div>
            <p className="text-sm text-muted-foreground font-mono mb-1">RARITY BOOST (1.3x)</p>
            <h3 className="text-3xl font-orbitron text-white">
              +30%
            </h3>
            <p className="text-xs text-muted-foreground mt-2">
              Applied to Rare, Epic & Legendary
            </p>
          </Card>

        </div>
      </div>
    </section>
  );
}
