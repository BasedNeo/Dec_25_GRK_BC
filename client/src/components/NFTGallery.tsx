import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, TrendingUp, Download } from "lucide-react";
import { Guardian, MOCK_GUARDIANS, calculateBackedValue } from "@/lib/mockData";
import { useAccount } from "wagmi";
import { useState, useMemo, useEffect, useRef } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useGuardians } from "@/hooks/useGuardians";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

import { NFTDetailModal } from "./NFTDetailModal";
import { FilterBar } from "./FilterBar";

interface NFTGalleryProps {}

export function NFTGallery({}: NFTGalleryProps) {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [useMockData, setUseMockData] = useState(false);
  const [useCsvData, setUseCsvData] = useState(true); // Default to CSV Data for speed & completeness
  const [selectedNFT, setSelectedNFT] = useState<Guardian | null>(null);
  
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
      deferredPrompt.userChoice.then((choiceResult: any) => {
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
  
  // New specific filters mapping to trait types
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [sortBy, setSortBy] = useState<string>("recent");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Pass filters to hook. We map the specific filters to the generic traitType/traitValue expected by the hook.
  // Prioritize Type, then Role for server-side filtering if hook only supports one.
  const traitType = typeFilter !== 'all' ? 'Biological Type' : (roleFilter !== 'all' ? 'Role' : 'all');
  const traitValue = typeFilter !== 'all' ? typeFilter : (roleFilter !== 'all' ? roleFilter : 'all');

  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useGuardians(useMockData, useCsvData, {
      search: debouncedSearch,
      rarity: rarityFilter,
      traitType,
      traitValue,
      sortBy
  });

  // Infinite Scroll Observer
  const observerTarget = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
           fetchNextPage();
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
  let displayNfts = (nfts && nfts.length > 0) ? nfts : (useMockData ? MOCK_GUARDIANS : []);

  // Client-side filtering for secondary traits if multiple are selected
  if (typeFilter !== 'all' && roleFilter !== 'all') {
    displayNfts = displayNfts.filter(nft => {
      // We already filtered by Type in the hook (prioritized above), so filter by Role here
      // Or if the hook returned matches for Type, we ensure Role also matches
      const hasType = nft.traits?.some((t: any) => t.type === 'Biological Type' && t.value === typeFilter);
      const hasRole = nft.traits?.some((t: any) => t.type === 'Role' && t.value === roleFilter);
      return hasType && hasRole;
    });
  }

  // Extract Traits for FilterBar
  const availableTraits = useMemo(() => {
      const traits: Record<string, Set<string>> = {};
      if (displayNfts.length > 0) {
        displayNfts.forEach(item => {
            item.traits?.forEach((t: any) => {
                if (!traits[t.type]) traits[t.type] = new Set();
                traits[t.type].add(t.value);
            });
        });
      }
      return traits;
  }, [displayNfts]);

  // Value Estimation Logic
  const baseValuePerNFT = calculateBackedValue(); 
  const userTotalValue = displayNfts.reduce((total, guardian) => {
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

  const handleClearAll = () => {
    setSearch("");
    setRarityFilter("all");
    setTypeFilter("all");
    setRoleFilter("all");
    setSortBy("recent");
  };

  // Sync URL Params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('rarity')) setRarityFilter(params.get('rarity')!);
    if (params.get('type')) setTypeFilter(params.get('type')!);
    if (params.get('role')) setRoleFilter(params.get('role')!);
    if (params.get('sort')) setSortBy(params.get('sort')!);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (rarityFilter !== 'all') params.set('rarity', rarityFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (roleFilter !== 'all') params.set('role', roleFilter);
    if (sortBy !== 'recent') params.set('sort', sortBy);
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [rarityFilter, typeFilter, roleFilter, sortBy]);

  return (
    <section id="gallery" className="py-20 border-t border-white/5 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header & Value Summary */}
        <div className="flex flex-col items-center mb-12 space-y-6">
          <div className="text-center relative">
            <h2 className="text-4xl md:text-5xl text-white mb-2 font-black tracking-tighter uppercase relative z-10 text-center mx-auto">
                YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">BATTALION</span>
            </h2>
             {/* Center Glow Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 blur-[50px] -z-10 rounded-full pointer-events-none"></div>

            <p className="text-muted-foreground font-rajdhani text-lg">Manage your Guardians and view their traits.</p>
            
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

          {isConnected && nfts.length > 0 && (
             <Card className="bg-black/40 border-primary/30 backdrop-blur-md px-8 py-6 flex flex-col md:flex-row items-center gap-8 shadow-[0_0_30px_rgba(0,255,255,0.1)]">
                 <div className="flex flex-col items-center md:items-start border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-8">
                     <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 bg-primary/10 rounded-full text-primary"><TrendingUp size={16} /></div>
                        <span className="text-xs text-muted-foreground font-mono tracking-widest">TOTAL HOLDINGS VALUE</span>
                     </div>
                     <span className="text-4xl md:text-5xl font-black font-orbitron text-white text-glow">
                        {Math.floor(userTotalValue).toLocaleString()} <span className="text-2xl text-primary font-bold">$BASED</span>
                     </span>
                     <span className="text-xs text-muted-foreground mt-2 font-mono bg-white/5 px-2 py-1 rounded">
                        {displayNfts.length} Guardians
                     </span>
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

        {isConnected && (
            <FilterBar 
                search={search}
                onSearchChange={setSearch}
                rarity={rarityFilter}
                onRarityChange={setRarityFilter}
                type={typeFilter}
                onTypeChange={setTypeFilter}
                role={roleFilter}
                onRoleChange={setRoleFilter}
                sortBy={sortBy}
                onSortChange={setSortBy}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                totalItems={nfts.length || 0}
                showingItems={displayNfts.length || 0}
                availableTraits={availableTraits}
                onClearAll={handleClearAll}
            />
        )}

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
            <Lock className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-orbitron text-white mb-2">WALLET LOCKED</h3>
            <p className="text-muted-foreground mb-6">Connect your wallet to view your Guardian collection.</p>
            <Button 
              onClick={openConnectModal}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-orbitron tracking-wider"
            >
              CONNECT TO VIEW
            </Button>
          </div>
        ) : (
          <>
            {isLoading && !displayNfts.length && !useMockData ? (
               <div className={`grid gap-6 transition-all duration-300 ${
                    viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
                  }`}>
                  {Array.from({ length: 12 }).map((_, i) => (
                      <GuardianCardSkeleton key={i} viewMode={viewMode} />
                  ))}
               </div>
            ) : displayNfts.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                 <p className="text-muted-foreground mb-4">No Guardians found matching criteria.</p>
                 <p className="text-xs text-muted-foreground/50 mb-6">Try broadening your search or clearing filters.</p>
                 <Button onClick={handleClearAll} variant="outline">
                    Clear Filters
                 </Button>
               </div>
            ) : (
              <>
                <motion.div 
                  variants={container}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  className={`grid gap-6 transition-all duration-300 ${
                    viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
                  }`}
                >
                  {displayNfts.map((guardian, idx) => (
                    <motion.div key={`${guardian.id}-${idx}`} variants={item}>
                      <GuardianCard 
                        guardian={guardian} 
                        onClick={() => setSelectedNFT(guardian)} 
                        viewMode={viewMode}
                      />
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

      <NFTDetailModal 
        isOpen={!!selectedNFT} 
        onClose={() => setSelectedNFT(null)} 
        nft={selectedNFT} 
      />
    </section>
  );
}

function GuardianCardSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'list') {
      return (
        <Card className="bg-card border-white/5 p-4 flex gap-4 items-center">
            <div className="h-12 w-12 bg-white/5 rounded animate-pulse" />
            <div className="space-y-2 flex-1">
                <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
            </div>
        </Card>
      )
  }
  return (
    <Card className="bg-card border-white/5 overflow-hidden h-full flex flex-col">
      <div className="relative aspect-square bg-white/5 animate-pulse" />
      <div className="p-4 space-y-3 flex-grow bg-white/[0.02]">
        <div className="flex justify-between items-center">
            <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
            <div className="h-5 w-20 bg-white/10 rounded-full animate-pulse" />
        </div>
        <div className="h-6 w-3/4 bg-white/10 rounded animate-pulse" />
        <div className="pt-2 mt-auto border-t border-white/5 flex justify-between">
             <div className="h-3 w-1/3 bg-white/5 rounded animate-pulse" />
             <div className="h-3 w-1/4 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

function GuardianCard({ guardian, onClick, viewMode }: { guardian: Guardian, onClick: () => void, viewMode: 'grid' | 'list' }) {
  const [imgSrc, setImgSrc] = useState(guardian.image);
  const cardRef = useRef<HTMLDivElement>(null);

  const rarityTrait = guardian.traits?.find((t: any) => t.type === 'Rarity Level' || t.type === 'Rarity')?.value || guardian.rarity || 'Common';
  
  // Rarity Class Helper
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
  const rarityClass = getRarityClass(rarityTrait);
  
  // Legacy glowColor for List view (kept for compatibility)
  const glowColor = useMemo(() => {
     if (rarityTrait.includes('Legendary')) return '#fbbf24'; 
     if (rarityTrait.includes('Very Rare')) return '#c084fc';
     if (rarityTrait.includes('More Rare')) return '#f59e0b';
     return 'rgba(34, 211, 238, 0.5)';
  }, [rarityTrait]);

  if (viewMode === 'list') {
      return (
        <Card 
            className="group bg-black/40 border-white/10 hover:border-primary/50 transition-all cursor-pointer flex items-center p-3 gap-4"
            onClick={onClick}
        >
            <div className="h-12 w-12 rounded-md overflow-hidden shrink-0">
                <img src={imgSrc} alt={guardian.name} className="h-full w-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-orbitron text-sm text-white truncate">{guardian.name}</h4>
                <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>#{guardian.id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${rarityClass.replace('rarity-', 'text-')}`}>{rarityTrait}</span>
                </div>
            </div>
            <div className="hidden sm:flex gap-2">
                {guardian.traits?.slice(0, 3).map((t, i) => (
                    <Badge key={i} variant="outline" className="text-[10px] border-white/10 text-muted-foreground">
                        {t.value}
                    </Badge>
                ))}
            </div>
        </Card>
      );
  }

  return (
    <Card 
      ref={cardRef}
      className="group relative bg-black/40 border-white/10 hover:border-primary/50 transition-all duration-300 cursor-pointer flex flex-col"
      onClick={onClick}
      style={{
        boxShadow: `0 0 0 1px rgba(255,255,255,0.05)`
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-t-xl" />
      
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-black/50 rounded-t-xl">
        <img 
          src={imgSrc} 
          alt={guardian.name} 
          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          onError={() => setImgSrc("https://placehold.co/400x400/1e1e1e/FFF?text=Image+Unavailable")}
        />
        
        {/* Rarity Badge - Top Right Overlay */}
        <span className={`rarity-badge ${rarityClass}`}>
            {rarityTrait}
        </span>
      </div>

      <div className="p-4 pb-5 flex flex-col flex-grow relative z-20">
        <div className="flex justify-between items-start mb-2">
           <h3 className="font-orbitron font-bold text-white text-sm truncate pr-2 group-hover:text-primary transition-colors">
             {guardian.name}
           </h3>
           <span className="font-mono text-xs text-muted-foreground">#{guardian.id}</span>
        </div>

        {/* Traits Preview */}
        <div className="flex flex-wrap gap-1 mt-auto">
            {guardian.traits?.slice(0, 2).map((trait, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground border border-white/5 truncate max-w-[100%]">
                    {trait.value}
                </span>
            ))}
            {(guardian.traits?.length || 0) > 2 && (
                <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground">+{ (guardian.traits?.length || 0) - 2 }</span>
            )}
        </div>
      </div>
    </Card>
  );
}
