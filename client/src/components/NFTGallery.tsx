import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Loader2, RefreshCw, AlertTriangle, Filter, TrendingUp, Search, ArrowUpDown, Download, Square, LayoutGrid, Grid3x3, Grid, ExternalLink } from "lucide-react";
import { Guardian, RARITY_CONFIG, calculateBackedValue } from "@/lib/mockData";
import { useAccount } from "wagmi";
import { useState, useMemo, useEffect, useRef } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useGuardians } from "@/hooks/useGuardians";
import { useUserNFTs } from "@/hooks/useUserNFTs";
import { useOffersForOwner } from "@/hooks/useOffers";
import { useListing } from "@/hooks/useMarketplace";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { NFT_CONTRACT, BLOCK_EXPLORER } from "@/lib/constants";
import { Security } from "@/lib/security";
import { CacheService } from "@/lib/cache";
import { clearCSVCache } from "@/lib/csvLoader";

import { NFTDetailModal } from "./NFTDetailModal";
import { RetrieveOldListing } from "./RetrieveOldListing";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MyOffersPanel } from "./MyOffersPanel";
import CollectionSelector from "./CollectionSelector";
import { useWalletCollections } from "@/hooks/useWalletCollections";

interface NFTGalleryProps {
  title?: string;
  subtitle?: string;
  filterByOwner?: boolean; // New prop to filter by connected wallet
}

function GuardianCardSkeleton() {
  return (
    <Card className="bg-card border-white/10 overflow-hidden h-full flex flex-col">
      <Skeleton className="w-full aspect-square skeleton rounded-none" />
      <div className="p-4 space-y-3 flex-1">
        <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20 skeleton" />
            <Skeleton className="h-5 w-16 rounded-full skeleton" />
        </div>
        <Skeleton className="h-6 w-3/4 skeleton" />
        <div className="pt-4 mt-auto space-y-2">
            <div className="flex justify-between">
                <Skeleton className="h-3 w-16 skeleton" />
                <Skeleton className="h-3 w-12 skeleton" />
            </div>
            <div className="flex justify-between">
                <Skeleton className="h-3 w-20 skeleton" />
                <Skeleton className="h-3 w-10 skeleton" />
            </div>
        </div>
        <Skeleton className="h-9 w-full mt-4 skeleton" />
      </div>
    </Card>
  );
}

export function NFTGallery({ 
  title = "YOUR BATTALION",
  subtitle = "Manage your Guardians and view their traits.",
  filterByOwner = false
}: NFTGalleryProps) {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [useMockData, setUseMockData] = useState(false);
  const [useCsvData, setUseCsvData] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  const { nfts: userNFTsRaw, loading: isLoadingOwned, error: ownedError, refetch: refetchOwned, hasLoaded: nftsHasLoaded, totalOwned } = useUserNFTs();
  const ownedNFTs = userNFTsRaw.map(nft => ({
    id: nft.tokenId,
    name: nft.name,
    image: nft.image,
    rarity: nft.rarity || 'Common',
    owner: nft.owner,
    traits: nft.attributes?.map(a => ({ type: a.trait_type, value: String(a.value) })) || [],
  }));
  const ownedBalance = userNFTsRaw.length;
  const { offers: allOffers } = useOffersForOwner();
  const [selectedNFT, setSelectedNFT] = useState<Guardian | null>(null);
  
  const { 
    collections: walletCollections, 
    loading: collectionsLoading, 
    error: collectionsError 
  } = useWalletCollections();
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  
  // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
      });
    } else {
        toast({
            title: "App Already Installed",
            description: "Or your browser doesn't support PWA installation.",
            variant: "default"
        });
    }
  };
  
  // Filters & Search
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [traitTypeFilter, setTraitTypeFilter] = useState<string>("all");
  const [traitValueFilter, setTraitValueFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("listed-price-asc");
  const [gridCols, setGridCols] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 6);

  // Pass filters to hook for server-side (CSV-side) filtering
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useGuardians(useMockData, useCsvData, {
      search: debouncedSearch,
      rarity: rarityFilter,
      traitType: traitTypeFilter,
      traitValue: traitValueFilter,
      sortBy,
      owner: (filterByOwner && isConnected && address) ? address : undefined // Pass owner if filtering enabled
  });

  // Infinite Scroll Observer
  const observerTarget = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
           fetchNextPage();
           // Track scroll load event
           trackEvent('scroll_load_batch', 'Engagement', 'NFT Gallery');
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten pages
  const nfts = data?.pages.flatMap((page: any) => page.nfts) || [];
  
  // Filter by selected collection if specified
  const isBasedGuardiansSelected = !selectedCollection || selectedCollection.toLowerCase() === NFT_CONTRACT.toLowerCase();
  const displayNfts = filterByOwner 
    ? (isBasedGuardiansSelected ? ownedNFTs : []) 
    : (nfts && nfts.length > 0) ? nfts : [];
  
  // Get selected collection info for display
  const selectedCollectionInfo = selectedCollection 
    ? walletCollections.find(c => c.contractAddress.toLowerCase() === selectedCollection.toLowerCase())
    : null;

  // Extract Traits
  const availableTraits = useMemo(() => {
      const traits: Record<string, Set<string>> = {};
      const excludedTypes = ['Flying Style', 'Special Meta', 'What they like to do', 'NFT Vol.'];
      
      if (displayNfts.length > 0) {
        displayNfts.forEach(item => {
            item.traits?.forEach((t: any) => {
                if (excludedTypes.includes(t.type)) return;
                if (!traits[t.type]) traits[t.type] = new Set();
                let value = t.value;
                if (t.type === 'Character Type' && value === 'Based Creature') {
                  value = 'Based Creatures';
                }
                traits[t.type].add(value);
            });
        });
      }
      return traits;
  }, [displayNfts]);

  // Value Estimation Logic
  const baseValuePerNFT = calculateBackedValue(); // Now returns ~35k + accrued
  const userTotalValue = displayNfts.reduce((total, guardian) => {
    // Per user request, we simply multiply base value by count for the "Total Holdings"
    // They explicitly asked for 20 * ~35,907 = ~718,140
    // So we remove the rarity multiplier from this specific aggregate calculation
    return total + baseValuePerNFT;
  }, 0);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

    // Pull-to-Refresh Logic
    useEffect(() => {
        let startY = 0;
        let refreshing = false;
        
        const handleTouchStart = (e: TouchEvent) => {
            startY = e.touches[0].pageY;
        };
        
        const handleTouchMove = async (e: TouchEvent) => {
            if (window.scrollY === 0 && e.touches[0].pageY > startY + 80 && !refreshing) {
                refreshing = true;
                // Add visual feedback or vibration if possible
                if (navigator.vibrate) navigator.vibrate(50);
                
                await fetchNextPage(); // Or a dedicated refresh function if available
                
                // Simulate refresh delay
                setTimeout(() => {
                    refreshing = false;
                }, 1000);
            }
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
        };
    }, [fetchNextPage]);

    return (
        <section id="gallery" className="py-20 border-t border-white/5 relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              
              {/* Header & Value Summary */}
              <div className="flex flex-col items-center mb-12 space-y-6">
                <div className="text-center relative">
                  <h2 className="text-4xl md:text-5xl text-white mb-2 font-black tracking-tighter uppercase relative z-10 text-center mx-auto">
                      {title.includes("YOUR BATTALION") ? (
                          <>YOUR <span 
                            className="bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(0,255,255,0.3)]"
                            style={{
                              backgroundImage: 'linear-gradient(90deg, #22d3ee, #ffffff, #a78bfa, #ffffff, #22d3ee)',
                              backgroundSize: '200% 100%',
                              animation: 'gradientShift 8s ease-in-out infinite',
                            }}
                          >BATTALION</span></>
                      ) : (
                          <>{title.split(' ').slice(0, -1).join(' ')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">{title.split(' ').pop()}</span></>
                      )}
                  </h2>
                  <style>{`
                    @keyframes gradientShift {
                      0%, 100% { background-position: 0% 50%; }
                      50% { background-position: 100% 50%; }
                    }
                  `}</style>
                   {/* Center Glow Effect */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 blur-[50px] -z-10 rounded-full pointer-events-none"></div>

                  <p className="text-muted-foreground font-rajdhani text-lg">{subtitle}</p>
                  
                  {/* PWA Install Button */}
                  {deferredPrompt && (
                      <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleInstallClick}
                          className="mt-4 text-xs font-mono text-primary border border-primary/20 hover:bg-primary/10"
                      >
                          <Download size={12} className="mr-2" /> INSTALL APP
                      </Button>
                  )}
                </div>

                {isConnected && displayNfts.length > 0 && filterByOwner && (
                   <Card className="bg-black/40 border-primary/30 backdrop-blur-md px-8 py-6 flex flex-col md:flex-row items-center gap-8 shadow-[0_0_30px_rgba(0,255,255,0.1)]">
                       <div className="flex flex-col items-center md:items-start border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-8">
                           <div className="flex items-center gap-2 mb-1">
                              <div className="p-2 bg-primary/10 rounded-full text-primary"><TrendingUp size={16} /></div>
                              <span className="text-xs text-muted-foreground font-mono tracking-widest">TOTAL HOLDINGS VALUE</span>
                           </div>
                           <span className="text-4xl md:text-5xl font-black font-orbitron text-white text-glow">
                              {Math.floor(userTotalValue).toLocaleString()} <span className="text-2xl text-primary font-bold">$BASED</span>
                           </span>
                           <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground font-mono bg-white/5 px-2 py-1 rounded">
                                 {displayNfts.length} Guardians (Chain: {ownedBalance})
                              </span>
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => {
                                    refetchOwned();
                                 }}
                                 className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
                                 disabled={isLoadingOwned}
                                 title="Refresh from blockchain"
                              >
                                 <RefreshCw size={12} className={isLoadingOwned ? 'animate-spin' : ''} />
                              </Button>
                              <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => {
                                    CacheService.clearAll();
                                    clearCSVCache();
                                    refetchOwned();
                                    toast({
                                       title: "Cache Cleared",
                                       description: "All cached data has been cleared. Fetching fresh data...",
                                    });
                                 }}
                                 className="h-6 px-2 text-xs text-orange-400 hover:bg-orange-400/10"
                                 title="Clear all caches and refresh"
                              >
                                 <AlertTriangle size={12} />
                              </Button>
                           </div>
                       </div>
                       
                       <div className="flex flex-col items-center md:items-start pl-2">
                           <span className="text-xs text-muted-foreground font-mono mb-1">BACKED PER NFT</span>
                           <span className="text-xl font-mono text-green-400 flex items-center gap-2 font-bold">
                              {Math.floor(baseValuePerNFT).toLocaleString()} $BASED
                           </span>
                           <span className="text-[10px] text-green-400/70 mt-1 flex items-center">
                              <TrendingUp size={10} className="mr-1" /> Includes Mint + Emissions
                           </span>
                       </div>
                   </Card>
                )}
              </div>

              {/* Retrieve Old Listing - Hidden for now, kept for future use */}
              {/* {filterByOwner && isConnected && <RetrieveOldListing />} */}
              
              {/* Multi-Collection Portfolio Selector */}
              {filterByOwner && isConnected && walletCollections.length > 1 && (
                <div className="mb-8">
                  <CollectionSelector
                    collections={walletCollections}
                    selectedCollection={selectedCollection}
                    onSelectCollection={setSelectedCollection}
                    loading={collectionsLoading}
                  />
                  {collectionsError && (
                    <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3 mt-4">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        Could not scan all collections: {collectionsError}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div className="w-full">
                  {isConnected && (
                     <div className="flex flex-col gap-4 w-full">
                       
                       <div className="flex flex-col sm:flex-row gap-2 w-full justify-center md:justify-between">
                          <div className="relative flex-1 w-full md:max-w-md">
                             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                             <Input 
                               placeholder="Search ID (e.g. 3000), Name, or 'Strength >= 8'..." 
                               className="pl-9 bg-white/5 border-white/10 text-white focus:border-primary/50 w-full"
                               value={search}
                               onChange={(e) => setSearch(e.target.value)}
                               type="text"
                             />
                          </div>
                          
                          <div className="flex gap-2 w-full md:w-auto items-center">
                                 {/* Grid Toggle */}
                                 <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10 h-10 mr-2">
                                    <span className="text-[10px] text-muted-foreground font-mono px-2 hidden xl:inline">VIEW:</span>
                                    {[1, 2, 4, 6].map((cols) => (
                                      <Button
                                        key={cols}
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setGridCols(cols)}
                                        className={`w-8 h-8 ${gridCols === cols ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'text-muted-foreground hover:text-white'}`}
                                        title={`${cols}-wide view`}
                                      >
                                        {cols === 1 && <Square size={14} />}
                                        {cols === 2 && <LayoutGrid size={14} />}
                                        {cols === 4 && <Grid3x3 size={14} />}
                                        {cols === 6 && <Grid size={14} />}
                                      </Button>
                                    ))}
                                 </div>

                               <Select value={sortBy} onValueChange={setSortBy}>
                                   <SelectTrigger className="w-full md:w-[180px] bg-white/5 border-white/10 text-white">
                                     <ArrowUpDown size={16} className="mr-2 text-muted-foreground" />
                                     <SelectValue placeholder="Sort By" />
                                   </SelectTrigger>
                                   <SelectContent>
                                     <SelectItem value="listed-price-asc">For Sale (Lowest First)</SelectItem>
                                    <SelectItem value="price-asc">Floor Price: Low to High</SelectItem>
                                     <SelectItem value="price-desc">Price: High to Low</SelectItem>
                                     <SelectItem value="id-asc">ID: Low to High</SelectItem>
                                     <SelectItem value="id-desc">ID: High to Low</SelectItem>
                                     <SelectItem value="rarity-desc">Rarity: High to Low</SelectItem>
                                     <SelectItem value="rarity-asc">Rarity: Low to High</SelectItem>
                                   </SelectContent>
                                 </Select>
                                 
                                 <Button 
                                   variant="outline" 
                                   onClick={() => setShowFilters(!showFilters)}
                                   className={`border-white/20 min-w-[44px] min-h-[44px] ${showFilters ? 'bg-primary/20 text-primary border-primary' : ''}`}
                                 >
                                   <Filter size={18} />
                                 </Button>
                          </div>
                       </div>

                     </div>
                  )}
                </div>
              </div>

              {/* Filters Panel */}
              {showFilters && isConnected && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="overflow-hidden mb-8"
                  >
                    <Card className="p-4 bg-white/5 border-white/10 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label className="text-xs font-mono text-muted-foreground">RARITY</Label>
                        <Select value={rarityFilter} onValueChange={setRarityFilter}>
                              <SelectTrigger className="bg-black/50 border-white/10 text-white">
                                  <SelectValue placeholder="All Rarities" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All Rarities</SelectItem>
                                  {Object.keys(RARITY_CONFIG).map((rarity) => (
                                      <SelectItem key={rarity} value={rarity}>{rarity}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                      </div>

                      <div className="space-y-2">
                          <Label className="text-xs font-mono text-muted-foreground">ATTRIBUTE TYPE</Label>
                          <Select value={traitTypeFilter} onValueChange={(v) => { setTraitTypeFilter(v); setTraitValueFilter("all"); }}>
                              <SelectTrigger className="bg-black/50 border-white/10 text-white">
                                  <SelectValue placeholder="Select Type" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All Attributes</SelectItem>
                                  {Object.keys(availableTraits).length > 0 ? 
                                      Object.keys(availableTraits).sort().map(type => (
                                          <SelectItem key={type} value={type}>{type}</SelectItem>
                                      )) : (
                                          <>
                                              <SelectItem value="Character Type">Character Type</SelectItem>
                                              <SelectItem value="Strength">Strength</SelectItem>
                                              <SelectItem value="Speed">Speed</SelectItem>
                                          </>
                                      )
                                  }
                              </SelectContent>
                          </Select>
                      </div>

                      <div className="space-y-2">
                          <Label className="text-xs font-mono text-muted-foreground">ATTRIBUTE VALUE</Label>
                          <Select 
                              value={traitValueFilter} 
                              onValueChange={setTraitValueFilter}
                              disabled={traitTypeFilter === "all"}
                          >
                              <SelectTrigger className="bg-black/50 border-white/10 text-white">
                                  <SelectValue placeholder="Select Value" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All Values</SelectItem>
                                  {traitTypeFilter !== "all" && (() => {
                                      const values = Array.from(availableTraits[traitTypeFilter] || []);
                                      return values.sort().map(val => (
                                          <SelectItem key={val} value={val}>{val}</SelectItem>
                                      ));
                                  })()}
                              </SelectContent>
                          </Select>
                      </div>
                      
                      {/* Character Type Shortcuts */}
                      <div className="col-span-1 md:col-span-3 pt-4 border-t border-white/5 flex gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground mr-2 py-1">QUICK FILTERS:</span>
                          {['Based Frog', 'Based Guardian', 'Based Creatures'].map(type => (
                              <Badge 
                                  key={type}
                                  variant="outline" 
                                  className="cursor-pointer hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-colors"
                                  onClick={() => {
                                      setTraitTypeFilter("Character Type");
                                      setTraitValueFilter(type);
                                  }}
                              >
                                  {type}
                              </Badge>
                          ))}
                      </div>
                    </Card>
                  </motion.div>
              )}

              {!isConnected && filterByOwner ? (
                // Locked state ONLY if we are in "My Portfolio" mode
                (<div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                    <Lock className="w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-orbitron text-white mb-2">WALLET LOCKED</h3>
                    <p className="text-muted-foreground mb-6">Connect your wallet to view your Guardian collection.</p>
                    <Button 
                      onClick={openConnectModal}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-orbitron tracking-wider"
                    >
                      CONNECT TO VIEW
                    </Button>
                </div>)
              ) : filterByOwner && isConnected && !nftsHasLoaded && !isLoadingOwned ? (
                // Manual Load Button - NFTs not yet fetched (prevents browser crash)
                (<div className="flex flex-col items-center justify-center py-20 border border-dashed border-primary/30 rounded-xl bg-primary/5">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                      <RefreshCw className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-orbitron text-white mb-2">LOAD YOUR NFTs</h3>
                    <p className="text-muted-foreground mb-4 text-center max-w-md">
                      Click below to fetch your Based Guardians from the blockchain.
                    </p>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-6 max-w-md">
                      <p className="text-xs text-yellow-400 text-center">
                        For performance, we'll load up to 20 NFTs. If you own more, we'll show the first 20.
                      </p>
                    </div>
                    <Button 
                      onClick={refetchOwned}
                      size="lg"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-orbitron tracking-wider gap-2"
                      data-testid="button-load-nfts"
                    >
                      <RefreshCw className="w-5 h-5" />
                      LOAD MY NFTs
                    </Button>
                    <p className="text-xs text-muted-foreground mt-4">
                      This may take 10-30 seconds depending on how many NFTs you own.
                    </p>
                </div>)
              ) : (
                <>
                  {(filterByOwner ? isLoadingOwned : isLoading) && !displayNfts.length ? (
                    // Loading State with progress indicator
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-primary/30 rounded-xl bg-primary/5">
                      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                      <h3 className="text-lg font-orbitron text-white mb-2">LOADING YOUR NFTs...</h3>
                      <p className="text-sm text-muted-foreground">
                        {displayNfts.length > 0 ? `Found ${displayNfts.length} so far...` : 'Fetching from blockchain...'}
                      </p>
                    </div>
                  ) : displayNfts.length === 0 ? (
                     (<div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                         {filterByOwner && !isBasedGuardiansSelected && selectedCollectionInfo ? (
                           <>
                             <div className="w-20 h-20 rounded-xl overflow-hidden mb-4 bg-muted">
                               {selectedCollectionInfo.representativeImage ? (
                                 <img src={selectedCollectionInfo.representativeImage} alt={selectedCollectionInfo.name} className="w-full h-full object-cover" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center text-4xl">🖼️</div>
                               )}
                             </div>
                             <h3 className="text-lg font-bold text-white mb-2">{selectedCollectionInfo.name}</h3>
                             <p className="text-muted-foreground mb-4">You own {selectedCollectionInfo.balance} NFT{selectedCollectionInfo.balance !== 1 ? 's' : ''} from this collection.</p>
                             <p className="text-xs text-muted-foreground/50 mb-6">This gallery is optimized for Based Guardians. View other collections on the block explorer.</p>
                             <a 
                               href={`${BLOCK_EXPLORER}/token/${selectedCollectionInfo.contractAddress}`}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg text-primary transition-colors"
                             >
                               <ExternalLink size={16} />
                               View on Block Explorer
                             </a>
                             <Button 
                               onClick={() => setSelectedCollection(null)} 
                               variant="ghost" 
                               className="mt-4 text-muted-foreground"
                             >
                               Back to Based Guardians
                             </Button>
                           </>
                         ) : filterByOwner && nftsHasLoaded ? (
                           <>
                             <p className="text-muted-foreground mb-4">You don't own any Guardians yet.</p>
                             <p className="text-xs text-muted-foreground/50 mb-6">Mint or buy NFTs to see them here.</p>
                           </>
                         ) : !filterByOwner ? (
                           <>
                             <p className="text-muted-foreground mb-4">No Guardians found matching criteria.</p>
                             <p className="text-xs text-muted-foreground/50 mb-6">Try broadening your search or clearing filters.</p>
                           </>
                         ) : null}
                         {(isBasedGuardiansSelected || !filterByOwner) && (
                           <Button onClick={() => { setSearch(""); setRarityFilter("all"); setTraitTypeFilter("all"); setTraitValueFilter("all"); }} variant="outline">
                              Clear Filters
                           </Button>
                         )}
                     </div>)
                  ) : (
                    <>
                      {/* Warning when more than 20 NFTs owned but only showing first 20 */}
                      {filterByOwner && totalOwned !== null && totalOwned > 20 && displayNfts.length > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                          <p className="text-sm text-yellow-300">
                            You own <span className="font-bold">{totalOwned}</span> NFTs, but we're only showing the first 20 for performance. 
                            View your full collection on the <a href={`${BLOCK_EXPLORER}/address/${address}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-200">block explorer</a>.
                          </p>
                        </div>
                      )}
                      
                      {/* Unified Grid (Replaces separate Desktop Grid and Mobile Carousel) */}
                      <motion.div 
                        variants={container}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true }}
                        className={`grid gap-6 transition-all duration-300 ${
                          gridCols === 1 ? 'grid-cols-1' : 
                          gridCols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 
                          gridCols === 4 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 
                          'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
                        }`}
                      >
                        {displayNfts.map((guardian, idx) => (
                          <motion.div key={`${guardian.id}-${idx}`} variants={item}>
                            <GuardianCard guardian={guardian} onClick={() => setSelectedNFT(guardian)} tokenOffers={allOffers.get(guardian.id)} />
                          </motion.div>
                        ))}
                      </motion.div>

                      {/* Infinite Scroll Trigger & Loader */}
                      <div ref={observerTarget} className="flex flex-col items-center justify-center py-12 w-full">
                        {isFetchingNextPage && (
                           <div className="flex flex-col items-center gap-2">
                              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                              <span className="text-xs font-mono text-cyan-400 animate-pulse">LOADING NEURAL LINK...</span>
                           </div>
                        )}
                        {!hasNextPage && !isFetchingNextPage && displayNfts.length > 0 && (
                           <div className="text-xs font-mono text-muted-foreground border border-white/10 px-4 py-2 rounded-full mt-4">
                              END OF COLLECTION
                           </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            {filterByOwner && isConnected && displayNfts.length > 0 && (
              <div className="mt-12">
                <MyOffersPanel />
              </div>
            )}

            <NFTDetailModal 
              isOpen={!!selectedNFT} 
              onClose={() => setSelectedNFT(null)} 
              nft={selectedNFT} 
            />
        </section>
    );
}

import { NFTImage } from "./NFTImage";
import { BuyButton } from "./BuyButton";

interface OfferData {
  tokenId: number;
  offerer: string;
  amount: string;
  expiresAt: number;
  active: boolean;
}

function GuardianCard({ guardian, onClick, tokenOffers }: { guardian: Guardian, onClick: () => void, tokenOffers?: OfferData[] }) {
  // Fetch real listing data from blockchain
  const { listing, isLoading: listingLoading } = useListing(guardian.id);
  
  // Get highest offer from passed offers
  const highestOffer = tokenOffers?.length 
    ? tokenOffers.reduce((max, offer) => Number(offer.amount) > Number(max.amount) ? offer : max, tokenOffers[0])
    : null;

  if (guardian.isError) {
      return (
        <Card className="bg-red-950/20 border-red-500/20 h-full flex flex-col items-center justify-center p-6 text-center">
             <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
             <h4 className="text-white font-bold mb-2">Metadata Error</h4>
             <p className="text-xs text-muted-foreground mb-4">Could not fetch data for #{guardian.id}</p>
             <Button variant="outline" size="sm" onClick={() => {}} className="border-red-500/50 text-red-500 hover:bg-red-500/10">
                 <RefreshCw size={14} className="mr-2" /> Retry
             </Button>
        </Card>
      );
  }

  const rarityTrait = guardian.traits?.find((t: any) => t.type === 'Rarity Level' || t.type === 'Rarity')?.value || guardian.rarity || 'Common';
  
  // Normalize rarity string (new 7-tier system)
  let normalizedRarity = rarityTrait;
  if (normalizedRarity === 'Rarest (1/1s)' || normalizedRarity === 'Rarest' || normalizedRarity === 'Legendary' || normalizedRarity === 'Rarest-Legendary') normalizedRarity = 'Epic Legendary';
  if (normalizedRarity === 'Very Rare') normalizedRarity = 'Very Rare Legendary';
  if (normalizedRarity === 'More Rare') normalizedRarity = 'Rare';

  // Find config, handle casing or partial matches if needed, but exact match is preferred
  const rarityConfig = RARITY_CONFIG[normalizedRarity] || RARITY_CONFIG['Common'];

  // Calculate Value with Rarity Boost
  const backedValue = calculateBackedValue(normalizedRarity);
  
  // Check if listed on-chain (real data takes priority)
  const isListedOnChain = listing && listing.active;
  const listingPrice = listing?.price ? Number(listing.price) : null;

  const hasOffers = tokenOffers && tokenOffers.length > 0;

  return (
    <Card 
        className={`nft-card card-lift bg-card overflow-hidden transition-colors duration-300 group h-full flex flex-col cursor-pointer ${
          hasOffers 
            ? 'border-2 border-green-500/50 ring-2 ring-green-500/20 bg-gradient-to-b from-green-500/5 to-transparent' 
            : 'border-white/10 hover:border-primary/50'
        }`}
        onClick={onClick}
        data-token-id={guardian.id}
    >
      <div className="relative aspect-square overflow-hidden bg-secondary/20">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <NFTImage 
            src={Security.sanitizeUrl(guardian.image)} 
            alt={Security.sanitizeText(guardian.name)} 
            id={guardian.id}
            className="nft-image w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Listed Badge - Top Left */}
        {isListedOnChain && (
          <div className="absolute top-2 left-2 z-20">
            <Badge className="bg-yellow-500/90 text-black border-yellow-400 font-bold text-[10px]">
              FOR SALE
            </Badge>
          </div>
        )}
        
        {/* Offers Badge - Below Listed Badge or Top Left */}
        {hasOffers && (
          <div className={`absolute ${isListedOnChain ? 'top-10' : 'top-2'} left-2 z-20`}>
            <Badge className="bg-green-500/90 text-black border-green-400 font-bold text-[10px] animate-pulse">
              {tokenOffers!.length} OFFER{tokenOffers!.length > 1 ? 'S' : ''}
            </Badge>
          </div>
        )}
        
        {/* Rarity Badge */}
        <div className="absolute top-2 right-2 z-20">
            <Badge className={`backdrop-blur-md border shadow-[0_0_15px_rgba(0,0,0,0.5)] ${rarityConfig.color}`}>
                {rarityTrait}
            </Badge>
        </div>

        {/* Quick Stats Overlay (Hover) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <div className="flex justify-between items-center text-xs font-mono text-white mb-1">
                <span>Backed Value:</span>
                <span className="text-cyan-400 font-bold">{backedValue.toLocaleString()} $BASED</span>
            </div>
            {rarityConfig.multiplier > 0 && (
                <div className="flex justify-end text-[10px] text-green-400 font-mono">
                    +{rarityConfig.multiplier * 100}% Boost Active
                </div>
            )}
        </div>
      </div>

      <div className="nft-info p-4 flex flex-col flex-grow bg-black/40 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-2">
            <div>
                <h3 className="nft-name font-bold text-white font-orbitron tracking-wide text-sm">{Security.escapeHtml(guardian.name)}</h3>
                <a 
                    href={`${BLOCK_EXPLORER}/token/${NFT_CONTRACT}/instance/${guardian.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] text-muted-foreground font-mono mt-0.5 hover:text-cyan-400 transition-colors flex items-center gap-1 w-fit"
                >
                    ID: {guardian.id} <ExternalLink size={8} />
                </a>
            </div>
        </div>
        
        <div className="flex flex-col gap-2 mt-auto pt-3 border-t border-white/5">
             <div className="grid grid-cols-2 gap-2">
                 {/* Left column: Listing Price or Unlisted */}
                 <div className="flex flex-col">
                     {isListedOnChain && listingPrice ? (
                       <>
                         <span className="text-[9px] text-yellow-400 uppercase font-bold">Listed Price</span>
                         <span className="text-xs font-mono text-yellow-400 font-bold">{listingPrice.toLocaleString()}</span>
                       </>
                     ) : (
                       <>
                         <span className="text-[9px] text-muted-foreground uppercase italic">Unlisted</span>
                         <span className="text-xs font-mono text-cyan-400 font-bold">{backedValue.toLocaleString()}</span>
                       </>
                     )}
                     {/* Highest Offer - Always shown below price when offers exist */}
                     {highestOffer && (
                       <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                         Best Offer: {Number(highestOffer.amount).toLocaleString()}
                       </span>
                     )}
                 </div>
                 
                 {/* Right column: Rarity */}
                 <div className="flex flex-col items-end">
                     <span className="text-[9px] text-muted-foreground uppercase">Rarity</span>
                     <span className={`text-xs font-mono font-bold ${rarityConfig.color.split(' ')[0]}`}>{rarityTrait}</span>
                 </div>
             </div>
             
             {/* Buy Button for Listed Items (for Collection view - other people's NFTs) */}
             {isListedOnChain && listingPrice && (
                <div className="nft-actions">
                    <BuyButton 
                        tokenId={guardian.id}
                        price={listingPrice.toString()}
                        size="small"
                        className="w-full h-8 text-xs"
                        compact
                        onBuy={(id, price) => {
                            toast({ 
                                title: "Purchase Initiated", 
                                description: `Buying Guardian #${id} for ${price} $BASED`,
                                className: "bg-black border-cyan-500 text-cyan-500 font-orbitron"
                            });
                        }}
                    />
                </div>
             )}
        </div>
      </div>
    </Card>
  );
}