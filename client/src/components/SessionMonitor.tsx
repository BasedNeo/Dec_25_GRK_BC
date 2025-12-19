import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Users, Shield, RefreshCw } from 'lucide-react';

interface SessionStats {
  sessions: {
    total: number;
    uniqueUsers: number;
    adminSessions: number;
  };
}

interface ActiveSession {
  id: string;
  walletAddress: string;
  isAdmin: boolean;
  ipAddress: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
}

export const SessionMonitor = () => {
  const { address } = useAccount();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

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

  const fetchData = useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    const auth = await getAdminAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    
    try {
      const headers = {
        'x-wallet-address': auth.walletAddress,
        'x-admin-signature': auth.signature
      };
      
      const [statsRes, sessionsRes] = await Promise.all([
        fetch('/api/admin/sessions/stats', { headers }),
        fetch('/api/admin/sessions/active', { headers })
      ]);
      
      if (!statsRes.ok || !sessionsRes.ok) {
        setError('Failed to fetch session data');
        setLoading(false);
        return;
      }
      
      const statsData = await statsRes.json();
      const sessionsData = await sessionsRes.json();
      
      setStats(statsData);
      setSessions(sessionsData.sessions || []);
      setInitialized(true);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch session data:', err);
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [address, getAdminAuth]);

  if (!initialized && !loading) {
    return (
      <Card className="p-6 bg-black/60 border-purple-500/30" data-testid="session-monitor-panel">
        <div className="flex flex-col items-center justify-center gap-4">
          <p className="text-gray-400">Click to load session data (requires admin signature)</p>
          <Button
            onClick={fetchData}
            disabled={loading || !address}
            className="flex items-center gap-2"
            data-testid="button-load-sessions"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            Load Session Data
          </Button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="session-monitor-content">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Session Statistics</h3>
        <Button
          onClick={fetchData}
          disabled={loading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          data-testid="button-refresh-sessions"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-black/60 border-purple-500/30" data-testid="stat-active-sessions">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-400">Active Sessions</span>
          </div>
          <div className="text-3xl font-bold" data-testid="value-active-sessions">
            {stats?.sessions?.total || 0}
          </div>
        </Card>
        
        <Card className="p-4 bg-black/60 border-blue-500/30" data-testid="stat-unique-users">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-400">Unique Users</span>
          </div>
          <div className="text-3xl font-bold" data-testid="value-unique-users">
            {stats?.sessions?.uniqueUsers || 0}
          </div>
        </Card>
        
        <Card className="p-4 bg-black/60 border-green-500/30" data-testid="stat-admin-sessions">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">Admin Sessions</span>
          </div>
          <div className="text-3xl font-bold" data-testid="value-admin-sessions">
            {stats?.sessions?.adminSessions || 0}
          </div>
        </Card>
      </div>
      
      <Card className="p-6 bg-black/60 border-purple-500/30" data-testid="active-sessions-list">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          Active Sessions
        </h3>
        
        {sessions.length === 0 ? (
          <div className="text-gray-400" data-testid="text-no-sessions">No active sessions</div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div 
                key={session.id} 
                className="p-3 bg-black/40 rounded border border-purple-500/20"
                data-testid={`session-item-${session.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-sm text-purple-400">
                      {session.walletAddress.slice(0, 6)}...{session.walletAddress.slice(-4)}
                      {session.isAdmin && (
                        <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      IP: {session.ipAddress}
                    </div>
                    <div className="text-xs text-gray-400">
                      Created: {new Date(session.createdAt).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      Last active: {new Date(session.lastActivity).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      Expires: {new Date(session.expiresAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
