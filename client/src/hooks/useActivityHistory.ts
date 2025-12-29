import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useWebSocket } from './useWebSocket';
import { cacheActivityLogs, getCachedActivityLogs, type CachedActivityLog } from '@/lib/activityCache';

export interface ActivityLog {
  id: number;
  walletAddress: string;
  eventType: string;
  details: string | null;
  pointsEarned: number | null;
  gameType: string | null;
  createdAt: string;
}

interface UseActivityHistoryResult {
  logs: ActivityLog[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  lastUpdated: string | null;
  refetch: () => Promise<void>;
}

export function useActivityHistory(): UseActivityHistoryResult {
  const { address, isConnected } = useAccount();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const { on } = useWebSocket({ walletAddress: address });
  const fetchedRef = useRef(false);

  const fetchLogs = useCallback(async () => {
    if (!address || !isConnected) {
      setLogs([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/activity/logs?wallet=${address}&limit=50`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }

      const data = await response.json();
      setLogs(data.logs);
      setIsOffline(false);
      setLastUpdated(new Date().toISOString());

      // Cache for offline use
      await cacheActivityLogs(address, data.logs);
    } catch (err) {
      console.warn('[useActivityHistory] Fetch failed, trying cache:', err);
      
      // Try to load from cache
      const cached = await getCachedActivityLogs(address);
      if (cached.logs.length > 0) {
        setLogs(cached.logs);
        setLastUpdated(cached.lastUpdated);
        setIsOffline(true);
      } else {
        setError('Unable to load activity logs');
      }
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  // Initial fetch on mount
  useEffect(() => {
    if (isConnected && address && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchLogs();
    }
    
    if (!isConnected) {
      fetchedRef.current = false;
      setLogs([]);
    }
  }, [isConnected, address, fetchLogs]);

  // Handle WebSocket activity_log messages
  useEffect(() => {
    if (!on || !address) return;
    
    const unsubscribe = on('activity_log', (data) => {
      const newLog = data as ActivityLog;
      
      // Only add if it's for this wallet
      if (newLog.walletAddress?.toLowerCase() === address.toLowerCase()) {
        setLogs(prev => {
          // Avoid duplicates
          if (prev.some(log => log.id === newLog.id)) {
            return prev;
          }
          return [newLog, ...prev].slice(0, 50);
        });
        setIsOffline(false);
        setLastUpdated(new Date().toISOString());
      }
    });
    
    return unsubscribe;
  }, [on, address]);

  return {
    logs,
    loading,
    error,
    isOffline,
    lastUpdated,
    refetch: fetchLogs
  };
}

// Helper to log activity from games
export async function logActivity(data: {
  walletAddress: string;
  eventType: 'riddle_solved' | 'riddle_failed' | 'wave_survived' | 'wave_failed' | 'game_completed' | 'points_earned' | 'level_up' | 'challenge_completed';
  details?: string;
  pointsEarned?: number;
  gameType?: 'riddle_quest' | 'creature_command' | 'retro_defender' | 'guardian_defense' | 'infinity_race';
}): Promise<boolean> {
  try {
    const response = await fetch('/api/activity/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    return response.ok;
  } catch (error) {
    console.warn('[logActivity] Failed to log activity:', error);
    return false;
  }
}
