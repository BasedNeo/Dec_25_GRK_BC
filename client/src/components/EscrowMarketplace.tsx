import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShieldCheck, ShoppingBag, Plus, RefreshCw, AlertTriangle, CheckCircle2, 
  Wallet, Clock, Filter, ArrowUpDown, Search, Fingerprint, X, Gavel, Timer, Infinity as InfinityIcon
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

export function EscrowMarketplace() {
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPaused } = useSecurity();
  const [activeTab, setActiveTab] = useState("buy");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- State for Filters & Sort ---
  const [search, setSearch] = useState("");
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("price-asc");
  const [showFilters, setShowFilters] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(20); // Lazy load limit

  // --- Biometric Auth State ---
  const [biometricAuthenticated, setBiometricAuthenticated] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);

  // --- Admin Check ---
  const isAdmin = address?.toLowerCase() === ADMIN_WALLET.toLowerCase();

  // --- Data Fetching (Mocking Alchemy/Contract fetch) ---
  const { data: allItems } = useQuery({
    queryKey: ['marketplace-items'],
    queryFn: async () => generateMarketplaceData(3732),
    staleTime: 30000, // 30s caching
  });

  // --- Filtering Logic ---
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

    // Search (Numeric validation included)
    if (search) {
      items = items.filter(i => 
        i.name.toLowerCase().includes(search.toLowerCase()) || 
        i.id.toString().includes(search)
      );
    }

    // Rarity
    if (rarityFilter !== "all") {
      items = items.filter(i => i.rarity.toLowerCase() === rarityFilter);
    }

    // Sort
    items.sort((a, b) => {
      if (sortBy === 'price-asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price-desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'id-asc') return a.id - b.id;
      if (sortBy === 'rarity') {
        const rarityScore: Record<string, number> = { 'Legendary': 3, 'Epic': 2.5, 'Rare': 2, 'Common': 1 };
        return (rarityScore[b.rarity] || 0) - (rarityScore[a.rarity] || 0);
      }
      return 0;
    });

    return items;
  }, [allItems, activeTab, search, rarityFilter, sortBy, isConnected]);

  const displayedItems = filteredItems.slice(0, displayLimit);
  const hasMore = filteredItems.length > displayLimit;

  const loadMore = () => {
    setDisplayLimit(prev => prev + 20);
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
    } catch (e) {
      toast({ title: "Authentication Failed", variant: "destructive" });
    }
  };

  const handleBuy = (item: MarketItem) => {
    if (isPaused) {
        toast({ title: "Market Paused", description: "Trading halted by admin.", variant: "destructive" });
        return;
    }
    if (!isConnected) { openConnectModal?.(); return; }
    if (!biometricAuthenticated) { setShowBiometricModal(true); return; }

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
    }, 2000);
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
            <Badge variant="outline" className="mb-2 border-primary/50 text-primary font-mono">
                {isPaused ? "MARKET PAUSED" : "MARKETPLACE V2"}
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
             <div className="relative flex-1 sm:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
               <Input 
                 placeholder="Search ID (e.g. 100) or Name..." 
                 className="pl-9 bg-white/5 border-white/10 text-white focus:border-primary/50"
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 type="text"
               />
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
                 <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white">
                   <ArrowUpDown size={16} className="mr-2 text-muted-foreground" />
                   <SelectValue placeholder="Sort By" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="price-asc">Price: Low to High</SelectItem>
                   <SelectItem value="price-desc">Price: High to Low</SelectItem>
                   <SelectItem value="rarity">Rarity: High to Low</SelectItem>
                   <SelectItem value="id-asc">Token ID: Low to High</SelectItem>
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
                {/* More filters could go here */}
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

          <TabsContent value="buy" className="mt-0">
             {/* Mobile: Horizontal scroll / Swipe | Desktop: Grid */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
               {displayedItems.map((item) => (
                 <MarketCard 
                   key={item.id} 
                   item={item} 
                   onBuy={() => handleBuy(item)} 
                   isConnected={isConnected}
                   onConnect={openConnectModal}
                   isAdmin={isAdmin}
                   onAdminCancel={() => handleAdminCancel(item)}
                 />
               ))}
             </div>
             
             {hasMore && (
                <div className="flex justify-center py-8">
                    <Button 
                        variant="outline" 
                        onClick={loadMore}
                        className="border-primary/50 text-primary hover:bg-primary/10 font-orbitron tracking-widest min-w-[200px]"
                    >
                        LOAD MORE GUARDIANS
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
                 {/* Mock Inventory Items */}
                 {filteredItems.length > 0 ? filteredItems.map((item) => (
                   <MarketCard key={item.id} item={item} isOwner={true} isConnected={true} />
                 )) : (
                   <div className="col-span-full text-center py-20 text-muted-foreground">You don't own any Guardians yet.</div>
                 )}
              </div>
            )}
          </TabsContent>
        </Tabs>
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

function MarketCard({ item, onBuy, isConnected, onConnect, isOwner = false, isAdmin = false, onAdminCancel }: { 
    item: MarketItem, 
    onBuy?: () => void, 
    isConnected: boolean, 
    onConnect?: () => void, 
    isOwner?: boolean,
    isAdmin?: boolean,
    onAdminCancel?: () => void
}) {
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showOffersList, setShowOffersList] = useState(false);
  const { toast } = useToast();

  const handleMakeOffer = (e: React.FormEvent) => {
    e.preventDefault();
    setShowOfferModal(false);
    toast({
      title: "Offer Submitted",
      description: `Your offer of ${new FormData(e.target as HTMLFormElement).get('offerAmount')} for ${item.name} has been sent.`,
      className: "bg-black border-primary text-primary font-orbitron"
    });
  };

  const isExpired = item.listingExpiresAt ? new Date(item.listingExpiresAt) < new Date() : false;

  return (
    <>
    <Card className="group bg-card border-white/10 hover:border-primary/50 transition-all duration-300 overflow-hidden flex flex-col relative">
      <div className="relative aspect-square overflow-hidden bg-black/50">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        
        {/* Rarity Badge */}
        <div className="absolute top-2 right-2">
          <Badge className={`backdrop-blur-md border-none ${
             item.rarity === 'Legendary' ? 'bg-orange-500/20 text-orange-400' : 
             item.rarity === 'Rare' ? 'bg-purple-500/20 text-purple-400' : 
             'bg-white/10 text-gray-300'
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
          <p className="text-xs text-white font-mono truncate">{item.owner}</p>
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
                  <Button 
                    className="h-11 text-xs bg-white/5 hover:bg-primary hover:text-black border border-white/10 hover:border-primary font-orbitron"
                    onClick={onBuy}
                  >
                    {isConnected ? 'BUY NOW' : 'CONNECT'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                    <Button variant="outline" className="w-full h-11 text-xs border-red-500/30 text-red-500 hover:bg-red-500/10">
                    CANCEL LISTING
                    </Button>
                    {(item.offers && item.offers.length > 0) && (
                        <Button 
                            variant="secondary" 
                            className="w-full h-11 text-xs"
                            onClick={() => setShowOffersList(true)}
                        >
                            VIEW {item.offers.length} OFFERS
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
            <DialogTitle className="font-orbitron">MAKE AN OFFER</DialogTitle>
            <DialogDescription>
              Enter your price for {item.name}. The owner will be notified.
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
               SEND OFFER
             </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Offers List Modal (For Owner) */}
      <Dialog open={showOffersList} onOpenChange={setShowOffersList}>
        <DialogContent className="bg-black border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="font-orbitron">RECEIVED OFFERS</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                  {item.offers?.map((offer) => (
                      <div key={offer.id} className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/10">
                          <div>
                              <div className="text-lg font-bold text-white">{offer.amount} {offer.currency}</div>
                              <div className="text-xs text-muted-foreground">From: {offer.bidder}</div>
                          </div>
                          <div className="flex gap-2">
                              <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-900/20"><X size={16}/></Button>
                              <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300 hover:bg-green-900/20"><CheckCircle2 size={16}/></Button>
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

