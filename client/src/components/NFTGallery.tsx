import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, RefreshCw, AlertTriangle, Filter, TrendingUp, Search, ArrowUpDown } from "lucide-react";
import { Guardian, MOCK_GUARDIANS, MOCK_POOL_BALANCE, TOTAL_SUPPLY } from "@/lib/mockData";
import { useAccount } from "wagmi";
import { useState, useMemo } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useGuardians } from "@/hooks/useGuardians";
import { IPFS_ROOT } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";

import { NFTDetailModal } from "./NFTDetailModal";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface NFTGalleryProps {
  isConnected: boolean; // Kept for legacy
  onConnect: () => void; // Kept for legacy
}

export function NFTGallery({ isConnected: _isConnected, onConnect: _onConnect }: NFTGalleryProps) {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [useMockData, setUseMockData] = useState(false);
  const [useCsvData, setUseCsvData] = useState(true); // Default to CSV for indexing
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<Guardian | null>(null);
  
  // Filters & Search
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [traitTypeFilter, setTraitTypeFilter] = useState<string>("all");
  const [traitValueFilter, setTraitValueFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("id-asc");

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
      sortBy
  });

  // Flatten pages
  const nfts = data?.pages.flatMap((page: any) => page.nfts) || [];
  const displayNfts = (nfts && nfts.length > 0) ? nfts : (useMockData ? MOCK_GUARDIANS : []);

  // Extract Traits (This might need to come from full CSV loader directly if we want ALL traits in dropdown, 
  // but for now extracting from displayed/loaded is standard unless we expose a separate "metadata" hook)
  // For better UX, we could hardcode known traits or fetch just metadata once.
  // Using displayed items for trait extraction works ok for now as long as we load enough, 
  // but ideally we'd want all options available. 
  // Since we don't have a separate "get all traits" hook yet, let's stick to this or hardcode common ones.
  const availableTraits = useMemo(() => {
      const traits: Record<string, Set<string>> = {};
      // Iterate over a larger set if possible? 
      // Since useGuardians filters on the backend (hook), `displayNfts` are just the results.
      // So the dropdowns might shrink if we filter. 
      // Ideally we want *all* possible traits in the dropdown.
      // For this mockup, let's pre-populate some key ones or rely on what's visible + defaults.
      
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
  const baseValuePerNFT = MOCK_POOL_BALANCE / TOTAL_SUPPLY;
  const userTotalValue = displayNfts.reduce((total, guardian) => {
    const r = guardian.rarity?.toLowerCase() || '';
    const isRare = r === 'rare' || r === 'legendary' || r === 'epic';
    const multiplier = isRare ? 1.3 : 1.0;
    return total + (baseValuePerNFT * multiplier);
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

  return (
    <section id="gallery" className="py-20 border-t border-white/5 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header & Value Summary */}
        <div className="flex flex-col items-center mb-12 space-y-6">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl text-white mb-2 font-black tracking-tighter">YOUR <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">BATTALION</span></h2>
            <p className="text-muted-foreground font-rajdhani text-lg">Manage your Guardians and view their traits.</p>
          </div>

          {isConnected && nfts.length > 0 && (
             <Card className="bg-black/40 border-primary/30 backdrop-blur-md px-8 py-4 flex items-center gap-6 shadow-[0_0_30px_rgba(0,255,255,0.1)]">
                 <div className="flex flex-col items-center border-r border-white/10 pr-6">
                     <span className="text-xs text-muted-foreground font-mono">TOTAL VALUE</span>
                     <span className="text-2xl font-orbitron text-white">≈ {Math.floor(userTotalValue).toLocaleString()} <span className="text-primary text-sm">$BASED</span></span>
                 </div>
                 <div className="flex flex-col items-center pl-2">
                     <span className="text-xs text-muted-foreground font-mono">BACKING</span>
                     <span className="text-sm font-mono text-green-400 flex items-center gap-1">
                        <TrendingUp size={12} /> +{Math.floor(baseValuePerNFT).toLocaleString()} / NFT
                     </span>
                 </div>
             </Card>
          )}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div className="w-full">
            {isConnected && (
               <div className="flex flex-col gap-4 w-full">
                 
                 <div className="flex flex-col sm:flex-row gap-2 w-full justify-center md:justify-between">
                    <div className="relative flex-1 w-full md:max-w-md">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                       <Input 
                         placeholder="Search ID, Name, or 'Strength >= 8'..." 
                         className="pl-9 bg-white/5 border-white/10 text-white focus:border-primary/50 w-full"
                         value={search}
                         onChange={(e) => setSearch(e.target.value)}
                         type="text"
                       />
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto">
                         <Select value={sortBy} onValueChange={setSortBy}>
                             <SelectTrigger className="w-full md:w-[180px] bg-white/5 border-white/10 text-white">
                               <ArrowUpDown size={16} className="mr-2 text-muted-foreground" />
                               <SelectValue placeholder="Sort By" />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="id-asc">ID: Low to High</SelectItem>
                               <SelectItem value="id-desc">ID: High to Low</SelectItem>
                               <SelectItem value="rarity-desc">Rarity: High to Low</SelectItem>
                               <SelectItem value="rarity-asc">Rarity: Low to High</SelectItem>
                             </SelectContent>
                           </Select>
                           
                           <Button 
                             variant="outline" 
                             onClick={() => setShowFilters(!showFilters)}
                             className={`border-white/20 ${showFilters ? 'bg-primary/20 text-primary border-primary' : ''}`}
                           >
                             <Filter size={14} />
                           </Button>
                    </div>
                 </div>

                 <div className="flex items-center justify-center md:justify-end gap-2 w-full">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setUseCsvData(!useCsvData)}
                        className={`text-[10px] h-6 ${useCsvData ? 'text-green-400 bg-green-400/10' : 'text-muted-foreground hover:text-white'}`}
                    >
                        {useCsvData ? "Full Index (CSV) Active" : "Use IPFS Only"}
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setUseMockData(!useMockData); setUseCsvData(false); }}
                        className="text-[10px] h-6 text-muted-foreground hover:text-white"
                    >
                        {useMockData ? "Switch to Real" : "View Demo Data"}
                    </Button>
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
                            <SelectItem value="common">Common</SelectItem>
                            <SelectItem value="rare">Rare</SelectItem>
                            <SelectItem value="epic">Epic</SelectItem>
                            <SelectItem value="legendary">Legendary</SelectItem>
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
                            {/* Pre-populate common types if empty to ensure UX */}
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
                            {traitTypeFilter !== "all" && Array.from(availableTraits[traitTypeFilter] || []).sort().map(val => (
                                <SelectItem key={val} value={val}>{val}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                {/* Character Type Shortcuts */}
                <div className="col-span-1 md:col-span-3 pt-4 border-t border-white/5 flex gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground mr-2 py-1">QUICK FILTERS:</span>
                    {['Based Frog', 'Based Guardian', 'Based Creature'].map(type => (
                        <Badge 
                            key={type}
                            variant="outline" 
                            className="cursor-pointer hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-colors"
                            onClick={() => {
                                setTraitTypeFilter("Character Type");
                                // Small delay to allow state update if needed, but React matches usually work
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
              <div className="flex justify-center py-20">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
            ) : displayNfts.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                 <p className="text-muted-foreground mb-4">No Guardians found matching criteria.</p>
                 <p className="text-xs text-muted-foreground/50 mb-6">Try broadening your search or clearing filters.</p>
                 <Button onClick={() => { setSearch(""); setRarityFilter("all"); setTraitTypeFilter("all"); setTraitValueFilter("all"); }} variant="outline">
                    Clear Filters
                 </Button>
               </div>
            ) : (
              <>

                {/* Desktop Grid */}
                <motion.div 
                  variants={container}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                  {displayNfts.map((guardian, idx) => (
                    <motion.div key={`${guardian.id}-${idx}`} variants={item}>
                      <GuardianCard guardian={guardian} onClick={() => setSelectedNFT(guardian)} />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Mobile Swipe Gallery */}
                <div className="md:hidden">
                    <Carousel className="w-full max-w-xs mx-auto">
                        <CarouselContent>
                            {displayNfts.map((guardian, idx) => (
                                <CarouselItem key={`${guardian.id}-${idx}`}>
                                    <div className="p-1">
                                        <GuardianCard guardian={guardian} onClick={() => setSelectedNFT(guardian)} />
                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>
                        <CarouselPrevious className="border-primary/50 text-primary" />
                        <CarouselNext className="border-primary/50 text-primary" />
                    </Carousel>
                    <div className="text-center text-xs text-muted-foreground mt-4 font-mono animate-pulse">
                        &lt; SWIPE TO VIEW &gt;
                    </div>
                </div>

                {/* Load More Button */}
                {hasNextPage && !useMockData && (
                  <div className="flex justify-center mt-12">
                    <Button 
                      onClick={() => fetchNextPage()} 
                      disabled={isFetchingNextPage}
                      className="bg-secondary/50 hover:bg-secondary text-white font-orbitron tracking-widest min-w-[200px]"
                    >
                      {isFetchingNextPage ? (
                        <>LOADING <Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
                      ) : (
                        "LOAD MORE"
                      )}
                    </Button>
                  </div>
                )}
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

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// ... [Previous imports remain]

function GuardianCard({ guardian, onClick }: { guardian: Guardian, onClick: () => void }) {
  const [retryCount, setRetryCount] = useState(0);
  const [imgSrc, setImgSrc] = useState(guardian.image);

  // ... [Retry logic remains]

  if (guardian.isError) {
      // ... [Error card remains]
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

  // Get Rarity for Badge
  const rarityTrait = guardian.traits?.find((t: any) => t.type === 'Rarity Level')?.value || guardian.rarity;
  const isCommon = !rarityTrait || rarityTrait === 'Common' || rarityTrait === 'common';

  return (
    <Card 
        className="bg-card border-white/10 overflow-hidden hover:border-primary/50 transition-colors duration-300 group h-full flex flex-col cursor-pointer"
        onClick={onClick}
    >
      <div className="relative aspect-square overflow-hidden bg-secondary/20">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {imgSrc ? (
          <img 
            src={imgSrc} 
            alt={guardian.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => {
                // Fallback to placeholder or show error state
            }} 
          />
        ) : (
           <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
             <span className="mb-2">No Image</span>
           </div>
        )}
        
        {/* Dynamic Rarity Badge */}
        {!isCommon && (
            <div className="absolute top-2 right-2 z-20">
            <Badge className={`backdrop-blur-md border shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
                rarityTrait?.includes('Legendary') ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_10px_rgba(192,132,252,0.3)]' : 
                rarityTrait?.includes('Epic') ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_10px_rgba(192,132,252,0.3)]' : 
                rarityTrait?.includes('Rare') ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]' :
                'bg-black/40 text-gray-300 border-white/10'
            } font-mono text-[10px] uppercase`}>
                {rarityTrait}
            </Badge>
            </div>
        )}
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <h4 className="text-lg text-white mb-1 font-orbitron">{guardian.name}</h4>
        <p className="text-[10px] text-muted-foreground font-mono mb-4">TOKEN ID: #{guardian.id}</p>
        
        <div className="mt-auto">
             <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="traits" className="border-white/10">
                    <AccordionTrigger className="text-xs py-2 text-muted-foreground hover:text-white font-mono uppercase">
                        View Attributes ({guardian.traits?.length || 0})
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {guardian.traits && guardian.traits.map((trait, i) => (
                            <div key={i} className="flex justify-between text-[10px] border-b border-white/5 pb-1 last:border-0 last:pb-0">
                              <span className="text-muted-foreground/70">{trait.type}</span>
                              <span className="text-primary font-medium truncate ml-2 text-right max-w-[60%]">{trait.value}</span>
                            </div>
                          ))}
                          {(!guardian.traits || guardian.traits.length === 0) && (
                              <div className="text-xs text-muted-foreground italic">No traits found</div>
                          )}
                        </div>
                    </AccordionContent>
                </AccordionItem>
             </Accordion>
        </div>
      </div>
    </Card>
  );
}
