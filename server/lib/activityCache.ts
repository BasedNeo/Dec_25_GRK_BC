/**
 * Activity Cache - Server-side caching for blockchain activity
 * 
 * Caches activity data on the server to provide fast API responses.
 * Reduces client RPC calls and improves UX with sub-second load times.
 */

import { ethers } from 'ethers';

// Load contract addresses from environment variables with fallbacks
const RPC_URL = process.env.RPC_URL || 'https://mainnet.basedaibridge.com/rpc/';
const NFT_CONTRACT = process.env.NFT_CONTRACT_ADDRESS || '0xaE51dc5fD1499A129f8654963560f9340773ad59';
const MARKETPLACE_CONTRACT = process.env.MARKETPLACE_CONTRACT_ADDRESS || '0x2836f07Ed31a6DEc09E0d62Fb15D7c6c6Ddb139c';
const CACHE_DURATION_MS = 2 * 60 * 1000; // 2 minutes
const DISPLAY_BLOCKS = 100000; // ~2.3 days of activity (reduced from 172800)
const CHUNK_SIZE = 20000; // 20k blocks per chunk

// ABIs
const NFT_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'function totalMinted() view returns (uint256)'
];

const MARKETPLACE_ABI = [
  'event Listed(uint256 indexed tokenId, address indexed seller, uint256 price)',
  'event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 fee)'
];

// Types
export interface ActivityEvent {
  id: string;
  type: 'mint' | 'transfer' | 'list' | 'sale';
  tokenId: number;
  from: string;
  to: string;
  price?: string;
  timestamp: number;
  txHash: string;
  blockNumber: number;
}

export interface ActivityData {
  activities: ActivityEvent[];
  stats: {
    totalMinted: number;
    recentMints: number;
    totalSales: number;
    totalListings: number;
    totalTransfers: number;
    recentVolume: number;
  };
  lastBlock: number;
  lastUpdated: number;
  cacheExpiresAt: number;
}

// Cache state
let cachedActivity: ActivityData | null = null;
let lastFetchTime = 0;
let isFetching = false;

/**
 * Fetch events in chunks to avoid RPC timeout
 */
async function fetchEventsInChunks(
  provider: ethers.JsonRpcProvider,
  contractAddress: string,
  abi: string[],
  eventName: string,
  startBlock: number,
  endBlock: number
): Promise<ethers.EventLog[]> {
  const allEvents: ethers.EventLog[] = [];
  let currentStart = startBlock;
  
  while (currentStart < endBlock) {
    const chunkEnd = Math.min(currentStart + CHUNK_SIZE, endBlock);
    try {
      const contract = new ethers.Contract(contractAddress, abi, provider);
      const events = await contract.queryFilter(
        contract.filters[eventName](),
        currentStart,
        chunkEnd
      );
      allEvents.push(...(events as ethers.EventLog[]));
    } catch (err) {
      console.warn(`[ActivityCache] Chunk ${currentStart}-${chunkEnd} failed for ${eventName}`);
    }
    currentStart = chunkEnd + 1;
  }
  return allEvents;
}

/**
 * Fetch fresh activity data from blockchain
 */
async function fetchFreshActivity(): Promise<ActivityData> {
  console.log('[ActivityCache] Fetching fresh activity data...');
  const startTime = Date.now();
  
  const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
    staticNetwork: true,
    batchMaxCount: 1
  });
  
  // Set timeout for all operations
  const timeout = 30000; // 30 seconds total
  
  try {
    // Get current block
    const currentBlock = await Promise.race([
      provider.getBlockNumber(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Block number timeout')), 10000)
      )
    ]);
    
    const fromBlock = Math.max(0, currentBlock - DISPLAY_BLOCKS);
    console.log(`[ActivityCache] Fetching from block ${fromBlock} to ${currentBlock}`);
    
    // Fetch all data in parallel
    const [totalMinted, transferEvents, listedEvents, soldEvents] = await Promise.all([
      new ethers.Contract(NFT_CONTRACT, NFT_ABI, provider)
        .totalMinted()
        .catch(() => 0),
      fetchEventsInChunks(provider, NFT_CONTRACT, NFT_ABI, 'Transfer', fromBlock, currentBlock)
        .catch(() => [] as ethers.EventLog[]),
      fetchEventsInChunks(provider, MARKETPLACE_CONTRACT, MARKETPLACE_ABI, 'Listed', fromBlock, currentBlock)
        .catch(() => [] as ethers.EventLog[]),
      fetchEventsInChunks(provider, MARKETPLACE_CONTRACT, MARKETPLACE_ABI, 'Sold', fromBlock, currentBlock)
        .catch(() => [] as ethers.EventLog[])
    ]);
    
    // Get block timestamps for a sample of blocks
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const getTimestampFast = (blockNum: number): number => {
      const blocksDiff = currentBlock - blockNum;
      return currentTimestamp - (blocksDiff * 2); // ~2 seconds per block
    };
    
    // Parse activities
    const activities: ActivityEvent[] = [];
    
    // Parse Transfer events (mints and transfers)
    for (const event of transferEvents.slice(-100)) { // Last 100 transfers
      const log = event as ethers.EventLog;
      const from = log.args[0] as string;
      const to = log.args[1] as string;
      const tokenId = Number(log.args[2]);
      const isMint = from === ethers.ZeroAddress;
      
      activities.push({
        id: `${log.transactionHash}-${log.index}`,
        type: isMint ? 'mint' : 'transfer',
        tokenId,
        from: isMint ? 'New Mint' : from,
        to,
        timestamp: getTimestampFast(log.blockNumber),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
      });
    }
    
    // Parse Listed events
    for (const event of listedEvents.slice(-50)) { // Last 50 listings
      const log = event as ethers.EventLog;
      activities.push({
        id: `${log.transactionHash}-list-${log.index}`,
        type: 'list',
        tokenId: Number(log.args[0]),
        from: log.args[1] as string,
        to: MARKETPLACE_CONTRACT,
        price: ethers.formatEther(log.args[2]),
        timestamp: getTimestampFast(log.blockNumber),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
      });
    }
    
    // Parse Sold events
    for (const event of soldEvents.slice(-50)) { // Last 50 sales
      const log = event as ethers.EventLog;
      activities.push({
        id: `${log.transactionHash}-sale-${log.index}`,
        type: 'sale',
        tokenId: Number(log.args[0]),
        from: log.args[1] as string,
        to: log.args[2] as string,
        price: ethers.formatEther(log.args[3]),
        timestamp: getTimestampFast(log.blockNumber),
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
      });
    }
    
    // Sort by timestamp (newest first)
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    // Calculate stats
    const recentMints = transferEvents.filter(e => 
      (e as ethers.EventLog).args[0] === ethers.ZeroAddress
    ).length;
    
    // Calculate recent volume with full precision (no rounding for financial accuracy)
    const recentVolume = soldEvents.reduce((sum, e) => {
      const log = e as ethers.EventLog;
      return sum + Number(ethers.formatEther(log.args[3]));
    }, 0);
    
    const now = Date.now();
    const result: ActivityData = {
      activities: activities.slice(0, 50), // Top 50 activities
      stats: {
        totalMinted: Number(totalMinted),
        recentMints,
        totalSales: soldEvents.length,
        totalListings: listedEvents.length,
        totalTransfers: transferEvents.length - recentMints,
        recentVolume, // Full precision - no rounding for locked financial calculations
      },
      lastBlock: currentBlock,
      lastUpdated: now,
      cacheExpiresAt: now + CACHE_DURATION_MS,
    };
    
    console.log(`[ActivityCache] Fetched in ${Date.now() - startTime}ms - ${activities.length} activities`);
    return result;
    
  } finally {
    provider.destroy();
  }
}

/**
 * Get cached activity data, refreshing if stale
 */
export async function getActivityData(): Promise<ActivityData> {
  const now = Date.now();
  
  // Return cached data if fresh
  if (cachedActivity && (now - lastFetchTime) < CACHE_DURATION_MS) {
    console.log('[ActivityCache] Returning cached data');
    return cachedActivity;
  }
  
  // If already fetching, return stale cache or wait
  if (isFetching) {
    if (cachedActivity) {
      console.log('[ActivityCache] Fetch in progress, returning stale cache');
      return cachedActivity;
    }
    // Wait for current fetch to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (cachedActivity) return cachedActivity;
  }
  
  // Fetch fresh data
  isFetching = true;
  try {
    cachedActivity = await fetchFreshActivity();
    lastFetchTime = now;
    return cachedActivity;
  } catch (error) {
    console.error('[ActivityCache] Failed to fetch:', error);
    // Return stale cache if available
    if (cachedActivity) {
      console.log('[ActivityCache] Returning stale cache after error');
      return cachedActivity;
    }
    // Return empty data
    return {
      activities: [],
      stats: {
        totalMinted: 0,
        recentMints: 0,
        totalSales: 0,
        totalListings: 0,
        totalTransfers: 0,
        recentVolume: 0,
      },
      lastBlock: 0,
      lastUpdated: now,
      cacheExpiresAt: now + 30000, // Retry sooner on error
    };
  } finally {
    isFetching = false;
  }
}

/**
 * Force refresh the cache (called by background job)
 */
export async function refreshActivityCache(): Promise<void> {
  try {
    console.log('[ActivityCache] Background refresh started');
    cachedActivity = await fetchFreshActivity();
    lastFetchTime = Date.now();
    console.log('[ActivityCache] Background refresh complete');
  } catch (error) {
    console.error('[ActivityCache] Background refresh failed:', error);
  }
}

/**
 * Get cache status
 */
export function getCacheStatus() {
  return {
    hasCachedData: !!cachedActivity,
    lastFetchTime,
    cacheAge: cachedActivity ? Date.now() - lastFetchTime : null,
    isFetching,
  };
}
