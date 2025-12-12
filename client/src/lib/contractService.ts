import { ethers } from 'ethers';

// Configuration
const CONFIG = {
  contractAddress: "0xaE51dc5fD1499A129f8654963560f9340773ad59",
  rpcUrl: "https://mainnet.basedaibridge.com/rpc//",
  chainId: 32323,
  explorerUrl: "https://explorer.bf1337.org",
  metadataBaseUrl: "https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeie3c5ahzsiiparmbr6lgdbpiukorbphvclx73dwr6vrjfalfyu52y/"
};

// Contract ABI
const CONTRACT_ABI = [
  "function totalMinted() view returns (uint256)",
  "function MAX_SUPPLY() view returns (uint256)",
  "function MINT_PRICE() view returns (uint256)",
  "function publicMintEnabled() view returns (bool)",
  "function revealed() view returns (bool)",
  "function paused() view returns (bool)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenByIndex(uint256 index) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

// Cache Storage
const CACHE = {
  stats: {
    data: null as any,
    timestamp: 0
  },
  metadata: new Map<string, any>()
};

const STATS_CACHE_DURATION = 15000; // 15 seconds
const MAX_RETRIES = 3;

// --- Helper Functions ---

/**
 * retry wrapper for async functions with exponential backoff
 */
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    
    const delay = Math.pow(2, MAX_RETRIES - retries) * 1000; // 1s, 2s, 4s
    console.warn(`[BlockchainService] Operation failed, retrying in ${delay}ms...`, error);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1);
  }
}

// --- Main Service Methods ---

/**
 * 1. initializeProvider()
 * Creates and returns an ethers.JsonRpcProvider
 */
export function initializeProvider() {
  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl, CONFIG.chainId);
    return provider;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Provider initialization failed:`, error);
    throw new Error("Failed to initialize blockchain provider");
  }
}

/**
 * 2. getCollectionStats()
 * Returns cached or fresh collection statistics
 */
export async function getCollectionStats() {
  try {
    // Check cache
    const now = Date.now();
    if (CACHE.stats.data && (now - CACHE.stats.timestamp < STATS_CACHE_DURATION)) {
      return CACHE.stats.data;
    }

    const provider = initializeProvider();
    const contract = new ethers.Contract(CONFIG.contractAddress, CONTRACT_ABI, provider);

    // Fetch all stats in parallel
    const [
      totalMinted,
      maxSupply,
      mintPrice,
      isPublicMintActive,
      isRevealed,
      isPaused
    ] = await withRetry(() => Promise.all([
      contract.totalMinted(),
      contract.MAX_SUPPLY(),
      contract.MINT_PRICE(),
      contract.publicMintEnabled(),
      contract.revealed(),
      contract.paused()
    ]));

    const stats = {
      totalMinted: Number(totalMinted),
      maxSupply: Number(maxSupply),
      remaining: Number(maxSupply) - Number(totalMinted),
      percentMinted: ((Number(totalMinted) / Number(maxSupply)) * 100).toFixed(2),
      mintPriceWei: mintPrice,
      mintPriceFormatted: "69,420 $BASED", // Hardcoded per requirement, or could derive from ethers.formatEther(mintPrice)
      isPublicMintActive,
      isRevealed,
      isPaused,
      contractAddress: CONFIG.contractAddress
    };

    // Update Cache
    CACHE.stats.data = stats;
    CACHE.stats.timestamp = now;

    return stats;
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Error fetching collection stats:`, error);
    return { success: false, error: error.message || "Failed to fetch stats" };
  }
}

/**
 * 3. getRecentMints(count)
 * Returns array of recently minted tokens with metadata
 */
export async function getRecentMints(count = 12) {
  try {
    const provider = initializeProvider();
    const contract = new ethers.Contract(CONFIG.contractAddress, CONTRACT_ABI, provider);

    // Get total minted first to know where to start
    const totalMintedBig = await withRetry(() => contract.totalMinted());
    const totalMinted = Number(totalMintedBig);

    if (totalMinted === 0) return [];

    const startIndex = Math.max(0, totalMinted - 1);
    const endIndex = Math.max(0, totalMinted - count);
    
    const promises = [];

    // Iterate backwards from latest mint
    for (let i = startIndex; i >= endIndex; i--) {
      promises.push((async () => {
        try {
          // Get Token ID by Index (Enumerable)
          // Note: If tokenByIndex is expensive or not supported, we might assume ID = index + 1 for sequential mints
          // But prompt specifically asked for tokenByIndex
          const tokenId = await withRetry(() => contract.tokenByIndex(i));
          const id = Number(tokenId);
          
          // Get Owner
          const owner = await withRetry(() => contract.ownerOf(id));

          // Get Metadata
          const metadata = await getMetadata(id);

          return {
            tokenId: id,
            owner,
            name: metadata.name || `Guardian #${id}`,
            image: metadata.image ? metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/") : "",
            description: metadata.description,
            attributes: metadata.attributes,
            rarity: extractRarity(metadata.attributes)
          };
        } catch (err) {
          console.warn(`Failed to fetch recent mint at index ${i}`, err);
          return null;
        }
      })());
    }

    const results = await Promise.all(promises);
    return results.filter(item => item !== null);

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Error fetching recent mints:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 4. getTokenDetails(tokenId)
 * Returns full token data including metadata
 */
export async function getTokenDetails(tokenId: number) {
  try {
    const provider = initializeProvider();
    const contract = new ethers.Contract(CONFIG.contractAddress, CONTRACT_ABI, provider);

    const [owner, tokenUri] = await withRetry(() => Promise.all([
      contract.ownerOf(tokenId),
      contract.tokenURI(tokenId)
    ]));

    const metadata = await getMetadata(tokenId);
    
    // Parse attributes into key-value object
    const attributesMap: Record<string, string> = {};
    if (metadata.attributes && Array.isArray(metadata.attributes)) {
      metadata.attributes.forEach((attr: any) => {
        if (attr.trait_type) {
          attributesMap[attr.trait_type] = attr.value;
        }
      });
    }

    return {
      tokenId,
      owner,
      tokenUri,
      metadata,
      attributes: attributesMap
    };
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Error fetching token details for #${tokenId}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 5. getOwnerTokens(address)
 * Returns array of tokenIds owned by address
 * Note: This can be slow without an indexer if balanceOf is high
 */
export async function getOwnerTokens(address: string) {
  try {
    const provider = initializeProvider();
    const contract = new ethers.Contract(CONFIG.contractAddress, CONTRACT_ABI, provider);

    const balanceBig = await withRetry(() => contract.balanceOf(address));
    const balance = Number(balanceBig);

    if (balance === 0) return [];

    // Use tokenOfOwnerByIndex if available (usually in Enumerable), but ABI didn't list it in the array provided in prompt.
    // The prompt ABI list has `tokenByIndex` (global) but not `tokenOfOwnerByIndex`.
    // Without `tokenOfOwnerByIndex`, we can't efficiently get owner tokens from the contract alone unless we iterate ALL tokens.
    // However, if the user requested it and provided that specific ABI, maybe they assume we can use `tokenOfOwnerByIndex`?
    // Or maybe they mistakenly omitted it.
    // If we strictly follow the provided ABI, we cannot implement this efficiently. 
    // But since `tokenByIndex` (global) is there, it implies Enumerable. 
    // Usually Enumerable also has `tokenOfOwnerByIndex(owner, index)`.
    // I will try to call `tokenOfOwnerByIndex` assuming standard Enumerable behavior, 
    // OR if I must stick STRICTLY to the provided ABI array, I can't do it efficiently.
    // I'll add `tokenOfOwnerByIndex` to the local ABI definition to support this requirement efficiently.
    
    // Updated ABI locally for this function
    const ENUMERABLE_ABI = [
      ...CONTRACT_ABI,
      "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)"
    ];
    
    const enumContract = new ethers.Contract(CONFIG.contractAddress, ENUMERABLE_ABI, provider);

    const promises = [];
    for (let i = 0; i < balance; i++) {
        promises.push(withRetry(() => enumContract.tokenOfOwnerByIndex(address, i)));
    }

    const tokenIdsBig = await Promise.all(promises);
    return tokenIdsBig.map(id => Number(id));

  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Error fetching owner tokens for ${address}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 6. formatAddress(address)
 * Returns "0x1234...5678" format
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * 7. getExplorerUrl(type, value)
 * Returns explorer link
 */
export function getExplorerUrl(type: 'address' | 'token' | 'tx', value: string): string {
  const base = CONFIG.explorerUrl;
  switch (type) {
    case 'address':
      return `${base}/address/${value}`;
    case 'token':
      return `${base}/token/${CONFIG.contractAddress}/instance/${value}`;
    case 'tx':
      return `${base}/tx/${value}`;
    default:
      return base;
  }
}

// --- Internal Helpers ---

async function getMetadata(tokenId: number) {
  // Check cache
  const cacheKey = String(tokenId);
  if (CACHE.metadata.has(cacheKey)) {
    return CACHE.metadata.get(cacheKey);
  }

  try {
    const url = `${CONFIG.metadataBaseUrl}${tokenId}.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    // Cache permanently
    CACHE.metadata.set(cacheKey, data);
    return data;
  } catch (error) {
    console.warn(`Failed to fetch metadata for token #${tokenId}`, error);
    return {};
  }
}

function extractRarity(attributes: any[]): string {
  if (!attributes || !Array.isArray(attributes)) return "Common";
  const rarityTrait = attributes.find(a => 
    a.trait_type && (a.trait_type.includes("Rarity") || a.trait_type === "Rarity Level")
  );
  return rarityTrait ? rarityTrait.value : "Common";
}
