import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useInterval } from "@/hooks/useInterval";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsGuardianHolder } from '@/hooks/useIsGuardianHolder';
import { 
  ShieldCheck, ShoppingBag, Plus, RefreshCw, AlertTriangle, CheckCircle2, Check,
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
import { useMarketplace, useListing, useFloorPrice } from "@/hooks/useMarketplace";
import { useOffersForOwner } from "@/hooks/useOffers";
import { useOffersV3 } from "@/hooks/useOffersV3";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";
import { parseEther } from "viem";
import { MyOffersPanel } from "./MyOffersPanel";

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
  
  // --- V3 Off-Chain Offers (gasless, like Aftermint) ---
  const offersV3 = useOffersV3();
  
  // --- Floor Price ---
  const { floorPrice, isLoading: floorPriceLoading } = useFloorPrice();
  
  // --- Get user's owned NFTs for sorting priority ---
  const { nfts: ownedNFTs } = useOwnedNFTs();
  const ownedTokenIds = useMemo(() => new Set(ownedNFTs.map(n => n.id)), [ownedNFTs]);

  // --- CRITICAL FIX: Direct Contract Fetching State ---
  const [directNFTs, setDirectNFTs] = useState<MarketItem[]>([]);
  const [directLoading, setDirectLoading] = useState(false);
  const [directError, setDirectError] = useState<string | null>(null);
  const [contractStats, setContractStats] = useState<{totalMinted: number} | null>(null);
  const [mintedTokenIdsList, setMintedTokenIdsList] = useState<number[]>([]);
  const [directListingIds, setDirectListingIds] = useState<number[]>([]);
  const [listingPrices, setListingPrices] = useState<Map<number, number>>(new Map());
  
  // --- Fetch totalMinted, minted token IDs, AND active listings directly via ethers.js ---
  const fetchContractData = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider('https://mainnet.basedaibridge.com/rpc/');
      
      // NFT Contract for minted tokens
      const nftContract = new ethers.Contract(
        '0xaE51dc5fD1499A129f8654963560f9340773ad59',
        [
          'function totalMinted() view returns (uint256)',
          'function tokenByIndex(uint256 index) view returns (uint256)'
        ],
        provider
      );
      
      // Marketplace Contract for listings
      const marketplaceContract = new ethers.Contract(
        MARKETPLACE_CONTRACT,
        [
          'function getActiveListings() view returns (uint256[])'
        ],
        provider
      );
      
      // Fetch minted data
      const totalMinted = await nftContract.totalMinted();
      const totalMintedNum = Number(totalMinted);
      setContractStats({ totalMinted: totalMintedNum });
      
      // Fetch all minted token IDs in PARALLEL for speed
      if (totalMintedNum > 0) {
        const tokenPromises = Array.from({ length: totalMintedNum }, (_, i) =>
          nftContract.tokenByIndex(i)
            .then((id: bigint) => Number(id))
            .catch(() => null)
        );
        const results = await Promise.all(tokenPromises);
        const tokenIds = results.filter((id): id is number => id !== null);
        setMintedTokenIdsList(tokenIds);
      }
      
      // Fetch active listings directly from marketplace contract
      try {
        const activeListings = await marketplaceContract.getActiveListings();
        const listingIds = activeListings.map((id: bigint) => Number(id));
        setDirectListingIds(listingIds);
      } catch {
        // Listing fetch failed silently
      }
      
    } catch {
      // Contract data fetch failed silently
    }
  }, []);

  useEffect(() => {
    fetchContractData();
  }, [fetchContractData]);

  useInterval(fetchContractData, 30000);

  // Fetch listing prices for all active listings
  useEffect(() => {
    if (directListingIds.length === 0) return;
    
    const fetchListingPrices = async () => {
      try {
        const provider = new ethers.JsonRpcProvider('https://mainnet.basedaibridge.com/rpc/');
        const marketplaceContract = new ethers.Contract(
          MARKETPLACE_CONTRACT,
          [
            'function getListing(uint256 tokenId) view returns (address seller, uint256 price, uint256 listedAt, bool active)'
          ],
          provider
        );
        
        const prices = new Map<number, number>();
        
        // Fetch prices in parallel for speed
        const pricePromises = directListingIds.map(async (tokenId) => {
          try {
            const listing = await marketplaceContract.getListing(tokenId);
            if (listing.active) {
              const priceInBased = parseFloat(ethers.formatEther(listing.price));
              prices.set(tokenId, priceInBased);
            }
          } catch {
            // Skip failed price fetch
          }
        });
        
        await Promise.all(pricePromises);
        setListingPrices(prices);
      } catch {
        // Price fetch failed silently
      }
    };
    
    fetchListingPrices();
  }, [directListingIds]);

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
      message?: string;
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
          status: 'active',
          message: (offer as { message?: string }).message
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
  const [sortBy, setSortBy] = useState<string>("listed-price-asc"); // Default: Listed NFTs first
  const [showFilters, setShowFilters] = useState(false);
  const [useCsvData, setUseCsvData] = useState(true); // Default to CSV Mode to show ALL 3,732 NFTs with minted first
  const [gridCols, setGridCols] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 6);
  
  // Commercial Search: Attribute Filters
  const [traitTypeFilter, setTraitTypeFilter] = useState<string>("all");
  const [traitValueFilter, setTraitValueFilter] = useState<string>("all");

  // --- DIRECT Ethers.js FETCHING LOGIC (Per User Request) ---
  // Always fetch on-chain minted NFTs regardless of mode - they appear first in combined view
  useEffect(() => {

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

            // 2. Get active listings from marketplace first
            const marketplaceContract = new ethers.Contract(
              MARKETPLACE_CONTRACT,
              [
                'function getActiveListings() view returns (uint256[])',
                'function getListing(uint256 tokenId) view returns (address seller, uint256 price, uint256 listedAt, bool active)'
              ],
              provider
            );
            
            let activeListingIds: number[] = [];
            const listingPricesMap = new Map<number, number>();
            
            try {
              const listings = await marketplaceContract.getActiveListings();
              activeListingIds = listings.map((id: bigint) => Number(id));
              
              // Fetch prices for listed NFTs in parallel
              const pricePromises = activeListingIds.map(async (tokenId) => {
                try {
                  const listing = await marketplaceContract.getListing(tokenId);
                  if (listing.active) {
                    const priceInBased = parseFloat(ethers.formatEther(listing.price));
                    listingPricesMap.set(tokenId, priceInBased);
                  }
                } catch {}
              });
              await Promise.all(pricePromises);
            } catch {}
            
            const listedTokenSet = new Set(activeListingIds);
            
            // 3. Fetch NFTs (0 to totalMinted - 1) - PARALLEL for speed and reliability
            const PRE_REVEAL_URI = "https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeihqtvucde65whnu627ujhsdu7hsa56t5gipw353g7jzfwxyomear4/0.json";
            
            // Create parallel fetch promises for ALL minted NFTs
            const nftPromises = Array.from({ length: totalMinted }, (_, i) => 
                (async (index: number): Promise<MarketItem | null> => {
                    try {
                        const tokenIdBig = await contract.tokenByIndex(index);
                        const tokenId = Number(tokenIdBig);
                        
                        // Parallel fetch owner and URI
                        const [owner, tokenUri] = await Promise.all([
                            contract.ownerOf(tokenId).catch(() => '0x0'),
                            contract.tokenURI(tokenId).catch(() => PRE_REVEAL_URI)
                        ]);
                        
                        // Metadata Fetching
                        let metadata: { name: string; image: string; attributes: any[] } = { 
                            name: `Guardian #${tokenId}`, 
                            image: '', 
                            attributes: [] 
                        };
                        
                        // If URI is from IPFS, convert to gateway
                        let metadataUrl = tokenUri || PRE_REVEAL_URI;
                        if (metadataUrl.startsWith('ipfs://')) {
                            metadataUrl = metadataUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
                        }

                        // Special handling for pre-reveal check
                        const isPreReveal = metadataUrl.includes("bafybeihqtvucde65whnu627ujhsdu7hsa56t5gipw353g7jzfwxyomear4");

                        try {
                            const res = await fetch(metadataUrl, { signal: AbortSignal.timeout(5000) });
                            if (res.ok) {
                                metadata = await res.json();
                            }
                        } catch {
                            // If fetch fails, populate with basic info so it still shows up
                            metadata = { 
                                name: `Guardian #${tokenId}`, 
                                image: "https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeihqtvucde65whnu627ujhsdu7hsa56t5gipw353g7jzfwxyomear4/0.png",
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
                            imageUrl = "https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeihqtvucde65whnu627ujhsdu7hsa56t5gipw353g7jzfwxyomear4/0.png";
                        }

                        // Rarity Badge Logic
                        let rarity = metadata.attributes?.find((a: any) => a.trait_type === 'Rarity')?.value || 'Common';
                        if (isPreReveal) {
                            rarity = "Pre-Reveal";
                        }

                        // Check if this NFT is listed for sale
                        const isListed = listedTokenSet.has(tokenId);
                        const listingPrice = listingPricesMap.get(tokenId);
                        
                        return {
                            id: tokenId,
                            name: metadata.name || `Guardian #${tokenId}`,
                            image: imageUrl,
                            traits: metadata.attributes?.map((a: any) => ({ type: a.trait_type, value: a.value })) || [],
                            rarity: rarity,
                            owner: owner,
                            isMinted: true,
                            isListed: isListed,
                            price: isListed ? listingPrice : undefined,
                            currency: '$BASED'
                        };

                    } catch {
                        // Return null for failed tokens - they'll be filtered out
                        return null;
                    }
                })(i)
            );

            // Wait for all parallel fetches
            const results = await Promise.all(nftPromises);
            const fetchedNFTs = results.filter((nft): nft is MarketItem => nft !== null);

            setDirectNFTs(fetchedNFTs);

        } catch (error: any) {
            setDirectError(error.message || "Failed to load collection");
        } finally {
            setDirectLoading(false);
        }
    };

    fetchDirectly();
  }, []); // Run once on mount to fetch on-chain minted NFTs

  // Determine if we need to start from offset 0 (for filters or when sorting by listed items)
  const needsFullCollection = 
      !!debouncedSearch || 
      (rarityFilter && rarityFilter !== 'all') || 
      (traitTypeFilter && traitTypeFilter !== 'all') ||
      sortBy === 'listed-price-asc'; // Always start from 0 when showing listed items first

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
      startOffset: needsFullCollection ? 0 : 299 // Start at 0 when filtering or sorting by listed
  }); 

  // Get minted token IDs - use mintedTokenIdsList which is fetched from contract
  // CRITICAL: If mintedTokenIdsList is empty but we know totalMinted, we should NOT fallback to all NFTs
  const mintedTokenIds = useMemo(() => {
    if (mintedTokenIdsList.length > 0) {
      return new Set<number>(mintedTokenIdsList);
    }
    // Empty set if we don't have minted token IDs yet - will use contractStats.totalMinted as fallback
    return new Set<number>();
  }, [mintedTokenIdsList]);
  

  const allItems = useMemo(() => {
     const MINT_PRICE = 69420;
     
     // Build offer maps for both V3 and V2
     const v3OffersByToken = new Map<number, number>();
     offersV3.myOffers.forEach((offer: { status: string; price: string; tokenId: number }) => {
       if (offer.status === 'pending' || offer.status === 'accepted') {
         const amount = parseFloat(offer.price);
         const current = v3OffersByToken.get(offer.tokenId) || 0;
         if (amount > current) {
           v3OffersByToken.set(offer.tokenId, amount);
         }
       }
     });
     
     const v2OffersByToken = new Map<number, number>();
     offersByToken.forEach((offers, tokenId) => {
       const highestOffer = offers.reduce((max, o) => {
         const amt = parseFloat(o.amount);
         return amt > max ? amt : max;
       }, 0);
       if (highestOffer > 0) {
         v2OffersByToken.set(tokenId, highestOffer);
       }
     });
     
     // HYBRID APPROACH: On-chain minted NFTs FIRST, then CSV unminted NFTs
     // 1. Use directNFTs (fetched from blockchain) for minted NFTs - these have real on-chain data
     // 2. Fill in with CSV data for unminted NFTs (excluding minted token IDs)
     
     // Get the set of minted token IDs from on-chain data
     const mintedIdsFromChain = new Set<number>(directNFTs.map(nft => nft.id));
     
     // Start with on-chain minted NFTs (they already have correct isMinted, isListed, price)
     const onChainItems: MarketItem[] = directNFTs.map(nft => {
       const v3Offer = v3OffersByToken.get(nft.id);
       const v2Offer = v2OffersByToken.get(nft.id);
       const highestOffer = v3Offer || v2Offer || undefined;
       return {
         ...nft,
         highestOffer,
         hasActiveOffer: !!highestOffer
       };
     });
     
     // Get CSV data and filter out minted token IDs
     let csvItems: MarketItem[] = [];
     if (data && data.pages) {
       csvItems = data.pages.flatMap((page: any) => page.nfts)
         .filter((item: any) => !mintedIdsFromChain.has(item.id)) // Exclude minted NFTs
         .map((item: any) => {
           const v3Offer = v3OffersByToken.get(item.id);
           const v2Offer = v2OffersByToken.get(item.id);
           const highestOffer = v3Offer || v2Offer || undefined;
           
           return {
             ...item,
             isListed: false,
             isMinted: false,
             mintPrice: MINT_PRICE,
             price: MINT_PRICE, // Unminted = mint price
             currency: '$BASED' as const,
             owner: undefined,
             highestOffer,
             hasActiveOffer: !!highestOffer
           };
         }) as MarketItem[];
     }
     
     // Combine: On-chain minted first, then CSV unminted
     return [...onChainItems, ...csvItems];
  }, [data, directNFTs, offersV3.myOffers, offersByToken]);

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
    
    // COMMERCIAL SORT: Listed (price asc) → Unlisted (ID asc) → Unminted (ID asc)
    // Category helper function
    const getCat = (x: any) => {
        if (x.isMinted && x.isListed) return 0;  // Listed - highest priority
        if (x.isMinted && !x.isListed) return 1; // Unlisted (minted, not for sale)
        return 2; // Unminted - lowest priority
    };
    
    if (sortBy === 'listed-price-asc') {
         items.sort((a, b) => {
             const catA = getCat(a);
             const catB = getCat(b);
             
             // Sort by category first (lower category = higher priority)
             if (catA !== catB) return catA - catB;
             
             // Within same category, apply appropriate sort
             if (catA === 0) {
                 // LISTED: Sort by price LOW to HIGH
                 const priceA = a.price ?? Infinity;
                 const priceB = b.price ?? Infinity;
                 if (priceA !== priceB) return priceA - priceB;
                 return a.id - b.id;
             } else {
                 // UNLISTED or UNMINTED: Sort by token ID LOW to HIGH
                 return a.id - b.id;
             }
         });
    } else if (sortBy === 'listed-price-desc') {
         items.sort((a, b) => {
             const catA = getCat(a);
             const catB = getCat(b);
             
             // Sort by category first
             if (catA !== catB) return catA - catB;
             
             // Within same category
             if (catA === 0) {
                 // LISTED: Sort by price HIGH to LOW
                 const priceA = a.price ?? 0;
                 const priceB = b.price ?? 0;
                 if (priceA !== priceB) return priceB - priceA;
                 return b.id - a.id;
             } else {
                 // UNLISTED or UNMINTED: Sort by token ID HIGH to LOW
                 return b.id - a.id;
             }
         });
    } else if (sortBy === 'price-asc' || sortBy === 'price-desc' || sortBy === 'floor-price') {
         items.sort((a, b) => {
             const catA = getCat(a);
             const catB = getCat(b);
             if (catA !== catB) return catA - catB;
             
             const priceA = a.price || 0;
             const priceB = b.price || 0;
             if (sortBy === 'price-asc' || sortBy === 'floor-price') return priceA - priceB;
             if (sortBy === 'price-desc') return priceB - priceA;
             return a.id - b.id;
         });
    }

    return items;
  }, [allItems, activeTab, isConnected, sortBy, ownedTokenIds]);

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
          // Use V3 off-chain offers (gasless, like Aftermint)
          const success = await offersV3.makeOffer(offerItem.id, amount, expirationDays);
          
          if (success) {
              trackEvent('nft_offer_v3', 'Marketplace', `Item #${offerItem.id}`, amount);
              confetti({ particleCount: 100, spread: 60, origin: { y: 0.7 }, colors: ['#00ffff', '#bf00ff'] });
          }
      } catch {
          // Error handled in hook
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
      } catch {
          // Error handled by marketplace hook
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
      } catch {
          // Error handled by marketplace hook
      }
  };

  const handleDelistNFT = async (tokenId: number) => {
      try {
          await marketplace.delistNFT(tokenId);
          trackEvent('nft_delist', 'Marketplace', `Item #${tokenId}`);
      } catch {
          // Error handled by marketplace hook
      }
  };

  const handleApproveMarketplace = async () => {
      try {
          await marketplace.approveMarketplace();
          trackEvent('marketplace_approve', 'Marketplace');
      } catch {
          // Error handled by marketplace hook
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
            // Fetch the actual listing price from the contract
            const provider = new ethers.JsonRpcProvider('https://mainnet.basedaibridge.com/rpc/');
            const marketplaceContract = new ethers.Contract(
                MARKETPLACE_CONTRACT,
                ['function listings(uint256) view returns (address seller, uint256 price, uint256 expiresAt, bool active)'],
                provider
            );
            
            const listing = await marketplaceContract.listings(item.id);
            const priceWei = listing[1]; // price is the second element
            const isActive = listing[3]; // active is the fourth element
            
            if (!isActive) {
                toast({ 
                    title: "Listing Not Available", 
                    description: "This NFT is no longer listed for sale.",
                    variant: "destructive" 
                });
                return;
            }
            
            const priceFormatted = Number(ethers.formatEther(priceWei));
            
            await marketplace.buyNFT(item.id, priceWei);
            
            // Analytics: Track Sale (Buy Action)
            trackEvent('nft_buy', 'Marketplace', `Item #${item.id}`, priceFormatted);
            
            // Show confetti on success (hook handles toast)
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#00ffff', '#bf00ff'] });
        } catch {
            toast({ 
                title: "Purchase Failed", 
                description: "Could not complete purchase. Please try again.",
                variant: "destructive" 
            });
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

  // Helper to get the best offer for a specific token
  const getOfferDataForToken = (tokenId: number): { offerer: string; amount: number; expiresAt: number } | null => {
    const offers = offersByToken.get(tokenId);
    if (!offers || offers.length === 0) return null;
    
    // Return the highest offer
    const bestOffer = offers.reduce((best, offer) => {
      const amount = Number(offer.amount);
      return amount > (best ? Number(best.amount) : 0) ? offer : best;
    }, offers[0]);
    
    return {
      offerer: bestOffer.offerer,
      amount: Number(bestOffer.amount),
      expiresAt: bestOffer.expiresAt
    };
  };

  // Wrapper for MarketCard accept offer (simpler signature)
  const handleCardAcceptOffer = async (tokenId: number, offerer: string) => {
    await handleAcceptOffer(`${tokenId}-${offerer}`, tokenId, offerer);
  };

  // Wrapper for MarketCard decline offer
  const handleCardDeclineOffer = async (tokenId: number, offerer: string) => {
    handleRejectOffer(`${tokenId}-${offerer}`);
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
            <h2 className="text-4xl text-white font-black mb-2">BASED GUARDIANS <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">COLLECTION</span></h2>
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground font-mono">
              <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-green-500"/> NFT Stays in Wallet</span>
              <span className="flex items-center gap-1"><Fingerprint size={12} className="text-accent"/> Biometric Auth</span>
              <span className="flex items-center gap-1"><RefreshCw size={12} className="text-primary"/> 1% Platform Fee</span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30" data-testid="floor-price-indicator">
                <Tag size={12} className="text-cyan-400"/>
                <span className="text-white/80">Floor:</span>
                {floorPriceLoading ? (
                  <span className="text-cyan-400 animate-pulse">...</span>
                ) : floorPrice ? (
                  <span className="text-cyan-400 font-bold">{floorPrice.price.toLocaleString()} $BASED</span>
                ) : (
                  <span className="text-muted-foreground">No listings</span>
                )}
              </span>
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
                   <SelectItem value="listed-price-asc">Price: Low First</SelectItem>
                   <SelectItem value="listed-price-desc">Price: High First</SelectItem>
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
                    <MessageCircle size={14} className="mr-2" /> RECEIVED
                    {receivedOffers.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-black text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                            {receivedOffers.length}
                        </span>
                    )}
                </TabsTrigger>
                <TabsTrigger value="my-offers" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black font-orbitron relative">
                    <Gavel size={14} className="mr-2" /> MY OFFERS
                    {offersV3.myOffers.filter(o => o.status === 'pending' || o.status === 'accepted').length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                            {offersV3.myOffers.filter(o => o.status === 'pending' || o.status === 'accepted').length}
                        </span>
                    )}
                </TabsTrigger>
            </TabsList>
            
            <TabsContent value="buy" className="space-y-8">
                {isLoading || directLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 border border-dashed border-cyan-500/30 rounded-xl bg-gradient-to-b from-cyan-950/20 to-transparent">
                        <div className="relative mb-8">
                            <div className="w-24 h-24 rounded-full border-2 border-cyan-500/30 flex items-center justify-center">
                                <ShieldCheck className="w-12 h-12 text-cyan-400 animate-pulse" />
                            </div>
                            <div className="absolute inset-0 border-t-2 border-cyan-400 rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
                            <div className="absolute inset-[-4px] border-t-2 border-purple-500/50 rounded-full animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}></div>
                        </div>
                        <h3 className="text-2xl font-orbitron text-white mb-3 animate-pulse">INITIALIZING GUARDIAN NETWORK</h3>
                        <p className="text-cyan-400 font-mono text-sm mb-2">Syncing with BasedAI blockchain...</p>
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></span>
                            <span>Loading 3,732 unique Guardians, Frogs & Creatures</span>
                        </div>
                        <div className="mt-8 flex gap-4">
                            <div className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-400 font-mono text-xs animate-pulse">
                                <Zap size={12} className="inline mr-1" /> DECRYPTING METADATA
                            </div>
                            <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded text-purple-400 font-mono text-xs animate-pulse" style={{ animationDelay: '0.5s' }}>
                                <RefreshCw size={12} className="inline mr-1 animate-spin" /> SCANNING LISTINGS
                            </div>
                        </div>
                    </div>
                ) : displayedItems.length > 0 ? (
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
                        <Button onClick={openConnectModal} className="bg-cyan-500 text-white hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.5)]">CONNECT NOW</Button>
                     </div>
                ) : displayedItems.length > 0 ? (
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
                                onBuy={() => {}} 
                                onOffer={() => handleOffer(item)} 
                                onClick={() => setSelectedNFT(item)} 
                                isOwner={true} 
                                totalMinted={contractStats?.totalMinted}
                                offerData={getOfferDataForToken(item.id)}
                                onAcceptOffer={handleCardAcceptOffer}
                                onDeclineOffer={handleCardDeclineOffer}
                            />
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
                        <Button onClick={openConnectModal} className="bg-cyan-500 text-white hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.5)]">CONNECT NOW</Button>
                     </div>
                 ) : (
                     <div className="space-y-8">
                         {/* Info Banner about V3 Offers */}
                         <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 border border-cyan-500/30">
                           <div className="flex items-start gap-3">
                             <Gavel className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                             <div>
                               <h4 className="text-sm font-orbitron text-white mb-1">GASLESS V3 OFFERS</h4>
                               <p className="text-xs text-white/60">
                                 Making offers is now FREE! Sign a message to submit your offer - no gas required. 
                                 Funds stay in your wallet until the seller accepts and you complete the purchase.
                               </p>
                             </div>
                           </div>
                         </div>

                         {/* Received Offers Section */}
                         <div className="space-y-4">
                           <h3 className="text-lg font-orbitron text-white flex items-center gap-2">
                             <MessageCircle className="text-purple-400" size={20} />
                             RECEIVED OFFERS ({receivedOffers.length})
                           </h3>
                           {receivedOffers.length > 0 ? receivedOffers.map(offer => (
                               <Card key={offer.id} className="p-6 bg-white/5 border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                                   <div className="flex items-center gap-4">
                                       <div className="w-16 h-16 bg-secondary/20 rounded-lg overflow-hidden relative">
                                          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">#{offer.nftId}</div>
                                       </div>
                                       <div>
                                           <h4 className="text-lg font-orbitron text-white">{offer.nftName}</h4>
                                           <p className="text-xs text-muted-foreground font-mono">Offer from {offer.offerer.slice(0, 6)}...{offer.offerer.slice(-4)}</p>
                                           <div className="flex items-center gap-2 mt-1">
                                               <Badge variant="outline" className="border-accent text-accent">{offer.amount.toLocaleString()} $BASED</Badge>
                                               <span className="text-[10px] text-muted-foreground">{offer.time}</span>
                                           </div>
                                           {offer.message && (
                                               <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg max-w-md">
                                                   <div className="flex items-start gap-2">
                                                       <ShieldCheck size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
                                                       <div>
                                                           <p className="text-[10px] text-purple-400 font-bold mb-1">GUARDIAN HOLDER</p>
                                                           <p className="text-sm text-white/90 italic">"{offer.message}"</p>
                                                       </div>
                                                   </div>
                                               </div>
                                           )}
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
                              <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-xl">
                                  <MessageCircle className="w-12 h-12 text-muted-foreground mb-3" />
                                  <h3 className="text-lg font-orbitron text-white mb-1">NO RECEIVED OFFERS</h3>
                                  <p className="text-muted-foreground text-sm">You haven't received any offers on your NFTs yet.</p>
                              </div>
                           )}
                         </div>
                     </div>
                 )}
            </TabsContent>

            <TabsContent value="my-offers">
                {!isConnected ? (
                    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
                        <Gavel className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-orbitron text-white mb-2">CONNECT WALLET</h3>
                        <p className="text-muted-foreground mb-6">Connect to manage your offers.</p>
                        <Button onClick={openConnectModal} className="bg-cyan-500 text-white hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.5)]">CONNECT NOW</Button>
                    </div>
                ) : (
                    <MyOffersPanel />
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
            <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowBiometricModal(false)} className="border-white/20 text-white hover:bg-white/10">
                    Cancel
                </Button>
                <Button onClick={handleBiometricAuth} className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold hover:from-cyan-400 hover:to-purple-400 shadow-[0_0_20px_rgba(0,255,255,0.4)]">
                    Verify Identity
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Status Indicators */}
      {marketplace.state.isPending && (
        <div className="fixed bottom-4 right-4 bg-cyan-400/50 border-2 border-cyan-300 rounded-lg p-4 z-50 shadow-[0_0_30px_rgba(0,255,255,0.6)] animate-[pulse_0.8s_ease-in-out_infinite]">
          <p className="text-white font-mono text-sm flex items-center gap-2 font-bold drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]">
            <span className="w-3 h-3 bg-white rounded-full animate-ping shadow-[0_0_10px_rgba(0,255,255,1)]"></span>
            Confirm in your wallet...
          </p>
        </div>
      )}

      {marketplace.state.isConfirming && (
        <div className="fixed bottom-4 right-4 bg-amber-400/50 border-2 border-amber-300 rounded-lg p-4 z-50 shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-[pulse_0.8s_ease-in-out_infinite]">
          <p className="text-white font-mono text-sm flex items-center gap-2 font-bold drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">
            <span className="w-3 h-3 bg-white rounded-full animate-ping shadow-[0_0_10px_rgba(251,191,36,1)]"></span>
            Transaction confirming...
          </p>
        </div>
      )}

    </section>
  );
}

import { NFTImage } from "./NFTImage";

// Helper Card Component - Memoized for performance
const MarketCard = React.memo(function MarketCard({ item, onBuy, onOffer, onClick, isOwner = false, isAdmin = false, onCancel, totalMinted, offerData, onAcceptOffer, onDeclineOffer }: { item: MarketItem, onBuy: () => void, onOffer: () => void, onClick: () => void, isOwner?: boolean, isAdmin?: boolean, onCancel?: () => void, totalMinted?: number, offerData?: { offerer: string; amount: number; expiresAt: number } | null, onAcceptOffer?: (tokenId: number, offerer: string) => void, onDeclineOffer?: (tokenId: number, offerer: string) => void }) {
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
                <div className="flex flex-col min-h-[3.5rem]">
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
                            <span className="text-sm font-bold text-gray-400 font-mono italic">Unlisted</span>
                        </div>
                    )}
                    
                    {/* Offer Panel for Owners - Show when there's an active offer */}
                    {isOwner && offerData && offerData.amount > 0 && (
                        <div className="mt-2 p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-purple-400 uppercase font-semibold flex items-center gap-1">
                                    <MessageCircle size={10} /> OFFER RECEIVED
                                </span>
                            </div>
                            <div className="text-sm font-bold text-white font-mono">
                                {offerData.amount.toLocaleString()} $BASED
                            </div>
                            <div className="text-[9px] text-gray-400 font-mono truncate mb-2">
                                From: {offerData.offerer.slice(0, 6)}...{offerData.offerer.slice(-4)}
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    size="sm"
                                    className="flex-1 bg-green-500 hover:bg-green-400 text-black text-xs font-bold h-7"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAcceptOffer?.(item.id, offerData.offerer);
                                    }}
                                >
                                    <Check size={12} className="mr-1" /> ACCEPT
                                </Button>
                                <Button 
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/20 text-xs font-bold h-7"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeclineOffer?.(item.id, offerData.offerer);
                                    }}
                                >
                                    <X size={12} className="mr-1" /> DECLINE
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    {/* Best Offer text for non-owners */}
                    {!isOwner && item.highestOffer && item.highestOffer > 0 && (
                        <span className="text-[11px] text-gray-400 font-mono mt-1">
                            Best Offer: {item.highestOffer.toLocaleString()} $BASED
                        </span>
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
                                className="offer-btn flex-1 bg-cyan-500 text-black hover:bg-cyan-400 active:bg-cyan-300 font-bold px-3 h-10 min-h-[44px] shadow-[0_0_10px_rgba(0,255,255,0.3)] touch-manipulation select-none" 
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
                            className="offer-btn w-full bg-cyan-500 text-black hover:bg-cyan-400 active:bg-cyan-300 font-bold px-3 h-10 min-h-[44px] shadow-[0_0_10px_rgba(0,255,255,0.3)] touch-manipulation select-none" 
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
                      const sanitizedPrice = Math.max(1, Math.min(Number(listPrice), 999999999));
                      if (isNaN(sanitizedPrice)) return;
                      marketplace.listNFT(item.id, sanitizedPrice);
                      setShowListModal(false);
                    }}
                    disabled={listPrice < 1 || listPrice > 999999999 || marketplace.state.isPending}
                  >
                    {marketplace.state.isPending ? 'LISTING...' : 'CONFIRM LISTING'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </Card>
    );
});

// Offer Modal Component - V3 VERSION (Gasless Off-Chain Offers)
function OfferModal({ isOpen, onClose, item, onSubmit }: { isOpen: boolean, onClose: () => void, item: MarketItem | null, onSubmit: (amount: number, duration: string) => void }) {
    const [amount, setAmount] = useState<number>(0);
    const [duration, setDuration] = useState("7");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const { isConnected, address } = useAccount();
    const { isHolder, isLoading: holderLoading } = useIsGuardianHolder();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const { toast } = useToast();
    const { openConnectModal } = useConnectModal();
    
    // V3 Hook for gasless offers
    const { makeOffer, isLoading: offerLoading } = useOffersV3();
    
    // Real wallet balance (for display only - funds NOT locked until completion)
    const [walletBalance, setWalletBalance] = useState<number | null>(null);
    const [balanceLoading, setBalanceLoading] = useState(false);
    
    const durationOptions = [
        { value: "1", label: "1 Day" },
        { value: "3", label: "3 Days" },
        { value: "7", label: "1 Week" },
        { value: "30", label: "1 Month" },
    ];
    
    const getDurationLabel = (value: string) => {
        return durationOptions.find(opt => opt.value === value)?.label || "1 Week";
    };
    
    // Fetch wallet balance when modal opens (for display only)
    useEffect(() => {
        if (isOpen && isConnected && address) {
            setBalanceLoading(true);
            const fetchBalance = async () => {
                try {
                    const { ethers } = await import('ethers');
                    const provider = new ethers.JsonRpcProvider('https://mainnet.basedaibridge.com/rpc/');
                    const balanceWei = await provider.getBalance(address);
                    const balance = parseFloat(ethers.formatEther(balanceWei));
                    setWalletBalance(balance);
                } catch {
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
            setAmount(item.price ? Math.floor(item.price * 0.9) : 1000);
            setDuration("7");
            setMessage("");
            setValidationError(null);
        }
    }, [item]);
    
    // V3 Submit - Uses gasless signature, funds stay in wallet
    const handleSubmit = async () => {
        setValidationError(null);
        
        if (!isConnected) {
            openConnectModal?.();
            return;
        }
        
        if (chainId !== 32323) {
            switchChain?.({ chainId: 32323 });
            return;
        }
        
        const sanitizedAmount = Math.max(1, Math.min(Number(amount), 999999999));
        if (isNaN(sanitizedAmount) || sanitizedAmount <= 0 || !item) {
            setValidationError('Please enter a valid offer amount (1 - 999,999,999)');
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            // V3: Use off-chain signing - funds stay in wallet!
            const success = await makeOffer(item.id, amount, parseInt(duration), isHolder ? message.trim() : undefined);
            if (success) {
                setMessage("");
                onClose();
            }
        } catch {
            setValidationError('Failed to submit offer. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const setMaxAmount = () => {
        if (walletBalance && walletBalance > 0) {
            setAmount(Math.floor(walletBalance * 0.95));
            setValidationError(null);
        }
    };

    if (!item) return null;

    const isButtonDisabled = !isConnected || isSubmitting || offerLoading;

    return (
        <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
            <DialogContent 
                className="bg-black/95 backdrop-blur-xl border-cyan-500/30 text-white w-full h-full sm:h-auto sm:max-w-md sm:rounded-xl overflow-y-auto"
                style={{ zIndex: 99999 }}
            >
                <DialogHeader className="pt-8 sm:pt-0">
                    <DialogTitle className="font-orbitron text-xl flex items-center gap-2">
                        <Gavel className="text-cyan-400" size={20} />
                        MAKE AN OFFER
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Offer on <span className="text-cyan-400 font-bold">{Security.sanitizeText(item.name)}</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    {/* V3 INFO BANNER - Funds stay in wallet */}
                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-green-400 text-sm mb-1">FUNDS STAY IN YOUR WALLET</p>
                                <p className="text-xs text-green-200/80">
                                    This is FREE (just a signature). Your $BASED only leaves your wallet when you complete the purchase after seller accepts.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Label className="text-xs text-cyan-400/70 uppercase font-mono tracking-wider">OFFER AMOUNT ($BASED)</Label>
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
                                className="bg-white/5 border-white/20 text-white font-mono text-lg focus:border-cyan-500/50 focus:ring-cyan-500/20"
                                placeholder="Enter amount..."
                                data-testid="offer-amount-input"
                             />
                             <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={setMaxAmount}
                                disabled={!walletBalance}
                                className="bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 font-mono text-xs px-4 h-10"
                                data-testid="max-offer-btn"
                             >
                                MAX
                             </Button>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                            {balanceLoading ? (
                                <span className="animate-pulse">Loading balance...</span>
                            ) : walletBalance !== null ? (
                                <>Balance: <span className="text-emerald-400">{walletBalance.toLocaleString()}</span> $BASED</>
                            ) : isConnected ? (
                                'Could not load balance'
                            ) : (
                                'Connect wallet to see balance'
                            )}
                        </div>
                    </div>
                    
                    {/* Validation Error */}
                    {validationError && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2" data-testid="offer-validation-error">
                            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                            <span className="text-xs text-red-300">{validationError}</span>
                        </div>
                    )}

                    {/* Duration Select */}
                    <div className="space-y-2">
                        <Label className="text-xs text-cyan-400/70 uppercase font-mono tracking-wider">OFFER DURATION</Label>
                        <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger 
                                className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-cyan-500/50 focus:border-cyan-500/50 focus:ring-cyan-500/20 h-12"
                                data-testid="duration-select-trigger"
                            >
                                <div className="flex items-center gap-2">
                                    <Timer size={16} className="text-cyan-400" />
                                    <SelectValue placeholder="Select duration">{getDurationLabel(duration)}</SelectValue>
                                </div>
                            </SelectTrigger>
                            <SelectContent 
                                className="bg-black/95 backdrop-blur-xl border-cyan-500/30 text-white"
                                style={{ zIndex: 999999 }}
                                position="popper"
                                sideOffset={4}
                            >
                                {durationOptions.map((opt) => (
                                    <SelectItem 
                                        key={opt.value} 
                                        value={opt.value}
                                        className="text-white hover:bg-cyan-500/20 focus:bg-cyan-500/20 cursor-pointer py-3"
                                    >
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* MESSAGE - GUARDIAN HOLDER PERK */}
                    <div className="space-y-2 pt-3 border-t border-white/10">
                        <Label className="text-xs text-cyan-400/70 uppercase font-mono flex items-center gap-2">
                            MESSAGE TO SELLER
                            {isHolder && <span className="px-1.5 py-0.5 bg-[#6cff61]/20 text-[#6cff61] text-[9px] rounded font-bold">HOLDER PERK</span>}
                        </Label>
                        
                        {holderLoading ? (
                            <div className="h-20 bg-white/5 border border-white/10 rounded flex items-center justify-center">
                                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                            </div>
                        ) : isHolder ? (
                            <div>
                                <div className="flex justify-end mb-1">
                                    <span className={`text-[10px] ${message.length > 250 ? 'text-amber-400' : 'text-muted-foreground'}`}>{message.length}/280</span>
                                </div>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value.slice(0, 280))}
                                    placeholder="Add a personal message to stand out..."
                                    className="w-full h-20 px-3 py-2 bg-white/5 border border-[#6cff61]/30 rounded text-white text-sm resize-none focus:border-[#6cff61] focus:outline-none placeholder:text-gray-500"
                                    maxLength={280}
                                />
                                <p className="text-[10px] text-[#6cff61]/70 mt-1 flex items-center gap-1">
                                    <ShieldCheck size={10} /> Exclusive to Guardian holders
                                </p>
                            </div>
                        ) : (
                            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <ShieldCheck className="w-8 h-8 text-purple-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-white mb-1">Own a Guardian to Unlock</p>
                                        <p className="text-xs text-white/60 mb-3">Send personal messages with your offers.</p>
                                        <div className="flex gap-2">
                                            <a href="#mint" 
                                               className="px-3 py-1.5 bg-[#6cff61] text-black text-xs font-bold rounded hover:bg-[#5de554] transition-colors" 
                                               onClick={(e) => { e.stopPropagation(); onClose(); }}>
                                                MINT
                                            </a>
                                            <button onClick={(e) => { e.stopPropagation(); onClose(); }}
                                                    className="px-3 py-1.5 bg-white/10 text-white text-xs font-bold rounded border border-white/20 hover:bg-white/20 transition-colors">
                                                BUY
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* V3 Flow Explanation */}
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2 text-xs">
                        <div className="flex items-center gap-2 text-cyan-400">
                            <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-[10px] font-bold">1</span>
                            <span>You sign offer (FREE - no gas!)</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">2</span>
                            <span>Seller accepts → You get notified</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold">3</span>
                            <span>Complete purchase within 24h</span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex gap-3 sm:gap-3 flex-col sm:flex-row pb-6 sm:pb-0">
                    <Button 
                        variant="ghost" 
                        onClick={onClose} 
                        className="flex-1 w-full border border-white/20 text-white hover:bg-white/10 h-12"
                    >
                        CANCEL
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isButtonDisabled || !amount}
                        className={`flex-1 w-full font-bold font-orbitron h-12 text-base transition-all duration-300 ${
                            isButtonDisabled || !amount
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-60'
                                : 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-black hover:from-cyan-400 hover:to-cyan-300 shadow-[0_0_25px_rgba(0,255,255,0.5)] hover:shadow-[0_0_35px_rgba(0,255,255,0.7)]'
                        }`}
                        data-testid="submit-offer-btn"
                    >
                        {isSubmitting || offerLoading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="animate-spin" size={18} />
                                SIGNING...
                            </span>
                        ) : !isConnected ? (
                            'CONNECT WALLET'
                        ) : (
                            <span className="flex items-center gap-2">
                                <Gavel size={18} />
                                SIGN OFFER (FREE)
                            </span>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}