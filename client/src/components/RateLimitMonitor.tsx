import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Ban, RefreshCw } from 'lucide-react';

interface SuspiciousIP {
  ip: string;
  count: number;
  firstSeen: Date;
  active: boolean;
}

interface BannedIP {
  ip: string;
  reason: string;
  until: Date;
  remaining: number;
}

export const RateLimitMonitor = () => {
  const { address } = useAccount();
  const [suspicious, setSuspicious] = useState<SuspiciousIP[]>([]);
  const [banned, setBanned] = useState<BannedIP[]>([]);
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
      
      const [suspRes, banRes] = await Promise.all([
        fetch('/api/admin/rate-limits/suspicious', { headers }),
        fetch('/api/admin/rate-limits/banned', { headers })
      ]);
      
      if (!suspRes.ok || !banRes.ok) {
        setError('Failed to fetch rate limit data');
        setLoading(false);
        return;
      }
      
      const suspData = await suspRes.json();
      const banData = await banRes.json();
      
      setSuspicious(suspData.suspicious || []);
      setBanned(banData.banned || []);
      setInitialized(true);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch rate limit data:', err);
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [address, getAdminAuth]);
  
  const banIP = async (ip: string, durationHours: number) => {
    const auth = await getAdminAuth();
    if (!auth) return;
    
    try {
      const res = await fetch('/api/admin/rate-limits/ban', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-wallet-address': auth.walletAddress,
          'x-admin-signature': auth.signature
        },
        body: JSON.stringify({
          ip,
          durationMs: durationHours * 60 * 60 * 1000,
          reason: 'Manual ban by admin'
        })
      });
      
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to ban IP:', err);
    }
  };
  
  const unbanIP = async (ip: string) => {
    const auth = await getAdminAuth();
    if (!auth) return;
    
    try {
      const res = await fetch('/api/admin/rate-limits/unban', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-wallet-address': auth.walletAddress,
          'x-admin-signature': auth.signature
        },
        body: JSON.stringify({ ip })
      });
      
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to unban IP:', err);
    }
  };
  
  const clearSuspicious = async () => {
    const auth = await getAdminAuth();
    if (!auth) return;
    
    try {
      const res = await fetch('/api/admin/rate-limits/clear-suspicious', { 
        method: 'POST',
        headers: {
          'x-wallet-address': auth.walletAddress,
          'x-admin-signature': auth.signature
        }
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to clear suspicious IPs:', err);
    }
  };
  
  if (!initialized) {
    return (
      <div className="space-y-4" data-testid="rate-limit-monitor">
        <div className="text-gray-400 text-sm mb-4">
          Click refresh to load rate limit data (requires signature)
        </div>
        <Button 
          onClick={fetchData} 
          size="sm" 
          variant="outline"
          disabled={loading}
          className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
          data-testid="button-load-rate-limits"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Load Rate Limit Data
            </>
          )}
        </Button>
        {error && (
          <div className="text-red-400 text-sm mt-2" data-testid="rate-limit-error">
            {error}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-6" data-testid="rate-limit-monitor">
      <div className="p-4 bg-black/40 border border-yellow-500/30 rounded" data-testid="suspicious-ips-panel">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            Suspicious Activity ({suspicious.length})
          </h4>
          <div className="flex gap-2">
            <Button 
              onClick={clearSuspicious} 
              size="sm" 
              variant="outline"
              className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
              data-testid="button-clear-suspicious"
            >
              Clear All
            </Button>
            <Button 
              onClick={fetchData} 
              size="sm" 
              variant="outline"
              disabled={loading}
              className="border-gray-600 text-gray-400 hover:bg-gray-800"
              data-testid="button-refresh-rate-limits"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {error && (
          <div className="text-red-400 text-sm mb-4">{error}</div>
        )}
        
        {suspicious.length === 0 ? (
          <div className="text-gray-400 text-sm">No suspicious activity detected</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {suspicious.map((item) => (
              <div 
                key={item.ip} 
                className={`p-3 rounded border ${
                  item.active ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-gray-500/50 bg-gray-500/10'
                }`}
                data-testid={`suspicious-ip-${item.ip.replace(/\./g, '-')}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm text-white">{item.ip}</div>
                    <div className="text-xs text-gray-400">
                      {item.count} violations • First seen: {new Date(item.firstSeen).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => banIP(item.ip, 1)} 
                      size="sm" 
                      variant="destructive"
                      data-testid={`button-ban-1h-${item.ip.replace(/\./g, '-')}`}
                    >
                      Ban 1h
                    </Button>
                    <Button 
                      onClick={() => banIP(item.ip, 24)} 
                      size="sm" 
                      variant="destructive"
                      data-testid={`button-ban-24h-${item.ip.replace(/\./g, '-')}`}
                    >
                      Ban 24h
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-4 bg-black/40 border border-red-500/30 rounded" data-testid="banned-ips-panel">
        <h4 className="font-bold flex items-center gap-2 mb-4">
          <Ban className="w-5 h-5 text-red-400" />
          Banned IPs ({banned.length})
        </h4>
        
        {banned.length === 0 ? (
          <div className="text-gray-400 text-sm">No banned IPs</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {banned.map((item) => (
              <div 
                key={item.ip} 
                className="p-3 rounded border border-red-500/50 bg-red-500/10"
                data-testid={`banned-ip-${item.ip.replace(/\./g, '-')}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-sm text-white">{item.ip}</div>
                    <div className="text-xs text-gray-400">
                      Reason: {item.reason}
                    </div>
                    <div className="text-xs text-gray-400">
                      Until: {new Date(item.until).toLocaleString()} 
                      ({Math.ceil(item.remaining / 60000)} minutes remaining)
                    </div>
                  </div>
                  <Button 
                    onClick={() => unbanIP(item.ip)} 
                    size="sm" 
                    variant="outline"
                    className="border-gray-600 text-gray-400 hover:bg-gray-800"
                    data-testid={`button-unban-${item.ip.replace(/\./g, '-')}`}
                  >
                    Unban
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
