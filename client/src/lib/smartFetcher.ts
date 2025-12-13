import { publicClient } from './onchain';
import { NFT_CONTRACT } from './constants';
import { Guardian } from './mockData';
import { fetchGuardianMetadata } from './ipfs';

// --- Smart Caching System ---

const metadataCache = new Map<number, Guardian>();
const OWNERS_CACHE_KEY = 'bguard_owners_cache';
const STATS_CACHE_KEY = 'bguard_stats_cache';

// In-memory cache for owners to avoid reading localStorage every time
let ownersCache: Record<number, string> = {};

// Load caches on init
if (typeof window !== 'undefined') {
  try {
    const storedOwners = localStorage.getItem(OWNERS_CACHE_KEY);
    if (storedOwners) ownersCache = JSON.parse(storedOwners);
  } catch (e) {
    console.error("Failed to load owners cache", e);
  }
}

// Contract stats cache (30s)
let statsCache: { data: any, timestamp: number } | null = null;

// ABI snippets for Multicall
const ABI = [
  {
    inputs: [{ name: "index", type: "uint256" }],
    name: "tokenByIndex",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  }
] as const;

export async function fetchSmartMintedData() {
  // 1. Get Total Supply (Cached 30s)
  let totalSupply = 0;
  if (statsCache && Date.now() - statsCache.timestamp < 30000) {
    totalSupply = statsCache.data;
  } else {
    try {
        const supply = await publicClient.readContract({
            address: NFT_CONTRACT as `0x${string}`,
            abi: ABI,
            functionName: 'totalSupply',
        });
        totalSupply = Number(supply);
        statsCache = { data: totalSupply, timestamp: Date.now() };
    } catch (e) {
        console.warn("Failed to fetch live supply, defaulting to 0", e);
        return { nfts: [], distribution: {}, totalMinted: 0 };
    }
  }

  if (totalSupply === 0) return { nfts: [], distribution: {}, totalMinted: 0 };

  // 2. Identify New Tokens to Fetch
  // We assume tokens are indexed 0 to totalSupply-1
  // We check which ones we are missing owners/IDs for.
  // NOTE: For metadata, we cache aggressively. For owners, they can change, but for this "Minted" view
  // we primarily care about *new* mints. 
  // Optimization: We will only fetch indexes that we haven't seen "tokenByIndex" for, 
  // OR we refresh owners periodically.
  // For the user's request "Incremental Updates", let's assume we fetch new ones.

  const knownCount = Object.keys(ownersCache).length;
  
  // If we have more total supply than known owners, fetch the difference
  // AND maybe refresh the last 10 just in case.
  
  const startIndex = 0; 
  const endIndex = totalSupply;
  
  // We'll use a simplified strategy: 
  // 1. Fetch ALL Token IDs via Multicall (fast) to map Index -> TokenID
  // 2. Fetch Owners via Multicall
  // 3. Fetch Metadata (Parallel + Cached)
  
  // BATCHING: We can't fetch 3000 items in one multicall usually (RPC limits).
  // Let's do batches of 500.
  
  const BATCH_SIZE = 500;
  const allTokenIds: number[] = [];
  const allOwners: string[] = [];

  // Need to fetch indices [0 ... totalSupply-1]
  const missingIndices = [];
  for(let i=0; i<totalSupply; i++) {
      missingIndices.push(i);
  }

  // --- Step 1 & 2: Token IDs and Owners (Parallel Batches) ---
  // We actually need TokenID to get Owner. So we do TokenIDs first.
  
  // A. Get Token IDs
  const tokenIdsMap: Record<number, number> = {}; // Index -> TokenID
  
  for (let i = 0; i < totalSupply; i += BATCH_SIZE) {
      const batchIndices = missingIndices.slice(i, i + BATCH_SIZE);
      
      const calls = batchIndices.map(index => ({
          address: NFT_CONTRACT as `0x${string}`,
          abi: ABI,
          functionName: 'tokenByIndex',
          args: [BigInt(index)]
      }));

      try {
          const results = await publicClient.multicall({ contracts: calls });
          results.forEach((res, idx) => {
              if (res.status === 'success') {
                  tokenIdsMap[batchIndices[idx]] = Number(res.result);
              }
          });
      } catch (e) {
          console.error("Batch fetch tokenByIndex failed", e);
      }
  }

  const tokenIds = Object.values(tokenIdsMap);

  // B. Get Owners (for these Token IDs)
  // We can check cache first? Owners CHANGE, so we should probably refresh owners 
  // or at least new ones. For "Smart Caching", maybe we trust cache for old ones?
  // Let's fetch owners for ALL for accuracy (it's fast with multicall), 
  // but if we want strictly "Incremental", we only fetch new.
  // Let's fetch ALL owners to be safe (transfers happen), but in parallel batches.
  
  const ownersMap: Record<number, string> = {};

  for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
      const batchIds = tokenIds.slice(i, i + BATCH_SIZE);
      const calls = batchIds.map(id => ({
          address: NFT_CONTRACT as `0x${string}`,
          abi: ABI,
          functionName: 'ownerOf',
          args: [BigInt(id)]
      }));

      try {
          const results = await publicClient.multicall({ contracts: calls });
          results.forEach((res, idx) => {
              if (res.status === 'success') {
                  ownersMap[batchIds[idx]] = res.result as string;
              }
          });
      } catch (e) {
         console.error("Batch fetch ownerOf failed", e);
      }
  }

  // Update Cache
  ownersCache = { ...ownersCache, ...ownersMap };
  if (typeof window !== 'undefined') {
     localStorage.setItem(OWNERS_CACHE_KEY, JSON.stringify(ownersCache));
  }

  // --- Step 3: Metadata (Smart Caching) ---
  const nfts: Guardian[] = [];
  const distribution: Record<string, number> = {
    "Rarest-Legendary": 0, "Very Rare": 0, "More Rare": 0, "Rare": 0,
    "Less Rare": 0, "Less Common": 0, "Common": 0, "Most Common": 0
  };

  // Parallel Metadata Fetch with limit
  // We process in chunks to avoid network saturation
  const METADATA_CONCURRENCY = 20;
  
  for (let i = 0; i < tokenIds.length; i += METADATA_CONCURRENCY) {
      const batchIds = tokenIds.slice(i, i + METADATA_CONCURRENCY);
      
      const batchPromises = batchIds.map(async (id) => {
          // Check Memory Cache
          if (metadataCache.has(id)) return metadataCache.get(id)!;
          
          // Check LocalStorage
          const stored = typeof window !== 'undefined' ? localStorage.getItem(`bguard_nft_${id}`) : null;
          if (stored) {
              try {
                  const data = JSON.parse(stored);
                  metadataCache.set(id, data);
                  return data;
              } catch (e) { /* Invalid JSON, refetch */ }
          }
          
          // Fetch
          try {
              const data = await fetchGuardianMetadata(id);
              // Cache it
              metadataCache.set(id, data);
              if (typeof window !== 'undefined') {
                  localStorage.setItem(`bguard_nft_${id}`, JSON.stringify(data));
              }
              return data;
          } catch (e) {
              console.warn(`Failed to fetch metadata for #${id}`);
              return null;
          }
      });
      
      const results = await Promise.all(batchPromises);
      
      results.forEach(nft => {
          if (nft) {
              // Inject Owner
              nft.owner = ownersCache[nft.id] || 'Unknown';
              nfts.push(nft);
              
              // Distribution Stats
              let r = nft.rarity || 'Common';
              // Normalize rarity keys
              if (r === 'Rarest (1/1s)') r = 'Rarest-Legendary';
              if (r === 'Legendary') r = 'Rarest-Legendary';
              if (distribution[r] !== undefined) {
                  distribution[r]++;
              } else {
                  distribution['Common']++;
              }
          }
      });
  }

  return { nfts, distribution, totalMinted: totalSupply };
}
