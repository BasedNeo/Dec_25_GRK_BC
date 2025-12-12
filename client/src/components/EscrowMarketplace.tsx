import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShieldCheck, ShoppingBag, Plus, RefreshCw, AlertTriangle, CheckCircle2, 
  Wallet, Clock, Filter, ArrowUpDown, Search, Fingerprint, X, Gavel, Timer, Infinity as InfinityIcon,
  Flame, Zap, History, MessageCircle, TrendingUp, Loader2, Square, LayoutGrid, Grid3x3, Grid, Info
} from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { generateMarketplaceData, MarketItem } from "@/lib/marketplaceData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ADMIN_WALLET } from "@/lib/constants";
import { useSecurity } from "@/context/SecurityContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trackEvent, trackSearch } from "@/lib/analytics";

import { useGuardians } from "@/hooks/useGuardians";
import Fuse from 'fuse.js';
import { useDebounce } from "@/hooks/use-debounce"; 
import { NFTDetailModal } from "./NFTDetailModal";

export function EscrowMarketplace() {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPaused } = useSecurity();
  const [activeTab, setActiveTab] = useState("buy");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<MarketItem | null>(null);
  const [offerItem, setOfferItem] = useState<MarketItem | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);

  // Mock Received Offers (for Seller Dashboard)
  const [receivedOffers, setReceivedOffers] = useState([
      { id: 1, nftId: 300, nftName: "Guardian #300", offerer: "0x71C...9A21", amount: 450, time: "2 hours ago", status: "pending" },
      { id: 2, nftId: 1245, nftName: "Guardian #1245", offerer: "0xA4F...B299", amount: 1200, time: "1 day ago", status: "pending" }
  ]);

  // Load saved searches on mount
  useEffect(() => {
    const saved = localStorage.getItem('bguard_saved_searches');
    if (saved) {
        try {
            setSavedSearches(JSON.parse(saved));
        } catch(e) { console.error("Failed to load saved searches"); }
    }
  }, []);

  const saveSearch = (term: string) => {
     if (!term || term.length < 2) return;
     const newSaved = Array.from(new Set([term, ...savedSearches])).slice(0, 5); // Max 5 unique
     setSavedSearches(newSaved);
     localStorage.setItem('bguard_saved_searches', JSON.stringify(newSaved));
     trackSearch(term);
     toast({ title: "Search Saved", description: `"${term}" added to your saved searches.` });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearch(val);
      
      // Simple suggestion trigger logic
      if (val.length > 0) setShowSavedSearches(true);
  };
  
  const applySearch = (term: string) => {
      setSearch(term);
      setShowSavedSearches(false);
      trackSearch(term);
  };

  // --- State for Filters & Sort ---
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300); // 300ms debounce
  const [savedSearches, setSavedSearches] = useState<string[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("price-asc");
  const [showFilters, setShowFilters] = useState(false);
  const [useCsvData, setUseCsvData] = useState(true); // Default to CSV for indexing
  const [gridCols, setGridCols] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 4);
  
  // Commercial Search: Attribute Filters
  const [traitTypeFilter, setTraitTypeFilter] = useState<string>("all");
  const [traitValueFilter, setTraitValueFilter] = useState<string>("all");

  // Use infinite query for data with server-side (hook-side) filtering
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading 
  } = useGuardians(false, useCsvData, {
      search: debouncedSearch,
      rarity: rarityFilter,
      traitType: traitTypeFilter,
      traitValue: traitValueFilter,
      sortBy
  }); 

  const allItems = useMemo(() => {
     if (!data) return [];
     // Flatten pages and add mock price/listing status for the marketplace demo
     return data.pages.flatMap((page: any) => page.nfts).map((item: any) => ({
        ...item,
        isListed: true, // Assume all fetched are listed for this demo
        // Mock price: Make some items (e.g., every 3rd one) have NO price to test the "Offer" state
        price: item.id % 3 === 0 ? undefined : 420 + (item.id % 100), 
        currency: '$BASED',
        owner: `0x${item.id.toString(16).padStart(40, '0')}` // Mock owner
     })) as unknown as MarketItem[];
  }, [data]);

  // Extract available traits for filters
  const availableTraits = useMemo(() => {
      const traits: Record<string, Set<string>> = {};
      // Use loaded items to populate dropdowns
      allItems.forEach(item => {
          item.traits.forEach(t => {
              if (!traits[t.type]) traits[t.type] = new Set();
              traits[t.type].add(t.value);
          });
      });
      return traits;
  }, [allItems]);

  // Mock Trending Trait
  const trendingTrait = useMemo(() => {
      const types = Object.keys(availableTraits);
      if (types.length === 0) return null;
      // Stable mock: Pick "Power" if available, else first
      const type = types.find(t => t === 'Power') || types[0];
      const values = Array.from(availableTraits[type]);
      if (values.length === 0) return null;
      return { type, value: values[0], change: '+22%' };
  }, [availableTraits]);

  // --- Biometric Auth State ---
  const [biometricAuthenticated, setBiometricAuthenticated] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // --- Admin Check ---
  const isAdmin = address?.toLowerCase() === ADMIN_WALLET.toLowerCase();

  // --- Filtering Logic (Client-side for tabs only, Search is Server-side) ---
  
  const filteredItems = useMemo(() => {
    // Search and filters are already applied by useGuardians hook
    // We just need to handle the tabs (Buy vs Inventory)
    
    let items = [...allItems];

    // Tab Filter
    if (activeTab === "buy") {
       items = items.filter(i => i.isListed);
    } else if (activeTab === "inventory") {
       // Mock inventory for connected user (just show some random ones if connected)
       items = isConnected ? items.filter(i => i.id % 50 === 0) : [];
    }

    // Sort is handled by hook, but price sort mock might need client side if hook doesn't have prices
    // Since hook adds mock prices in `allItems` transformation above, 
    // we might need to re-sort if the hook didn't sort by price (because it doesn't know about price).
    // The hook knows about `sortBy`, but `price` is added HERE.
    // So we should sort by price here if needed.
    
    if (sortBy === 'price-asc' || sortBy === 'price-desc' || sortBy === 'floor-price') {
         items.sort((a, b) => {
             const priceA = a.price || 0;
             const priceB = b.price || 0;
             if (sortBy === 'price-asc' || sortBy === 'floor-price') return priceA - priceB;
             if (sortBy === 'price-desc') return priceB - priceA;
             return 0;
         });
    }

    return items;
  }, [allItems, activeTab, isConnected, sortBy]);

  // Suggested Filters (Premium UX)
  const suggestedFilters = useMemo(() => {
    return [
        { label: "High Strength", action: () => applySearch("Strength >= 8") },
        { label: "Rarest-Legendary", action: () => setRarityFilter("Rarest-Legendary") },
        { label: "Based Frog", action: () => { 
            setTraitTypeFilter("Character Type");
            setTimeout(() => setTraitValueFilter("Based Frog"), 0);
        }},
        { label: "Based Guardian", action: () => { 
            setTraitTypeFilter("Character Type");
            setTimeout(() => setTraitValueFilter("Based Guardian"), 0);
        }},
        { label: "Based Creature", action: () => { 
            setTraitTypeFilter("Character Type");
            setTimeout(() => setTraitValueFilter("Based Creature"), 0);
        }}
    ];
  }, []);

  // Use full filtered list (pagination handled by fetchNextPage)
  const displayedItems = filteredItems; 
  
  const loadMore = () => {
    fetchNextPage();
  };

  // --- Actions ---
  const handleOffer = (item: MarketItem) => {
      setOfferItem(item);
      setShowOfferModal(true);
  };

  const submitOffer = (amount: number, duration: string) => {
      setShowOfferModal(false);
      setIsSubmitting(true);
      
      toast({
          title: "Submitting Offer",
          description: "Signing transaction...",
          className: "bg-black border-primary text-primary font-orbitron"
      });

      setTimeout(() => {
          setIsSubmitting(false);
          toast({
              title: "Offer Submitted",
              description: `You offered ${amount} $BASED for ${offerItem?.name}. Valid for ${duration}.`,
              className: "bg-black border-green-500 text-green-500 font-orbitron"
          });
          // Analytics
          trackEvent('nft_offer', 'Marketplace', `Item #${offerItem?.id}`, amount);
      }, 1500);
  };

  const handleAcceptOffer = (offerId: number) => {
      toast({
          title: "Accepting Offer",
          description: "Transferring asset to buyer...",
          className: "bg-black border-accent text-accent font-orbitron"
      });
      
      setTimeout(() => {
          setReceivedOffers(prev => prev.filter(o => o.id !== offerId));
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#00ffff', '#bf00ff'] });
          toast({
              title: "Offer Accepted",
              description: "Asset transferred. Funds (minus 1% fee) added to your wallet.",
              className: "bg-black border-green-500 text-green-500 font-orbitron"
          });
      }, 2000);
  };

  const handleRejectOffer = (offerId: number) => {
      setReceivedOffers(prev => prev.filter(o => o.id !== offerId));
      toast({
          title: "Offer Rejected",
          description: "The offer has been declined.",
          variant: "destructive"
      });
  };

  const handleBiometricAuth = async () => {
    // Mock WebAuthn
    try {
      toast({ title: "Authenticating...", description: "Please verify your identity." });
      await new Promise(resolve => setTimeout(resolve, 1500)); // Sim delay
      setBiometricAuthenticated(true);
      setShowBiometricModal(false);
      toast({ 
        title: "Identity Verified", 
        description: "Biometric authentication successful.",
        className: "bg-black border-green-500 text-green-500 font-orbitron"
      });
      if (pendingAction) {
          pendingAction();
          setPendingAction(null);
      }
    } catch (e) {
      toast({ title: "Authentication Failed", variant: "destructive" });
    }
  };

  const handleBuy = (item: MarketItem) => {
    const executeBuy = () => {
        if (isPaused) {
            toast({ title: "Market Paused", description: "Trading halted by admin.", variant: "destructive" });
            return;
        }

        toast({
          title: "Processing Transaction",
          description: "Interacting with Escrow Contract...",
          className: "bg-black border-accent text-accent font-orbitron",
        });

        setTimeout(() => {
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#00ffff', '#bf00ff'] });
          toast({
            title: "Purchase Successful",
            description: `You are now the owner of ${item.name}. Asset transferred.`,
            className: "bg-black border-green-500 text-green-500 font-orbitron",
          });

          // Analytics: Track Sale (Buy Action)
          trackEvent('nft_buy', 'Marketplace', `Item #${item.id}`, parseFloat((item.price || 0).toString()));
        }, 2000);
    };

    if (!isConnected) { openConnectModal?.(); return; }
    if (!biometricAuthenticated) { 
        setPendingAction(() => executeBuy);
        setShowBiometricModal(true); 
        return; 
    }
    
    executeBuy();
  };

  const handleAdminCancel = (item: MarketItem) => {
      toast({
          title: "Admin Action",
          description: `Listing for ${item.name} cancelled by admin override.`,
          variant: "destructive"
      });
  };

  return (
    <section id="marketplace" className="py-20 bg-black min-h-screen relative">
       {/* Background */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-end mb-8 gap-6">
          <div>
            <Badge variant="outline" className="mb-2 border-primary/50 text-primary font-mono cursor-pointer hover:bg-primary/10" onClick={() => setUseCsvData(!useCsvData)}>
                {isPaused ? "MARKET PAUSED" : (useCsvData ? "MARKETPLACE V2 (CSV MODE)" : "MARKETPLACE V2")}
            </Badge>
            {/* AUDIT NOTE */}
            <div className="text-[10px] text-green-500 font-mono mb-2 flex items-center">
                <ShieldCheck size={10} className="mr-1" /> Contracts Audited (Slither) | ReentrancyGuard Enabled
            </div>
            <h2 className="text-4xl text-white font-black mb-2">GUARDIAN <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">EXCHANGE</span></h2>
            <div className="flex gap-4 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-green-500"/> Escrow Secured</span>
              <span className="flex items-center gap-1"><Fingerprint size={12} className="text-accent"/> Biometric Auth</span>
              <span className="flex items-center gap-1"><RefreshCw size={12} className="text-primary"/> 1% Platform Fee</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
             <div className="relative flex-1 w-full md:w-64 transition-all duration-300">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
               <Input 
                 placeholder="Search Traits (e.g. 'Strength >= 8')..." 
                 className="pl-9 bg-white/5 border-white/10 text-white focus:border-primary/50 w-full scroll-mt-20"
                 value={search}
                 onChange={handleSearchChange}
                 onKeyDown={(e) => {
                     if (e.key === 'Enter') {
                         saveSearch(search);
                         setShowSavedSearches(false);
                     }
                 }}
                 onFocus={() => setShowSavedSearches(true)}
                 type="text"
               />
               
               {/* Saved Searches / Suggestions Dropdown */}
               <AnimatePresence>
                {showSavedSearches && (search.length > 0 || savedSearches.length > 0) && (
                    <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-black border border-white/20 rounded-md shadow-xl z-50 overflow-hidden"
                    >
                        <div className="p-2">
                             {/* Test: Suggest "Rare" if user types "R" or "r" */}
                             {search.toLowerCase().startsWith('r') && search.length < 4 && (
                                 <div 
                                    className="px-3 py-2 text-sm text-white hover:bg-white/10 cursor-pointer flex items-center justify-between group"
                                    onClick={() => applySearch("Rare")}
                                 >
                                    <span className="flex items-center"><Search size={12} className="mr-2 text-primary" /> Rare (Suggestion)</span>
                                 </div>
                             )}

                             {savedSearches.filter(s => s.toLowerCase().includes(search.toLowerCase())).map(s => (
                                 <div 
                                    key={s} 
                                    className="px-3 py-2 text-sm text-white hover:bg-white/10 cursor-pointer flex items-center justify-between group"
                                    onClick={() => applySearch(s)}
                                 >
                                    <span className="flex items-center"><History size={12} className="mr-2 text-muted-foreground" /> {s}</span>
                                    <X 
                                        size={12} 
                                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const newSaved = savedSearches.filter(item => item !== s);
                                            setSavedSearches(newSaved);
                                            localStorage.setItem('bguard_saved_searches', JSON.stringify(newSaved));
                                        }}
                                    />
                                 </div>
                             ))}
                             
                             {search.length > 1 && !savedSearches.includes(search) && (
                                 <div 
                                    className="px-3 py-2 text-xs text-primary hover:bg-primary/10 cursor-pointer border-t border-white/10 mt-1"
                                    onClick={() => saveSearch(search)}
                                 >
                                     + Save "{search}"
                                 </div>
                             )}
                        </div>
                        
                        {/* Suggested Filters in Dropdown */}
                        {search.length === 0 && savedSearches.length === 0 && (
                            <div className="p-2 border-t border-white/10">
                                <span className="text-[10px] text-muted-foreground px-2 mb-2 block">SUGGESTED</span>
                                <div className="flex flex-wrap gap-2 px-2">
                                    {suggestedFilters.map((sf, i) => (
                                        <Badge 
                                            key={i} 
                                            variant="outline" 
                                            className="cursor-pointer hover:bg-white/10 text-xs border-white/20"
                                            onClick={() => {
                                                sf.action();
                                                setShowSavedSearches(false);
                                            }}
                                        >
                                            {sf.label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {savedSearches.length > 0 && (
                            <div className="bg-white/5 px-3 py-1 text-[10px] text-muted-foreground flex justify-between">
                                <span>RECENT SEARCHES</span>
                                <span className="cursor-pointer hover:text-white" onClick={() => setShowSavedSearches(false)}>CLOSE</span>
                            </div>
                        )}
                    </motion.div>
                )}
               </AnimatePresence>
             </div>
             
             <div className="flex gap-2 items-center">
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

               <Button 
                 variant="outline" 
                 onClick={() => setShowFilters(!showFilters)}
                 className={`border-white/10 ${showFilters ? 'bg-primary/20 border-primary/50 text-primary' : 'text-muted-foreground'}`}
               >
                 <Filter size={16} className="mr-2" /> Filters
               </Button>
               <Select value={sortBy} onValueChange={setSortBy}>
                 <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
                   <ArrowUpDown size={16} className="mr-2 text-muted-foreground" />
                   <SelectValue placeholder="Sort By" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="price-asc">Price: Low to High</SelectItem>
                   <SelectItem value="price-desc">Price: High to Low</SelectItem>
                   <SelectItem value="floor-price">Floor Price (Lowest)</SelectItem>
                   <SelectItem value="rarity-desc">Rarity: High to Low</SelectItem>
                   <SelectItem value="rarity-asc">Rarity: Low to High</SelectItem>
                   <SelectItem value="id-asc">ID: Low to High</SelectItem>
                   <SelectItem value="id-desc">ID: High to Low</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </div>
        </div>

        {/* Filters Panel (Collapsible) */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-8"
            >
              <Card className="p-4 bg-white/5 border-white/10 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">RARITY</Label>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'common', 'rare', 'legendary'].map(r => (
                      <Badge 
                        key={r}
                        variant="outline" 
                        className={`cursor-pointer capitalize ${rarityFilter === r ? 'bg-primary text-black border-primary' : 'text-muted-foreground hover:text-white'}`}
                        onClick={() => setRarityFilter(r)}
                      >
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">ATTRIBUTE TYPE</Label>
                    <Select value={traitTypeFilter} onValueChange={(v) => { setTraitTypeFilter(v); setTraitValueFilter("all"); }}>
                        <SelectTrigger className="bg-black/50 border-white/10 text-white">
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Attributes</SelectItem>
                            {/* Pre-populate or use available */}
                            {Object.keys(availableTraits).length > 0 ? 
                                Object.keys(availableTraits).sort().map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                )) : (
                                    <>
                                        <SelectItem value="Character Type">Character Type</SelectItem>
                                        <SelectItem value="Strength">Strength</SelectItem>
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
                                if (traitTypeFilter === "Character Type" && !values.includes("Based Creature")) {
                                    values.push("Based Creature");
                                }
                                return values.sort().map(val => (
                                    <SelectItem key={val} value={val}>{val}</SelectItem>
                                ));
                            })()}
                        </SelectContent>
                    </Select>
                </div>
                
                {/* Advanced Filters removed to use main Search Bar logic */}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsList className="bg-white/5 border-white/10 p-1">
                <TabsTrigger value="buy" className="data-[state=active]:bg-primary data-[state=active]:text-black font-orbitron">
                    <ShoppingBag size={14} className="mr-2" /> BUY NOW
                </TabsTrigger>
                <TabsTrigger value="inventory" className="data-[state=active]:bg-primary data-[state=active]:text-black font-orbitron">
                    <Wallet size={14} className="mr-2" /> SELL (INVENTORY)
                </TabsTrigger>
                <TabsTrigger value="offers" className="data-[state=active]:bg-primary data-[state=active]:text-black font-orbitron relative">
                    <MessageCircle size={14} className="mr-2" /> OFFERS
                    {receivedOffers.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-black text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                            {receivedOffers.length}
                        </span>
                    )}
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="buy" className="space-y-8">
                {displayedItems.length > 0 ? (
                    <div className={`grid gap-6 transition-all duration-300 ${
                        gridCols === 1 ? 'grid-cols-1' : 
                        gridCols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 
                        gridCols === 4 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 
                        'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                    }`}>
                        {displayedItems.map((item) => (
                            <MarketCard 
                                key={item.id} 
                                item={item} 
                                onBuy={() => handleBuy(item)} 
                                onOffer={() => handleOffer(item)}
                                onClick={() => setSelectedNFT(item)} 
                                isAdmin={isAdmin} 
                                onCancel={() => handleAdminCancel(item)} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl">
                        <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-orbitron text-white mb-2">NO LISTINGS FOUND</h3>
                        <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
                        <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setRarityFilter("all"); setTraitTypeFilter("all"); setTraitValueFilter("all"); }}>
                            Clear Filters
                        </Button>
                    </div>
                )}
                
                {/* Load More Button */}
                {hasNextPage && (
                  <div className="flex justify-center mt-12">
                    <Button 
                      onClick={() => fetchNextPage()} 
                      disabled={isFetchingNextPage}
                      className="bg-secondary/50 hover:bg-secondary text-white font-orbitron tracking-widest min-w-[200px]"
                    >
                      {isFetchingNextPage ? (
                        <>LOADING <Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
                      ) : (
                        "LOAD MORE LISTINGS"
                      )}
                    </Button>
                  </div>
                )}
            </TabsContent>
            
            <TabsContent value="inventory">
                {!isConnected ? (
                     <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                        <Wallet className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-orbitron text-white mb-2">CONNECT WALLET</h3>
                        <p className="text-muted-foreground mb-6">Connect your wallet to list your Guardians for sale.</p>
                        <Button onClick={openConnectModal} className="bg-primary text-black hover:bg-primary/90">CONNECT NOW</Button>
                     </div>
                ) : displayedItems.length > 0 ? (
                     <div className={`grid gap-6 transition-all duration-300 ${
                        gridCols === 1 ? 'grid-cols-1' : 
                        gridCols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 
                        gridCols === 4 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 
                        'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                    }`}>
                        {displayedItems.map((item) => (
                            <MarketCard key={item.id} item={item} onBuy={() => {}} onOffer={() => handleOffer(item)} onClick={() => setSelectedNFT(item)} isOwner={true} />
                        ))}
                     </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl">
                        <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-orbitron text-white mb-2">NO GUARDIANS FOUND</h3>
                        <p className="text-muted-foreground">You don't have any Guardians matching these filters.</p>
                    </div>
                )}
            </TabsContent>

            <TabsContent value="offers">
                 {!isConnected ? (
                     <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                        <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-orbitron text-white mb-2">CONNECT WALLET</h3>
                        <p className="text-muted-foreground mb-6">Connect to view offers on your Guardians.</p>
                        <Button onClick={openConnectModal} className="bg-primary text-black hover:bg-primary/90">CONNECT NOW</Button>
                     </div>
                 ) : (
                     <div className="space-y-4">
                         {receivedOffers.length > 0 ? receivedOffers.map(offer => (
                             <Card key={offer.id} className="p-6 bg-white/5 border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                                 <div className="flex items-center gap-4">
                                     <div className="w-16 h-16 bg-secondary/20 rounded-lg overflow-hidden relative">
                                        {/* Placeholder Image for Offer Item */}
                                        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">IMG</div>
                                     </div>
                                     <div>
                                         <h4 className="text-lg font-orbitron text-white">{offer.nftName}</h4>
                                         <p className="text-xs text-muted-foreground font-mono">Offer from {offer.offerer}</p>
                                         <div className="flex items-center gap-2 mt-1">
                                             <Badge variant="outline" className="border-accent text-accent">{offer.amount} $BASED</Badge>
                                             <span className="text-[10px] text-muted-foreground">{offer.time}</span>
                                         </div>
                                     </div>
                                 </div>
                                 
                                 <div className="flex gap-2 w-full md:w-auto">
                                     <Button variant="outline" className="flex-1 md:flex-none border-red-500/50 text-red-500 hover:bg-red-500/10" onClick={() => handleRejectOffer(offer.id)}>
                                         REJECT
                                     </Button>
                                     <Button className="flex-1 md:flex-none bg-green-500 text-black hover:bg-green-600" onClick={() => handleAcceptOffer(offer.id)}>
                                         ACCEPT OFFER
                                     </Button>
                                 </div>
                             </Card>
                         )) : (
                            <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl">
                                <MessageCircle className="w-16 h-16 text-muted-foreground mb-4" />
                                <h3 className="text-xl font-orbitron text-white mb-2">NO ACTIVE OFFERS</h3>
                                <p className="text-muted-foreground">You haven't received any offers yet.</p>
                            </div>
                         )}
                     </div>
                 )}
            </TabsContent>
        </Tabs>

      </div>
      
      {/* Modals */}
      <NFTDetailModal 
        isOpen={!!selectedNFT} 
        onClose={() => setSelectedNFT(null)} 
        nft={selectedNFT} 
      />

      {/* Offer Modal */}
      <OfferModal 
        isOpen={showOfferModal} 
        onClose={() => setShowOfferModal(false)} 
        item={offerItem} 
        onSubmit={submitOffer}
      />

      {/* Biometric Modal */}
      <Dialog open={showBiometricModal} onOpenChange={setShowBiometricModal}>
        <DialogContent className="bg-black border-white/10 text-white sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-orbitron">
                    <Fingerprint className="text-accent" /> Biometric Authentication
                </DialogTitle>
                <DialogDescription>
                    Please verify your identity to proceed with this high-value transaction.
                </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-8">
                <div className="relative w-24 h-24 rounded-full border-2 border-accent/30 flex items-center justify-center animate-pulse">
                    <Fingerprint className="w-12 h-12 text-accent" />
                    <div className="absolute inset-0 border-t-2 border-accent rounded-full animate-spin"></div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setShowBiometricModal(false)}>Cancel</Button>
                <Button onClick={handleBiometricAuth} className="bg-accent text-black hover:bg-accent/90">
                    Verify Identity
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </section>
  );
}

// Helper Card Component
function MarketCard({ item, onBuy, onOffer, onClick, isOwner = false, isAdmin = false, onCancel }: { item: MarketItem, onBuy: () => void, onOffer: () => void, onClick: () => void, isOwner?: boolean, isAdmin?: boolean, onCancel?: () => void }) {
    const isRare = ['Rare', 'Epic', 'Legendary'].includes(item.rarity);
    const hasPrice = item.price && item.price > 0;
    
    return (
        <Card className="bg-card border-white/10 overflow-hidden hover:border-primary/50 transition-all duration-300 group cursor-pointer relative" onClick={onClick}>
            {/* Image & Badges */}
            <div className="relative aspect-square bg-secondary/20 overflow-hidden">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                
                {isRare && (
                    <Badge className="absolute top-2 right-2 bg-purple-500/20 text-purple-400 border-purple-500/50 backdrop-blur-md">
                        {item.rarity}
                    </Badge>
                )}
                
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                     <div className="flex justify-between items-end">
                         <span className="text-white font-bold font-orbitron text-sm">{item.name}</span>
                         <span className="text-xs text-muted-foreground font-mono">#{item.id}</span>
                     </div>
                </div>
            </div>
            
            {/* Details */}
            <div className="p-4 space-y-4">
                <div className="flex justify-between items-center min-h-[3rem]">
                    {hasPrice ? (
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase">Price</span>
                            <span className="text-lg font-bold text-primary font-mono">{item.price} $BASED</span>
                        </div>
                    ) : (
                        <div className="flex flex-col justify-center">
                            <span className="text-[10px] text-muted-foreground uppercase italic">Taking Offers</span>
                            <span className="text-sm font-bold text-white font-mono">--</span>
                        </div>
                    )}
                </div>
                
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {isOwner ? (
                        <Button className="w-full bg-white/10 hover:bg-white/20 text-white" variant="outline">
                            List / Delist
                        </Button>
                    ) : (
                        <>
                            {hasPrice && (
                                <Button className="flex-1 bg-primary text-black hover:bg-primary/90 font-bold px-2" onClick={onBuy}>
                                    BUY
                                </Button>
                            )}
                            <Button 
                                className={`flex-1 ${!hasPrice ? 'w-full bg-primary text-black' : 'bg-transparent border border-primary/50 text-primary hover:bg-primary/10'} font-bold px-2`} 
                                onClick={onOffer}
                                variant={!hasPrice ? 'default' : 'outline'}
                            >
                                OFFER
                            </Button>
                        </>
                    )}
                    
                    {isAdmin && !isOwner && (
                        <Button size="icon" variant="destructive" onClick={onCancel} title="Admin: Cancel Listing">
                            <X size={16} />
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
}

// Offer Modal Component
function OfferModal({ isOpen, onClose, item, onSubmit }: { isOpen: boolean, onClose: () => void, item: MarketItem | null, onSubmit: (amount: number, duration: string) => void }) {
    const [amount, setAmount] = useState<number>(0);
    const [duration, setDuration] = useState("1 week");
    const { isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const { toast } = useToast();
    
    // Reset when item changes
    useEffect(() => {
        if (item) {
            setAmount(item.price ? Math.floor(item.price * 0.9) : 100);
        }
    }, [item]);

    // Check chain on open
    useEffect(() => {
        if (isOpen && isConnected && chainId !== 32323) {
            toast({
                title: "Wrong Network",
                description: "This marketplace is on BasedAI (Chain ID 32323). Please switch.",
                action: (
                    <Button 
                        size="sm" 
                        onClick={() => switchChain({ chainId: 32323 })}
                        className="bg-primary text-black hover:bg-primary/90"
                    >
                        Switch to BasedAI
                    </Button>
                ),
                duration: 6000,
            });
        }
    }, [isOpen, isConnected, chainId, switchChain, toast]);

    if (!item) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-black border-white/10 text-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-xl overflow-y-auto">
                <DialogHeader className="pt-8 sm:pt-0">
                    <DialogTitle className="font-orbitron text-xl">MAKE AN OFFER</DialogTitle>
                    <DialogDescription>
                        Set your price for <span className="text-primary font-bold">{item.name}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-mono">OFFER AMOUNT ($BASED)</Label>
                        <div className="flex gap-2">
                             <Input 
                                type="number" 
                                value={amount} 
                                onChange={(e) => setAmount(Number(e.target.value))}
                                className="bg-white/5 border-white/10 text-white font-mono text-lg"
                             />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Balance: 42,000 $BASED</span>
                            <span>Floor: 420 $BASED</span>
                        </div>
                    </div>

                    {/* Duration Select */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-mono">OFFER DURATION</Label>
                        <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1 day">1 Day</SelectItem>
                                <SelectItem value="3 days">3 Days</SelectItem>
                                <SelectItem value="1 week">1 Week</SelectItem>
                                <SelectItem value="1 month">1 Month</SelectItem>
                                <SelectItem value="3 months">3 Months</SelectItem>
                                <SelectItem value="indefinitely">Indefinitely</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Gas Estimate */}
                    <div className="p-3 rounded bg-white/5 border border-white/10 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Flame size={14} className="text-orange-500" />
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex items-center gap-1 cursor-help group">
                                            <span className="text-xs text-muted-foreground group-hover:text-white transition-colors border-b border-dotted border-muted-foreground/50">Est. Gas Fee</span>
                                            <Info size={10} className="text-muted-foreground group-hover:text-white transition-colors" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-black border-white/20 text-white text-xs max-w-[200px]">
                                        <p>Gas paid in $BASED (BasedAI native token)</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-mono text-white block">~0.002 $BASED</span>
                            <span className="text-[10px] text-muted-foreground block whitespace-nowrap">(on BasedAI chain)</span>
                        </div>
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground text-center px-4">
                        Offers are non-binding until accepted by the seller. Funds will be held in escrow upon acceptance.
                    </p>
                </div>

                <DialogFooter className="flex gap-2 sm:gap-2 flex-col sm:flex-row pb-6 sm:pb-0">
                    <Button variant="ghost" onClick={onClose} className="flex-1 w-full">CANCEL</Button>
                    <Button onClick={() => onSubmit(amount, duration)} className="flex-1 w-full bg-primary text-black hover:bg-primary/90 font-bold font-orbitron">
                        SUBMIT OFFER
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}