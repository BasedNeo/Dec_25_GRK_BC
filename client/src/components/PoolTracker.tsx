import { TOTAL_SUPPLY, calculatePassiveEmissions, EMISSION_SCHEDULE } from "@/lib/mockData";
import { motion } from "framer-motion";
import { Database, RefreshCw, Timer, AlertTriangle, TrendingUp, Coins, Zap, DollarSign } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ethers } from "ethers";
import { RPC_URL, NFT_CONTRACT } from "@/lib/constants";

const MINT_PRICE = 69420;
const TREASURY_PERCENT = 0.51;
const ROYALTY_PERCENT = 0.02;
const MARKETPLACE_CONTRACT = "0x88161576266dCDedb19342aC2197267282520793";

const NFT_ABI = ["function totalMinted() view returns (uint256)"];
const MARKETPLACE_ABI = [
  "event Sold(uint256 indexed listingId, address indexed buyer, uint256 price)"
];

export function PoolTracker() {
  const [mintedCount, setMintedCount] = useState<number | null>(null);
  const [salesVolume, setSalesVolume] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMintedCount = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(NFT_CONTRACT, NFT_ABI, provider);
      const minted = await contract.totalMinted();
      return Number(minted);
    } catch (e) {
      console.error("Failed to fetch totalMinted:", e);
      return null;
    }
  }, []);

  const fetchSalesVolume = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, provider);
      
      const filter = contract.filters.Sold();
      const events = await contract.queryFilter(filter, 0, "latest");
      
      let totalVolume = 0;
      for (const event of events) {
        const log = event as ethers.EventLog;
        if (log.args && log.args.price) {
          totalVolume += parseFloat(ethers.formatEther(log.args.price));
        }
      }
      
      return totalVolume;
    } catch (e) {
      console.error("Failed to fetch sales volume:", e);
      return 0;
    }
  }, []);

  const updateData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [minted, volume] = await Promise.all([
        fetchMintedCount(),
        fetchSalesVolume()
      ]);
      
      if (minted !== null) {
        setMintedCount(minted);
      } else {
        setError("Failed to fetch minted count from contract");
      }
      
      setSalesVolume(volume);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Update failed:", e);
      setError("Failed to update treasury data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateData();
    
    const mintInterval = setInterval(() => {
      fetchMintedCount().then(minted => {
        if (minted !== null) setMintedCount(minted);
      });
    }, 60 * 1000);

    const salesInterval = setInterval(() => {
      fetchSalesVolume().then(volume => {
        setSalesVolume(volume);
      });
    }, 2 * 60 * 1000);

    return () => {
      clearInterval(mintInterval);
      clearInterval(salesInterval);
    };
  }, [fetchMintedCount, fetchSalesVolume]);

  const treasuryData = useMemo(() => {
    const minted = mintedCount ?? 0;
    
    const mintRevenue = minted * MINT_PRICE * TREASURY_PERCENT;
    
    const emissionsData = calculatePassiveEmissions();
    const passiveEmissions = emissionsData.total;
    
    const royaltyShare = salesVolume * ROYALTY_PERCENT;
    
    const totalTreasury = mintRevenue + passiveEmissions + royaltyShare;
    
    const backedValuePerNFT = minted > 0 ? totalTreasury / minted : 0;
    
    return {
      mintRevenue,
      passiveEmissions,
      royaltyShare,
      totalTreasury,
      backedValuePerNFT,
      currentDailyRate: emissionsData.currentDailyRate,
      nextHalvingIn: emissionsData.nextHalvingIn,
      nextHalvingRate: emissionsData.nextHalvingRate,
      minted
    };
  }, [mintedCount, salesVolume]);

  const formatNumber = (num: number, decimals: number = 0) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  return (
    <section id="pool" className="py-24 bg-gradient-to-b from-background to-secondary/20 border-t border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,255,255,0.05),transparent_50%)] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl md:text-5xl font-black text-white font-orbitron text-center mb-2 uppercase tracking-tight">
            Community Treasury
          </h2>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl max-w-md mx-auto">
              <div className="flex items-center justify-center gap-2 text-red-400 text-sm">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center justify-center mb-8 relative py-8">
            <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full -z-10"></div>
            <span className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-2">Community Treasury</span>
            <div className="text-5xl md:text-7xl font-black text-white font-orbitron text-glow" data-testid="text-total-treasury">
              {formatNumber(treasuryData.totalTreasury)} <span className="text-2xl md:text-4xl text-primary">$BASED</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3 font-mono">
              {mintedCount !== null ? `${formatNumber(mintedCount)} NFTs Minted` : 'Loading...'}
            </p>
          </div>

          <div className="mb-8 p-6 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 rounded-xl max-w-md mx-auto">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Backed Value Per NFT</span>
            <div className="text-3xl md:text-4xl font-black text-white font-orbitron mt-2" data-testid="text-backed-value">
              {formatNumber(treasuryData.backedValuePerNFT)} <span className="text-lg text-primary">$BASED</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono opacity-70">= Treasury ÷ Minted</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 w-full max-w-4xl mx-auto">
            
            <div className="bg-black/40 border border-pink-500/30 rounded-xl p-5 flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-3">
                <Coins size={18} className="text-pink-400" />
                <h3 className="text-sm font-bold text-white font-orbitron uppercase">From Mints (51%)</h3>
              </div>
              <span className="text-2xl font-mono font-bold text-pink-400 mb-1" data-testid="text-mint-revenue">
                {formatNumber(treasuryData.mintRevenue)} $BASED
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {formatNumber(treasuryData.minted)} × {formatNumber(MINT_PRICE)} × 51%
              </span>
            </div>
            
            <div className="bg-black/40 border border-cyan-500/30 rounded-xl p-5 flex flex-col items-center text-center shadow-[0_0_15px_rgba(34,211,238,0.1)]">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={18} className="text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-orbitron uppercase">Passive Emissions</h3>
              </div>
              <span className="text-2xl font-mono font-bold text-cyan-400 mb-1" data-testid="text-passive-emissions">
                {formatNumber(treasuryData.passiveEmissions)} $BASED
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Since Dec 10, 2025
              </span>
            </div>
            
            <div className="bg-black/40 border border-green-500/30 rounded-xl p-5 flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign size={18} className="text-green-400" />
                <h3 className="text-sm font-bold text-white font-orbitron uppercase">Royalty Share (2%)</h3>
              </div>
              <span className="text-2xl font-mono font-bold text-green-400 mb-1" data-testid="text-royalty-share">
                {formatNumber(treasuryData.royaltyShare)} $BASED
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                From {formatNumber(salesVolume)} total sales
              </span>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 w-full max-w-2xl mx-auto">
            
            <div className="bg-black/40 border border-amber-500/30 rounded-xl p-5 flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-amber-400" />
                <h3 className="text-xs font-bold text-white font-orbitron uppercase">Current Daily Emissions</h3>
              </div>
              <span className="text-xl font-mono font-bold text-amber-400" data-testid="text-daily-emissions">
                {formatNumber(treasuryData.currentDailyRate)} $BASED/day
              </span>
            </div>
            
            <div className="bg-black/40 border border-purple-500/30 rounded-xl p-5 flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-2">
                <Timer size={16} className="text-purple-400" />
                <h3 className="text-xs font-bold text-white font-orbitron uppercase">Next Halving In</h3>
              </div>
              {treasuryData.nextHalvingIn !== null ? (
                <>
                  <span className="text-xl font-mono font-bold text-purple-400" data-testid="text-next-halving">
                    {treasuryData.nextHalvingIn} days
                  </span>
                  {treasuryData.nextHalvingRate && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      → {formatNumber(treasuryData.nextHalvingRate)} $BASED/day
                    </span>
                  )}
                </>
              ) : (
                <span className="text-lg font-mono text-muted-foreground">No halving scheduled</span>
              )}
            </div>

          </div>

          <div className="mb-6 flex justify-center">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 border border-white/5 rounded-full px-3 py-1 bg-black/20">
              <AlertTriangle size={10} className="text-yellow-500" />
              <span>Live blockchain data; estimates may vary. Not financial advice.</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={updateData} 
              disabled={loading}
              className="border-white/10 hover:bg-white/5 text-xs font-mono h-8"
              data-testid="button-refresh-treasury"
            >
              <RefreshCw size={12} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'SYNCING...' : 'REFRESH DATA'}
            </Button>
          </div>

          {lastUpdated && (
            <p className="mt-4 text-[10px] text-muted-foreground/50 font-mono">
              Last Updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}

        </motion.div>
      </div>
    </section>
  );
}
