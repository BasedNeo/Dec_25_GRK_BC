/**
 * PoolTracker Component
 * 
 * ⚠️ LOCKED - Do NOT modify without explicit user request
 * See replit.md "LOCKED SYSTEMS - FINANCIAL GRADE" section
 * 
 * Displays community treasury calculations:
 * - Mint Revenue: minted × 69,420 × 51%
 * - Royalty Revenue: salesVolume × 2%
 * - Emissions data from Brain wallet
 * 
 * This is a financial-grade component. All formulas are locked.
 */

import { calculateBackedValue } from "@/lib/mockData";
import { useSubnetEmissions } from "@/hooks/useSubnetEmissions";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import React, { Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useFeatureFlags } from "@/lib/featureFlags";

const BrainDiagnostics = lazy(() => import("./BrainDiagnostics").then(m => ({ default: m.BrainDiagnostics })));
import { Database, RefreshCw, Timer, AlertTriangle, TrendingUp, Coins, Zap, DollarSign, Info, X } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ethers } from "ethers";
import { RPC_URL, NFT_CONTRACT, MINT_SPLIT, ROYALTY_SPLIT, PLATFORM_FEE_PERCENT } from "@/lib/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useInterval } from "@/hooks/useInterval";

const MINT_PRICE = 69420;

const NFT_ABI = ["function totalMinted() view returns (uint256)"];

export function PoolTracker() {
  const [mintedCount, setMintedCount] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  const { flags } = useFeatureFlags();
  const showLiveData = flags.poolShowLiveData;
  
  const subnetEmissions = useSubnetEmissions();
  const { stats: activityStats } = useActivityFeed();
  
  const salesVolume = activityStats?.totalVolume ?? 0;
  const isDataReady = mintedCount !== null;

  const fetchMintedCount = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(NFT_CONTRACT, NFT_ABI, provider);
      const minted = await contract.totalMinted();
      return Number(minted);
    } catch {
      return null;
    }
  }, []);

  const updateData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const minted = await fetchMintedCount();
      
      if (minted !== null) {
        setMintedCount(minted);
      } else {
        setError("Failed to fetch minted count from contract");
      }
      
      setLastUpdated(new Date());
    } catch {
      setError("Failed to update treasury data");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    updateData();
  }, []);

  useInterval(() => {
    fetchMintedCount().then(minted => {
      if (minted !== null) setMintedCount(minted);
    });
  }, 60000);

  // ⚠️ LOCKED CALCULATIONS - Do NOT modify without explicit user request
  // See replit.md "LOCKED CALCULATIONS" section for details
  const treasuryData = useMemo(() => {
    const minted = mintedCount ?? 0;
    const sales = salesVolume ?? 0;
    
    // === MINT REVENUE (69,420 $BASED per NFT) ===
    const totalMintRevenue = minted * MINT_PRICE;
    const mintToTreasury = totalMintRevenue * (MINT_SPLIT.TREASURY_PERCENT / 100);
    const mintToCreator = totalMintRevenue * (MINT_SPLIT.CREATOR_PERCENT / 100);
    
    // === ROYALTY REVENUE (10% of secondary sales) ===
    const totalRoyalties = sales * (ROYALTY_SPLIT.TOTAL_ROYALTY_PERCENT / 100);
    const royaltyToTreasury = sales * (ROYALTY_SPLIT.TREASURY_PERCENT / 100);
    const royaltyToRoyaltyWallet = sales * (ROYALTY_SPLIT.ROYALTY_WALLET_PERCENT / 100);
    const royaltyToCreator = sales * (ROYALTY_SPLIT.CREATOR_PERCENT / 100);
    
    // === PLATFORM FEE (1% of secondary sales) ===
    const platformFeeToCreator = sales * (PLATFORM_FEE_PERCENT / 100);
    
    // === WALLET TOTALS ===
    const treasuryTotal = mintToTreasury + royaltyToTreasury;
    const creatorTotal = mintToCreator + royaltyToCreator + platformFeeToCreator;
    const royaltyWalletTotal = royaltyToRoyaltyWallet;
    
    // Use REAL emission data from blockchain
    const passiveEmissions = subnetEmissions.communityShare; // 10% of brain emissions
    
    const totalTreasuryWithEmissions = treasuryTotal + passiveEmissions;
    const backedValuePerNFT = calculateBackedValue();
    
    return {
      // Mint breakdown
      totalMintRevenue,
      mintToTreasury,
      mintToCreator,
      
      // Royalty breakdown
      totalRoyalties,
      royaltyToTreasury,
      royaltyToRoyaltyWallet,
      royaltyToCreator,
      
      // Platform fee
      platformFeeToCreator,
      
      // Wallet totals
      treasuryTotal,
      creatorTotal,
      royaltyWalletTotal,
      
      // Legacy names (for backward compatibility)
      mintRevenue: mintToTreasury,
      royaltyRevenue: royaltyToTreasury,
      
      // Treasury with emissions
      passiveEmissions,
      totalTreasury: totalTreasuryWithEmissions,
      backedValuePerNFT,
      currentDailyRate: subnetEmissions.dailyRate,
      nextHalvingIn: null,
      nextHalvingRate: null,
      minted,
      salesVolume: sales,
      
      // Real emission data
      brainBalance: subnetEmissions.brainBalance,
      totalBrainEmissions: subnetEmissions.totalReceived,
      weeklyTotal: subnetEmissions.weeklyTotal,
      monthlyProjection: subnetEmissions.monthlyProjection,
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
                  <DialogDescription className="sr-only">Details about treasury calculation methodology</DialogDescription>
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

            {!showLiveData ? (
              <>
                <div className="flex flex-col items-center justify-center mb-8 relative py-8">
                  <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full -z-10"></div>
                  <span className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-2">Total Treasury</span>
                  <div className="text-5xl md:text-7xl font-black text-gray-500 font-orbitron" data-testid="text-total-treasury">
                    N/A <span className="text-2xl md:text-4xl text-gray-600">$BASED</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-3 font-mono">Coming Soon</p>
                </div>

                <div className="mb-8 p-6 bg-gradient-to-r from-gray-500/10 to-gray-600/10 border border-gray-500/30 rounded-xl max-w-md mx-auto">
                  <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Backed Value Per NFT</span>
                  <div className="text-3xl md:text-4xl font-black text-gray-500 font-orbitron mt-2" data-testid="text-backed-value">
                    N/A <span className="text-lg text-gray-600">$BASED</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 font-mono opacity-70">Coming Soon</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 w-full max-w-4xl mx-auto">
                  <div className="bg-black/40 border border-gray-500/30 rounded-xl p-5 flex flex-col items-center text-center">
                    <div className="flex items-center gap-2 mb-3">
                      <Coins size={18} className="text-gray-500" />
                      <h3 className="text-sm font-bold text-gray-400 font-orbitron uppercase">From Mints</h3>
                    </div>
                    <span className="text-2xl font-mono font-bold text-gray-500 mb-1">N/A</span>
                    <span className="text-xs text-gray-600 font-mono">Coming Soon</span>
                  </div>
                  
                  <div className="bg-black/40 border border-gray-500/30 rounded-xl p-5 flex flex-col items-center text-center">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={18} className="text-gray-500" />
                      <h3 className="text-sm font-bold text-gray-400 font-orbitron uppercase">From Emissions</h3>
                    </div>
                    <span className="text-2xl font-mono font-bold text-gray-500 mb-1">N/A</span>
                    <span className="text-xs text-gray-600 font-mono">Coming Soon</span>
                  </div>
                  
                  <div className="bg-black/40 border border-gray-500/30 rounded-xl p-5 flex flex-col items-center text-center">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign size={18} className="text-gray-500" />
                      <h3 className="text-sm font-bold text-gray-400 font-orbitron uppercase">From Royalties</h3>
                    </div>
                    <span className="text-2xl font-mono font-bold text-gray-500 mb-1">N/A</span>
                    <span className="text-xs text-gray-600 font-mono">Coming Soon</span>
                  </div>
                  
                  <div className="bg-black/40 border border-gray-500/30 rounded-xl p-5 flex flex-col items-center text-center">
                    <div className="flex items-center gap-2 mb-3">
                      <Database size={18} className="text-gray-500" />
                      <h3 className="text-sm font-bold text-gray-400 font-orbitron uppercase">Staking Emissions</h3>
                    </div>
                    <span className="text-2xl font-mono font-bold text-gray-500 mb-1">N/A</span>
                    <span className="text-xs text-gray-600 font-mono">Coming Soon</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* === COMMUNITY TREASURY CARD === */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 w-full max-w-5xl mx-auto">
                  <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-lg p-6 border border-cyan-500/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Coins className="w-6 h-6 text-cyan-400" />
                        <h3 className="text-lg font-orbitron text-white">Community Treasury</h3>
                      </div>
                      <span className="text-2xl">🏦</span>
                    </div>

                    {/* Total Balance */}
                    <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-6" data-testid="text-total-treasury">
                      {displayValue(treasuryData.totalTreasury, 0)} $BASED
                    </div>

                    {/* Treasury Breakdown */}
                    <div className="space-y-3 text-sm">
                      {/* From Mints */}
                      <div className="flex justify-between items-center p-2 bg-black/30 rounded">
                        <span className="text-gray-400">From Mints ({MINT_SPLIT.TREASURY_PERCENT}%)</span>
                        <span className="text-cyan-400 font-semibold">
                          {displayValue(treasuryData.mintToTreasury, 0)} $BASED
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 pl-2 -mt-2">
                        {isDataReady ? `${formatNumber(treasuryData.minted)} minted × ${formatNumber(MINT_PRICE)} × ${MINT_SPLIT.TREASURY_PERCENT}%` : '---'}
                      </div>

                      {/* From Royalties */}
                      <div className="flex justify-between items-center p-2 bg-black/30 rounded">
                        <span className="text-gray-400">From Royalties (2%)</span>
                        <span className="text-cyan-400 font-semibold">
                          {displayValue(treasuryData.royaltyToTreasury, 0)} $BASED
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 pl-2 -mt-2">
                        {isDataReady ? `${formatNumber(treasuryData.salesVolume)} sales × 2%` : '---'}
                      </div>

                      {/* From Emissions */}
                      <div className="flex justify-between items-center p-2 bg-black/30 rounded">
                        <span className="text-gray-400">From $BRAIN Emissions</span>
                        <span className="text-purple-400 font-semibold">
                          {displayValue(treasuryData.passiveEmissions, 0)} $BASED
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 pl-2 -mt-2">
                        Community share: {displayValue(treasuryData.currentDailyRate, 0)}/day
                      </div>
                    </div>

                    {/* Backed Value */}
                    <div className="mt-4 pt-4 border-t border-cyan-500/20">
                      <div className="text-xs text-gray-400 mb-1">Backed Value per NFT</div>
                      <div className="text-xl font-bold text-cyan-400" data-testid="text-backed-value">
                        {displayValue(treasuryData.backedValuePerNFT, 0)} $BASED
                      </div>
                    </div>
                  </div>

                  {/* === ECOSYSTEM REVENUE CARD (NEW) === */}
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg p-6 border border-purple-500/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-purple-400" />
                        <h3 className="text-lg font-orbitron text-white">Ecosystem Revenue</h3>
                      </div>
                      <span className="text-2xl">💰</span>
                    </div>

                    {/* Total Ecosystem Revenue */}
                    <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6">
                      {displayValue(treasuryData.totalMintRevenue + treasuryData.totalRoyalties + treasuryData.platformFeeToCreator, 0)} $BASED
                    </div>

                    {/* Revenue Breakdown by Source */}
                    <div className="space-y-3 text-sm mb-4">
                      {/* Mint Revenue */}
                      <div>
                        <div className="flex justify-between items-center p-2 bg-black/30 rounded">
                          <span className="text-gray-400">Mint Revenue</span>
                          <span className="text-purple-400 font-semibold">
                            {displayValue(treasuryData.totalMintRevenue, 0)} $BASED
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 pl-2 mt-1 space-y-0.5">
                          <div>→ Treasury: {displayValue(treasuryData.mintToTreasury, 0)} ({MINT_SPLIT.TREASURY_PERCENT}%)</div>
                          <div>→ Creator: {displayValue(treasuryData.mintToCreator, 0)} ({MINT_SPLIT.CREATOR_PERCENT}%)</div>
                        </div>
                      </div>

                      {/* Royalty Revenue */}
                      <div>
                        <div className="flex justify-between items-center p-2 bg-black/30 rounded">
                          <span className="text-gray-400">Royalty Revenue (10%)</span>
                          <span className="text-purple-400 font-semibold">
                            {displayValue(treasuryData.totalRoyalties, 0)} $BASED
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 pl-2 mt-1 space-y-0.5">
                          <div>→ Treasury: {displayValue(treasuryData.royaltyToTreasury, 0)} (2%)</div>
                          <div>→ Royalty Wallet: {displayValue(treasuryData.royaltyToRoyaltyWallet, 0)} (4%)</div>
                          <div>→ Creator: {displayValue(treasuryData.royaltyToCreator, 0)} (4%)</div>
                        </div>
                      </div>

                      {/* Platform Fee */}
                      <div>
                        <div className="flex justify-between items-center p-2 bg-black/30 rounded">
                          <span className="text-gray-400">Platform Fee (1%)</span>
                          <span className="text-purple-400 font-semibold">
                            {displayValue(treasuryData.platformFeeToCreator, 0)} $BASED
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 pl-2 mt-1">
                          → Creator Wallet
                        </div>
                      </div>
                    </div>

                    {/* Wallet Totals */}
                    <div className="mt-4 pt-4 border-t border-purple-500/20">
                      <div className="text-xs text-gray-400 mb-2">Total by Wallet</div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Treasury:</span>
                          <span className="text-cyan-400 font-semibold">{displayValue(treasuryData.treasuryTotal, 0)} $BASED</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Creator:</span>
                          <span className="text-purple-400 font-semibold">{displayValue(treasuryData.creatorTotal, 0)} $BASED</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Royalty Wallet:</span>
                          <span className="text-pink-400 font-semibold">{displayValue(treasuryData.royaltyWalletTotal, 0)} $BASED</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* === EMISSIONS STATS === */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 w-full max-w-2xl mx-auto">
                  <div className="bg-black/40 border border-amber-500/30 rounded-xl p-5 flex flex-col items-center text-center">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={16} className="text-amber-400" />
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
              </>
            )}

          </motion.div>
        </div>
      </section>
      
      <Suspense fallback={<LoadingSpinner text="Loading Brain Diagnostics..." />}>
        <BrainDiagnostics />
      </Suspense>
    </>
  );
}
