import { useState, useEffect, useCallback } from 'react';
import { Loader2, Activity, RefreshCw } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRecentMints } from '../lib/contractService';
import { HeroStatsBanner } from './HeroStatsBanner';

interface RecentMint {
  tokenId: number;
  name: string;
  image: string;
  rarity: string;
  owner: string;
}

// Rarity Color Mapping Helper
const getRarityClass = (rarity: string) => {
  const r = rarity?.toLowerCase() || '';
  if (r.includes('legendary')) return 'rarity-legendary';
  if (r.includes('very rare')) return 'rarity-very-rare';
  if (r.includes('rarest')) return 'rarity-rarest';
  if (r === 'rare') return 'rarity-rare';
  if (r.includes('less rare')) return 'rarity-less-rare';
  if (r.includes('less common')) return 'rarity-less-common';
  return 'rarity-common';
};

export function LiveNFTDashboard() {
  const [recentMints, setRecentMints] = useState<RecentMint[]>([]);
  const [loadingMints, setLoadingMints] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecentMintsData = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await getRecentMints(12); // Fetch 12 as per service default
      if (Array.isArray(data)) {
        setRecentMints(data as RecentMint[]);
      }
    } catch (err) {
      console.error("Error fetching recent mints:", err);
    } finally {
      setLoadingMints(false);
      setRefreshing(false);
    }
  }, []);


  // Initial Fetch & Interval
  useEffect(() => {
    fetchRecentMintsData();
    const interval = setInterval(fetchRecentMintsData, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, [fetchRecentMintsData]);

  return (
    <div className="space-y-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Hero Stats Banner (Replaces previous header & stats grid) */}
      <HeroStatsBanner />

      {/* Recent Mints Grid */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="text-xl font-orbitron text-white flex items-center gap-2">
                <Activity className="text-primary w-5 h-5" /> RECENTLY MINTED
            </h3>
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={fetchRecentMintsData} 
                disabled={refreshing}
                className="text-xs font-mono text-muted-foreground hover:text-white"
            >
                {refreshing ? <Loader2 className="animate-spin w-3 h-3 mr-2" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                {refreshing ? "SYNCING..." : "REFRESH"}
            </Button>
        </div>

        {loadingMints && recentMints.length === 0 ? (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="bg-white/5 border-white/5 aspect-square animate-pulse rounded-lg" />
              ))}
           </div>
        ) : recentMints.length === 0 ? (
           <div className="py-12 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
              <p className="text-muted-foreground font-mono">Waiting for new mints...</p>
           </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {recentMints.map((mint) => (
                    <MintCard key={mint.tokenId} mint={mint} />
                ))}
            </div>
        )}
      </div>

    </div>
  );
}

function MintCard({ mint }: { mint: RecentMint }) {
    const rarityClass = getRarityClass(mint.rarity);
    const isLegendary = mint.rarity?.toLowerCase().includes('legendary');

    return (
        <Card className="bg-black/60 border-white/10 group hover:-translate-y-1 transition-transform duration-300 flex flex-col">
            <div className="relative aspect-square bg-secondary/20 overflow-hidden rounded-t-xl">
                 {/* Image */}
                 <img 
                    src={mint.image} 
                    alt={mint.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                 />
                 
                 {/* Rarity Badge - Top Right Overlay */}
                 <span className={`rarity-badge ${rarityClass}`}>
                    {mint.rarity}
                 </span>

                 {/* Overlay Gradient */}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                 {/* ID Badge */}
                 <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm border border-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono text-white">
                    #{mint.tokenId}
                 </div>
            </div>

            <div className="p-3 pb-5">
                <h4 className="text-xs font-bold text-white font-orbitron truncate mb-1">{mint.name}</h4>
                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                    <span>Owner:</span>
                    <span className="text-primary truncate max-w-[60px]" title={mint.owner}>
                        {mint.owner.substring(0, 4)}...{mint.owner.substring(mint.owner.length - 4)}
                    </span>
                </div>
            </div>
        </Card>
    );
}
