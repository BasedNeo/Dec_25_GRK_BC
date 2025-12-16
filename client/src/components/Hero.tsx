import { useState, useEffect } from "react";
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
import confetti from "canvas-confetti";

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

export function Hero() {
  const [mintQuantity, setMintQuantity] = useState(1);
  const [maxAffordable, setMaxAffordable] = useState(0);
  const { toast } = useToast();
  const { isPaused } = useSecurity();
  const mintButtonColor = useABTest('mint-button-color', ['cyan', 'purple']);
  const { isConnected, chain } = useAccount();
  const { openConnectModal } = useConnectModal();
  
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
    console.log('🔴 MINT BUTTON CLICKED');
    console.log('   isConnected:', isConnected);
    console.log('   isPaused:', isPaused);
    console.log('   mintQuantity:', mintQuantity);
    console.log('   canAfford:', canAfford(mintQuantity));
    
    if (!isConnected) {
      console.log('❌ Not connected - opening connect modal');
      openConnectModal?.();
      return;
    }

    if (isPaused) {
      console.log('❌ System paused');
      toast({
        title: "System Paused",
        description: "Minting is currently paused by the administrator.",
        variant: "destructive"
      });
      return;
    }

    // Analytics: Track Mint Attempt
    trackEvent('mint_attempt', 'Transaction', 'Hero Section', mintQuantity);

    console.log('✅ Calling mint function...');
    // Call the real mint function
    await mint(mintQuantity);
  };

  // Fire confetti and refresh data on successful mint
  useEffect(() => {
    if (mintState.isSuccess) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00ffff', '#bf00ff', '#ffffff']
      });

      // Analytics: Track Successful Mint
      trackEvent('mint_success', 'Transaction', 'Hero Section', mintQuantity);

      // Refresh Data after mint
      fetchAllMintedData();

      // Reset mint state after a delay so user can see success
      setTimeout(() => {
        resetMint();
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
    <section id="hero" className="min-h-screen pt-8 pb-12 flex items-center relative overflow-hidden bg-black">
      {/* Beta Ribbon (Red Corner Badge) */}
      <div className="absolute top-8 left-0 w-32 h-32 overflow-hidden z-20 pointer-events-none">
        <div className="absolute top-0 left-0 transform -translate-x-10 translate-y-6 -rotate-45 bg-red-600 text-white font-bold font-orbitron text-[10px] py-1 w-40 text-center shadow-lg border border-red-400/50">
          BETA v1.0
        </div>
      </div>

      {/* Premium Parallax Cyberpunk Space Background */}
      <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-[#0a0a0a] to-black"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.05)_0%,transparent_50%)] opacity-30 animate-pulse"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Column: Text & Mint UI */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-center lg:items-start text-center lg:text-left"
        >
          <Badge variant="outline" className="mb-4 border-primary/50 text-primary font-mono tracking-widest bg-primary/5">
            SERIES 01: GENESIS
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight text-white glitch-hover">
            BASED GUARDIANS <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">({NFT_SYMBOL})</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 font-rajdhani leading-relaxed max-w-lg">
            The Based Guardians — Step into the Based Universe where courage, creativity, and community collide. 3,732 unique NFTs (1,776 Guardians, 1,320 Based Frogs, 636 Creatures). Staked to BasedAI Brain for $BASED emissions; Legendary rarities unlock higher yields. All NFT holders gain Race-to-Base privileges. A longterm vision blending 80s retro-fantasy with AI/blockchain/humanitarian mission. 'This story, your story, has only just begun... Stay Based.' 
          </p>

          <MintBalancePanel onMaxAffordableChange={setMaxAffordable} />

          <div className="bg-card/50 backdrop-blur-sm border border-white/10 p-6 rounded-xl max-w-md shadow-2xl w-full">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm text-muted-foreground font-mono">MINTED</span>
              <span className="text-xl font-orbitron text-primary text-glow">
                  <motion.span>{rounded}</motion.span> / {TOTAL_SUPPLY}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-8">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(mintedData.totalMinted / TOTAL_SUPPLY) * 100}%` }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-accent"
              />
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
            
            <div className="mb-4 text-[10px] text-gray-600 font-mono text-center">
                 Live sync; rarity based on minted metadata.
                 <span className="block mt-1 text-primary/40">Last updated: {secondsAgo}s ago</span>
            </div>

            {/* Minted NFTs Table (Shared Data) */}
            <ErrorBoundary>
                <MintedNFTsTable 
                    nfts={mintedData.nfts}
                    isLoading={mintedData.isLoading}
                    onRefresh={fetchAllMintedData}
                />
            </ErrorBoundary>

            <div className="flex justify-between items-center mb-8 pt-6">
              <div className="flex items-center space-x-4 bg-black/40 p-2 rounded-lg border border-white/5">
                <button onClick={decrement} className="p-2 hover:text-primary transition-colors" data-testid="button-decrement"><Minus size={18} /></button>
                <span className="font-orbitron w-8 text-center" data-testid="text-mint-quantity">{mintQuantity}</span>
                <button onClick={increment} className="p-2 hover:text-primary transition-colors" data-testid="button-increment"><Plus size={18} /></button>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">TOTAL PRICE</div>
                <div className="text-xl font-orbitron text-white" data-testid="text-total-price">{(MINT_PRICE * mintQuantity).toLocaleString()} <span className="text-primary text-sm">$BASED</span></div>
              </div>
            </div>

            <Button 
              id="hero-mint-section"
              onClick={handleMint}
              disabled={isPaused || isMinting || (isConnected && !canAfford(mintQuantity))}
              className={`w-full py-6 text-lg font-orbitron tracking-widest disabled:opacity-50 disabled:cursor-not-allowed mb-4
                ${!isConnected 
                  ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.5)]'
                  : mintButtonColor === 'purple' 
                    ? 'bg-[#bf00ff] text-white hover:bg-[#bf00ff]/90 shadow-[0_0_20px_rgba(191,0,255,0.4)]' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(0,255,255,0.4)]'
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
              <div className="mb-4 p-3 bg-black/40 rounded-lg border border-white/10">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-muted-foreground">Your Balance:</span>
                  <span className={`${canAfford(mintQuantity) ? 'text-green-400' : 'text-red-400'}`} data-testid="text-wallet-balance">
                    {balance ? Number(balance).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'} $BASED
                  </span>
                </div>
                {maxMintable > 0 && (
                  <div className="flex justify-between items-center text-xs font-mono mt-1">
                    <span className="text-muted-foreground">You can mint up to:</span>
                    <span className="text-primary" data-testid="text-max-mintable">{Math.min(maxMintable, 10)} NFTs</span>
                  </div>
                )}
              </div>
            )}
            
            <p className="mt-4 text-xs text-center text-muted-foreground/60 font-mono">
              {isConnected 
                ? `Connected to ${chain?.name || 'Unknown Network'} • Prices in $BASED`
                : 'Connect wallet to BasedAI network to mint'
              }
            </p>
          </div>
        </motion.div>

        {/* Right Column: NFT Carousel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative flex justify-center"
        >
          <div className="relative aspect-square w-full max-w-md">
            {/* Decorative Rings */}
            <div className="absolute inset-0 border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]" />
            <div className="absolute inset-4 border border-accent/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
            
            {/* Main Image Card */}
            <Card className="absolute inset-8 bg-black border-primary/30 overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.15)] group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />
              
              {heroGuardian ? (
                <>
                    <NFTImage 
                        src={heroGuardian.image} 
                        alt={heroGuardian.name} 
                        id={heroGuardian.id}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    
                    {/* Top Right: Rarity & Backing */}
                    <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
                        <Badge className={`backdrop-blur-md border ${getRarityColor(heroGuardian.rarity || 'Common')} font-mono text-[10px] uppercase`}>
                            {heroGuardian.rarity || 'Common'}
                        </Badge>
                        <div className="bg-black/60 backdrop-blur-sm border border-white/10 px-2 py-1 rounded text-[10px] text-green-400 font-mono flex items-center gap-1">
                            <TrendingUp size={10} />
                            BACKED: {backingValue.toLocaleString()} $BASED
                        </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                        <h3 className="text-2xl font-orbitron text-white mb-1">{heroGuardian.name}</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <CheckCircle size={14} className="text-primary" />
                        <span>Verified Contract</span>
                        </div>
                    </div>
                </>
              ) : (
                <div className="w-full h-full bg-black/50 flex flex-col p-0">
                    <Skeleton className="w-full h-full absolute inset-0 rounded-none bg-primary/5" />
                    
                    {/* Top Right Mock */}
                    <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
                        <Skeleton className="h-5 w-20 rounded-full bg-primary/10" />
                        <Skeleton className="h-5 w-32 rounded bg-black/60" />
                    </div>

                    {/* Bottom Info Mock */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20 space-y-3">
                        <Skeleton className="h-8 w-3/4 bg-primary/10" />
                        <div className="flex items-center space-x-2">
                            <Skeleton className="h-4 w-4 rounded-full" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                    
                    {/* Center Loading Text */}
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <span className="text-primary/50 animate-pulse font-orbitron text-sm">LOADING #3000...</span>
                    </div>
                </div>
              )}
            </Card>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
