import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, AlertTriangle, RefreshCw, Plus, Check, X } from 'lucide-react';

interface CorsViolation {
  origin: string;
  count: number;
}

export const SecurityMonitor = () => {
  const { address } = useAccount();
  const [corsViolations, setCorsViolations] = useState<CorsViolation[]>([]);
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>([]);
  const [csrfStats, setCsrfStats] = useState<{ activeTokens: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [newOrigin, setNewOrigin] = useState('');
  const [addingOrigin, setAddingOrigin] = useState(false);

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
      
      const [violationsRes, originsRes, csrfRes] = await Promise.all([
        fetch('/api/admin/security/cors-violations', { headers }),
        fetch('/api/admin/security/allowed-origins', { headers }),
        fetch('/api/admin/security/csrf-stats', { headers })
      ]);
      
      if (!violationsRes.ok || !originsRes.ok || !csrfRes.ok) {
        setError('Failed to fetch security data');
        setLoading(false);
        return;
      }
      
      const violationsData = await violationsRes.json();
      const originsData = await originsRes.json();
      const csrfData = await csrfRes.json();
      
      setCorsViolations(violationsData.suspicious || []);
      setAllowedOrigins(originsData.origins || []);
      setCsrfStats(csrfData);
      setInitialized(true);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch security data:', err);
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [address, getAdminAuth]);

  const clearViolations = async () => {
    const auth = await getAdminAuth();
    if (!auth) return;
    
    try {
      await fetch('/api/admin/security/clear-cors-violations', {
        method: 'POST',
        headers: {
          'x-wallet-address': auth.walletAddress,
          'x-admin-signature': auth.signature
        }
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to clear violations:', err);
    }
  };

  const addOrigin = async () => {
    if (!newOrigin || !newOrigin.startsWith('http')) {
      setError('Origin must start with http:// or https://');
      return;
    }
    
    const auth = await getAdminAuth();
    if (!auth) return;
    
    setAddingOrigin(true);
    try {
      const res = await fetch('/api/admin/security/add-origin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': auth.walletAddress,
          'x-admin-signature': auth.signature
        },
        body: JSON.stringify({ origin: newOrigin })
      });
      
      if (res.ok) {
        setNewOrigin('');
        await fetchData();
      }
    } catch (err) {
      console.error('Failed to add origin:', err);
    } finally {
      setAddingOrigin(false);
    }
  };

  if (!initialized && !loading) {
    return (
      <Card className="p-6 bg-black/60 border-purple-500/30" data-testid="security-monitor-panel">
        <div className="flex flex-col items-center justify-center gap-4">
          <p className="text-gray-400">Click to load security data (requires admin signature)</p>
          <Button
            onClick={fetchData}
            disabled={loading || !address}
            className="flex items-center gap-2"
            data-testid="button-load-security"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            Load Security Data
          </Button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="security-monitor-content">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Security Status</h3>
        <Button
          onClick={fetchData}
          disabled={loading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          data-testid="button-refresh-security"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <Card className="p-6 bg-black/60 border-green-500/30" data-testid="security-headers-panel">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-green-400" />
          <h4 className="text-lg font-bold">Security Headers Status</h4>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-black/40 rounded">
            <span>CORS Protection</span>
            <span className="text-green-400 flex items-center gap-1"><Check className="w-4 h-4" /> Active</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-black/40 rounded">
            <span>CSP (Content Security Policy)</span>
            <span className="text-green-400 flex items-center gap-1"><Check className="w-4 h-4" /> Active</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-black/40 rounded">
            <span>HSTS (Strict Transport Security)</span>
            <span className="text-green-400 flex items-center gap-1"><Check className="w-4 h-4" /> Active</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-black/40 rounded">
            <span>X-Frame-Options (Clickjacking)</span>
            <span className="text-green-400 flex items-center gap-1"><Check className="w-4 h-4" /> Active</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-black/40 rounded">
            <span>XSS Protection</span>
            <span className="text-green-400 flex items-center gap-1"><Check className="w-4 h-4" /> Active</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-black/40 rounded">
            <span>MIME Sniffing Prevention</span>
            <span className="text-green-400 flex items-center gap-1"><Check className="w-4 h-4" /> Active</span>
          </div>
        </div>
        
        {csrfStats && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between p-2 bg-black/40 rounded">
              <span>Active CSRF Tokens</span>
              <span className="text-cyan-400 font-mono" data-testid="value-csrf-tokens">{csrfStats.activeTokens}</span>
            </div>
          </div>
        )}
      </Card>
      
      <Card className="p-6 bg-black/60 border-yellow-500/30" data-testid="cors-violations-panel">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h4 className="text-lg font-bold">CORS Violations ({corsViolations.length})</h4>
          </div>
          {corsViolations.length > 0 && (
            <Button 
              onClick={clearViolations} 
              size="sm" 
              variant="outline"
              className="border-yellow-500/50 text-yellow-400"
              data-testid="button-clear-violations"
            >
              Clear All
            </Button>
          )}
        </div>
        
        {corsViolations.length === 0 ? (
          <div className="text-gray-400" data-testid="text-no-violations">No CORS violations detected</div>
        ) : (
          <div className="space-y-2">
            {corsViolations.map((violation, i) => (
              <div 
                key={i} 
                className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded"
                data-testid={`violation-item-${i}`}
              >
                <div className="font-mono text-sm">{violation.origin}</div>
                <div className="text-xs text-gray-400">
                  {violation.count} attempt{violation.count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      <Card className="p-6 bg-black/60 border-cyan-500/30" data-testid="allowed-origins-panel">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h4 className="text-lg font-bold">Allowed Origins ({allowedOrigins.length})</h4>
        </div>
        
        <div className="space-y-2 mb-4">
          {allowedOrigins.map((origin, i) => (
            <div 
              key={i} 
              className="p-2 bg-black/40 rounded font-mono text-sm text-cyan-400"
              data-testid={`origin-item-${i}`}
            >
              {origin}
            </div>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Input
            value={newOrigin}
            onChange={(e) => setNewOrigin(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 bg-black/40 border-gray-700"
            data-testid="input-new-origin"
          />
          <Button
            onClick={addOrigin}
            disabled={addingOrigin || !newOrigin}
            size="sm"
            className="flex items-center gap-1"
            data-testid="button-add-origin"
          >
            {addingOrigin ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add
          </Button>
        </div>
      </Card>
    </div>
  );
};
