import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, useMotionValue, useTransform, animate, useScroll } from "framer-motion";
import { Minus, Plus, Zap, CheckCircle, Fingerprint, TrendingUp, Loader2, RefreshCw, Wallet } from "lucide-react";
import { calculateBackedValue, Guardian } from "@/lib/mockData";
const MINT_PRICE = 69420;
const TOTAL_SUPPLY = 3732;
import { NFT_SYMBOL, BLOCK_EXPLORER } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

import { useSecurity } from "@/context/SecurityContext";
import { trackEvent } from "@/lib/analytics";
import { useABTest } from "@/hooks/useABTest";
import { useGuardians } from "@/hooks/useGuardians";
import { fetchSmartMintedData } from "@/lib/smartFetcher";
import { AverageStatsChart } from "./AverageStatsChart";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MintedNFTsTable } from "./MintedNFTsTable";
import { RarityChart } from "./RarityChart";
import { NFTImage } from "./NFTImage";
import { MintBalancePanel } from "./MintBalancePanel";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useMint } from "@/hooks/useMint";
import { useTransactionContext } from "@/context/TransactionContext";

export function Hero() {
  const [mintQuantity, setMintQuantity] = useState(1);
  const [maxAffordable, setMaxAffordable] = useState(0);
  const { toast } = useToast();
  const { isPaused } = useSecurity();
  const mintButtonColor = useABTest('mint-button-color', ['cyan', 'purple']);
  const { isConnected, chain } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { showTransaction } = useTransactionContext();
  const overlayShownRef = useRef<string | null>(null);
  
  // Real minting hook
  const { mint, state: mintState, reset: resetMint, balance, canAfford, maxAffordable: maxMintable, status, txHash } = useMint();
  const isMinting = mintState.isPending || mintState.isConfirming;
  
  // Shared Data State
  const [mintedData, setMintedData] = useState<{
    nfts: Guardian[];
    distribution: Record<string, number>;
    totalMinted: number;
    isLoading: boolean;
  }>({
    nfts: [],
    distribution: {},
    totalMinted: 0,
    isLoading: true
  });

  // Default Rarity Data Structure
  const [rarityStats, setRarityStats] = useState([
    { name: 'Rarest-Legendary', value: 127, color: '#22d3ee', minted: 0 },
    { name: 'Very Rare', value: 63, color: '#c084fc', minted: 0 },
    { name: 'More Rare', value: 452, color: '#fbbf24', minted: 0 },
    { name: 'Rare', value: 642, color: '#facc15', minted: 0 },
    { name: 'Less Rare', value: 194, color: '#60a5fa', minted: 0 },
    { name: 'Less Common', value: 836, color: '#4ade80', minted: 0 },
    { name: 'Common', value: 836, color: '#ffffff', minted: 0 },
    { name: 'Most Common', value: 582, color: '#9ca3af', minted: 0 },
  ]);

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Unified Fetching Logic
  const fetchAllMintedData = async () => {
    if (mintedData.totalMinted === 0) {
        setMintedData(prev => ({ ...prev, isLoading: true }));
    }
    
    try {
        const { nfts, distribution, totalMinted } = await fetchSmartMintedData();

        setMintedData({
            nfts,
            distribution,
            totalMinted,
            isLoading: false
        });
        
        setLastUpdated(new Date());
        setSecondsAgo(0);

    } catch (e) {
        setMintedData(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    fetchAllMintedData();
    const interval = setInterval(fetchAllMintedData, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Parallax
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  
  // Supply Counter Animation
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const animation = animate(count, mintedData.totalMinted, { duration: 2, ease: "easeOut" });
    return animation.stop;
  }, [mintedData.totalMinted]);

  // Fetch Real Guardian #3000 as requested
  const { data: searchData, isLoading: isLoadingGuardian } = useGuardians(false, true, { search: "3000" });
  const heroGuardian = searchData?.pages[0]?.nfts[0];
  
  // Calculate Backing Value (Live)
  const [backingValue, setBackingValue] = useState(calculateBackedValue());

  useEffect(() => {
    const interval = setInterval(() => {
        setBackingValue(calculateBackedValue());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Real Smart Contract Minting
  const handleMint = async () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    if (isPaused) {
      toast({
        title: "System Paused",
        description: "Minting is currently paused by the administrator.",
        variant: "destructive"
      });
      return;
    }

    trackEvent('mint_attempt', 'Transaction', 'Hero Section', mintQuantity);
    await mint(mintQuantity);
  };

  // Show transaction overlay when we get a txHash
  useEffect(() => {
    if (txHash && overlayShownRef.current !== txHash) {
      overlayShownRef.current = txHash;
      const totalCost = (mintQuantity * MINT_PRICE).toLocaleString();
      showTransaction(
        txHash as `0x${string}`,
        'mint',
        `Minting ${mintQuantity} Guardian${mintQuantity > 1 ? 's' : ''} for ${totalCost} $BASED`
      );
    }
  }, [txHash, mintQuantity, showTransaction]);

  // Fire confetti and refresh data on successful mint
  useEffect(() => {
    if (mintState.isSuccess) {
      // Analytics: Track Successful Mint
      trackEvent('mint_success', 'Transaction', 'Hero Section', mintQuantity);

      // Refresh Data after mint
      fetchAllMintedData();

      // Reset mint state after a delay so user can see success
      setTimeout(() => {
        resetMint();
        overlayShownRef.current = null;
      }, 3000);
    }
  }, [mintState.isSuccess]);

  const increment = () => setMintQuantity(prev => Math.min(prev + 1, 10));
  const decrement = () => setMintQuantity(prev => Math.max(prev - 1, 1));

  // Rarity Badge Color Logic
  const getRarityColor = (rarity: string) => {
      if (rarity === 'Rarest-Legendary') return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]';
      if (rarity === 'Very Rare') return 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_10px_rgba(192,132,252,0.3)]';
      if (rarity === 'More Rare') return 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(251,191,36,0.3)]';
      if (rarity === 'Rare') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50 shadow-[0_0_10px_rgba(250,204,21,0.3)]';
      if (rarity === 'Less Rare') return 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(96,165,250,0.3)]';
      if (rarity === 'Less Common') return 'bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(74,222,128,0.3)]';
      if (rarity === 'Common') return 'bg-white/10 text-white border-white/20';
      if (rarity === 'Most Common') return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      if (rarity?.includes('Legendary')) return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]';
      return 'bg-black/40 text-gray-300 border-white/10';
  };

  return (
    <section id="hero" className="min-h-screen pt-6 sm:pt-8 pb-8 sm:pb-12 flex flex-col items-center justify-center relative overflow-hidden bg-black">
      {/* Beta Ribbon (Red Corner Badge) */}
      <div className="absolute top-6 sm:top-8 left-0 w-28 sm:w-32 h-28 sm:h-32 overflow-hidden z-20 pointer-events-none">
        <div className="absolute top-0 left-0 transform -translate-x-10 translate-y-5 sm:translate-y-6 -rotate-45 bg-red-600 text-white font-bold font-orbitron text-[9px] sm:text-[10px] py-1 w-36 sm:w-40 text-center shadow-lg border border-red-400/50">
          BETA v1.0
        </div>
      </div>

      {/* Premium Parallax Cyberpunk Space Background */}
      <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-[#0a0a0a] to-black"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,255,255,0.08)_0%,transparent_40%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.06)_0%,transparent_40%)]"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        
        {/* Left Column: Text & Mint UI */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1"
        >
          <Badge variant="outline" className="mb-3 sm:mb-4 border-primary/50 text-primary font-mono tracking-widest bg-primary/5 text-[10px] sm:text-xs">
            SERIES 01: GENESIS
          </Badge>
          
          <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-black mb-4 sm:mb-6 leading-tight text-white">
            BASED GUARDIANS <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">({NFT_SYMBOL})</span>
          </h1>
          
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-6 sm:mb-8 font-rajdhani leading-relaxed max-w-lg">
            Step into the Based Universe where courage, creativity, and community collide. 3,732 unique NFTs staked to BasedAI Brain for $BASED emissions. Legendary rarities unlock higher yields. All holders gain Race-to-Base privileges. 
          </p>

          <MintBalancePanel onMaxAffordableChange={setMaxAffordable} />

          <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-4 sm:p-6 rounded-2xl max-w-md shadow-[0_8px_32px_rgba(0,0,0,0.4)] w-full">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <span className="text-xs sm:text-sm text-muted-foreground font-mono uppercase tracking-wider">Supply</span>
              <span className="text-lg sm:text-xl font-orbitron text-primary">
                  <motion.span>{rounded}</motion.span> <span className="text-white/40">/</span> <span className="text-white/60">{TOTAL_SUPPLY}</span>
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-2 sm:h-2.5 bg-black/60 rounded-full overflow-hidden mb-6 sm:mb-8 ring-1 ring-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(mintedData.totalMinted / TOTAL_SUPPLY) * 100}%` }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary via-cyan-400 to-accent relative"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/20" />
              </motion.div>
            </div>

            {/* Rarity Chart (New Component) */}
            <ErrorBoundary fallback={null}>
                <RarityChart 
                    mintedCount={mintedData.nfts.length}
                    totalMinted={mintedData.totalMinted}
                    distribution={mintedData.distribution}
                    isLoading={mintedData.isLoading}
                />
            </ErrorBoundary>
            
            <div className="mb-4 text-[9px] sm:text-[10px] text-gray-500 font-mono text-center">
                 Live sync • Rarity from minted metadata
                 <span className="block mt-0.5 text-primary/40">Updated {secondsAgo}s ago</span>
            </div>

            {/* Minted NFTs Table (Shared Data) */}
            <ErrorBoundary>
                <MintedNFTsTable 
                    nfts={mintedData.nfts}
                    isLoading={mintedData.isLoading}
                    onRefresh={fetchAllMintedData}
                />
            </ErrorBoundary>

            <div className="flex justify-between items-center mb-6 sm:mb-8 pt-4 sm:pt-6">
              <div className="flex items-center space-x-2 sm:space-x-3 bg-black/60 p-1.5 sm:p-2 rounded-xl border border-white/10">
                <button onClick={decrement} className="p-2 sm:p-2.5 hover:text-primary hover:bg-white/5 rounded-lg transition-all active:scale-95" data-testid="button-decrement"><Minus size={16} /></button>
                <span className="font-orbitron w-8 sm:w-10 text-center text-lg sm:text-xl" data-testid="text-mint-quantity">{mintQuantity}</span>
                <button onClick={increment} className="p-2 sm:p-2.5 hover:text-primary hover:bg-white/5 rounded-lg transition-all active:scale-95" data-testid="button-increment"><Plus size={16} /></button>
              </div>
              <div className="text-right">
                <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 uppercase tracking-wider">Total</div>
                <div className="text-lg sm:text-xl font-orbitron text-white" data-testid="text-total-price">{(MINT_PRICE * mintQuantity).toLocaleString()} <span className="text-primary text-xs sm:text-sm">$BASED</span></div>
              </div>
            </div>

            <Button 
              id="hero-mint-section"
              onClick={handleMint}
              disabled={isPaused || isMinting || (isConnected && !canAfford(mintQuantity))}
              className={`w-full py-5 sm:py-6 text-sm sm:text-lg font-orbitron tracking-wider sm:tracking-widest disabled:opacity-50 disabled:cursor-not-allowed mb-3 sm:mb-4 rounded-xl transition-all duration-300 active:scale-[0.98]
                ${!isConnected 
                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black hover:from-cyan-400 hover:to-cyan-300 shadow-[0_0_30px_rgba(0,255,255,0.4)]'
                  : mintButtonColor === 'purple' 
                    ? 'bg-gradient-to-r from-[#bf00ff] to-purple-500 text-white hover:from-purple-500 hover:to-[#bf00ff] shadow-[0_0_25px_rgba(191,0,255,0.4)]' 
                    : 'bg-gradient-to-r from-primary to-cyan-400 text-black hover:from-cyan-400 hover:to-primary shadow-[0_0_25px_rgba(0,255,255,0.4)]'
                }
              `}
              data-testid="button-mint"
            >
              {isPaused ? (
                <span className="flex items-center text-red-500">
                  <Zap className="mr-2 h-4 w-4" /> PAUSED
                </span>
              ) : !isConnected ? (
                <span className="flex items-center justify-center text-black font-bold">
                  <Wallet className="mr-2 h-4 w-4" /> CONNECT WALLET TO MINT
                </span>
              ) : mintState.isPending ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> CONFIRM IN WALLET...
                </span>
              ) : mintState.isConfirming ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> MINTING...
                </span>
              ) : mintState.isSuccess ? (
                <span className="flex items-center justify-center text-green-400">
                  <CheckCircle className="mr-2 h-4 w-4" /> MINT SUCCESSFUL!
                </span>
              ) : !canAfford(mintQuantity) ? (
                <span className="flex items-center justify-center text-red-400">
                  INSUFFICIENT $BASED BALANCE
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Zap className="mr-2 h-4 w-4" /> MINT {mintQuantity} NFT{mintQuantity > 1 ? 'S' : ''} NOW
                </span>
              )}
            </Button>
            
            {/* Transaction Status */}
            {isMinting && status && status !== 'idle' && (
              <div className="mb-4 text-center p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <p className="text-cyan-400 text-sm font-mono animate-pulse">{status}</p>
                {txHash && (
                  <a 
                    href={`${BLOCK_EXPLORER}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline font-mono mt-2 inline-block"
                    data-testid="link-transaction"
                  >
                    View on Explorer →
                  </a>
                )}
              </div>
            )}
            
            {/* Transaction Link (after success) */}
            {!isMinting && mintState.txHash && (
              <div className="mb-4 text-center">
                <a 
                  href={`${BLOCK_EXPLORER}/tx/${mintState.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline font-mono"
                  data-testid="link-transaction-success"
                >
                  View Transaction →
                </a>
              </div>
            )}
            
            {/* Error Display */}
            {mintState.error && (
              <div className="mb-4 text-center p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{mintState.error}</p>
                <button 
                  onClick={resetMint}
                  className="text-xs text-gray-400 hover:text-white mt-2 underline"
                >
                  Try Again
                </button>
              </div>
            )}
            
            {/* Balance & Affordability Info */}
            {isConnected && (
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-black/50 rounded-xl border border-white/5">
                <div className="flex justify-between items-center text-[11px] sm:text-xs font-mono">
                  <span className="text-muted-foreground">Balance:</span>
                  <span className={`font-medium ${canAfford(mintQuantity) ? 'text-green-400' : 'text-red-400'}`} data-testid="text-wallet-balance">
                    {balance ? Number(balance).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'} $BASED
                  </span>
                </div>
                {maxMintable > 0 && (
                  <div className="flex justify-between items-center text-[11px] sm:text-xs font-mono mt-1">
                    <span className="text-muted-foreground">Max mint:</span>
                    <span className="text-primary" data-testid="text-max-mintable">{Math.min(maxMintable, 10)} NFTs</span>
                  </div>
                )}
              </div>
            )}
            
            <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs text-center text-muted-foreground/50 font-mono">
              {isConnected 
                ? `${chain?.name || 'BasedAI'} • Prices in $BASED`
                : 'Connect wallet to mint'
              }
            </p>
          </div>
        </motion.div>

        {/* Right Column: NFT Showcase */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative flex justify-center order-1 lg:order-2 mb-6 lg:mb-0"
        >
          <div className="relative aspect-square w-full max-w-[280px] sm:max-w-sm lg:max-w-md">
            {/* Decorative Rings */}
            <div className="absolute inset-0 border border-primary/15 rounded-full animate-[spin_12s_linear_infinite]" />
            <div className="absolute inset-3 sm:inset-4 border border-accent/15 rounded-full animate-[spin_18s_linear_infinite_reverse]" />
            
            {/* Main Image Card */}
            <Card className="absolute inset-6 sm:inset-8 bg-black border-primary/20 overflow-hidden shadow-[0_0_40px_rgba(0,255,255,0.12)] group rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 z-10" />
              
              {heroGuardian ? (
                <>
                    <NFTImage 
                        src={heroGuardian.image} 
                        alt={heroGuardian.name} 
                        id={heroGuardian.id}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    
                    {/* Top Right: Rarity & Backing */}
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex flex-col items-end gap-1.5 sm:gap-2">
                        <Badge className={`backdrop-blur-md border ${getRarityColor(heroGuardian.rarity || 'Common')} font-mono text-[8px] sm:text-[10px] uppercase px-1.5 sm:px-2`}>
                            {heroGuardian.rarity || 'Common'}
                        </Badge>
                        <div className="bg-black/70 backdrop-blur-sm border border-white/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[8px] sm:text-[10px] text-green-400 font-mono flex items-center gap-1">
                            <TrendingUp size={8} className="sm:w-[10px] sm:h-[10px]" />
                            {backingValue.toLocaleString()}
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 z-20">
                        <h3 className="text-lg sm:text-xl lg:text-2xl font-orbitron text-white mb-0.5 sm:mb-1">{heroGuardian.name}</h3>
                        <div className="flex items-center space-x-1.5 sm:space-x-2 text-[10px] sm:text-sm text-gray-400">
                          <CheckCircle size={12} className="text-primary sm:w-[14px] sm:h-[14px]" />
                          <span>Verified</span>
                        </div>
                    </div>
                </>
              ) : (
                <div className="w-full h-full bg-black/50 flex flex-col p-0">
                    <Skeleton className="w-full h-full absolute inset-0 rounded-none bg-primary/5" />
                    
                    {/* Top Right Mock */}
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex flex-col items-end gap-1.5">
                        <Skeleton className="h-4 sm:h-5 w-16 sm:w-20 rounded-full bg-primary/10" />
                        <Skeleton className="h-4 sm:h-5 w-20 sm:w-24 rounded bg-black/60" />
                    </div>

                    {/* Bottom Info Mock */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-5 z-20 space-y-2">
                        <Skeleton className="h-6 sm:h-8 w-3/4 bg-primary/10" />
                        <div className="flex items-center space-x-2">
                            <Skeleton className="h-3 sm:h-4 w-3 sm:w-4 rounded-full" />
                            <Skeleton className="h-3 sm:h-4 w-16 sm:w-24" />
                        </div>
                    </div>
                    
                    {/* Center Loading Text */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <span className="text-primary/50 animate-pulse font-orbitron text-xs sm:text-sm">LOADING...</span>
                    </div>
                </div>
              )}
            </Card>
          </div>
        </motion.div>

      </div>

      {/* See Your Stats CTA - Mobile Optimized */}
      <motion.div 
        className="mt-6 sm:mt-12 lg:mt-16 mb-6 sm:mb-8 flex justify-center px-4 w-full"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'stats' }))}
          className="group relative overflow-hidden w-full max-w-sm sm:w-auto px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-900/20 via-cyan-900/20 to-purple-900/20 border border-white/10 hover:border-cyan-500/40 transition-all duration-300 active:scale-[0.98]"
          data-testid="button-see-stats"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
              <TrendingUp className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <div className="text-sm font-orbitron tracking-wide text-white group-hover:text-cyan-300 transition-colors">
                SEE YOUR STATS
              </div>
              <div className="text-[10px] text-white/40 font-mono">
                Track your journey
              </div>
            </div>
            <div className="text-white/30 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0">
              →
            </div>
          </div>
        </button>
      </motion.div>
    </section>
  );
}
