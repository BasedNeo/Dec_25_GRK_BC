import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, Activity, Download, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface SecurityEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  details: any;
  ipAddress?: string;
  handled: boolean;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  blockedRequests: number;
  failedAuth: number;
  activeBans: number;
  activeThreats: number;
}

export const SecurityDashboard = () => {
  const { address } = useAccount();
  const [metrics, setMetrics] = useState<{ metrics: SecurityMetrics; score: number; blockedEndpoints: any[] } | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auth, setAuth] = useState<{ signature: string; walletAddress: string } | null>(null);
  
  const getAdminAuth = useCallback(async (): Promise<{ signature: string; walletAddress: string } | null> => {
    if (!address) {
      setError('Wallet not connected');
      return null;
    }
    
    try {
      const nonceRes = await fetch('/api/admin/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      
      if (!nonceRes.ok) {
        setError('Not authorized');
        return null;
      }
      
      const { nonce } = await nonceRes.json();
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const message = `Based Guardians Admin Auth\nNonce: ${nonce}`;
      const signature = await signer.signMessage(message);
      
      return { signature, walletAddress: address };
    } catch (err) {
      console.error('Admin auth failed:', err);
      setError('Authentication cancelled or failed');
      return null;
    }
  }, [address]);
  
  const fetchData = useCallback(async (currentAuth?: { signature: string; walletAddress: string } | null) => {
    const authToUse = currentAuth || auth;
    if (!authToUse) return;
    
    try {
      const headers = {
        'x-wallet-address': authToUse.walletAddress,
        'x-admin-signature': authToUse.signature
      };
      
      const [metricsRes, eventsRes] = await Promise.all([
        fetch('/api/admin/security/metrics', { headers }),
        fetch('/api/admin/security/events?limit=50', { headers })
      ]);
      
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }
      
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.events || []);
      }
      
      setError(null);
    } catch (error) {
      console.error('Failed to fetch security data:', error);
      setError('Failed to fetch security data');
    } finally {
      setLoading(false);
    }
  }, [auth]);
  
  const initialize = useCallback(async () => {
    if (!address) {
      setLoading(false);
      return;
    }
    
    const newAuth = await getAdminAuth();
    if (newAuth) {
      setAuth(newAuth);
      await fetchData(newAuth);
    } else {
      setLoading(false);
    }
  }, [address, getAdminAuth, fetchData]);
  
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  const handleEvent = async (eventId: string) => {
    if (!auth) return;
    
    try {
      await fetch(`/api/admin/security/events/${eventId}/handle`, { 
        method: 'POST',
        headers: {
          'x-wallet-address': auth.walletAddress,
          'x-admin-signature': auth.signature
        }
      });
      fetchData();
    } catch (error) {
      console.error('Failed to handle event:', error);
    }
  };
  
  const exportEvents = async (format: 'json' | 'csv') => {
    if (!auth) return;
    
    try {
      const response = await fetch(`/api/admin/security/export?format=${format}`, {
        headers: {
          'x-wallet-address': auth.walletAddress,
          'x-admin-signature': auth.signature
        }
      });
      
      if (!response.ok) {
        console.error('Export failed:', response.status);
        return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-events.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 border-red-500 text-red-400';
      case 'high': return 'bg-orange-500/20 border-orange-500 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      default: return 'bg-blue-500/20 border-blue-500 text-blue-400';
    }
  };
  
  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400" data-testid="security-loading">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
        Loading security dashboard...
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-8" data-testid="security-error">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <div className="text-red-400 mb-4">{error}</div>
        <Button onClick={initialize} variant="outline" size="sm" data-testid="retry-auth">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Authentication
        </Button>
      </div>
    );
  }
  
  if (!address) {
    return (
      <div className="text-center py-8 text-gray-400" data-testid="security-no-wallet">
        Connect wallet to view security dashboard
      </div>
    );
  }
  
  return (
    <div className="space-y-6" data-testid="security-dashboard">
      <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Security Score</h2>
            <p className="text-sm text-gray-400">Overall security health (last 24h)</p>
          </div>
          <div className={`text-5xl font-bold ${getScoreColor(metrics?.score || 0)}`} data-testid="security-score">
            {metrics?.score || 0}
          </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3 bg-black/60 border-purple-500/30">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Total Events</span>
          </div>
          <div className="text-2xl font-bold" data-testid="total-events">
            {metrics?.metrics?.totalEvents || 0}
          </div>
        </Card>
        
        <Card className="p-3 bg-black/60 border-red-500/30">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-gray-400">Critical</span>
          </div>
          <div className="text-2xl font-bold text-red-400" data-testid="critical-events">
            {metrics?.metrics?.criticalEvents || 0}
          </div>
        </Card>
        
        <Card className="p-3 bg-black/60 border-orange-500/30">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-gray-400">High</span>
          </div>
          <div className="text-2xl font-bold text-orange-400" data-testid="high-events">
            {metrics?.metrics?.highEvents || 0}
          </div>
        </Card>
        
        <Card className="p-3 bg-black/60 border-yellow-500/30">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-gray-400">Blocked</span>
          </div>
          <div className="text-2xl font-bold text-yellow-400" data-testid="blocked-requests">
            {metrics?.metrics?.blockedRequests || 0}
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 bg-black/60 border-cyan-500/30">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-gray-400">Active Bans</span>
          </div>
          <div className="text-2xl font-bold text-cyan-400" data-testid="active-bans">
            {metrics?.metrics?.activeBans || 0}
          </div>
        </Card>
        
        <Card className="p-3 bg-black/60 border-pink-500/30">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-pink-400" />
            <span className="text-xs text-gray-400">Failed Auth</span>
          </div>
          <div className="text-2xl font-bold text-pink-400" data-testid="failed-auth">
            {metrics?.metrics?.failedAuth || 0}
          </div>
        </Card>
      </div>
      
      {metrics?.metrics?.activeThreats && metrics.metrics.activeThreats > 0 && (
        <Card className="p-4 bg-red-500/10 border-red-500">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <div className="text-lg font-bold text-red-400" data-testid="active-threats">
                {metrics.metrics.activeThreats} Active Threat{metrics.metrics.activeThreats !== 1 ? 's' : ''}
              </div>
              <div className="text-xs text-red-300">Requires immediate attention</div>
            </div>
          </div>
        </Card>
      )}
      
      {metrics?.blockedEndpoints && metrics.blockedEndpoints.length > 0 && (
        <Card className="p-4 bg-orange-500/10 border-orange-500/30">
          <h4 className="text-sm font-bold text-orange-400 mb-2">Blocked Endpoints</h4>
          <div className="space-y-1">
            {metrics.blockedEndpoints.map((ep, i) => (
              <div key={i} className="text-xs font-mono text-gray-300">
                {ep.endpoint} - until {new Date(ep.until).toLocaleTimeString()}
              </div>
            ))}
          </div>
        </Card>
      )}
      
      <Card className="p-4 bg-black/60 border-purple-500/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Recent Security Events</h3>
          <div className="flex gap-2">
            <Button onClick={() => fetchData()} size="sm" variant="outline" data-testid="refresh-events">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={() => exportEvents('json')} size="sm" variant="outline" data-testid="export-json">
              <Download className="w-4 h-4 mr-1" />
              JSON
            </Button>
            <Button onClick={() => exportEvents('csv')} size="sm" variant="outline" data-testid="export-csv">
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
        
        {events.length === 0 ? (
          <div className="text-center text-gray-400 py-6" data-testid="no-events">
            <Shield className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div className="text-sm">No security events detected</div>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto" data-testid="events-list">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`p-3 rounded-lg border ${getSeverityColor(event.severity)} ${
                  event.handled ? 'opacity-50' : ''
                }`}
                data-testid={`security-event-${event.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-sm">{event.type.replace('_', ' ').toUpperCase()}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${getSeverityColor(event.severity)}`}>
                        {event.severity}
                      </span>
                      {event.handled && (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                          Handled
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-300">Source: {event.source}</div>
                    {event.ipAddress && (
                      <div className="text-xs text-gray-400">IP: {event.ipAddress}</div>
                    )}
                    <div className="text-xs font-mono bg-black/60 p-2 rounded mt-2 overflow-auto max-h-20">
                      {JSON.stringify(event.details, null, 2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {!event.handled && (
                    <Button 
                      onClick={() => handleEvent(event.id)} 
                      size="sm" 
                      variant="outline"
                      className="ml-2 flex-shrink-0"
                      data-testid={`handle-event-${event.id}`}
                    >
                      Mark Handled
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
