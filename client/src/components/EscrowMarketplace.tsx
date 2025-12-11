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
  Flame, Zap, History, MessageCircle, TrendingUp
} from "lucide-react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { generateMarketplaceData, MarketItem } from "@/lib/marketplaceData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
      
      // Smart Search Logic
      if (val.toLowerCase().includes("high strength")) {
          setHighStrengthFilter(true);
      } else if (val.length < 5 && highStrengthFilter) {
          // Reset if user clears it (optional, but good UX)
          // setHighStrengthFilter(false); 
      }

      // Simple suggestion trigger logic
      if (val.length > 0) setShowSavedSearches(true);
  };
  
  const applySearch = (term: string) => {
      setSearch(term);
      if (term.toLowerCase().includes("high strength")) setHighStrengthFilter(true);
      setShowSavedSearches(false);
      trackSearch(term);
  };

  // --- State for Filters & Sort ---
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300); // 300ms debounce
  const [savedSearches, setSavedSearches] = useState<string[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [highStrengthFilter, setHighStrengthFilter] = useState(false);
  const [sortBy, setSortBy] = useState<string>("price-asc");
  const [showFilters, setShowFilters] = useState(false);
  const [useCsvData, setUseCsvData] = useState(false); // Add CSV support to marketplace too
  
  // Commercial Search: Attribute Filters
  const [traitTypeFilter, setTraitTypeFilter] = useState<string>("all");
  const [traitValueFilter, setTraitValueFilter] = useState<string>("all");

  // Use infinite query for data instead of loading all at once
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading 
  } = useGuardians(false, useCsvData); // Fetch real data or CSV

  const allItems = useMemo(() => {
     if (!data) return [];
     // Flatten pages and add mock price/listing status for the marketplace demo
     return data.pages.flatMap((page: any) => page.nfts).map((item: any) => ({
        ...item,
        isListed: true, // Assume all fetched are listed for this demo
        price: 420 + (item.id % 100), // Mock price
        currency: '$BASED',
        owner: `0x${item.id.toString(16).padStart(40, '0')}` // Mock owner
     })) as unknown as MarketItem[];
  }, [data]);

  // Extract available traits for filters
  const availableTraits = useMemo(() => {
      const traits: Record<string, Set<string>> = {};
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

  // --- Data Fetching (Mocking Alchemy/Contract fetch) ---
  // Replaced by useGuardians hook above

  // --- Filtering Logic ---
  
  // Fuse Instance (Memoized)
  const fuse = useMemo(() => {
    if (!allItems || allItems.length === 0) return null;
    return new Fuse(allItems, {
        keys: [
            'name', 
            'id', 
            'traits.value', 
            'traits.type',
            'rarity'
        ],
        threshold: 0.3, // Fuzzy match threshold
        distance: 100,
        minMatchCharLength: 2
    });
  }, [allItems]);

  const filteredItems = useMemo(() => {
    if (!allItems) return [];
    let items = [...allItems];

    // Tab Filter
    if (activeTab === "buy") {
       items = items.filter(i => i.isListed);
    } else if (activeTab === "inventory") {
       // Mock inventory for connected user (just show some random ones if connected)
       items = isConnected ? items.filter(i => i.id % 50 === 0) : [];
    }

    // Search (Fuse.js)
    if (debouncedSearch && fuse) {
        // Check for exact ID match first
        if (/^\d+$/.test(debouncedSearch)) {
             const exactIdMatch = items.find(i => i.id === parseInt(debouncedSearch));
             if (exactIdMatch) {
                 // Move exact match to top or just show it if user wants exact
                 // For now, let's just make sure it's in the results, maybe filteredItems logic handles it?
                 // Fuse might not prioritize exact ID match perfectly if thresholds are loose.
                 // Let's force it.
                 const others = fuse.search(debouncedSearch).map(r => r.item).filter(i => i.id !== exactIdMatch.id);
                 items = [exactIdMatch, ...others];
             } else {
                 const results = fuse.search(debouncedSearch);
                 items = results.map(r => r.item);
             }
        } else {
             const results = fuse.search(debouncedSearch);
             items = results.map(r => r.item);
        }
    } else if (search) {
        // Fallback or immediate typing (optional, usually wait for debounce)
        // But let's stick to debounced for performance
    }

    // Rarity
    if (rarityFilter !== "all") {
      items = items.filter(i => i.rarity.toLowerCase() === rarityFilter);
    }

    // Commercial Attribute Filter
    if (traitTypeFilter !== "all" && traitValueFilter !== "all") {
        items = items.filter(i => 
            i.traits.some(t => t.type === traitTypeFilter && t.value === traitValueFilter)
        );
    }

    // Strength > 8 Filter
    if (highStrengthFilter) {
          items = items.filter(i => {
              const strengthTrait = i.traits?.find(t => t.type === 'Strength');
              return strengthTrait && parseInt(strengthTrait.value) > 8;
          });
    }

    // Sort
    items.sort((a, b) => {
      const rarityScore: Record<string, number> = { 'Legendary': 3, 'Epic': 2.5, 'Rare': 2, 'Common': 1 };
      
      switch (sortBy) {
        case 'price-asc': return (a.price || 0) - (b.price || 0);
        case 'price-desc': return (b.price || 0) - (a.price || 0);
        case 'floor-price': return (a.price || 0) - (b.price || 0); // Floor Price = Lowest Price
        case 'id-asc': return a.id - b.id;
        case 'id-desc': return b.id - a.id;
        case 'rarity-desc': return (rarityScore[b.rarity] || 0) - (rarityScore[a.rarity] || 0);
        case 'rarity-asc': return (rarityScore[a.rarity] || 0) - (rarityScore[b.rarity] || 0);
        default: return 0;
      }
    });

    return items;
  }, [allItems, activeTab, debouncedSearch, fuse, rarityFilter, traitTypeFilter, traitValueFilter, highStrengthFilter, sortBy, isConnected]);

  // Suggested Filters (Premium UX)
  const suggestedFilters = useMemo(() => {
    return [
        { label: "High Strength", action: () => setHighStrengthFilter(true) },
        { label: "Legendary Only", action: () => setRarityFilter("legendary") },
        { label: "Based Frog", action: () => { 
            // Filter for "Character Type" = "Based Frog"
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
                 placeholder="Search Traits (e.g. 'High Power')..." 
                 className="pl-9 bg-white/5 border-white/10 text-white focus:border-primary/50 w-full"
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
             
             <div className="flex gap-2">
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

                {/* Attribute Filters */}
                <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">ATTRIBUTE TYPE</Label>
                    <Select value={traitTypeFilter} onValueChange={(v) => { setTraitTypeFilter(v); setTraitValueFilter("all"); }}>
                        <SelectTrigger className="bg-black/50 border-white/10 text-white">
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Attributes</SelectItem>
                            {Object.keys(availableTraits).sort().map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
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
                
                {/* Trending Badge */}
                <div className="flex flex-col justify-end space-y-2">
                    {trendingTrait && (
                        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="text-primary h-4 w-4" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground uppercase">Trending</span>
                                    <span className="text-xs font-bold text-white">{trendingTrait.value}</span>
                                </div>
                            </div>
                            <Badge className="bg-primary/20 text-primary border-none">{trendingTrait.change}</Badge>
                        </div>
                    )}
                    <Button 
                        variant={highStrengthFilter ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHighStrengthFilter(!highStrengthFilter)}
                        className={`w-full ${highStrengthFilter ? "bg-primary text-black" : "border-white/20"}`}
                    >
                        {highStrengthFilter ? "Strength > 8 (Active)" : "Filter: Strength > 8"}
                    </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Disclaimer */}
        <div className="mb-6 p-3 bg-yellow-500/5 border border-yellow-500/10 rounded text-xs text-yellow-500/60 font-mono text-center">
           DISCLAIMER: Values are estimates and may not be accurate due to market fluctuations. Not financial advice. Advisory votes; admin decides outcomes.
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent border-b border-white/10 w-full justify-start rounded-none h-auto p-0 mb-8 gap-6">
            <TabsTrigger value="buy" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-0 pb-3 font-orbitron text-lg">
              LIVE LISTINGS <span className="ml-2 text-xs bg-white/10 px-2 py-0.5 rounded-full text-muted-foreground">{allItems?.filter(i => i.isListed).length || 0}</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:text-accent px-0 pb-3 font-orbitron text-lg">
              MY INVENTORY
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="buy" className="mt-0 space-y-6">
             {/* Render Grid Items with onClick for Modal */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedItems.slice(0, 20).map((item) => ( 
                   <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <MarketCard 
                               item={item} 
                               onBuy={() => handleBuy(item)} 
                               isConnected={isConnected}
                               onConnect={openConnectModal}
                               isAdmin={isAdmin}
                               onAdminCancel={() => handleAdminCancel(item)}
                               onViewDetails={() => setSelectedNFT(item)}
                        />
                   </motion.div>
                ))}
             </div>
             
             {(hasNextPage || isLoading) && (
                <div className="flex justify-center py-8">
                    <Button 
                        variant="outline" 
                        onClick={loadMore}
                        disabled={isFetchingNextPage || isLoading}
                        className="border-primary/50 text-primary hover:bg-primary/10 font-orbitron tracking-widest min-w-[200px]"
                    >
                        {isFetchingNextPage || isLoading ? (
                             <>LOADING <RefreshCw className="ml-2 h-4 w-4 animate-spin" /></>
                        ) : (
                             "LOAD MORE GUARDIANS"
                        )}
                    </Button>
                </div>
             )}

             {filteredItems.length === 0 && (
                <div className="text-center py-20 text-muted-foreground">No guardians found matching your criteria.</div>
             )}
          </TabsContent>

          <TabsContent value="inventory" className="mt-0">
            {!isConnected ? (
              <div className="text-center py-20 border border-dashed border-white/10 rounded-xl">
                 <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                 <h3 className="text-white text-lg font-orbitron mb-2">WALLET NOT CONNECTED</h3>
                 <Button onClick={openConnectModal} className="mt-4 bg-primary text-black">Connect Wallet</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {filteredItems.length > 0 ? filteredItems.map((item) => (
                   <MarketCard 
                        key={item.id} 
                        item={item} 
                        isOwner={true} 
                        isConnected={true} 
                        onViewDetails={() => setSelectedNFT(item)}
                   />
                 )) : (
                   <div className="col-span-full text-center py-20 text-muted-foreground">You don't own any Guardians yet.</div>
                 )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <NFTDetailModal 
            isOpen={!!selectedNFT} 
            onClose={() => setSelectedNFT(null)} 
            nft={selectedNFT} 
        />
      </div>

      {/* Biometric Modal */}
      <Dialog open={showBiometricModal} onOpenChange={setShowBiometricModal}>
        <DialogContent className="bg-black border-white/20 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-orbitron text-center flex flex-col items-center gap-4 pt-4">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center animate-pulse">
                <Fingerprint size={32} className="text-accent" />
              </div>
              BIOMETRIC AUTH REQUIRED
            </DialogTitle>
            <DialogDescription className="text-center">
              Please verify your identity to authorize this high-value transaction.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center pb-4">
             <Button onClick={handleBiometricAuth} className="w-full bg-accent text-white hover:bg-accent/90 font-orbitron h-12">
               VERIFY IDENTITY
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </section>
  );
}

function MarketCard({ item, onBuy, isConnected, onConnect, isOwner = false, isAdmin = false, onAdminCancel, onViewDetails }: { 
    item: MarketItem, 
    onBuy?: () => void, 
    isConnected: boolean, 
    onConnect?: () => void, 
    isOwner?: boolean,
    isAdmin?: boolean,
    onAdminCancel?: () => void,
    onViewDetails?: () => void
}) {
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showOffersList, setShowOffersList] = useState(false);
  const { toast } = useToast();

  const handleMakeOffer = (e: React.FormEvent) => {
    e.preventDefault();
    setShowOfferModal(false);
    toast({
      title: "Offer Submitted (Timelock Active)",
      description: `Your offer of ${new FormData(e.target as HTMLFormElement).get('offerAmount')} for ${item.name} is locked for 1 hour.`,
      className: "bg-black border-primary text-primary font-orbitron"
    });

    // Analytics: Track Offer
    trackEvent('make_offer', 'Marketplace', `Item #${item.id}`, parseFloat(new FormData(e.target as HTMLFormElement).get('offerAmount') as string || '0'));
  };
  
  const handleAcceptOffer = (offerId: number) => {
      setShowOffersList(false);
      
      // Update local storage for Elite Seller Badge
      const currentSales = parseInt(localStorage.getItem('user_sales') || '0');
      localStorage.setItem('user_sales', (currentSales + 1).toString());

      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#00ff00', '#ffffff']
      });

      toast({
          title: "Offer Accepted!",
          description: "Transaction finalized. Funds transferred to your wallet.",
          className: "bg-black border-green-500 text-green-500 font-orbitron"
      });

      // Analytics: Track Sale (Sell Action)
      trackEvent('nft_sell', 'Marketplace', `Item #${item.id} (Offer Accepted)`, parseFloat((item.price || 0).toString()));
  };

  const isExpired = item.listingExpiresAt ? new Date(item.listingExpiresAt) < new Date() : false;

  return (
    <>
    <Card className="group bg-card border-white/10 hover:border-primary/50 transition-all duration-300 overflow-hidden flex flex-col relative">
      <div 
        className="relative aspect-square overflow-hidden bg-black/50 cursor-pointer"
        onClick={onViewDetails}
      >
        <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        
        {/* Hot Badge */}
        {item.listingExpiresAt && (
           <div className="absolute top-2 left-2 z-20 animate-pulse">
             <Badge className="bg-orange-500/90 hover:bg-orange-500 text-black border-none font-bold flex items-center gap-1">
                <Flame size={12} fill="currentColor" /> HOT
             </Badge>
           </div>
        )}

        {/* Rarity Badge */}
        <div className="absolute top-2 right-2">
          <Badge className={`backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
             item.rarity === 'Legendary' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-[0_0_10px_rgba(250,204,21,0.3)]' : 
             item.rarity === 'Epic' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_10px_rgba(192,132,252,0.3)]' : 
             item.rarity === 'Rare' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]' :
             'bg-black/40 text-gray-300'
          }`}>
            {item.rarity}
          </Badge>
        </div>

        {/* Listing Timer Overlay */}
        {item.isListed && (
             <div className="absolute top-2 left-2">
                 {item.listingExpiresAt ? (
                     <Badge variant="outline" className={`bg-black/50 backdrop-blur border-white/20 ${isExpired ? 'text-red-500 border-red-500' : 'text-white'}`}>
                        <Timer size={10} className="mr-1"/> 
                        {isExpired ? 'EXPIRED' : '24h Left'}
                     </Badge>
                 ) : (
                     <Badge variant="outline" className="bg-black/50 backdrop-blur border-white/20 text-white">
                        <InfinityIcon size={10} className="mr-1"/> Forever
                     </Badge>
                 )}
             </div>
        )}

        {/* Owner Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
          <p className="text-[10px] text-muted-foreground font-mono">OWNER</p>
          <p className="text-xs text-white font-mono truncate">
            {item.owner.slice(0, 6)}...{item.owner.slice(-4)}
          </p>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-orbitron text-white text-sm truncate pr-2">{item.name}</h4>
          <div className="text-xs text-muted-foreground font-mono">#{item.id}</div>
        </div>

        {/* Attributes (Mini) */}
        <div className="flex gap-1 mb-4 overflow-hidden">
           {item.traits.slice(0, 2).map((t, i) => (
             <span key={i} className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-gray-400 border border-white/5 truncate">
               {t.value}
             </span>
           ))}
           {item.traits.length > 2 && <span className="text-[10px] text-gray-500">+{item.traits.length - 2}</span>}
        </div>

        <div className="mt-auto pt-3 border-t border-white/5">
          {item.isListed ? (
            <div>
              <div className="flex justify-between items-end mb-3">
                <span className="text-xs text-muted-foreground">PRICE</span>
                <span className="text-lg font-bold text-white flex items-center gap-1">
                   {item.price} <span className={`text-xs ${item.currency === 'ETH' ? 'text-blue-400' : 'text-primary'}`}>{item.currency}</span>
                </span>
              </div>
              
              {!isOwner ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    className="h-11 text-xs border-white/10 hover:border-white/30"
                    onClick={() => setShowOfferModal(true)}
                  >
                    Make Offer
                  </Button>
                  
                  {/* Buy Button with Gas Preview Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                        <Button 
                            className="h-11 text-xs bg-white/5 hover:bg-primary hover:text-black border border-white/10 hover:border-primary font-orbitron"
                        >
                            {isConnected ? 'BUY NOW' : 'CONNECT'}
                        </Button>
                    </PopoverTrigger>
                    {isConnected && (
                        <PopoverContent className="w-56 bg-black border-white/20 text-white">
                            <div className="space-y-2">
                                <h5 className="font-orbitron text-sm border-b border-white/10 pb-2">TX PREVIEW</h5>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Price:</span>
                                    <span>{item.price} {item.currency}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Est. Gas:</span>
                                    <span className="text-orange-400 flex items-center"><Flame size={10} className="mr-1"/> 0.0004 ETH</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold pt-2 border-t border-white/10">
                                    <span>Total:</span>
                                    <span>{item.price} {item.currency}</span>
                                </div>
                                <Button size="sm" className="w-full mt-2 bg-primary text-black font-orbitron" onClick={onBuy}>
                                    CONFIRM BUY
                                </Button>
                            </div>
                        </PopoverContent>
                    )}
                  </Popover>

                </div>
              ) : (
                <div className="space-y-2">
                    <Button variant="outline" className="w-full h-11 text-xs border-red-500/30 text-red-500 hover:bg-red-500/10">
                    CANCEL LISTING
                    </Button>
                    {(item.offers && item.offers.length > 0) && (
                        <Button 
                            variant="secondary" 
                            className="w-full h-11 text-xs relative"
                            onClick={() => setShowOffersList(true)}
                        >
                            VIEW {item.offers.length} OFFERS
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                        </Button>
                    )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between h-[66px]">
               <span className="text-xs text-muted-foreground italic">Not Listed</span>
               {isOwner && (
                 <Button className="h-8 text-xs bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20">
                   LIST FOR SALE
                 </Button>
               )}
            </div>
          )}

          {/* Admin Override */}
          {isAdmin && item.isListed && (
              <Button 
                onClick={onAdminCancel}
                className="w-full mt-2 h-8 text-[10px] bg-red-900/20 text-red-500 border border-red-500/20 hover:bg-red-500/20 min-h-[32px]"
              >
                ADMIN OVERRIDE: DELIST
              </Button>
          )}
        </div>
      </div>

      {/* Offer Modal */}
      <Dialog open={showOfferModal} onOpenChange={setShowOfferModal}>
        <DialogContent className="bg-black border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="font-orbitron">MAKE A COUNTER-OFFER</DialogTitle>
            <DialogDescription>
              Enter your bid for {item.name}.
              <div className="mt-2 text-yellow-500/80 text-xs flex items-center bg-yellow-500/10 p-2 rounded">
                 <Clock size={12} className="mr-2" /> 
                 Security Note: Offers are timelocked for 1 hour to prevent front-running.
              </div>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMakeOffer} className="space-y-4 py-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input name="offerAmount" type="number" step="0.001" placeholder="0.00" className="bg-white/5 border-white/10" required />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select name="currency" defaultValue="ETH">
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="$BASED">$BASED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
             </div>
             <Button type="submit" className="w-full bg-primary text-black font-orbitron">
               SIGN & SEND OFFER
             </Button>
             <div className="text-center text-[10px] text-muted-foreground">
                 No gas required for off-chain signatures (Mocked)
             </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Offers List Modal (For Owner) */}
      <Dialog open={showOffersList} onOpenChange={setShowOffersList}>
        <DialogContent className="bg-black border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="font-orbitron">RECEIVED OFFERS</DialogTitle>
            <DialogDescription>
                Accepting an offer will immediately transfer the NFT.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                  {item.offers?.map((offer) => (
                      <div key={offer.id} className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/10">
                          <div>
                              <div className="text-lg font-bold text-white flex items-center">
                                  {offer.amount} {offer.currency}
                                  {offer.amount < (item.price || 0) && (
                                      <Badge variant="outline" className="ml-2 text-[10px] border-yellow-500/50 text-yellow-500 h-5">
                                          {-Math.round((1 - offer.amount / (item.price || 1)) * 100)}%
                                      </Badge>
                                  )}
                              </div>
                              <div className="text-xs text-muted-foreground">From: {offer.bidder}</div>
                              <div className="text-[10px] text-gray-500 flex items-center mt-1">
                                  <History size={10} className="mr-1"/> {new Date(offer.timestamp).toLocaleDateString()}
                              </div>
                          </div>
                          <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-8 text-xs border-red-500/20 hover:bg-red-500/10 text-red-500">
                                  REJECT
                              </Button>
                              <Button size="sm" className="h-8 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-500 border border-green-500/50" onClick={() => handleAcceptOffer(offer.id)}>
                                  ACCEPT
                              </Button>
                          </div>
                      </div>
                  ))}
              </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
    </>
  );
}

