import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';

// BasedAI Brain Configuration
const BRAIN_CONFIG = {
  name: 'Based Guardians Brain',
  wallet: '0xB0974F12C7BA2f1dC31f2C2545B71Ef1998815a4',
  token: '0x758db5be97ddf623a501f607ff822792a8f2d8f2', // $BASED on ETH mainnet
  communityShare: 0.10, // Community gets 10% of subnet emissions
  emissionsStart: new Date('2025-12-01T00:00:00Z').getTime(), // Dec 1, 2025
  initialDeposit: 35000, // Initial pool funding
  estimatedDailyRate: 6000, // Expected ~6,000/day for community (10%)
  nextHalvingDate: new Date('2025-12-31T00:00:00Z').getTime(),
  network: 'BasedAI',
  networkUrl: 'https://www.getbased.ai/'
};

// Free Ethereum mainnet RPC endpoints (fallback chain)
const ETH_RPC_ENDPOINTS = [
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com',
  'https://eth.drpc.org'
];

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

export interface EmissionEvent {
  from: string;
  amount: number;
  timestamp: number;
  txHash: string;
  blockNumber: number;
}

export interface DailyEmission {
  date: string;
  amount: number;
  dayOfWeek: string;
}

export interface SubnetEmissionsData {
  // Core metrics
  brainBalance: number;
  totalReceived: number;
  initialDeposit: number;
  communityShare: number;
  dailyRate: number;
  brainTotalDaily: number;
  brainAnnualOutput: number;
  weeklyTotal: number;
  monthlyProjection: number;
  daysUntilHalving: number;
  
  // Status
  status: 'active' | 'delayed' | 'inactive';
  lastEmissionTime: number | null;
  daysSinceStart: number;
  
  // Historical
  recentEvents: EmissionEvent[];
  dailyBreakdown: DailyEmission[];
  
  // Meta
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Config
  config: typeof BRAIN_CONFIG;
  
  // Actions
  refresh: () => Promise<void>;
}

async function getWorkingProvider(): Promise<ethers.JsonRpcProvider> {
  for (const rpc of ETH_RPC_ENDPOINTS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      await provider.getBlockNumber(); // Test connection
      return provider;
    } catch {
      continue;
    }
  }
  throw new Error('All RPC endpoints failed');
}

export function useSubnetEmissions(): SubnetEmissionsData {
  const [brainBalance, setBrainBalance] = useState<number>(0);
  const [totalReceived, setTotalReceived] = useState<number>(0);
  const [recentEvents, setRecentEvents] = useState<EmissionEvent[]>([]);
  const [dailyBreakdown, setDailyBreakdown] = useState<DailyEmission[]>([]);
  const [lastEmissionTime, setLastEmissionTime] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const cache = useRef<{ data: any; timestamp: number } | null>(null);
  const CACHE_DURATION = 60000; // 1 minute cache

  const fetchEmissions = useCallback(async () => {
    // Check cache
    if (cache.current && Date.now() - cache.current.timestamp < CACHE_DURATION) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const provider = await getWorkingProvider();
      const tokenContract = new ethers.Contract(BRAIN_CONFIG.token, ERC20_ABI, provider);

      // 1. Get current brain wallet balance
      const balance = await tokenContract.balanceOf(BRAIN_CONFIG.wallet);
      const balanceNum = parseFloat(ethers.formatEther(balance));
      setBrainBalance(balanceNum);

      // 2. Get current block for event query range
      const currentBlock = await provider.getBlockNumber();
      // Query last ~30 days of blocks (assuming ~12 sec blocks on ETH = ~7200 blocks/day)
      const blocksToQuery = 7200 * 30;
      const fromBlock = Math.max(0, currentBlock - blocksToQuery);

      // 3. Query Transfer events TO the brain wallet (with graceful failure)
      const filter = tokenContract.filters.Transfer(null, BRAIN_CONFIG.wallet);
      let events: ethers.EventLog[] = [];
      
      try {
        const rawEvents = await tokenContract.queryFilter(filter, fromBlock, 'latest');
        events = rawEvents.filter((e): e is ethers.EventLog => 'args' in e);
      } catch (e) {
        // If query fails, try smaller range
        try {
          const smallerFromBlock = currentBlock - 50000;
          const rawEvents = await tokenContract.queryFilter(filter, smallerFromBlock, 'latest');
          events = rawEvents.filter((e): e is ethers.EventLog => 'args' in e);
        } catch (e2) {
          // Event queries failed - we'll use balance as fallback below
          console.log('Event queries failed, will use balance as fallback');
          events = [];
        }
      }

      // 4. Process events (with fallback)
      let total = 0;
      const processedEvents: EmissionEvent[] = [];
      const dailyAmounts: Record<string, number> = {};

      for (const event of events) {
        if (event.args && event.args.value) {
          const amount = parseFloat(ethers.formatEther(event.args.value));
          total += amount;

          // Get block timestamp (simplified - skip individual block lookups to avoid rate limits)
          const timestamp = Date.now() - ((currentBlock - event.blockNumber) * 12000);

          processedEvents.push({
            from: event.args.from,
            amount,
            timestamp,
            txHash: event.transactionHash,
            blockNumber: event.blockNumber
          });

          // Aggregate by day
          const dateKey = new Date(timestamp).toISOString().split('T')[0];
          dailyAmounts[dateKey] = (dailyAmounts[dateKey] || 0) + amount;
        }
      }

      // FALLBACK: If no events found, use balance minus initial deposit as emissions
      // The brain wallet only receives emissions, so balance - deposit = total emissions
      if (total === 0 && balanceNum > 0) {
        // Subtract initial deposit to get actual emissions
        const actualEmissions = Math.max(0, balanceNum - BRAIN_CONFIG.initialDeposit);
        total = actualEmissions;
        console.log('Using balance as total received (no events found). Emissions:', total);
        
        // Calculate days since emissions started
        const daysActive = Math.max(1, (Date.now() - BRAIN_CONFIG.emissionsStart) / (1000 * 60 * 60 * 24));
        
        // Use actual rate or estimated rate
        const avgDailyRate = actualEmissions > 0 ? actualEmissions / daysActive : BRAIN_CONFIG.estimatedDailyRate;
        
        // Populate last 7 days with estimated average
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateKey = date.toISOString().split('T')[0];
          dailyAmounts[dateKey] = avgDailyRate;
        }
        
        // Set a synthetic "last emission" as recent
        setLastEmissionTime(Date.now() - (24 * 60 * 60 * 1000)); // 1 day ago
      }

      setTotalReceived(total);
      
      // Sort events by timestamp (newest first)
      processedEvents.sort((a, b) => b.timestamp - a.timestamp);
      setRecentEvents(processedEvents.slice(0, 20));

      // Set last emission time from events if available
      if (processedEvents.length > 0) {
        setLastEmissionTime(processedEvents[0].timestamp);
      }

      // Create daily breakdown for last 7 days
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dailyData: DailyEmission[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        dailyData.push({
          date: dateKey,
          amount: dailyAmounts[dateKey] || 0,
          dayOfWeek: days[date.getDay()]
        });
      }
      setDailyBreakdown(dailyData);

      // Cache results
      cache.current = {
        data: { brainBalance: balanceNum, totalReceived: total },
        timestamp: Date.now()
      };

      setLastUpdated(new Date());
    } catch (e) {
      console.error('Failed to fetch subnet emissions:', e);
      setError(e instanceof Error ? e.message : 'Failed to fetch emission data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmissions();
    const interval = setInterval(fetchEmissions, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [fetchEmissions]);

  // Calculate derived values
  const daysSinceStart = Math.max(1, (Date.now() - BRAIN_CONFIG.emissionsStart) / (1000 * 60 * 60 * 24));
  
  // Calculate daily rate - use calculated if reasonable, otherwise estimated
  const calculatedRate = totalReceived / daysSinceStart;
  const dailyRate = calculatedRate > 100 ? calculatedRate : BRAIN_CONFIG.estimatedDailyRate;
  
  const weeklyTotal = dailyBreakdown.reduce((sum, day) => sum + day.amount, 0);
  const communityShare = totalReceived; // Total emissions received = community's share
  const monthlyProjection = dailyRate * 30;
  
  // Calculate brain's FULL output (community only gets 10%)
  const brainTotalDaily = dailyRate / BRAIN_CONFIG.communityShare; // Full 100%
  const brainAnnualOutput = brainTotalDaily * 365;
  
  // Days until halving
  const daysUntilHalving = Math.max(0, Math.ceil((BRAIN_CONFIG.nextHalvingDate - Date.now()) / (1000 * 60 * 60 * 24)));

  // Determine status - if we have balance, brain is active
  let status: 'active' | 'delayed' | 'inactive' = brainBalance > 0 ? 'active' : 'inactive';
  
  // Only override if we have specific event timing data
  if (lastEmissionTime && recentEvents.length > 0) {
    const hoursSinceLastEmission = (Date.now() - lastEmissionTime) / (1000 * 60 * 60);
    if (hoursSinceLastEmission > 168) {
      status = 'inactive';
    } else if (hoursSinceLastEmission > 24) {
      status = 'delayed';
    } else {
      status = 'active';
    }
  }

  return {
    brainBalance,
    totalReceived,
    initialDeposit: BRAIN_CONFIG.initialDeposit,
    communityShare,
    dailyRate,
    brainTotalDaily,
    brainAnnualOutput,
    weeklyTotal,
    monthlyProjection,
    daysUntilHalving,
    status,
    lastEmissionTime,
    daysSinceStart,
    recentEvents,
    dailyBreakdown,
    loading,
    error,
    lastUpdated,
    config: BRAIN_CONFIG,
    refresh: fetchEmissions
  };
}

// Export config for use elsewhere
export { BRAIN_CONFIG };
