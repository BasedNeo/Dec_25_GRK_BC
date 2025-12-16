import { calculateBackedValue } from "@/lib/mockData";
import { useSubnetEmissions } from "@/hooks/useSubnetEmissions";
import { BrainDiagnostics } from "./BrainDiagnostics";
import { motion } from "framer-motion";
import { Database, RefreshCw, Timer, AlertTriangle, TrendingUp, Coins, Zap, DollarSign, Info, X } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ethers } from "ethers";
import { RPC_URL, NFT_CONTRACT, MARKETPLACE_CONTRACT, MINT_SPLIT, ROYALTY_SPLIT } from "@/lib/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MINT_PRICE = 69420;

const NFT_ABI = ["function totalMinted() view returns (uint256)"];
const MARKETPLACE_ABI = [
  "event Sold(uint256 indexed listingId, address indexed buyer, uint256 price)"
];

export function PoolTracker() {
  const [mintedCount, setMintedCount] = useState<number | null>(null);
  const [salesVolume, setSalesVolume] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  const subnetEmissions = useSubnetEmissions();
  
  const isDataReady = mintedCount !== null && salesVolume !== null;

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
      
      // Get current block number and query only last 10000 blocks to avoid timeout
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<number>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 8000)
      );
      
      const queryPromise = (async () => {
        const filter = contract.filters.Sold();
        const events = await contract.queryFilter(filter, fromBlock, "latest");
        
        let totalVolume = 0;
        for (const event of events) {
          const log = event as ethers.EventLog;
          if (log.args && log.args.price) {
            totalVolume += parseFloat(ethers.formatEther(log.args.price));
          }
        }
        return totalVolume;
      })();
      
      return await Promise.race([queryPromise, timeoutPromise]);
    } catch (e) {
      // Silently fail - sales volume is optional data
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
      setInitialLoading(false);
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
    const sales = salesVolume ?? 0;
    
    const mintRevenue = minted * MINT_PRICE * (MINT_SPLIT.TREASURY_PERCENT / 100);
    const royaltyRevenue = sales * (ROYALTY_SPLIT.TREASURY_PERCENT / 100);
    
    // Use REAL emission data from blockchain
    const passiveEmissions = subnetEmissions.communityShare; // 10% of brain emissions
    
    const totalTreasury = mintRevenue + royaltyRevenue + passiveEmissions;
    const backedValuePerNFT = calculateBackedValue();
    
    return {
      mintRevenue,
      royaltyRevenue,
      passiveEmissions,
      totalTreasury,
      backedValuePerNFT,
      currentDailyRate: subnetEmissions.dailyRate, // Already community 10% rate (6,438)
      nextHalvingIn: null, // Real emissions don't have programmatic halvings
      nextHalvingRate: null,
      minted,
      salesVolume: sales,
      // New real data
      brainBalance: subnetEmissions.brainBalance,
      totalBrainEmissions: subnetEmissions.totalReceived,
      weeklyTotal: subnetEmissions.weeklyTotal,
      monthlyProjection: subnetEmissions.monthlyProjection, // Already community rate * 30
      brainStatus: subnetEmissions.status
    };
  }, [mintedCount, salesVolume, subnetEmissions]);

  const displayValue = (value: number, decimals: number = 0) => {
    if (!isDataReady) return "---";
    return formatNumber(value, decimals);
  };

  const formatNumber = (num: number | null | undefined, decimals: number = 0) => {
    if (num === null || num === undefined) return "---";
    return num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  return (
    <>
      <section id="pool" className="py-24 bg-gradient-to-b from-background to-secondary/20 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,255,255,0.05),transparent_50%)] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <h2 className="text-4xl md:text-5xl font-black text-white font-orbitron text-center uppercase tracking-tight">
                Community Treasury
              </h2>
              <button 
                onClick={() => setShowInfoModal(true)}
                className="text-muted-foreground hover:text-primary transition-colors"
                data-testid="treasury-info-btn"
              >
                <Info size={20} />
              </button>
            </div>

            <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
              <DialogContent className="bg-black/95 border border-cyan-500/50 max-w-md p-6">
                <DialogHeader>
                  <DialogTitle className="text-xl font-orbitron text-cyan-400 flex items-center justify-between">
                    Treasury Information
                    <button 
                      onClick={() => setShowInfoModal(false)}
                      className="text-muted-foreground hover:text-white transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </DialogTitle>
                </DialogHeader>
                <div className="text-gray-300 mt-4">
                  <p className="text-base leading-relaxed">
                    This calculation is an estimate based on certain factors that will be refined over time.
                  </p>
                </div>
                <div className="mt-6">
                  <Button 
                    onClick={() => setShowInfoModal(false)}
                    className="w-full bg-cyan-500 text-white hover:bg-cyan-400 font-orbitron"
                  >
                    GOT IT
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
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
              <span className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-2">Total Treasury</span>
              <div className="text-5xl md:text-7xl font-black text-white font-orbitron text-glow" data-testid="text-total-treasury">
                {displayValue(treasuryData.totalTreasury)} <span className="text-2xl md:text-4xl text-primary">$BASED</span>
              </div>
              <p className="text-xs text-muted-foreground mt-3 font-mono">
                {isDataReady ? `${formatNumber(mintedCount!)} NFTs Minted` : 'Loading data...'}
              </p>
            </div>

            <div className="mb-8 p-6 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/30 rounded-xl max-w-md mx-auto">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Backed Value Per NFT</span>
              <div className="text-3xl md:text-4xl font-black text-white font-orbitron mt-2" data-testid="text-backed-value">
                {displayValue(treasuryData.backedValuePerNFT)} <span className="text-lg text-primary">$BASED</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-mono opacity-70">= Treasury ÷ Minted NFTs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 w-full max-w-4xl mx-auto">
              
              <div className="bg-black/40 border border-pink-500/30 rounded-xl p-5 flex flex-col items-center text-center">
                <div className="flex items-center gap-2 mb-3">
                  <Coins size={18} className="text-pink-400" />
                  <h3 className="text-sm font-bold text-white font-orbitron uppercase">From Mints ({MINT_SPLIT.TREASURY_PERCENT}%)</h3>
                </div>
                <span className="text-2xl font-mono font-bold text-pink-400 mb-1" data-testid="text-mint-revenue">
                  {displayValue(treasuryData.mintRevenue)} $BASED
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {isDataReady ? `${formatNumber(treasuryData.minted)} × ${formatNumber(MINT_PRICE)} × ${MINT_SPLIT.TREASURY_PERCENT}%` : '--- × --- × ---'}
                </span>
              </div>
              
              <div className="bg-black/40 border border-cyan-500/30 rounded-xl p-5 flex flex-col items-center text-center shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={18} className="text-cyan-400" />
                  <h3 className="text-sm font-bold text-white font-orbitron uppercase">From Emissions (10%)</h3>
                  {subnetEmissions.loading ? (
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${
                      treasuryData.brainStatus === 'active' ? 'bg-green-400 animate-pulse' :
                      treasuryData.brainStatus === 'delayed' ? 'bg-yellow-400' : 'bg-red-400'
                    }`} />
                  )}
                </div>
                <span className="text-2xl font-mono font-bold text-cyan-400 mb-1" data-testid="text-passive-emissions">
                  {subnetEmissions.loading ? '...' : formatNumber(treasuryData.passiveEmissions)} $BASED
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Community share of {formatNumber(treasuryData.totalBrainEmissions || 0)} total
                </span>
                <span className="text-[9px] text-cyan-500/50 font-mono mt-1">
                  ~{formatNumber(treasuryData.currentDailyRate, 2)}/day • Live from ETH
                </span>
              </div>
              
              <div className="bg-black/40 border border-green-500/30 rounded-xl p-5 flex flex-col items-center text-center">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign size={18} className="text-green-400" />
                  <h3 className="text-sm font-bold text-white font-orbitron uppercase">From Royalties ({ROYALTY_SPLIT.TREASURY_PERCENT}%)</h3>
                </div>
                <span className="text-2xl font-mono font-bold text-green-400 mb-1" data-testid="text-royalty-revenue">
                  {displayValue(treasuryData.royaltyRevenue)} $BASED
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  From {isDataReady ? formatNumber(treasuryData.salesVolume) : '---'} total sales volume
                </span>
              </div>
              
              <div className="bg-black/40 border border-orange-500/30 rounded-xl p-5 flex flex-col items-center text-center">
                <div className="flex items-center gap-2 mb-3">
                  <Database size={18} className="text-orange-400" />
                  <h3 className="text-sm font-bold text-white font-orbitron uppercase">Staking Emissions</h3>
                </div>
                <span className="text-2xl font-mono font-bold text-orange-400 mb-1" data-testid="text-staking-emissions">
                  0 $BASED
                </span>
                <span className="text-xs text-orange-500/70 font-mono bg-orange-500/5 px-2 py-1 rounded border border-orange-500/10 mt-1">COMING SOON</span>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 w-full max-w-2xl mx-auto">
              
              <div className="bg-black/40 border border-amber-500/30 rounded-xl p-5 flex flex-col items-center text-center">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-amber-400" />
                  <h3 className="text-xs font-bold text-white font-orbitron uppercase">Daily Community Rate</h3>
                </div>
                <span className="text-xl font-mono font-bold text-amber-400" data-testid="text-daily-emissions">
                  ~{formatNumber(treasuryData.currentDailyRate, 0)} $BASED/day
                </span>
                <span className="text-[9px] text-muted-foreground font-mono mt-1">
                  10% of ~{formatNumber(subnetEmissions.brainTotalDaily, 0)}/day brain output
                </span>
              </div>
              
              <div className="bg-black/40 border border-purple-500/30 rounded-xl p-5 flex flex-col items-center text-center">
                <div className="flex items-center gap-2 mb-2">
                  <Timer size={16} className="text-purple-400" />
                  <h3 className="text-xs font-bold text-white font-orbitron uppercase">Monthly Projection</h3>
                </div>
                <span className="text-xl font-mono font-bold text-purple-400" data-testid="text-monthly-projection">
                  ~{formatNumber(treasuryData.monthlyProjection || 0)} $BASED
                </span>
                <span className="text-[9px] text-muted-foreground font-mono mt-1">
                  Community share at current rate
                </span>
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
      
      <BrainDiagnostics />
    </>
  );
}
