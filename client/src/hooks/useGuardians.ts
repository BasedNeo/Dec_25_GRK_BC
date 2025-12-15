import { useInfiniteQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { MOCK_GUARDIANS, Guardian } from "@/lib/mockData";
import { fetchGuardiansPage, PAGE_SIZE } from "@/lib/ipfs";
import { loadGuardiansFromCSV } from "@/lib/csvLoader";
import Fuse from 'fuse.js';
import { getCached, setCache, CACHE_KEYS } from "@/lib/cache";
import { fetchTokenByIndex, fetchTokenOwner, fetchTokenURI, fetchTotalSupply } from "@/lib/onchain";
import { IPFS_ROOT, MARKETPLACE_CONTRACT, CHAIN_ID } from "@/lib/constants";
import { ContractService } from "@/lib/contractService";
import { createPublicClient, http, formatEther } from 'viem';

// Marketplace ABI for fetching active listings
const MARKETPLACE_ABI = [
  {
    name: 'getActiveListings',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'getListing',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'seller', type: 'address' },
      { name: 'price', type: 'uint256' },
      { name: 'listedAt', type: 'uint256' },
      { name: 'active', type: 'bool' }
    ],
  },
] as const;

// Create public client for reading marketplace data
const publicClient = createPublicClient({
  chain: {
    id: CHAIN_ID,
    name: 'BasedAI',
    nativeCurrency: { name: 'BASED', symbol: 'BASED', decimals: 18 },
    rpcUrls: { default: { http: ['https://mainnet.basedaibridge.com/rpc/'] } },
  },
  transport: http('https://mainnet.basedaibridge.com/rpc/'),
});

// Fetch active listings from marketplace contract
async function fetchActiveListings(): Promise<Map<number, { price: number; seller: string }>> {
  const listingsMap = new Map<number, { price: number; seller: string }>();
  
  try {
    const activeIds = await publicClient.readContract({
      address: MARKETPLACE_CONTRACT as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'getActiveListings',
    }) as bigint[];
    
    if (activeIds && activeIds.length > 0) {
      const listingPromises = activeIds.map(async (tokenId) => {
        try {
          const listing = await publicClient.readContract({
            address: MARKETPLACE_CONTRACT as `0x${string}`,
            abi: MARKETPLACE_ABI,
            functionName: 'getListing',
            args: [tokenId],
          });
          
          if (listing && listing[3]) { // active
            // Price is stored in wei (with 18 decimals), convert to whole tokens
            const priceInWei = listing[1] as bigint;
            const priceInTokens = Number(priceInWei) / 1e18;
            console.log(`[Listings] Token ${tokenId}: ${priceInTokens} $BASED (raw: ${priceInWei})`);
            listingsMap.set(Number(tokenId), {
              price: priceInTokens,
              seller: listing[0] as string,
            });
          }
        } catch (e) {
          // Ignore individual listing errors
        }
      });
      
      await Promise.all(listingPromises);
    }
  } catch (e) {
    console.error('[useGuardians] Failed to fetch active listings:', e);
  }
  
  return listingsMap;
}

export interface GuardianFilters {
  search?: string;
  rarity?: string;
  traitType?: string;
  traitValue?: string;
  sortBy?: string;
  owner?: string; // Add owner filter
  startOffset?: number; // Starting offset for pagination (e.g., 299 to start at #300)
}

export function useGuardians(
  useMockData: boolean = false, 
  useCsvData: boolean = false, // Changed default to false to prioritize Live Chain
  filters: GuardianFilters = {}
) {
  const { address } = useAccount();

  return useInfiniteQuery({
    queryKey: ['nfts', address, useMockData, useCsvData, filters],
    initialPageParam: filters.startOffset ?? 0, // Start at specified offset or 0
    queryFn: async ({ pageParam = 0 }: { pageParam: unknown }): Promise<{ nfts: Guardian[], nextCursor?: number }> => {
      const startIndex = typeof pageParam === 'number' ? pageParam : 0;
      const cacheKey = `${CACHE_KEYS.NFT_METADATA}_${startIndex}_${JSON.stringify(filters)}`;
      
      // 1. Try Cache First (30 seconds validity as requested)
      const cached = getCached<{ nfts: Guardian[], nextCursor?: number }>(cacheKey, 30 * 1000);
      if (cached) {
          return cached;
      }

      // Check if we need to force CSV mode due to active filters (Search, Rarity, Traits, Sort, Owner)
      // IPFS/Live mode only supports simple pagination, so we switch to CSV index for advanced queries.
      const hasActiveFilters = 
          !!filters.search || 
          (filters.rarity && filters.rarity !== 'all') || 
          (filters.traitType && filters.traitType !== 'all') || 
          (filters.sortBy && filters.sortBy !== 'id-asc' && filters.sortBy !== 'id-desc' && filters.sortBy !== 'price-asc') || // Allow id-asc and id-desc in live mode
          !!filters.owner; // Owner filter forces CSV/Mock logic

      // 0. CSV DATA MODE (Explicitly requested OR Active Filters)
      if (useCsvData || hasActiveFilters) {
          try {
             let allGuardians = await loadGuardiansFromCSV();
             
             // --- FILTERING ENGINE ---

             // 0. Owner Filter (Mock Simulation)
             if (filters.owner) {
                 // In a real app, this would fetch from indexer or contract.
                 // For MOCKUP: We simulate ownership by picking a deterministic subset
                 // based on the wallet address (or just ID modulo).
                 
                 // If specific mock wallet (Admin), give them cool ones
                 if (filters.owner.toLowerCase() === "0xAe543104fDBe456478E19894f7F0e01f0971c9B4".toLowerCase()) {
                     allGuardians = allGuardians.filter(g => g.id <= 50); // Admin owns first 50
                 } else {
                     // Regular user: Owns items where ID % 42 == 0 (Approx 88 items)
                     allGuardians = allGuardians.filter(g => g.id % 42 === 0);
                 }
             }
             
             // 1. Text Search (Advanced)
             if (filters.search) {
                 const term = filters.search.trim();
                 
                 // A. Numeric Range Search (e.g. "Strength >= 8" or "high strength")
                 let processedTerm = term;
                 
                 // Keyword mapping for fuzzy numeric queries
                 if (term.toLowerCase().includes('high') || term.toLowerCase().includes('strong') || term.toLowerCase().includes('fast')) {
                     // Map "high strength" -> "Strength >= 8"
                     if (term.toLowerCase().includes('strength')) processedTerm = "Strength >= 8";
                     else if (term.toLowerCase().includes('speed')) processedTerm = "Speed >= 8";
                     else if (term.toLowerCase().includes('intellect')) processedTerm = "Intelligence >= 8";
                     // Default "high" to sorting or generic high stats? Let's assume Strength for now if generic
                 }

                 const rangeMatch = processedTerm.match(/^([a-zA-Z\s]+)\s*(>=|>|<=|<|=)\s*(\d+)$/i);
                 if (rangeMatch) {
                     const [_, traitName, operator, valueStr] = rangeMatch;
                     const value = parseInt(valueStr);
                     
                     allGuardians = allGuardians.filter(g => {
                         const trait = g.traits.find(t => t.type.toLowerCase() === traitName.trim().toLowerCase());
                         if (!trait) return false;
                         const traitVal = parseInt(trait.value);
                         if (isNaN(traitVal)) return false;

                         switch(operator) {
                             case '>=': return traitVal >= value;
                             case '>': return traitVal > value;
                             case '<=': return traitVal <= value;
                             case '<': return traitVal < value;
                             case '=': return traitVal === value;
                             default: return false;
                         }
                     });
                 } 
                 // B. Exact ID Search
                 else if (/^\d+$/.test(term)) {
                     const id = parseInt(term);
                     const exact = allGuardians.find(g => g.id === id);
                     if (exact) {
                         // If exact match found, put it first, but also keep others if fuzzy match enabled? 
                         // User said "3000 shows #3000". Usually implies just that one or that one top.
                         // Let's return just that one for exact ID search to be precise, or put it at top.
                         // "3000 finds #3000 first" implies ordering.
                         const others = allGuardians.filter(g => g.id !== id);
                         // We can also fuzzy search others? No, exact ID is usually specific.
                         allGuardians = [exact, ...others]; 
                         // Wait, if I type "3000", I probably ONLY want #3000.
                         // But if I type "300", I might want #300, #3000, #3001...
                         // Let's filter to include ID match or Name match.
                         allGuardians = allGuardians.filter(g => g.id.toString().includes(term) || g.name.toLowerCase().includes(term));
                         
                         // Sort exact match to top
                         allGuardians.sort((a, b) => {
                             if (a.id === id) return -1;
                             if (b.id === id) return 1;
                             return 0;
                         });
                     } else {
                         // No exact match, search ID substring
                         allGuardians = allGuardians.filter(g => g.id.toString().includes(term));
                     }
                 }
                 // C. Fuzzy Search (Fuse.js)
                 else {
                     const fuse = new Fuse(allGuardians, {
                         keys: [
                             { name: 'name', weight: 0.4 },
                             { name: 'traits.value', weight: 0.3 },
                             { name: 'traits.type', weight: 0.2 },
                             { name: 'rarity', weight: 0.1 }
                         ],
                         threshold: 0.3,
                         ignoreLocation: true
                     });
                     const results = fuse.search(term);
                     allGuardians = results.map(r => r.item);
                 }
             }

             // 2. Rarity Filter
             if (filters.rarity && filters.rarity !== 'all') {
                 allGuardians = allGuardians.filter(g => g.rarity?.toLowerCase() === filters.rarity?.toLowerCase());
             }

             // 3. Trait Filter
             if (filters.traitType && filters.traitType !== 'all') {
                 allGuardians = allGuardians.filter(g => g.traits.some(t => t.type === filters.traitType));
                 
                 if (filters.traitValue && filters.traitValue !== 'all') {
                     allGuardians = allGuardians.filter(g => 
                         g.traits.some(t => t.type === filters.traitType && t.value === filters.traitValue)
                     );
                 }
             }

             // 4. Fetch active listings and mark NFTs
             const activeListings = await fetchActiveListings();
             console.log(`[useGuardians] Active listings count: ${activeListings.size}`, Array.from(activeListings.entries()));
             
             // Mark listed NFTs with their listing data
             allGuardians = allGuardians.map(g => {
                 const listing = activeListings.get(g.id);
                 if (listing) {
                     console.log(`[useGuardians] Marking #${g.id} as listed at ${listing.price} $BASED`);
                     return { ...g, isListed: true, price: listing.price };
                 }
                 return { ...g, isListed: false };
             });
             
             // 5. Sorting - ALWAYS show listed NFTs first
             const rarityScore: Record<string, number> = { 
               'Rarest-Legendary': 8, 
               'Very Rare': 7, 
               'More Rare': 6, 
               'Rare': 5, 
               'Less Rare': 4, 
               'Less Common': 3, 
               'Common': 2, 
               'Most Common': 1 
             };
             
             // Log listed NFTs before sorting
             const listedNFTs = allGuardians.filter(g => g.isListed);
             console.log(`[useGuardians] Listed NFTs before sort:`, listedNFTs.map(g => ({ id: g.id, price: g.price })));
             console.log(`[useGuardians] Current sortBy: ${filters.sortBy}`);
             
             allGuardians.sort((a, b) => {
                 // For listed-price-asc: Listed NFTs first, sorted by price
                 if (filters.sortBy === 'listed-price-asc') {
                    // Listed NFTs come first
                    const aListed = a.isListed ? 1 : 0;
                    const bListed = b.isListed ? 1 : 0;
                    if (aListed !== bListed) return bListed - aListed;
                    // Both listed: sort by price ascending
                    if (a.isListed && b.isListed) {
                       return (a.price || 0) - (b.price || 0);
                    }
                    // Neither listed: sort by ID
                    return a.id - b.id;
                 }
                 
                 // For other sorts: apply directly without prioritizing listed
                 switch (filters.sortBy) {
                    case 'price-asc': return (a.price || 0) - (b.price || 0);
                    case 'price-desc': return (b.price || 0) - (a.price || 0);
                    case 'id-asc': return a.id - b.id;
                    case 'id-desc': return b.id - a.id;
                    case 'rarity-desc': return (rarityScore[b.rarity] || 0) - (rarityScore[a.rarity] || 0);
                    case 'rarity-asc': return (rarityScore[a.rarity] || 0) - (rarityScore[b.rarity] || 0);
                    default: return a.id - b.id; // Default to ID ascending
                 }
             });

             // Pagination logic
             const pageSize = 50; 
             const index = startIndex;
             const endIndex = index + pageSize;
             
             const nfts = allGuardians.slice(index, endIndex);
             // If we have more items after this page, next cursor is next index
             const nextCursor = endIndex < allGuardians.length ? endIndex : undefined;

             const result = { nfts, nextCursor };
             setCache(cacheKey, result);
             return result;
          } catch(e) {
             console.error("Failed to load CSV", e);
             return { nfts: [], nextCursor: undefined };
          }
      }

      // 1. MOCK DATA MODE
      if (useMockData) {
         return { nfts: MOCK_GUARDIANS, nextCursor: undefined };
      }
      
      // 2. LIVE CHAIN MODE (Default for Collection/Minted view)
      try {
        // Fetch Total Supply first - try ContractService first, fallback to viem
        let totalMinted = await ContractService.getTotalMinted();
        if (totalMinted === 0) {
            totalMinted = await fetchTotalSupply() || 0;
        }
        if (totalMinted === 0) {
            return { nfts: [], nextCursor: undefined };
        }

        const pageSize = 20; // Smaller batch size for live RPC calls
        
        let startIdx = startIndex;
        let endIdx = Math.min(startIndex + pageSize, totalMinted);
        let isReverse = false;

        // Handle Reverse Sort (Newest First)
        if (filters.sortBy === 'id-desc') {
            isReverse = true;
            // For reverse, startIndex is actually the offset from the end
            // Page 0 (startIndex 0): fetch totalMinted - 1 down to totalMinted - 20
            // Page 1 (startIndex 20): fetch totalMinted - 21 down to totalMinted - 40
        }
        
        // Loop from tokenByIndex(startIndex) to tokenByIndex(endIndex - 1)
        const promises = [];
        
        // Prepare indices to fetch
        const indicesToFetch = [];
        if (isReverse) {
             const start = totalMinted - 1 - startIndex;
             const end = Math.max(0, start - pageSize + 1);
             for (let i = start; i >= end; i--) {
                 indicesToFetch.push(i);
             }
        } else {
             for (let i = startIndex; i < endIdx; i++) {
                 indicesToFetch.push(i);
             }
        }

        for (const i of indicesToFetch) {
            promises.push((async (idx) => {
                try {
                    const tokenId = await fetchTokenByIndex(idx);
                    if (tokenId === null) return null;

                    const [owner, uri] = await Promise.all([
                        fetchTokenOwner(tokenId),
                        fetchTokenURI(tokenId)
                    ]);

                    // Metadata Fetching
                    let metadataUrl = uri;
                    if (uri && !uri.startsWith('http')) {
                        metadataUrl = `${IPFS_ROOT}${tokenId}.json`;
                    } else if (uri && uri.startsWith('ipfs://')) {
                        metadataUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
                    } else if (!uri) {
                        metadataUrl = `${IPFS_ROOT}${tokenId}.json`;
                    }

                    let metadata = { name: `Guardian #${tokenId}`, attributes: [] as any[] };
                    if (metadataUrl) {
                        try {
                            const res = await fetch(metadataUrl);
                            if (res.ok) metadata = await res.json();
                        } catch(e) { /* ignore */ }
                    }

                    const rarityAttr = metadata.attributes?.find((a: any) => a.trait_type === 'Rarity');
                    
                    return {
                        id: tokenId,
                        name: metadata.name,
                        image: `https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeif47552u34c3r46iy3p26h7j3a7b63d333p4m4r4v3r4b6x3d3d3y/${tokenId}.png`, // Direct image link optimization
                        rarity: rarityAttr ? rarityAttr.value : 'Common',
                        price: 0, 
                        owner: owner || undefined,
                        traits: metadata.attributes?.map((a: any) => ({ type: a.trait_type, value: a.value })) || []
                    } as Guardian;
                } catch(e) {
                    console.error("Error fetching token at index", idx, e);
                    return null;
                }
            })(i));
        }

        const results = await Promise.all(promises);
        const nfts = results.filter((n): n is Guardian => n !== null);
        
        // Next cursor calculation
        let nextCursor = undefined;
        if (isReverse) {
             // For reverse, we are done when we reach index 0 (or strictly when start - pageSize < 0)
             // But simpler: if we fetched pageSize items, there might be more. 
             // Total items is totalMinted. Current offset is startIndex.
             if (startIndex + pageSize < totalMinted) {
                 nextCursor = startIndex + pageSize;
             }
        } else {
             if (endIdx < totalMinted) {
                 nextCursor = endIdx;
             }
        }

        const result = { nfts, nextCursor };
        setCache(cacheKey, result);
        return result;

      } catch (e) {
        console.warn("Live chain fetch failed, falling back to CSV:", e);
        // Fallback to CSV if Live Chain fails
        try {
            const csvNfts = await loadGuardiansFromCSV();
            const pageSize = 50; 
            const endIndex = startIndex + pageSize;
            const nfts = csvNfts.slice(startIndex, endIndex);
            const nextCursor = endIndex < csvNfts.length ? endIndex : undefined;
            
            const result = { nfts, nextCursor };
            setCache(cacheKey, result);
            return result;
        } catch (csvErr) {
            console.error("Critical: Both Live and CSV failed", csvErr);
            return { nfts: [], nextCursor: undefined };
        }
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: true,
    staleTime: 30000, // 30s stale time
  });
}
