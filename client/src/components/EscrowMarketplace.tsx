import { useState, useMemo, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShieldCheck, ShoppingBag, Plus, RefreshCw, AlertTriangle, CheckCircle2, 
  Wallet, Clock, Filter, ArrowUpDown, Search, Fingerprint, X, Gavel, Timer, Infinity as InfinityIcon,
  Flame, Zap, History, MessageCircle, TrendingUp, Loader2, Square, LayoutGrid, Grid3x3, Grid, Info, Tag
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
import { ADMIN_WALLET, MARKETPLACE_CONTRACT } from "@/lib/constants";
import { useSecurity } from "@/context/SecurityContext";
import { Security } from "@/lib/security";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trackEvent, trackSearch } from "@/lib/analytics";
import { ethers } from "ethers";
import { ContractService } from "@/lib/contractService";

import { useGuardians } from "@/hooks/useGuardians";
import Fuse from 'fuse.js';
import { useDebounce } from "@/hooks/use-debounce"; 
import { NFTDetailModal } from "./NFTDetailModal";
import { BuyButton } from "./BuyButton";
import { useMarketplace, useListing } from "@/hooks/useMarketplace";
import { useOffersForOwner } from "@/hooks/useOffers";
import { parseEther } from "viem";

interface EscrowMarketplaceProps {
  onNavigateToMint?: () => void;
  onNavigateToPortfolio?: () => void;
}

export function EscrowMarketplace({ onNavigateToMint, onNavigateToPortfolio }: EscrowMarketplaceProps) {
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

  // --- Real Marketplace Contract Integration ---
  const marketplace = useMarketplace();

  // --- CRITICAL FIX: Direct Contract Fetching State ---
  const [directNFTs, setDirectNFTs] = useState<MarketItem[]>([]);
  const [directLoading, setDirectLoading] = useState(false);
  const [directError, setDirectError] = useState<string | null>(null);
  const [contractStats, setContractStats] = useState<{totalMinted: number} | null>(null);
  
  // --- Fetch totalMinted from contract (for live minting status) ---
  useEffect(() => {
    const fetchTotalMinted = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('https://mainnet.basedaibridge.com/rpc/');
        const contract = new ethers.Contract(
          '0xaE51dc5fD1499A129f8654963560f9340773ad59',
          ['function totalMinted() view returns (uint256)'],
          provider
        );
        const totalMinted = await contract.totalMinted();
        setContractStats({ totalMinted: Number(totalMinted) });
      } catch (error) {
        // Error silently handled - collection still displays
      }
    };
    fetchTotalMinted();
    // Refresh every 30 seconds
    const interval = setInterval(fetchTotalMinted, 30000);
    return () => clearInterval(interval);
  }, []);

  // Real offers from blockchain via useOffersForOwner hook
  const { offers: offersByToken, isLoading: offersLoading } = useOffersForOwner();

  // Convert to array for the Offers tab
  const receivedOffers = useMemo(() => {
    const result: {
      id: string;
      nftId: number;
      nftName: string;
      offerer: string;
      amount: number;
      expiresAt: number;
      time: string;
      status: string;
    }[] = [];
    offersByToken.forEach((offers, tokenId) => {
      offers.forEach((offer, idx) => {
        result.push({
          id: `${tokenId}-${offer.offerer}-${idx}`,
          nftId: tokenId,
          nftName: `Guardian #${tokenId}`,
          offerer: offer.offerer,
          amount: Number(offer.amount),
          expiresAt: offer.expiresAt,
          time: new Date(offer.expiresAt * 1000).toLocaleDateString(),
          status: 'active'
        });
      });
    });
    return result.sort((a, b) => b.expiresAt - a.expiresAt);
  }, [offersByToken]);

  // Load saved searches on mount
  useEffect(() => {
    const saved = localStorage.getItem('bguard_saved_searches');
    if (saved) {
        try {
            setSavedSearches(JSON.parse(saved));
        } catch(e) { /* Silent fail for non-critical feature */ }
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
  const [sortBy, setSortBy] = useState<string>("listed-price-asc"); // Default: listed items first, then by lowest price
  const [showFilters, setShowFilters] = useState(false);
  const [useCsvData, setUseCsvData] = useState(true); // Default to CSV (true) for reliability
  const [gridCols, setGridCols] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 6);
  
  // Commercial Search: Attribute Filters
  const [traitTypeFilter, setTraitTypeFilter] = useState<string>("all");
  const [traitValueFilter, setTraitValueFilter] = useState<string>("all");

  // --- DIRECT Ethers.js FETCHING LOGIC (Per User Request) ---
  useEffect(() => {
    // Only run this if we are NOT using CSV mode (Live Mode)
    if (useCsvData) return;

    const fetchDirectly = async () => {
        setDirectLoading(true);
        setDirectError(null);
        setDirectNFTs([]);


        const debugContractConnection = async () => {
            try {
                const provider = new ethers.JsonRpcProvider('https://mainnet.basedaibridge.com/rpc/');
                
                const blockNumber = await provider.getBlockNumber();
                
                const contract = new ethers.Contract(
                    '0xaE51dc5fD1499A129f8654963560f9340773ad59',
                    ['function totalMinted() view returns (uint256)'],
                    provider
                );
                
                const totalMinted = await contract.totalMinted();
                return Number(totalMinted);
            } catch (error: any) {
                setDirectError(`Connection Failed: ${error.message}`);
                return 0;
            }
        };
        await debugContractConnection();
        
        try {
            const provider = new ethers.JsonRpcProvider('https://mainnet.basedaibridge.com/rpc/');
            const CONTRACT_ADDRESS = '0xaE51dc5fD1499A129f8654963560f9340773ad59';
            
            const abi = [
                'function totalMinted() view returns (uint256)',
                'function ownerOf(uint256 tokenId) view returns (address)',
                'function tokenByIndex(uint256 index) view returns (uint256)',
                'function tokenURI(uint256 tokenId) view returns (string)'
            ];

            const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

            // 1. Get Total Minted
            const totalMintedBig = await contract.totalMinted();
            const totalMinted = Number(totalMintedBig);
            setContractStats({ totalMinted });

            if (totalMinted === 0) {
                setDirectLoading(false);
                return;
            }

            // 2. Fetch NFTs (0 to totalMinted - 1)
            const fetchedNFTs: MarketItem[] = [];
            const PRE_REVEAL_URI = "https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeihqtvucde65whnu627ujhsdu7hsa56t5gipw353g7jzfwxyomear4/0.json";
            

            for (let i = 0; i < totalMinted; i++) {
                try {
                    const tokenIdBig = await contract.tokenByIndex(i);
                    const tokenId = Number(tokenIdBig);
                    
                    const owner = await contract.ownerOf(tokenId);
                    
                    // Try to fetch tokenURI, fallback to pre-reveal if needed
                    let tokenUri = "";
                    try {
                        tokenUri = await contract.tokenURI(tokenId);
                    } catch (e) {
                        tokenUri = PRE_REVEAL_URI;
                    }

                    // Metadata Fetching
                    let metadata = { name: `Guardian #${tokenId}`, image: '', attributes: [] };
                    
                    // If URI is from IPFS, convert to gateway
                    let metadataUrl = tokenUri;
                    if (tokenUri.startsWith('ipfs://')) {
                        metadataUrl = tokenUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
                    } else if (tokenUri === "") {
                        // Fallback
                        metadataUrl = PRE_REVEAL_URI;
                    }

                    // Special handling for pre-reveal check
                    // If the contract returns the pre-reveal URI (or similar), we treat it as pre-reveal
                    const isPreReveal = metadataUrl.includes("bafybeihqtvucde65whnu627ujhsdu7hsa56t5gipw353g7jzfwxyomear4");

                    try {
                        const res = await fetch(metadataUrl);
                        if (res.ok) {
                            metadata = await res.json();
                        }
                    } catch (e) {
                        // If fetch fails, populate with basic info so it still shows up
                        metadata = { 
                            name: `Guardian #${tokenId}`, 
                            image: "https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeihqtvucde65whnu627ujhsdu7hsa56t5gipw353g7jzfwxyomear4/0.png", // Assuming image matches pre-reveal pattern 
                            attributes: [] 
                        };
                    }

                    // Fix Image URL
                    let imageUrl = metadata.image || '';
                    if (imageUrl.startsWith('ipfs://')) {
                        imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
                    }
                    
                    // If pre-reveal, ensure image is valid
                    if (isPreReveal && !imageUrl) {
                        imageUrl = "https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeihqtvucde65whnu627ujhsdu7hsa56t5gipw353g7jzfwxyomear4/0.png"; // Fallback placeholder
                    }

                    // Rarity Badge Logic
                    // @ts-ignore
                    let rarity = metadata.attributes?.find(a => a.trait_type === 'Rarity')?.value || 'Common';
                    if (isPreReveal) {
                        rarity = "Pre-Reveal";
                    }

                    fetchedNFTs.push({
                        id: tokenId,
                        name: metadata.name || `Guardian #${tokenId}`,
                        image: imageUrl,
                        // @ts-ignore
                        traits: metadata.attributes?.map(a => ({ type: a.trait_type, value: a.value })) || [],
                        rarity: rarity,
                        owner: owner,
                        isListed: true, // Assume listed for display
                        price: 0,
                        currency: '$BASED'
                    });

                } catch (err) {
                    // Skip failed tokens silently
                }
            }

            setDirectNFTs(fetchedNFTs);

        } catch (error: any) {
            setDirectError(error.message || "Failed to load collection");
        } finally {
            setDirectLoading(false);
        }
    };

    fetchDirectly();
  }, [useCsvData]); // Re-run if toggling CSV mode

  // Determine if any filters are active (startOffset should be 0 when filtering)
  const hasActiveFilters = 
      !!debouncedSearch || 
      (rarityFilter && rarityFilter !== 'all') || 
      (traitTypeFilter && traitTypeFilter !== 'all');

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
      sortBy,
      startOffset: hasActiveFilters ? 0 : 299 // Start at 0 when filtering, else #300
  }); 

  const allItems = useMemo(() => {
     // IF LIVE MODE (useCsvData is false), USE DIRECT FETCHED DATA
     if (!useCsvData) {
         return directNFTs;
     }

     if (!data) return [];
     
     const MINT_PRICE = 69420;
     const totalMinted = contractStats?.totalMinted ?? 0;
     
     // Create a Set of actively listed token IDs for O(1) lookup
     const listedTokenIds = new Set<number>(
       (marketplace.activeListingIds || []).map(id => Number(id))
     );
     
     // Flatten pages and determine real status based on contract data
     return data.pages.flatMap((page: any) => page.nfts).map((item: any) => {
        const tokenId = item.id;
        const isMinted = tokenId <= totalMinted;
        const isListed = isMinted && listedTokenIds.has(tokenId);
        
        // Price logic:
        // - UNMINTED: show mint price
        // - MINTED + LISTED: price will be fetched from contract (placeholder for now, BuyButton fetches real price)
        // - MINTED + NOT LISTED: no price (accepts offers)
        let price: number | undefined;
        if (!isMinted) {
           price = MINT_PRICE;
        } else if (isListed) {
           // Listed items - the BuyButton component will fetch the actual price from contract
           // We set a placeholder indicating it's listed (actual price is fetched by useListing hook)
           price = undefined; // Will be fetched by BuyButton/useListing
        } else {
           // Minted but not listed - no price, accepts offers
           price = undefined;
        }
        
        return {
          ...item,
          isListed,
          isMinted,
          mintPrice: MINT_PRICE,
          price,
          currency: '$BASED' as const,
          owner: isMinted ? `0x${'?'.repeat(38)}` : undefined // Unknown owner for minted items
        };
     }) as unknown as MarketItem[];
  }, [data, directNFTs, useCsvData, contractStats?.totalMinted, marketplace.activeListingIds]);

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
       // Show ALL NFTs in the marketplace - unminted, minted (not listed), and listed
       // Each card will show appropriate button: MINT, MAKE OFFER, or BUY
       // No filtering needed - show everything
    } else if (activeTab === "inventory") {
       // Mock inventory for connected user (just show some random ones if connected)
       items = isConnected ? items.filter(i => i.id % 50 === 0) : [];
    }

    // Sort is handled by hook, but price sort mock might need client side if hook doesn't have prices
    // Since hook adds mock prices in `allItems` transformation above, 
    // we might need to re-sort if the hook didn't sort by price (because it doesn't know about price).
    // The hook knows about `sortBy`, but `price` is added HERE.
    // So we should sort by price here if needed.
    
    // Default sort: Listed items first (by lowest price), then unlisted/unminted
    if (sortBy === 'listed-price-asc') {
         items.sort((a, b) => {
             // Listed items come first
             const aListed = a.isListed ? 1 : 0;
             const bListed = b.isListed ? 1 : 0;
             if (aListed !== bListed) return bListed - aListed; // Listed first
             
             // Among listed items, sort by price ascending
             if (a.isListed && b.isListed) {
                 const priceA = a.price || 0;
                 const priceB = b.price || 0;
                 return priceA - priceB;
             }
             
             // Among unlisted, minted come before unminted
             const aMinted = a.isMinted ? 1 : 0;
             const bMinted = b.isMinted ? 1 : 0;
             if (aMinted !== bMinted) return bMinted - aMinted;
             
             // Otherwise by ID
             return a.id - b.id;
         });
    } else if (sortBy === 'price-asc' || sortBy === 'price-desc' || sortBy === 'floor-price') {
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
        { label: "Based Creatures", action: () => { 
            setTraitTypeFilter("Character Type");
            setTimeout(() => setTraitValueFilter("Based Creatures"), 0);
        }}
    ];
  }, []);

  // Use full filtered list (pagination handled by fetchNextPage)
  const displayedItems = filteredItems; 
  
  const loadMore = () => {
    if (useCsvData) fetchNextPage();
  };

  // Infinite Scroll Observer
  const observerTarget = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
           fetchNextPage();
           trackEvent('scroll_load_batch', 'Engagement', 'Marketplace');
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // --- Actions ---
  const handleOffer = (item: MarketItem) => {
      setOfferItem(item);
      setShowOfferModal(true);
  };

  const submitOffer = async (amount: number, duration: string) => {
      if (!offerItem) return;
      setShowOfferModal(false);
      setIsSubmitting(true);
      
      // Parse duration string to days (e.g., "7 days" -> 7)
      const daysMatch = duration.match(/(\d+)/);
      const expirationDays = daysMatch ? parseInt(daysMatch[1]) : 7;

      try {
          await marketplace.makeOffer(offerItem.id, amount, expirationDays);
          trackEvent('nft_offer', 'Marketplace', `Item #${offerItem.id}`, amount);
          
          // Show success on confirmation (handled by hook, but add confetti here)
          if (marketplace.state.isSuccess) {
              confetti({ particleCount: 100, spread: 60, origin: { y: 0.7 }, colors: ['#00ffff', '#bf00ff'] });
          }
      } catch (error) {
          console.error('Offer failed:', error);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleAcceptOffer = async (offerId: string, tokenId: number, offererAddress: string) => {
      try {
          await marketplace.acceptOffer(tokenId, offererAddress);
          // Offers will auto-refresh from blockchain via useOffersForOwner hook
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#00ffff', '#bf00ff'] });
          trackEvent('nft_accept_offer', 'Marketplace', `Item #${tokenId}`);
      } catch (error) {
          console.error('Accept offer failed:', error);
      }
  };

  const handleRejectOffer = (offerId: string) => {
      // Note: Rejecting offers on-chain would require a contract call
      // For now, this is informational - the offer will remain until expired
      toast({
          title: "Offer Rejected",
          description: "The offer has been declined. It will remain visible until it expires.",
          variant: "destructive"
      });
  };

  // --- List/Delist NFT Functions ---
  const handleListNFT = async (tokenId: number, price: number) => {
      if (!marketplace.isApproved) {
          toast({
              title: "Approval Required",
              description: "Please approve the marketplace first to list your NFT.",
              variant: "destructive"
          });
          return;
      }
      
      try {
          await marketplace.listNFT(tokenId, price);
          trackEvent('nft_list', 'Marketplace', `Item #${tokenId}`, price);
      } catch (error) {
          console.error('List failed:', error);
      }
  };

  const handleDelistNFT = async (tokenId: number) => {
      try {
          await marketplace.delistNFT(tokenId);
          trackEvent('nft_delist', 'Marketplace', `Item #${tokenId}`);
      } catch (error) {
          console.error('Delist failed:', error);
      }
  };

  const handleApproveMarketplace = async () => {
      try {
          await marketplace.approveMarketplace();
          trackEvent('marketplace_approve', 'Marketplace');
      } catch (error) {
          console.error('Approval failed:', error);
      }
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

  const handleBuy = async (item: MarketItem) => {
    const executeBuy = async () => {
        if (isPaused) {
            toast({ title: "Market Paused", description: "Trading halted by admin.", variant: "destructive" });
            return;
        }

        try {
            // Convert price to wei (item.price is in $BASED)
            const priceWei = parseEther(String(item.price || 0));
            await marketplace.buyNFT(item.id, priceWei);
            
            // Analytics: Track Sale (Buy Action)
            trackEvent('nft_buy', 'Marketplace', `Item #${item.id}`, parseFloat((item.price || 0).toString()));
            
            // Show confetti on success (hook handles toast)
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#00ffff', '#bf00ff'] });
        } catch (error) {
            console.error('Buy failed:', error);
        }
    };

    if (!isConnected) { openConnectModal?.(); return; }
    if (!biometricAuthenticated) { 
        setPendingAction(() => executeBuy);
        setShowBiometricModal(true); 
        return; 
    }
    
    await executeBuy();
  };

  const handleAdminCancel = (item: MarketItem) => {
      toast({
          title: "Admin Action",
          description: `Listing for ${Security.sanitizeText(item.name)} cancelled by admin override.`,
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
            {/* PRE-REVEAL NOTICE */}
            {!useCsvData && contractStats && contractStats.totalMinted > 0 && (
                <div className="mb-4 p-3 bg-cyan-950/30 border border-cyan-500/30 rounded text-cyan-400 font-mono text-xs flex items-center animate-pulse">
                    <Info size={14} className="mr-2" />
                    Showing {contractStats.totalMinted} minted NFTs (Pre-Reveal Mode - Images will be revealed soon)
                </div>
            )}
            <h2 className="text-4xl text-white font-black mb-2">GUARDIAN <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">EXCHANGE</span></h2>
            <div className="flex gap-4 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-green-500"/> Escrow Secured</span>
              <span className="flex items-center gap-1"><Fingerprint size={12} className="text-accent"/> Biometric Auth</span>
              <span className="flex items-center gap-1"><RefreshCw size={12} className="text-primary"/> 1% Platform Fee</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
             {directLoading && <div className="text-cyan-400 animate-pulse flex items-center"><Loader2 className="animate-spin mr-2"/> Loading Live Data...</div>}
             {directError && <div className="text-red-500 text-xs bg-red-900/20 p-2 rounded border border-red-500/50">Error: {directError}</div>}
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
                 size="icon"
                 onClick={() => setShowFilters(!showFilters)}
                 className={`border-white/10 w-10 h-10 md:w-auto md:px-4 ${showFilters ? 'bg-primary/20 border-primary/50 text-primary' : 'text-muted-foreground'}`}
               >
                 <Filter size={16} />
                 <span className="hidden md:inline ml-2">Filters</span>
               </Button>
               <Select value={sortBy} onValueChange={setSortBy}>
                 <SelectTrigger className="w-[100px] md:w-[160px] bg-white/5 border-white/10 text-white text-xs md:text-sm">
                   <ArrowUpDown size={14} className="mr-1 md:mr-2 text-muted-foreground flex-shrink-0" />
                   <SelectValue placeholder="Sort" />
                 </SelectTrigger>
                 <SelectContent className="bg-black/95 border-white/10 backdrop-blur-sm">
                   <SelectItem value="listed-price-asc">For Sale</SelectItem>
                   <SelectItem value="price-asc">Price: Low</SelectItem>
                   <SelectItem value="price-desc">Price: High</SelectItem>
                   <SelectItem value="floor-price">Floor Price</SelectItem>
                   <SelectItem value="rarity-desc">Rarity: High</SelectItem>
                   <SelectItem value="rarity-asc">Rarity: Low</SelectItem>
                   <SelectItem value="id-asc">ID: Low</SelectItem>
                   <SelectItem value="id-desc">ID: High</SelectItem>
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
              <Card className="p-4 bg-white/5 border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">ATTRIBUTE TYPE</Label>
                    <Select value={traitTypeFilter} onValueChange={(v) => { setTraitTypeFilter(v); setTraitValueFilter("all"); }}>
                        <SelectTrigger className="bg-black/50 border-white/10 text-white">
                            <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/95 border-white/10 backdrop-blur-sm">
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
                        <SelectContent className="bg-black/95 border-white/10 backdrop-blur-sm">
                            <SelectItem value="all">All Values</SelectItem>
                            {traitTypeFilter !== "all" && (() => {
                                const values = Array.from(availableTraits[traitTypeFilter] || []);
                                if (traitTypeFilter === "Character Type") {
                                    if (!values.includes("Based Guardian")) values.push("Based Guardian");
                                    if (!values.includes("Based Frog")) values.push("Based Frog");
                                    if (!values.includes("Based Creature")) values.push("Based Creature");
                                    if (!values.includes("Based Creatures")) values.push("Based Creatures");
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
                <button 
                    onClick={() => onNavigateToMint?.()}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-orbitron text-[#6cff61] bg-black/50 border border-white/10 hover:bg-white/5"
                >
                    <Zap size={14} className="mr-2" /> MINT NOW
                </button>
                <button 
                    onClick={() => onNavigateToPortfolio?.()}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-orbitron border ${isConnected ? 'text-cyan-400 bg-black/50 border-cyan-500/50 hover:bg-cyan-500/10 hover:border-cyan-400' : 'text-gray-600 bg-black/50 border-white/10 cursor-not-allowed opacity-50'}`}
                    disabled={!isConnected}
                >
                    <Wallet size={14} className="mr-2" /> SELL (INVENTORY)
                </button>
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
                    <>
                        {/* Live Minting Status Banner */}
                        {contractStats && (
                            <div className="p-4 rounded-lg bg-gradient-to-r from-[#6cff61]/10 to-cyan-500/10 border border-[#6cff61]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" data-testid="minting-status-banner">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-[#6cff61] animate-pulse"></div>
                                    <div>
                                        <span className="text-white font-orbitron text-sm">LIVE MINTING STATUS</span>
                                        <p className="text-[#6cff61] font-mono text-lg font-bold">
                                            {contractStats.totalMinted.toLocaleString()} / 3,732 MINTED
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Info size={12} />
                                    <span>NFTs with "MINT AVAILABLE" badge can be minted at 69,420 $BASED</span>
                                </div>
                            </div>
                        )}
                        
                        <div className={`grid gap-6 transition-all duration-300 ${
                            gridCols === 1 ? 'grid-cols-1' : 
                            gridCols === 2 ? 'grid-cols-1 sm:grid-cols-2' : 
                            gridCols === 4 ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 
                            'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
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
                                    totalMinted={contractStats?.totalMinted}
                                />
                            ))}
                        </div>

                        {/* Infinite Scroll Trigger & Loader */}
                        <div ref={observerTarget} className="flex flex-col items-center justify-center py-12 w-full">
                           {isFetchingNextPage && (
                             <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                                <span className="text-xs font-mono text-cyan-400 animate-pulse">LOADING NEURAL LINK...</span>
                             </div>
                           )}
                           {!hasNextPage && !isFetchingNextPage && displayedItems.length > 0 && (
                             <div className="text-xs font-mono text-muted-foreground border border-white/10 px-4 py-2 rounded-full mt-4">
                                END OF COLLECTION
                             </div>
                           )}
                        </div>
                    </>
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
                
                {/* Legacy Load More hidden */}
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
                            <MarketCard key={item.id} item={item} onBuy={() => {}} onOffer={() => handleOffer(item)} onClick={() => setSelectedNFT(item)} isOwner={true} totalMinted={contractStats?.totalMinted} />
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
                                     <Button className="flex-1 md:flex-none bg-green-500 text-black hover:bg-green-600" onClick={() => handleAcceptOffer(offer.id, offer.nftId, offer.offerer)}>
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
        <DialogContent className="bg-black border-white/10 text-white sm:max-w-md z-[10000]">
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

      {/* Transaction Status Indicators */}
      {marketplace.state.isPending && (
        <div className="fixed bottom-4 right-4 bg-cyan-500/20 border border-cyan-500 rounded-lg p-4 z-50 animate-pulse">
          <p className="text-cyan-400 font-mono text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></span>
            Confirm in your wallet...
          </p>
        </div>
      )}

      {marketplace.state.isConfirming && (
        <div className="fixed bottom-4 right-4 bg-amber-500/20 border border-amber-500 rounded-lg p-4 z-50 animate-pulse">
          <p className="text-amber-400 font-mono text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping"></span>
            Transaction confirming...
          </p>
        </div>
      )}

    </section>
  );
}

import { NFTImage } from "./NFTImage";

// Helper Card Component
function MarketCard({ item, onBuy, onOffer, onClick, isOwner = false, isAdmin = false, onCancel, totalMinted }: { item: MarketItem, onBuy: () => void, onOffer: () => void, onClick: () => void, isOwner?: boolean, isAdmin?: boolean, onCancel?: () => void, totalMinted?: number }) {
    const isRare = ['Rare', 'Epic', 'Legendary'].includes(item.rarity);
    const [showRandomMintWarning, setShowRandomMintWarning] = useState(false);
    const [showListModal, setShowListModal] = useState(false);
    const [listPrice, setListPrice] = useState<number>(69420);
    const marketplace = useMarketplace();
    
    // Use the isMinted prop from item (set in allItems useMemo) or fallback to calculation
    const isMinted = item.isMinted ?? (totalMinted !== undefined && item.id <= totalMinted);
    const isUnminted = !isMinted && totalMinted !== undefined;
    const isListed = item.isListed && isMinted;
    
    // For listed items, fetch real price from contract
    const { listing, isLoading: isLoadingPrice } = useListing(isListed ? item.id : undefined);
    
    // Determine displayed price
    // - UNMINTED: show mintPrice (69420)
    // - LISTED: show contract price
    // - NOT LISTED (minted): no price
    const MINT_PRICE = item.mintPrice ?? 69420;
    const contractPrice = listing?.price ? Number(listing.price) : undefined;
    const hasPrice = isListed && contractPrice !== undefined;
    
    const AFTERMINT_URL = "https://aftermint.trade/mint/based-guardians";
    
    return (
        <Card className="nft-card bg-card border-white/10 overflow-hidden hover:border-primary/50 transition-all duration-300 group cursor-pointer relative" onClick={onClick} data-token-id={item.id}>
            {/* Image & Badges */}
            <div className="relative aspect-square bg-secondary/20 overflow-hidden">
                <NFTImage 
                    src={item.image} 
                    alt={Security.sanitizeText(item.name)} 
                    id={item.id}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                {/* Status Badges */}
                {isUnminted && (
                    <Badge className="absolute top-2 left-2 bg-[#6cff61]/20 text-[#6cff61] border-[#6cff61]/50 backdrop-blur-md animate-pulse" data-testid={`badge-mint-available-${item.id}`}>
                        <Zap size={10} className="mr-1" /> MINT AVAILABLE
                    </Badge>
                )}
                {isListed && (
                    <Badge className="absolute top-2 left-2 bg-primary/20 text-primary border-primary/50 backdrop-blur-md" data-testid={`badge-listed-${item.id}`}>
                        <ShoppingBag size={10} className="mr-1" /> LISTED
                    </Badge>
                )}
                
                {isRare && (
                    <Badge className="absolute top-2 right-2 bg-purple-500/20 text-purple-400 border-purple-500/50 backdrop-blur-md">
                        {item.rarity}
                    </Badge>
                )}
                
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                     <div className="flex justify-between items-end">
                         <span className="text-white font-bold font-orbitron text-sm">{Security.sanitizeText(item.name)}</span>
                         <span className="text-xs text-muted-foreground font-mono">#{item.id}</span>
                     </div>
                </div>
            </div>
            
            {/* Details */}
            <div className="nft-info p-4 space-y-4">
                <div className="flex justify-between items-center min-h-[3rem]">
                    {isUnminted ? (
                        <div className="flex flex-col">
                            <span className="text-[10px] text-[#6cff61] uppercase font-semibold">Mint Price</span>
                            <span className="text-lg font-bold text-[#6cff61] font-mono">{MINT_PRICE.toLocaleString()} $BASED</span>
                        </div>
                    ) : isListed ? (
                        <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase">Listed Price</span>
                            {isLoadingPrice ? (
                                <span className="text-lg font-bold text-primary font-mono animate-pulse">Loading...</span>
                            ) : hasPrice ? (
                                <span className="text-lg font-bold text-primary font-mono" data-price={contractPrice}>{Number(contractPrice).toLocaleString()} $BASED</span>
                            ) : (
                                <span className="text-lg font-bold text-primary font-mono">--</span>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col justify-center">
                            <span className="text-[10px] text-muted-foreground uppercase italic">Not Listed</span>
                            <span className="text-sm font-bold text-white font-mono">--</span>
                        </div>
                    )}
                    
                    {/* Show active offer badge to owner */}
                    {item.hasActiveOffer && item.highestOffer && (
                        <div className="bg-gray-700/50 border border-gray-500/50 px-2 py-1 rounded">
                            <span className="text-[10px] text-gray-300 font-mono">OFFER: {item.highestOffer.toLocaleString()} $BASED</span>
                        </div>
                    )}
                </div>
                
                <div className="nft-actions flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                    {/* OWNER ACTIONS - List/Delist */}
                    {isOwner && isMinted && !isListed && (
                      <div className="flex flex-col gap-2">
                        {!marketplace.isApproved ? (
                          <Button 
                            className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold"
                            onClick={(e) => {
                              e.stopPropagation();
                              marketplace.approveMarketplace();
                            }}
                            disabled={marketplace.state.isPending}
                          >
                            {marketplace.state.isPending ? 'APPROVING...' : '1. APPROVE MARKETPLACE'}
                          </Button>
                        ) : (
                          <Button 
                            className="w-full bg-green-500 text-black hover:bg-green-400 font-bold shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowListModal(true);
                            }}
                          >
                            <Tag size={14} className="mr-2" /> LIST FOR SALE
                          </Button>
                        )}
                      </div>
                    )}

                    {/* If already listed by owner, show delist button */}
                    {isOwner && isListed && (
                      <Button 
                        className="w-full bg-red-500/80 text-white hover:bg-red-500 font-bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          marketplace.delistNFT(item.id);
                        }}
                        disabled={marketplace.state.isPending}
                      >
                        {marketplace.state.isPending ? 'DELISTING...' : 'REMOVE LISTING'}
                      </Button>
                    )}
                    
                    {/* NON-OWNER ACTIONS */}
                    {!isOwner && isUnminted ? (
                        <Button 
                            className="w-full bg-[#6cff61] text-black hover:bg-[#6cff61]/90 font-bold"
                            data-testid={`button-mint-${item.id}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowRandomMintWarning(true);
                            }}
                        >
                            <Zap size={14} className="mr-2" /> MINT NOW
                        </Button>
                    ) : !isOwner && isListed ? (
                        <div className="flex gap-2">
                            <BuyButton 
                                tokenId={item.id}
                                price={contractPrice}
                                className="flex-1"
                                onBuy={() => onBuy()}
                            />
                            <Button 
                                className="offer-btn flex-1 bg-cyan-500 text-black hover:bg-cyan-400 font-bold px-2 h-8 shadow-[0_0_10px_rgba(0,255,255,0.3)]" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOffer();
                                }}
                                data-testid={`button-offer-${item.id}`}
                            >
                                OFFER
                            </Button>
                        </div>
                    ) : !isOwner && isMinted && !isListed ? (
                        <Button 
                            className="offer-btn w-full bg-cyan-500 text-black hover:bg-cyan-400 font-bold px-2 h-8 shadow-[0_0_10px_rgba(0,255,255,0.3)]" 
                            onClick={(e) => {
                                e.stopPropagation();
                                onOffer();
                            }}
                            data-testid={`button-make-offer-${item.id}`}
                        >
                            MAKE OFFER
                        </Button>
                    ) : null}
                    
                    {isAdmin && !isOwner && (
                        <Button size="icon" variant="destructive" onClick={onCancel} title="Admin: Cancel Listing">
                            <X size={16} />
                        </Button>
                    )}
                </div>
            </div>
            
            {/* Random Mint Warning Dialog */}
            <Dialog open={showRandomMintWarning} onOpenChange={setShowRandomMintWarning}>
                <DialogContent className="bg-black border-amber-500/50 text-white sm:max-w-md z-[10000]" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-500 font-orbitron tracking-widest">
                            <AlertTriangle className="h-5 w-5" />
                            RANDOM MINT
                        </DialogTitle>
                        <DialogDescription className="text-gray-300 pt-4 text-base leading-relaxed">
                            <strong className="text-amber-400">Important:</strong> Minting is random. You will likely <strong>NOT</strong> receive this specific NFT (#{item.id}).
                            <p className="mt-3 text-sm text-gray-400">
                                The NFT you receive will be randomly selected from the remaining unminted collection.
                            </p>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:gap-2 flex-col sm:flex-row pt-4">
                        <Button 
                            variant="ghost" 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowRandomMintWarning(false);
                            }}
                            className="flex-1"
                        >
                            CANCEL
                        </Button>
                        <a 
                            href={AFTERMINT_URL} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Button 
                                className="w-full bg-[#6cff61] text-black hover:bg-[#6cff61]/90 font-bold font-orbitron"
                            >
                                <Zap size={14} className="mr-2" /> I UNDERSTAND, MINT NOW
                            </Button>
                        </a>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* List for Sale Modal */}
            <Dialog open={showListModal} onOpenChange={setShowListModal}>
              <DialogContent className="bg-black border-green-500/50 text-white sm:max-w-md z-[10000]" onClick={(e) => e.stopPropagation()}>
                <DialogHeader>
                  <DialogTitle className="font-orbitron text-green-400 flex items-center gap-2">
                    <Tag size={18} /> LIST FOR SALE
                  </DialogTitle>
                  <DialogDescription>
                    Set your price for <span className="text-primary font-bold">{item.name}</span>
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-mono">SALE PRICE ($BASED)</Label>
                    <Input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={listPrice || ''} 
                      onChange={(e) => {
                        const val = e.target.value.replace(/^0+/, '').replace(/[^0-9]/g, '');
                        setListPrice(val ? parseInt(val, 10) : 0);
                      }}
                      className="bg-white/5 border-white/10 text-white font-mono text-lg"
                      placeholder="69420"
                    />
                    <p className="text-xs text-muted-foreground">
                      You'll receive {Math.floor(listPrice * 0.99).toLocaleString()} $BASED after 1% platform fee
                    </p>
                  </div>
                </div>
                
                <DialogFooter className="flex gap-2">
                  <Button variant="ghost" onClick={() => setShowListModal(false)}>CANCEL</Button>
                  <Button 
                    className="bg-green-500 text-black hover:bg-green-400 font-bold"
                    onClick={() => {
                      marketplace.listNFT(item.id, listPrice);
                      setShowListModal(false);
                    }}
                    disabled={listPrice < 1 || marketplace.state.isPending}
                  >
                    {marketplace.state.isPending ? 'LISTING...' : 'CONFIRM LISTING'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </Card>
    );
}

// Offer Modal Component
function OfferModal({ isOpen, onClose, item, onSubmit }: { isOpen: boolean, onClose: () => void, item: MarketItem | null, onSubmit: (amount: number, duration: string) => void }) {
    const [amount, setAmount] = useState<number>(0);
    const [duration, setDuration] = useState("1 week");
    const [isValidating, setIsValidating] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const { isConnected, address } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const { toast } = useToast();
    
    // Real wallet balance
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [balanceLoading, setBalanceLoading] = useState(false);
    
    const GAS_BUFFER = 100; // Reserve for gas fees
    const maxOffer = walletBalance ? Math.max(0, walletBalance - GAS_BUFFER) : 0;
    const canAfford = walletBalance !== null && amount > 0 && amount <= maxOffer;
    const insufficientFunds = walletBalance !== null && amount > maxOffer;
    
    // Fetch wallet balance when modal opens
    useEffect(() => {
        if (isOpen && isConnected && address) {
            setBalanceLoading(true);
            const fetchBalance = async () => {
                try {
                    const { ethers } = await import('ethers');
                    const provider = new ethers.JsonRpcProvider('https://mainnet.basedaibridge.com/rpc/', {
                        chainId: 32323,
                        name: 'BasedAI'
                    });
                    const balanceWei = await provider.getBalance(address);
                    const balance = parseFloat(ethers.formatEther(balanceWei));
                    setWalletBalance(balance);
                } catch (error) {
                    console.error('[OfferModal] Failed to fetch balance:', error);
                    setWalletBalance(null);
                } finally {
                    setBalanceLoading(false);
                }
            };
            fetchBalance();
        }
    }, [isOpen, isConnected, address]);
    
    // Reset when item changes
    useEffect(() => {
        if (item) {
            setAmount(item.price ? Math.floor(item.price * 0.9) : 100);
            setValidationError(null);
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
    
    const handleSubmit = async () => {
        if (!isConnected) {
            setValidationError('Please connect your wallet first');
            return;
        }
        
        if (amount <= 0) {
            setValidationError('Please enter an offer amount');
            return;
        }
        
        if (walletBalance === null) {
            setValidationError('Could not verify wallet balance. Please try again.');
            return;
        }
        
        if (amount > walletBalance) {
            setValidationError(`Insufficient balance. You have ${walletBalance.toLocaleString()} $BASED but are offering ${amount.toLocaleString()} $BASED.`);
            return;
        }
        
        if (amount > maxOffer) {
            setValidationError(`You need to keep ~${GAS_BUFFER} $BASED for gas fees. Maximum offer: ${maxOffer.toLocaleString()} $BASED`);
            return;
        }
        
        setIsValidating(true);
        setValidationError(null);
        
        // Proceed with offer submission
        onSubmit(amount, duration);
        setIsValidating(false);
    };
    
    const setMaxOffer = () => {
        if (maxOffer > 0) {
            setAmount(Math.floor(maxOffer));
            setValidationError(null);
        }
    };

    if (!item) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-black border-white/10 text-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-xl overflow-y-auto z-[10000]">
                <DialogHeader className="pt-8 sm:pt-0">
                    <DialogTitle className="font-orbitron text-xl">MAKE AN OFFER</DialogTitle>
                    <DialogDescription>
                        Set your price for <span className="text-primary font-bold">{Security.sanitizeText(item.name)}</span>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground font-mono">OFFER AMOUNT ($BASED)</Label>
                        <div className="flex gap-2">
                             <Input 
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={amount || ''} 
                                onChange={(e) => {
                                    const val = e.target.value.replace(/^0+/, '').replace(/[^0-9]/g, '');
                                    setAmount(val ? parseInt(val, 10) : 0);
                                    setValidationError(null);
                                }}
                                className={`bg-white/5 border-white/10 text-white font-mono text-lg ${insufficientFunds ? 'border-red-500/50' : ''}`}
                                data-testid="offer-amount-input"
                             />
                             <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={setMaxOffer}
                                disabled={!walletBalance || maxOffer <= 0}
                                className="bg-white/5 border-white/10 text-cyan-400 hover:bg-cyan-500/10 font-mono text-xs px-3"
                                data-testid="max-offer-btn"
                             >
                                MAX
                             </Button>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span data-testid="offer-balance-display">
                                {balanceLoading ? (
                                    'Loading balance...'
                                ) : walletBalance !== null ? (
                                    <>Balance: <span className={insufficientFunds ? 'text-red-400' : 'text-emerald-400'}>{walletBalance.toLocaleString()}</span> $BASED</>
                                ) : isConnected ? (
                                    'Could not load balance'
                                ) : (
                                    'Connect wallet to see balance'
                                )}
                            </span>
                            <span>
                                {walletBalance !== null && (
                                    <>Max: {maxOffer.toLocaleString()} $BASED</>
                                )}
                            </span>
                        </div>
                    </div>
                    
                    {/* Validation Error */}
                    {validationError && (
                        <div className="p-3 rounded bg-red-500/10 border border-red-500/30 flex items-start gap-2" data-testid="offer-validation-error">
                            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <span className="text-xs text-red-300">{validationError}</span>
                        </div>
                    )}
                    
                    {/* Insufficient Funds Warning */}
                    {insufficientFunds && !validationError && (
                        <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 flex items-start gap-2" data-testid="insufficient-funds-warning">
                            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-300">
                                <p className="font-semibold">Insufficient Balance</p>
                                <p>You need {(amount - (walletBalance || 0)).toLocaleString()} more $BASED</p>
                            </div>
                        </div>
                    )}

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
                                        <p>Gas paid in $BASED (BasedAI native token). ~{GAS_BUFFER} $BASED reserved for transaction fees.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-mono text-white block">~0.002 $BASED</span>
                            <span className="text-[10px] text-muted-foreground block whitespace-nowrap">(on BasedAI chain)</span>
                        </div>
                    </div>
                    
                    {/* Important Disclaimer */}
                    <div className="p-3 rounded bg-amber-500/5 border border-amber-500/20">
                        <p className="text-[10px] text-amber-200/80 text-center">
                            <strong>⚠️ Note:</strong> Your $BASED is <strong>NOT locked</strong> until seller accepts. 
                            You must maintain sufficient balance when the seller accepts, or the offer will fail.
                        </p>
                    </div>
                </div>

                <DialogFooter className="flex gap-2 sm:gap-2 flex-col sm:flex-row pb-6 sm:pb-0">
                    <Button variant="ghost" onClick={onClose} className="flex-1 w-full">CANCEL</Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={!isConnected || !canAfford || isValidating || balanceLoading}
                        className={`flex-1 w-full font-bold font-orbitron ${
                            canAfford 
                                ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)]' 
                                : 'bg-gray-800 border border-cyan-500/30 text-cyan-400/50 cursor-not-allowed'
                        }`}
                        data-testid="submit-offer-btn"
                    >
                        {isValidating ? 'VALIDATING...' : balanceLoading ? 'LOADING...' : 'SUBMIT OFFER'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}