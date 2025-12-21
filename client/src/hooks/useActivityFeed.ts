/**
 * useActivityFeed Hook - PERFORMANCE OPTIMIZED
 * 
 * ⚠️ LOCKED - Do NOT modify without explicit user request
 * See replit.md "LOCKED CALCULATIONS" section for details
 * 
 * Fetches and displays real-time activity from the NFT and Marketplace contracts:
 * - Mints (Transfer from 0x0)
 * - Marketplace Listings
 * - Sales
 * - Transfers
 * 
 * LOCKED SETTINGS:
 * - Block range: 40,000 blocks (~22 hours)
 * - Contracts: NFT_CONTRACT, MARKETPLACE_CONTRACT
 * - Events: Transfer, Listed, Sold
 * - Baseline: CUMULATIVE_SALES_BASELINE for historical volume
 * 
 * OPTIMIZATION: Block timestamp caching to reduce RPC calls
 * FIXED: Now fetches REAL totalMinted from contract state (not just events)
 */

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { NFT_CONTRACT, MARKETPLACE_CONTRACT, CUMULATIVE_SALES_BASELINE } from '@/lib/constants';
import { useInterval } from '@/hooks/useInterval';
import { requestDedup } from '@/lib/requestDeduplicator';
import { rpcManager } from '@/lib/rpcProvider';
import { withCache } from '@/lib/cache';
import { perfMonitor } from '@/lib/performanceMonitor';

// Activity Types
export type ActivityType = 'mint' | 'transfer' | 'list' | 'sale' | 'offer' | 'delist';

export interface Activity {
  id: string;
  type: ActivityType;
  tokenId: number;
  from: string;
  to: string;
  price?: string; // In $BASED
  timestamp: number;
  txHash: string;
  blockNumber: number;
}

// Contract Stats from on-chain state
export interface ContractStats {
  totalMinted: number;
  maxSupply: number;
  activeListings: number;
  activeOffers: number;
}

// BLOCK TIMESTAMP CACHE - Reduces RPC calls significantly
const blockTimestampCache = new Map<number, number>();

async function getBlockTimestamp(provider: ethers.JsonRpcProvider, blockNumber: number): Promise<number> {
  // Check cache first
  if (blockTimestampCache.has(blockNumber)) {
    return blockTimestampCache.get(blockNumber)!;
  }
  
  // Fetch from chain
  const block = await provider.getBlock(blockNumber);
  const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);
  
  // Cache for future use
  blockTimestampCache.set(blockNumber, timestamp);
  
  return timestamp;
}

// ABIs for parsing events
const NFT_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'function totalMinted() view returns (uint256)',
  'function MAX_SUPPLY() view returns (uint256)',
  'function totalSupply() view returns (uint256)'
];

const MARKETPLACE_ABI = [
  'event Listed(uint256 indexed tokenId, address indexed seller, uint256 price)',
  'event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 fee)',
  'event Delisted(uint256 indexed tokenId, address indexed seller)',
  'event OfferMade(uint256 indexed tokenId, address indexed offerer, uint256 amount, uint256 expiresAt)'
];

interface UseActivityFeedOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
}

// PERSISTENT CACHE KEY for instant loading
const ACTIVITY_CACHE_KEY = 'based_activity_feed_v2';
const ACTIVITY_CACHE_DURATION = 120000; // 2 minutes

interface CachedActivityData {
  activities: Activity[];
  stats: ContractStats;
  lastBlock: number;
  timestamp: number;
}

function loadCachedActivity(): CachedActivityData | null {
  try {
    const cached = localStorage.getItem(ACTIVITY_CACHE_KEY);
    if (!cached) return null;
    const data = JSON.parse(cached) as CachedActivityData;
    // Accept cache up to 10 minutes old for instant display
    if (Date.now() - data.timestamp > 600000) return null;
    return data;
  } catch {
    return null;
  }
}

function saveCachedActivity(data: CachedActivityData): void {
  try {
    localStorage.setItem(ACTIVITY_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

export function useActivityFeed(options: UseActivityFeedOptions = {}) {
  const { 
    limit = 50, 
    autoRefresh = true, 
    refreshInterval = 300000 // 5 minutes - reduces RPC calls
  } = options;

  // OPTIMIZATION: Load cached data using lazy initialization for instant display
  const [activities, setActivities] = useState<Activity[]>(() => {
    const cached = loadCachedActivity();
    return cached?.activities || [];
  });
  const [isLoading, setIsLoading] = useState(() => !loadCachedActivity());
  const [isRefreshing, setIsRefreshing] = useState(() => !!loadCachedActivity());
  const [error, setError] = useState<string | null>(null);
  const [lastBlock, setLastBlock] = useState<number>(() => {
    const cached = loadCachedActivity();
    return cached?.lastBlock || 0;
  });
  
  // Contract state for accurate cumulative stats
  const [contractStats, setContractStats] = useState<ContractStats>(() => {
    const cached = loadCachedActivity();
    return cached?.stats || {
      totalMinted: 0,
      maxSupply: 3732,
      activeListings: 0,
      activeOffers: 0,
    };
  });

  // RPC retry helper for resilience against transient failures
  async function retryRpcCall<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        console.warn(`[ActivityFeed] RPC call failed, retry ${i + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
    throw new Error('Max retries exceeded');
  }

  // Fetch activities from blockchain - OPTIMIZED with parallel calls, RPC failover, and caching
  const fetchActivities = useCallback(async () => {
    const endTimer = perfMonitor.startTimer('ActivityFeed:fetch');
    return withCache('activity-feed', async () => {
    return requestDedup.execute('activity-feed-rpc', async () => {
    try {
      const provider = rpcManager.getProvider();
      
      // Get current block with failover
      const currentBlock = await rpcManager.executeWithFailover(p => p.getBlockNumber());
      
      // ⚠️ LOCKED: Block range for activity feed
      // Extended to 172,800 blocks (~4 days) to capture recent transactions
      // BasedAI block time: ~2 seconds
      // 4 days = 345,600 seconds / 2 = 172,800 blocks
      // Fetched in chunks to prevent RPC timeout
      const DISPLAY_BLOCKS = 172800; // ~4 days of activity
      const fromBlock = Math.max(0, currentBlock - DISPLAY_BLOCKS);
      
      // ⚠️ LOCKED: Event fetching - this is the source of truth for all activity
      // CHUNKED PARALLEL: Fetch events in chunks to prevent RPC timeout
      // - Transfer events: detect mints (from 0x0) and transfers
      // - Listed events: detect new marketplace listings
      // - Sold events: detect sales (used for royalty volume calculation)
      
      // Helper to fetch events in chunks to avoid RPC timeout
      const CHUNK_SIZE = 20000; // 20k blocks per chunk (~11 hours)
      const fetchEventsInChunks = async (
        contractAddress: string,
        abi: string[],
        eventName: string,
        startBlock: number,
        endBlock: number
      ): Promise<ethers.EventLog[]> => {
        const allEvents: ethers.EventLog[] = [];
        let currentStart = startBlock;
        
        while (currentStart < endBlock) {
          const chunkEnd = Math.min(currentStart + CHUNK_SIZE, endBlock);
          try {
            const events = await rpcManager.executeWithFailover(p => {
              const contract = new ethers.Contract(contractAddress, abi, p);
              return contract.queryFilter(contract.filters[eventName](), currentStart, chunkEnd);
            });
            allEvents.push(...(events as ethers.EventLog[]));
          } catch (err) {
            console.warn(`[ActivityFeed] Chunk ${currentStart}-${chunkEnd} failed for ${eventName}:`, err);
          }
          currentStart = chunkEnd + 1;
        }
        return allEvents;
      }
      
      const [
        totalMinted,
        transferEvents,
        listedEvents,
        soldEvents
      ] = await Promise.all([
        rpcManager.executeWithFailover(p => 
          new ethers.Contract(NFT_CONTRACT, NFT_ABI, p).totalMinted()
        ).catch((err) => { console.error('[ActivityFeed] Failed to fetch totalMinted:', err); return 0; }),
        fetchEventsInChunks(NFT_CONTRACT, NFT_ABI, 'Transfer', fromBlock, currentBlock)
          .catch((err) => { console.error('[ActivityFeed] Failed to fetch Transfer events:', err); return []; }),
        fetchEventsInChunks(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, 'Listed', fromBlock, currentBlock)
          .catch((err) => { console.error('[ActivityFeed] Failed to fetch Listed events:', err); return []; }),
        fetchEventsInChunks(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, 'Sold', fromBlock, currentBlock)
          .catch((err) => { console.error('[ActivityFeed] Failed to fetch Sold events:', err); return []; })
      ]);
      
      
      setContractStats({
        totalMinted: Number(totalMinted),
        maxSupply: 3732,
        activeListings: 0,
        activeOffers: 0,
      });
      
      const parsedActivities: Activity[] = [];
      
      // Collect all unique block numbers for batch timestamp fetching
      const allEvents = [...transferEvents.slice(-limit), ...listedEvents, ...soldEvents];
      const uniqueBlocks = Array.from(new Set(allEvents.map(e => e.blockNumber)));
      
      // Batch fetch timestamps for blocks not in cache
      const uncachedBlocks = uniqueBlocks.filter(b => !blockTimestampCache.has(b));
      if (uncachedBlocks.length > 0) {
        const timestampPromises = uncachedBlocks.slice(0, 20).map(async (blockNum) => {
          try {
            const block = await provider.getBlock(blockNum);
            if (block?.timestamp) {
              blockTimestampCache.set(blockNum, block.timestamp);
            }
          } catch {}
        });
        await Promise.all(timestampPromises);
      }
      
      // Now use estimated timestamps for any remaining
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const getTimestampFast = (blockNum: number): number => {
        if (blockTimestampCache.has(blockNum)) {
          return blockTimestampCache.get(blockNum)!;
        }
        // Estimate: ~2 seconds per block
        const blocksDiff = currentBlock - blockNum;
        return currentTimestamp - (blocksDiff * 2);
      };
      
      // Parse Transfer events
      for (const event of transferEvents.slice(-limit)) {
        const log = event as ethers.EventLog;
        const from = log.args[0] as string;
        const to = log.args[1] as string;
        const tokenId = Number(log.args[2]);
        const isMint = from === ethers.ZeroAddress;
        
        parsedActivities.push({
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
      for (const event of listedEvents) {
        const log = event as ethers.EventLog;
        parsedActivities.push({
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
      for (const event of soldEvents) {
        const log = event as ethers.EventLog;
        parsedActivities.push({
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

      // Sort by timestamp descending (newest first)
      parsedActivities.sort((a, b) => b.timestamp - a.timestamp);
      
      const finalActivities = parsedActivities.slice(0, limit);
      setActivities(finalActivities);
      setLastBlock(currentBlock);
      setError(null);
      
      // OPTIMIZATION: Persist to localStorage for instant load on next visit
      saveCachedActivity({
        activities: finalActivities,
        stats: {
          totalMinted: Number(totalMinted),
          maxSupply: 3732,
          activeListings: 0,
          activeOffers: 0,
        },
        lastBlock: currentBlock,
        timestamp: Date.now(),
      });
      
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to fetch activity');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      endTimer();
    }
    });
    }, 30000); // Cache for 30 seconds
  }, [limit]);

  // Initial fetch
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Auto refresh using safe interval hook
  useInterval(fetchActivities, autoRefresh ? refreshInterval : null);

  // ⚠️ LOCKED CALCULATIONS - Do NOT modify without explicit user request
  // See replit.md "LOCKED CALCULATIONS" section for details
  // 
  // PATHWAY: Sales volume calculation
  // 1. Activity feed fetches Sold events from MARKETPLACE_CONTRACT
  // 2. Each Sold event has a price in $BASED (from log.args[3])
  // 3. recentVolume = sum of all sale prices from on-chain events
  // 4. totalVolume = CUMULATIVE_SALES_BASELINE (0) + recentVolume
  // 5. This totalVolume is used by PoolTracker for royalty calculation
  //
  // NEVER hardcode sales volume - it must always come from on-chain Sold events
  const recentVolume = activities
    .filter(a => a.type === 'sale' && a.price)
    .reduce((sum, a) => sum + Number(a.price || 0), 0);
  
  // Calculate total mint volume: totalMinted * 69420
  const MINT_PRICE = 69420;
  const totalMintVolume = contractStats.totalMinted * MINT_PRICE;
    
  const stats = {
    // CUMULATIVE from CONTRACT (real total)
    totalMinted: contractStats.totalMinted,
    
    // FROM EVENTS (recent activity only - last 500k blocks for display)
    recentMints: activities.filter(a => a.type === 'mint').length,
    totalSales: activities.filter(a => a.type === 'sale').length,
    totalListings: activities.filter(a => a.type === 'list').length,
    totalTransfers: activities.filter(a => a.type === 'transfer').length,
    
    // VOLUME: Total mint volume + cumulative sales volume + recent on-chain sales
    // This includes ALL mints (from contract state) and ALL sales (baseline + recent)
    totalVolume: totalMintVolume + CUMULATIVE_SALES_BASELINE.volume + recentVolume,
    recentVolume, // Just the recent activity for display purposes
    totalMintVolume, // Total volume from all mints
      
    // FROM CONTRACT (real-time)
    activeListings: contractStats.activeListings,
    activeOffers: contractStats.activeOffers,
  };

  return {
    activities,
    isLoading,
    isRefreshing, // True when showing cached data and refreshing in background
    error,
    lastBlock,
    stats,
    contractStats,
    refresh: fetchActivities,
  };
}

/**
 * Get emoji and label for activity type
 */
export function getActivityDisplay(type: ActivityType): { emoji: string; label: string; color: string } {
  switch (type) {
    case 'mint':
      return { emoji: '🎨', label: 'Minted', color: 'text-green-400' };
    case 'sale':
      return { emoji: '💰', label: 'Sold', color: 'text-yellow-400' };
    case 'list':
      return { emoji: '📋', label: 'Listed', color: 'text-cyan-400' };
    case 'delist':
      return { emoji: '❌', label: 'Delisted', color: 'text-red-400' };
    case 'offer':
      return { emoji: '🏷️', label: 'Offer Made', color: 'text-purple-400' };
    case 'transfer':
      return { emoji: '🔄', label: 'Transferred', color: 'text-blue-400' };
    default:
      return { emoji: '📝', label: 'Activity', color: 'text-gray-400' };
  }
}

/**
 * Format timestamp to relative time
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  
  return new Date(timestamp * 1000).toLocaleDateString();
}
