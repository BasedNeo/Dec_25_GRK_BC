/**
 * useActivityFeed Hook - PERFORMANCE OPTIMIZED (API-based)
 * 
 * ⚠️ LOCKED CALCULATIONS - Do NOT modify volume/stats formulas
 * See replit.md "LOCKED CALCULATIONS" section for details
 * 
 * Now fetches from server-cached /api/activity endpoint for sub-second loading.
 * Falls back to localStorage cache for instant display while refreshing.
 * 
 * LOCKED SETTINGS:
 * - Contracts: NFT_CONTRACT, MARKETPLACE_CONTRACT
 * - Events: Transfer, Listed, Sold
 * - Baseline: CUMULATIVE_SALES_BASELINE for historical volume
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { MARKETPLACE_CONTRACT, CUMULATIVE_SALES_BASELINE } from '@/lib/constants';
import { useInterval } from '@/hooks/useInterval';

// Activity Types
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

export interface ContractStats {
  totalMinted: number;
  maxSupply: number;
  activeListings: number;
  activeOffers: number;
}

// PERSISTENT CACHE KEY for instant loading
const ACTIVITY_CACHE_KEY = 'based_activity_feed_v3';
const ACTIVITY_CACHE_MAX_AGE = 600000; // 10 minutes max for stale data

interface CachedActivityData {
  activities: Activity[];
  stats: {
    totalMinted: number;
    recentMints: number;
    totalSales: number;
    totalListings: number;
    totalTransfers: number;
    recentVolume: number;
  };
  lastBlock: number;
  timestamp: number;
}

function loadCachedActivity(): CachedActivityData | null {
  try {
    const cached = localStorage.getItem(ACTIVITY_CACHE_KEY);
    if (!cached) return null;
    const data = JSON.parse(cached) as CachedActivityData;
    if (Date.now() - data.timestamp > ACTIVITY_CACHE_MAX_AGE) return null;
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

interface UseActivityFeedOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useActivityFeed(options: UseActivityFeedOptions = {}) {
  const { 
    limit = 50, 
    autoRefresh = true, 
    refreshInterval = 120000 // 2 minutes - matches server cache
  } = options;

  // Load cached data immediately for instant display
  const cachedData = useRef(loadCachedActivity());
  
  const [activities, setActivities] = useState<Activity[]>(cachedData.current?.activities || []);
  const [isLoading, setIsLoading] = useState(!cachedData.current);
  const [isRefreshing, setIsRefreshing] = useState(!!cachedData.current);
  const [error, setError] = useState<string | null>(null);
  const [lastBlock, setLastBlock] = useState<number>(cachedData.current?.lastBlock || 0);
  
  const [contractStats, setContractStats] = useState<ContractStats>({
    totalMinted: cachedData.current?.stats.totalMinted || 0,
    maxSupply: 3732,
    activeListings: 0,
    activeOffers: 0,
  });

  // API-based fetch - much faster than direct blockchain queries
  const fetchActivities = useCallback(async () => {
    try {
      // If we have cached data, show it while refreshing
      if (cachedData.current && !activities.length) {
        setActivities(cachedData.current.activities);
        setIsRefreshing(true);
      }
      
      const response = await fetch('/api/activity', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Map API response to component format
      const mappedActivities: Activity[] = (data.activities || []).slice(0, limit).map((a: any) => ({
        id: a.id,
        type: a.type as ActivityType,
        tokenId: a.tokenId,
        from: a.from,
        to: a.to,
        price: a.price,
        timestamp: a.timestamp,
        txHash: a.txHash,
        blockNumber: a.blockNumber,
      }));
      
      setActivities(mappedActivities);
      setLastBlock(data.lastBlock || 0);
      setContractStats({
        totalMinted: data.stats?.totalMinted || 0,
        maxSupply: 3732,
        activeListings: 0,
        activeOffers: 0,
      });
      setError(null);
      
      // Save to localStorage for instant load next time
      const cacheData: CachedActivityData = {
        activities: mappedActivities,
        stats: {
          totalMinted: data.stats?.totalMinted || 0,
          recentMints: data.stats?.recentMints || 0,
          totalSales: data.stats?.totalSales || 0,
          totalListings: data.stats?.totalListings || 0,
          totalTransfers: data.stats?.totalTransfers || 0,
          recentVolume: data.stats?.recentVolume || 0,
        },
        lastBlock: data.lastBlock || 0,
        timestamp: Date.now(),
      };
      saveCachedActivity(cacheData);
      cachedData.current = cacheData;
      
    } catch (err: unknown) {
      const error = err as Error;
      console.warn('[ActivityFeed] API fetch failed:', error.message);
      
      // Use cached data if available
      if (cachedData.current) {
        setActivities(cachedData.current.activities);
        setLastBlock(cachedData.current.lastBlock);
        setContractStats({
          totalMinted: cachedData.current.stats.totalMinted,
          maxSupply: 3732,
          activeListings: 0,
          activeOffers: 0,
        });
      } else {
        setError(error.message || 'Failed to fetch activity');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [limit, activities.length]);

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
  // 2. Each Sold event has a price in $BASED
  // 3. recentVolume = sum of all sale prices from on-chain events
  // 4. totalVolume = totalMintVolume + CUMULATIVE_SALES_BASELINE + recentVolume
  // 5. This totalVolume is used by PoolTracker for royalty calculation
  const recentVolume = activities
    .filter(a => a.type === 'sale' && a.price)
    .reduce((sum, a) => sum + Number(a.price || 0), 0);
  
  // Calculate total mint volume: totalMinted * 69420
  const MINT_PRICE = 69420;
  const totalMintVolume = contractStats.totalMinted * MINT_PRICE;
    
  const stats = {
    // CUMULATIVE from CONTRACT (real total)
    totalMinted: contractStats.totalMinted,
    
    // FROM EVENTS (recent activity only)
    recentMints: activities.filter(a => a.type === 'mint').length,
    totalSales: activities.filter(a => a.type === 'sale').length,
    totalListings: activities.filter(a => a.type === 'list').length,
    totalTransfers: activities.filter(a => a.type === 'transfer').length,
    
    // VOLUME: Total mint volume + cumulative sales volume + recent on-chain sales
    totalVolume: totalMintVolume + CUMULATIVE_SALES_BASELINE.volume + recentVolume,
    recentVolume,
    totalMintVolume,
      
    // FROM CONTRACT (real-time)
    activeListings: contractStats.activeListings,
    activeOffers: contractStats.activeOffers,
  };

  return {
    activities,
    isLoading,
    isRefreshing,
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
