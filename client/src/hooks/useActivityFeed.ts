/**
 * useActivityFeed Hook
 * 
 * Fetches and displays real-time activity from the NFT and Marketplace contracts:
 * - Mints (Transfer from 0x0)
 * - Marketplace Listings
 * - Sales
 * - Transfers
 * 
 * Uses event logs from the blockchain
 */

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { NFT_CONTRACT, BLOCK_EXPLORER, RPC_URL, MARKETPLACE_CONTRACT } from '@/lib/constants';

export type ActivityType = 'mint' | 'transfer' | 'list' | 'sale' | 'offer' | 'delist';

export interface Activity {
  id: string;
  type: ActivityType;
  tokenId: number;
  from: string;
  to: string;
  price?: string;
  timestamp: number;
  txHash: string;
  blockNumber: number;
}

const NFT_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
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
  refreshInterval?: number;
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

  const fetchActivities = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000);
      
      const nftContract = new ethers.Contract(NFT_CONTRACT, NFT_ABI, provider);
      const transferFilter = nftContract.filters.Transfer();
      const transferEvents = await nftContract.queryFilter(transferFilter, fromBlock, currentBlock);
      
      const parsedActivities: Activity[] = [];
      
      for (const event of transferEvents.slice(-limit)) {
        const log = event as ethers.EventLog;
        const from = log.args[0] as string;
        const to = log.args[1] as string;
        const tokenId = Number(log.args[2]);
        
        const block = await provider.getBlock(log.blockNumber);
        const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);
        
        const isMint = from === ethers.ZeroAddress;
        
        parsedActivities.push({
          id: `${log.transactionHash}-${log.index}`,
          type: isMint ? 'mint' : 'transfer',
          tokenId,
          from: isMint ? 'New Mint' : from,
          to,
          timestamp,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        });
      }

      try {
        const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, provider);
        
        const listedFilter = marketplaceContract.filters.Listed();
        const listedEvents = await marketplaceContract.queryFilter(listedFilter, fromBlock, currentBlock);
        
        for (const event of listedEvents) {
          const log = event as ethers.EventLog;
          const tokenId = Number(log.args[0]);
          const seller = log.args[1] as string;
          const price = ethers.formatEther(log.args[2]);
          
          const block = await provider.getBlock(log.blockNumber);
          const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);
          
          parsedActivities.push({
            id: `${log.transactionHash}-list-${log.index}`,
            type: 'list',
            tokenId,
            from: seller,
            to: MARKETPLACE_CONTRACT,
            price,
            timestamp,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });
        }

        const soldFilter = marketplaceContract.filters.Sold();
        const soldEvents = await marketplaceContract.queryFilter(soldFilter, fromBlock, currentBlock);
        
        for (const event of soldEvents) {
          const log = event as ethers.EventLog;
          const tokenId = Number(log.args[0]);
          const seller = log.args[1] as string;
          const buyer = log.args[2] as string;
          const price = ethers.formatEther(log.args[3]);
          
          const block = await provider.getBlock(log.blockNumber);
          const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);
          
          parsedActivities.push({
            id: `${log.transactionHash}-sale-${log.index}`,
            type: 'sale',
            tokenId,
            from: seller,
            to: buyer,
            price,
            timestamp,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });
        }

      } catch (marketplaceError) {
        // No marketplace events yet
      }

      parsedActivities.sort((a, b) => b.timestamp - a.timestamp);
      const limitedActivities = parsedActivities.slice(0, limit);
      
      setActivities(limitedActivities);
      setLastBlock(currentBlock);
      setError(null);
      
    } catch (err: any) {
      console.error('[ActivityFeed] Error fetching activities:', err);
      setError(err.message || 'Failed to fetch activity');
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchActivities, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchActivities]);

  const stats = {
    totalMints: activities.filter(a => a.type === 'mint').length,
    totalSales: activities.filter(a => a.type === 'sale').length,
    totalListings: activities.filter(a => a.type === 'list').length,
    totalTransfers: activities.filter(a => a.type === 'transfer').length,
    totalVolume: activities
      .filter(a => a.type === 'sale' && a.price)
      .reduce((sum, a) => sum + Number(a.price || 0), 0),
  };

  return {
    activities,
    isLoading,
    error,
    lastBlock,
    stats,
    refresh: fetchActivities,
  };
}

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

export function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  
  return new Date(timestamp * 1000).toLocaleDateString();
}
