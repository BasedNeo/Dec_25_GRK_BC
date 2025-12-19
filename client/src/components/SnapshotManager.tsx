import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, GitCompare, Trash2, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Snapshot {
  id: string;
  timestamp: string;
  description: string;
  capturedBy: string;
  version: string;
  database: {
    tables: Record<string, number>;
    totalRecords: number;
    checksum: string;
  };
  features: Record<string, boolean>;
  size: number;
  status: 'captured' | 'failed';
  error?: string;
}

interface SnapshotStats {
  total: number;
  successful: number;
  failed: number;
  totalSize: string;
  oldest?: string;
  newest?: string;
}

export const SnapshotManager = () => {
  const { address } = useAccount();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [stats, setStats] = useState<SnapshotStats | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!address) throw new Error('Wallet not connected');
    
    const nonceRes = await fetch('/api/admin/nonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: address }),
    });
    
    if (!nonceRes.ok) throw new Error('Not authorized');
    
    const { nonce } = await nonceRes.json();
    const provider = new ethers.BrowserProvider(window.ethereum as any);
    const signer = await provider.getSigner();
    const message = `Based Guardians Admin Auth\nNonce: ${nonce}`;
    const signature = await signer.signMessage(message);
    
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'x-wallet-address': address,
        'x-admin-signature': signature,
        'Content-Type': 'application/json',
      },
    });
  }, [address]);
  
  const fetchData = useCallback(async () => {
    if (!address) {
      setFetchLoading(false);
      return;
    }
    
    setError(null);
    
    try {
      const [snapshotsRes, statsRes] = await Promise.all([
        authenticatedFetch('/api/admin/snapshots/list'),
        authenticatedFetch('/api/admin/snapshots/stats')
      ]);
      
      if (!snapshotsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch snapshot data');
      }
      
      const snapshotsData = await snapshotsRes.json();
      const statsData = await statsRes.json();
      
      setSnapshots(snapshotsData.snapshots || []);
      setStats(statsData.stats);
    } catch (err: any) {
      console.error('Failed to fetch snapshots:', err);
      setError(err.message || 'Failed to fetch snapshot data');
    } finally {
      setFetchLoading(false);
    }
  }, [address, authenticatedFetch]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const captureSnapshot = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch('/api/admin/snapshots/capture', {
        method: 'POST',
        body: JSON.stringify({ description })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Capture failed');
      }
      
      setDescription('');
      await fetchData();
    } catch (err: any) {
      console.error('Snapshot capture failed:', err);
      setError(err.message || 'Snapshot capture failed');
    } finally {
      setLoading(false);
    }
  };
  
  const restoreSnapshot = async (snapshotId: string) => {
    const confirmed = confirm(
      'WARNING\n\n' +
      'This will restore the application state to this snapshot.\n' +
      'Current feature flags and configuration will be replaced.\n\n' +
      'A pre-restore snapshot will be created automatically.\n\n' +
      'Continue?'
    );
    
    if (!confirmed) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`/api/admin/snapshots/restore/${snapshotId}`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Restore failed');
      }
      
      alert('Snapshot restored! The page will reload.');
      window.location.reload();
    } catch (err: any) {
      console.error('Restore failed:', err);
      setError(err.message || 'Restore failed');
    } finally {
      setLoading(false);
    }
  };
  
  const deleteSnapshot = async (snapshotId: string) => {
    const confirmed = confirm('Delete this snapshot?');
    if (!confirmed) return;
    
    try {
      const res = await authenticatedFetch(`/api/admin/snapshots/${snapshotId}`, {
        method: 'DELETE'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
      
      await fetchData();
    } catch (err: any) {
      console.error('Delete failed:', err);
      setError(err.message || 'Delete failed');
    }
  };
  
  const toggleCompareSelection = (snapshotId: string) => {
    if (selectedForCompare.includes(snapshotId)) {
      setSelectedForCompare(selectedForCompare.filter(id => id !== snapshotId));
    } else if (selectedForCompare.length < 2) {
      setSelectedForCompare([...selectedForCompare, snapshotId]);
    }
  };
  
  const compareSnapshots = async () => {
    if (selectedForCompare.length !== 2) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch('/api/admin/snapshots/compare', {
        method: 'POST',
        body: JSON.stringify({
          snapshot1: selectedForCompare[0],
          snapshot2: selectedForCompare[1]
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Comparison failed');
      }
      
      const data = await res.json();
      setComparison(data.diff);
    } catch (err: any) {
      console.error('Comparison failed:', err);
      setError(err.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };
  
  if (!address) {
    return (
      <div className="text-gray-400 text-center py-8">
        Connect your wallet to manage snapshots.
      </div>
    );
  }
  
  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        <span className="ml-2 text-gray-400">Loading snapshots...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6" data-testid="snapshot-manager">
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-black/60 border-blue-500/30">
            <div className="text-xs text-gray-400 mb-1">Total Snapshots</div>
            <div className="text-3xl font-bold" data-testid="stats-total">{stats.total}</div>
          </Card>
          <Card className="p-4 bg-black/60 border-green-500/30">
            <div className="text-xs text-gray-400 mb-1">Successful</div>
            <div className="text-3xl font-bold text-green-400" data-testid="stats-successful">{stats.successful}</div>
          </Card>
          <Card className="p-4 bg-black/60 border-red-500/30">
            <div className="text-xs text-gray-400 mb-1">Failed</div>
            <div className="text-3xl font-bold text-red-400" data-testid="stats-failed">{stats.failed}</div>
          </Card>
          <Card className="p-4 bg-black/60 border-purple-500/30">
            <div className="text-xs text-gray-400 mb-1">Total Size</div>
            <div className="text-2xl font-bold" data-testid="stats-size">{stats.totalSize}</div>
          </Card>
        </div>
      )}
      
      <Card className="p-6 bg-black/60 border-purple-500/30">
        <h3 className="text-xl font-bold mb-4">Capture New Snapshot</h3>
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Snapshot description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 bg-black/60 border border-purple-500/30 rounded text-white"
            data-testid="input-snapshot-description"
          />
          
          <div className="flex gap-2">
            <Button 
              onClick={captureSnapshot} 
              disabled={loading}
              className="bg-gradient-to-r from-purple-500 to-blue-500"
              data-testid="button-capture-snapshot"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
              Capture Snapshot
            </Button>
            
            <Button 
              onClick={() => {
                setCompareMode(!compareMode);
                setSelectedForCompare([]);
                setComparison(null);
              }}
              variant={compareMode ? "default" : "outline"}
              data-testid="button-toggle-compare"
            >
              <GitCompare className="w-4 h-4 mr-2" />
              {compareMode ? 'Exit Compare Mode' : 'Compare Snapshots'}
            </Button>
          </div>
        </div>
      </Card>
      
      {compareMode && selectedForCompare.length === 2 && (
        <div className="flex justify-center">
          <Button 
            onClick={compareSnapshots}
            disabled={loading}
            className="bg-gradient-to-r from-green-500 to-cyan-500"
            data-testid="button-compare-snapshots"
          >
            <GitCompare className="w-4 h-4 mr-2" />
            Compare Selected ({selectedForCompare.length}/2)
          </Button>
        </div>
      )}
      
      {comparison && (
        <Card className="p-6 bg-black/60 border-cyan-500/30">
          <h3 className="text-xl font-bold mb-4">Comparison Results</h3>
          
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-gray-400">Time Difference</div>
              <div className="font-mono">
                {Math.round(comparison.timestamp.timeDiff / 1000 / 60)} minutes
              </div>
            </div>
            
            <div>
              <div className="text-gray-400">Database Records Difference</div>
              <div className={`font-mono ${comparison.database.recordsDiff > 0 ? 'text-green-400' : comparison.database.recordsDiff < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {comparison.database.recordsDiff > 0 ? '+' : ''}{comparison.database.recordsDiff}
              </div>
            </div>
            
            {Object.keys(comparison.database.tableChanges).length > 0 && (
              <div>
                <div className="text-gray-400">Table Changes</div>
                <div className="font-mono text-xs">
                  {Object.entries(comparison.database.tableChanges).map(([table, change]: [string, any]) => (
                    <div key={table} className="flex justify-between">
                      <span>{table}:</span>
                      <span className={change.after > change.before ? 'text-green-400' : 'text-red-400'}>
                        {change.before} → {change.after}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {Object.keys(comparison.features.changed).length > 0 && (
              <div>
                <div className="text-gray-400">Feature Flag Changes</div>
                <div className="font-mono text-xs">
                  {Object.entries(comparison.features.changed).map(([flag, change]: [string, any]) => (
                    <div key={flag} className="flex justify-between">
                      <span>{flag}:</span>
                      <span>
                        {String(change.before)} → {String(change.after)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <Button
            onClick={() => {
              setComparison(null);
              setSelectedForCompare([]);
            }}
            variant="outline"
            className="mt-4"
            data-testid="button-close-comparison"
          >
            Close
          </Button>
        </Card>
      )}
      
      <Card className="p-6 bg-black/60 border-blue-500/30">
        <h3 className="text-xl font-bold mb-4">Snapshot History</h3>
        
        {snapshots.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            No snapshots yet. Capture your first snapshot above.
          </div>
        ) : (
          <div className="space-y-3">
            {snapshots.map((snapshot) => (
              <div 
                key={snapshot.id}
                className={`p-4 rounded border ${
                  compareMode && selectedForCompare.includes(snapshot.id)
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-gray-700 bg-black/40'
                } ${compareMode ? 'cursor-pointer' : ''}`}
                onClick={() => compareMode && toggleCompareSelection(snapshot.id)}
                data-testid={`snapshot-item-${snapshot.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {snapshot.status === 'captured' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className="font-bold">{snapshot.description || 'No description'}</span>
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(snapshot.timestamp)}
                      </span>
                      <span>By: {snapshot.capturedBy}</span>
                      <span>{(snapshot.size / 1024).toFixed(2)} KB</span>
                    </div>
                    
                    {snapshot.status === 'captured' && (
                      <div className="text-xs text-gray-500 mt-2">
                        Records: {snapshot.database.totalRecords} | 
                        Tables: {Object.keys(snapshot.database.tables).length} | 
                        Feature Flags: {Object.keys(snapshot.features).length}
                      </div>
                    )}
                    
                    {snapshot.error && (
                      <div className="text-xs text-red-400 mt-1">
                        Error: {snapshot.error}
                      </div>
                    )}
                  </div>
                  
                  {!compareMode && snapshot.status === 'captured' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => restoreSnapshot(snapshot.id)}
                        disabled={loading}
                        className="text-green-400 border-green-500/50 hover:bg-green-500/20"
                        data-testid={`button-restore-${snapshot.id}`}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteSnapshot(snapshot.id)}
                        className="text-red-400 border-red-500/50 hover:bg-red-500/20"
                        data-testid={`button-delete-${snapshot.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
