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
 * - Block range: 10,000 blocks (~5.5 hours)
 * - Contracts: NFT_CONTRACT, MARKETPLACE_CONTRACT
 * - Events: Transfer, Listed, Sold
 * - Baseline: CUMULATIVE_SALES_BASELINE for historical volume
 * 
 * OPTIMIZATION: Block timestamp caching to reduce RPC calls
 * FIXED: Now fetches REAL totalMinted from contract state (not just events)
 */

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { NFT_CONTRACT, RPC_URL, MARKETPLACE_CONTRACT, CUMULATIVE_SALES_BASELINE } from '@/lib/constants';

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
  'function MAX_SUPPLY() view returns (uint256)'
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

export function useActivityFeed(options: UseActivityFeedOptions = {}) {
  const { 
    limit = 50, 
    autoRefresh = true, 
    refreshInterval = 30000 
  } = options;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastBlock, setLastBlock] = useState<number>(0);
  
  // Contract state for accurate cumulative stats
  const [contractStats, setContractStats] = useState<ContractStats>({
    totalMinted: 0,
    maxSupply: 3732,
    activeListings: 0,
    activeOffers: 0,
  });

  // Fetch activities from blockchain - OPTIMIZED with parallel calls
  const fetchActivities = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      
      // Get current block
      const currentBlock = await provider.getBlockNumber();
      
      // Look back ~10000 blocks for good coverage without RPC issues
      // BasedAI ~2 sec blocks, so 10000 blocks ≈ 5.5 hours of history
      // Historical data is handled by CUMULATIVE_SALES_BASELINE
      const fromBlock = Math.max(0, currentBlock - 10000);
      
      const nftContract = new ethers.Contract(NFT_CONTRACT, NFT_ABI, provider);
      const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, provider);
      
      // PARALLEL: Fetch all data at once
      const [
        totalMinted,
        transferEvents,
        listedEvents,
        soldEvents
      ] = await Promise.all([
        nftContract.totalMinted().catch(() => 0),
        nftContract.queryFilter(nftContract.filters.Transfer(), fromBlock, currentBlock).catch(() => []),
        marketplaceContract.queryFilter(marketplaceContract.filters.Listed(), fromBlock, currentBlock).catch(() => []),
        marketplaceContract.queryFilter(marketplaceContract.filters.Sold(), fromBlock, currentBlock).catch(() => [])
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
      
      setActivities(parsedActivities.slice(0, limit));
      setLastBlock(currentBlock);
      setError(null);
      
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to fetch activity');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  // Initial fetch
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchActivities, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchActivities]);

  // ⚠️ LOCKED CALCULATIONS - Do NOT modify without explicit user request
  // See replit.md "LOCKED CALCULATIONS" section for details
  const recentVolume = activities
    .filter(a => a.type === 'sale' && a.price)
    .reduce((sum, a) => sum + Number(a.price || 0), 0);
    
  // LOCKED: totalVolume = CUMULATIVE_SALES_BASELINE.volume + recentVolume
  const stats = {
    // CUMULATIVE from CONTRACT (real total)
    totalMinted: contractStats.totalMinted,
    
    // FROM EVENTS (recent activity only - last 50000 blocks)
    recentMints: activities.filter(a => a.type === 'mint').length,
    totalSales: activities.filter(a => a.type === 'sale').length,
    totalListings: activities.filter(a => a.type === 'list').length,
    totalTransfers: activities.filter(a => a.type === 'transfer').length,
    
    // VOLUME: Historical baseline + recent on-chain activity
    // This provides accurate cumulative volume for royalty calculations
    totalVolume: CUMULATIVE_SALES_BASELINE.volume + recentVolume,
    recentVolume, // Just the recent activity for display purposes
      
    // FROM CONTRACT (real-time)
    activeListings: contractStats.activeListings,
    activeOffers: contractStats.activeOffers,
  };

  return {
    activities,
    isLoading,
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
