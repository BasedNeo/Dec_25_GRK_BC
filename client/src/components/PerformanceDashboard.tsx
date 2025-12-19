import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, HardDrive, Cpu, RefreshCw, Loader2 } from 'lucide-react';

interface HealthData {
  healthy: boolean;
  checks: {
    database: { status: string; latency?: string; error?: string };
    memory: { status: string; heapUsed?: string; percent?: string };
    backups: { status: string; lastBackup?: string; hoursOld?: string; error?: string };
  };
  timestamp: string;
  uptime: number;
}

export const PerformanceDashboard = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health/complete');
      const data = await res.json();
      setHealth(data);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchHealth();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'border-green-500/30 bg-green-500/10';
      case 'degraded': return 'border-yellow-500/30 bg-yellow-500/10';
      case 'unhealthy': return 'border-red-500/30 bg-red-500/10';
      default: return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'unhealthy': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        <span className="ml-2 text-gray-400">Loading system health...</span>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <p className="text-red-400">Failed to load health data</p>
        <Button onClick={handleRefresh} variant="outline" size="sm" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6" data-testid="performance-dashboard">
      <div className={`p-6 rounded-lg border-2 ${health?.healthy ? 'border-green-500 bg-green-500/5' : 'border-red-500 bg-red-500/5'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold" data-testid="system-status">
              {health?.healthy ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️ ISSUES DETECTED'}
            </div>
            <div className="text-gray-400 mt-1">
              Uptime: {formatUptime(health?.uptime || 0)} | Last check: {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'N/A'}
            </div>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={refreshing}
            data-testid="refresh-health-btn"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`p-4 ${getStatusColor(health?.checks?.database?.status || 'unknown')}`} data-testid="health-database">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5" />
            <span className="font-bold">Database</span>
          </div>
          <div className={`text-2xl font-bold ${getStatusBadgeColor(health?.checks?.database?.status || 'unknown')}`}>
            {health?.checks?.database?.status?.toUpperCase() || 'UNKNOWN'}
          </div>
          {health?.checks?.database?.latency && (
            <div className="text-xs text-gray-400 mt-1">{health.checks.database.latency}</div>
          )}
          {health?.checks?.database?.error && (
            <div className="text-xs text-red-400 mt-1">{health.checks.database.error}</div>
          )}
        </Card>

        <Card className={`p-4 ${getStatusColor(health?.checks?.memory?.status || 'unknown')}`} data-testid="health-memory">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-5 h-5" />
            <span className="font-bold">Memory</span>
          </div>
          <div className={`text-2xl font-bold ${getStatusBadgeColor(health?.checks?.memory?.status || 'unknown')}`}>
            {health?.checks?.memory?.percent || 'N/A'}
          </div>
          <div className="text-xs text-gray-400 mt-1">{health?.checks?.memory?.heapUsed || 'N/A'}</div>
        </Card>

        <Card className={`p-4 ${getStatusColor(health?.checks?.backups?.status || 'unknown')}`} data-testid="health-backups">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-5 h-5" />
            <span className="font-bold">Backups</span>
          </div>
          <div className={`text-2xl font-bold ${getStatusBadgeColor(health?.checks?.backups?.status || 'unknown')}`}>
            {health?.checks?.backups?.status?.toUpperCase() || 'UNKNOWN'}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {health?.checks?.backups?.hoursOld ? `${health.checks.backups.hoursOld}h old` : 'No backup data'}
          </div>
          {health?.checks?.backups?.error && (
            <div className="text-xs text-red-400 mt-1">{health.checks.backups.error}</div>
          )}
        </Card>
      </div>
    </div>
  );
};
