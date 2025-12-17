/**
 * ValueEstimation Component
 * 
 * ⚠️ LOCKED - Do NOT modify without explicit user request
 * See replit.md "LOCKED SYSTEMS - FINANCIAL GRADE" section
 * 
 * Displays backed value per NFT calculations:
 * - Base value: 51% of 69,420 mint price
 * - Pool share: emissions + royalties distributed per NFT
 * - Rarity multipliers applied to pool share
 * 
 * This is a financial-grade component. All formulas are locked.
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { calculateBackedValue } from "@/lib/mockData";
import { TrendingUp, DollarSign, Activity, RefreshCw, Database } from "lucide-react";
import { useBalance } from "wagmi";
import { useGuardians } from "@/hooks/useGuardians";
import { useSubnetEmissions } from "@/hooks/useSubnetEmissions";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ethers } from "ethers";
import { RPC_URL, NFT_CONTRACT, MINT_SPLIT, ROYALTY_SPLIT } from "@/lib/constants";

const MINT_PRICE = 69420;
const NFT_ABI = ["function totalMinted() view returns (uint256)"];

export function ValueEstimation() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mintedCount, setMintedCount] = useState<number | null>(null);
  const queryClient = useQueryClient();
  
  // Use the centralized harmonized value logic
  const [baseValuePerNFT, setBaseValuePerNFT] = useState(calculateBackedValue());

  // Fetch emissions and activity data (same as Pool page)
  const subnetEmissions = useSubnetEmissions();
  const { stats: activityStats } = useActivityFeed();
  const salesVolume = activityStats?.totalVolume ?? 0;

  // Live Ticker - updates every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
        setBaseValuePerNFT(calculateBackedValue());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch minted count from contract
  useEffect(() => {
    const fetchMintedCount = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(NFT_CONTRACT, NFT_ABI, provider);
        const minted = await contract.totalMinted();
        setMintedCount(Number(minted));
      } catch {
        // Silent fail
      }
    };
    fetchMintedCount();
    const interval = setInterval(fetchMintedCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // ⚠️ LOCKED CALCULATIONS - Do NOT modify without explicit user request
  // See replit.md "LOCKED CALCULATIONS" section for details
  const treasuryData = useMemo(() => {
    const minted = mintedCount ?? 0;
    const sales = salesVolume ?? 0;
    
    // LOCKED: mintRevenue = minted × 69,420 × 51%
    const mintRevenue = minted * MINT_PRICE * (MINT_SPLIT.TREASURY_PERCENT / 100);
    // LOCKED: royaltyRevenue = salesVolume × 2%
    const royaltyRevenue = sales * (ROYALTY_SPLIT.TREASURY_PERCENT / 100);
    const passiveEmissions = subnetEmissions.communityShare;
    
    const totalTreasury = mintRevenue + royaltyRevenue + passiveEmissions;
    
    return { totalTreasury, minted };
  }, [mintedCount, salesVolume, subnetEmissions]);

  // Fetch Pool Balance (for reference/debug, but not used for the display value anymore)
  const { data: poolBalance, refetch: refetchBalance } = useBalance({
    address: import.meta.env.VITE_POOL_WALLET as `0x${string}` || undefined,
    token: import.meta.env.VITE_BASED_TOKEN as `0x${string}` || undefined, 
    query: { staleTime: 30000 }
  });

  // Debounced Refresh
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await refetchBalance();
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  const isDataReady = mintedCount !== null;

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
            <p className="text-sm text-muted-foreground font-mono mb-1">BACKED VALUE PER NFT</p>
            <h3 className="text-3xl font-orbitron text-white">
              {baseValuePerNFT > 0 ? (
                 <span>{Math.floor(baseValuePerNFT).toLocaleString()} <span className="text-sm text-primary">$BASED</span></span>
              ) : (
                 <div className="h-8 w-32 skeleton rounded mx-auto" />
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-2">
              = Treasury ÷ Minted NFTs
            </p>
          </Card>

          <Card className="p-6 bg-card/50 border-white/10 flex flex-col items-center text-center hover:border-primary/30 transition-colors relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 z-0" />
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 text-primary z-10">
              <Database size={24} />
            </div>
            <p className="text-sm text-muted-foreground font-mono mb-1 z-10">COMMUNITY TREASURY</p>
            <h3 className="text-3xl font-orbitron text-white z-10 text-glow">
              {isDataReady ? (
                <span>{Math.floor(treasuryData.totalTreasury).toLocaleString()} <span className="text-sm text-primary">$BASED</span></span>
              ) : (
                <div className="h-8 w-40 skeleton rounded mx-auto" />
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-2 z-10">
              {isDataReady ? `${treasuryData.minted.toLocaleString()} NFTs Minted` : 'Loading...'}
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
              Applied to Legendary NFTs
            </p>
          </Card>

        </div>
      </div>
    </section>
  );
}
