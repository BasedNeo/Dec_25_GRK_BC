import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Download, Upload, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface Backup {
  id: string;
  timestamp: string;
  type: string;
  size: number;
  checksum: string;
  status: string;
  duration: number;
  recordCount?: number;
}

interface BackupStats {
  total: number;
  successful: number;
  failed: number;
  totalSize: string;
  avgDuration: string;
  oldest?: string;
  newest?: string;
}

export const BackupManager = () => {
  const { address } = useAccount();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
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
      setLoading(false);
      return;
    }
    
    setError(null);
    
    try {
      const [backupsRes, statsRes] = await Promise.all([
        authenticatedFetch('/api/admin/backup/list'),
        authenticatedFetch('/api/admin/backup/stats')
      ]);
      
      if (!backupsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch backup data');
      }
      
      const backupsData = await backupsRes.json();
      const statsData = await statsRes.json();
      
      setBackups(backupsData.backups || []);
      setStats(statsData.stats);
    } catch (err: any) {
      console.error('Failed to fetch backup data:', err);
      setError(err.message || 'Failed to fetch backup data');
    } finally {
      setLoading(false);
    }
  }, [address, authenticatedFetch]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const createBackup = async () => {
    setCreating(true);
    setError(null);
    
    try {
      const res = await authenticatedFetch('/api/admin/backup/create', {
        method: 'POST',
        body: JSON.stringify({ type: 'full' })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Backup failed');
      }
      
      await fetchData();
      alert('Backup created successfully!');
    } catch (err: any) {
      console.error('Backup failed:', err);
      setError(err.message);
      alert('Backup failed: ' + err.message);
    } finally {
      setCreating(false);
    }
  };
  
  const verifyBackup = async (backupId: string) => {
    setVerifying(backupId);
    
    try {
      const res = await authenticatedFetch(`/api/admin/backup/verify/${backupId}`, {
        method: 'POST'
      });
      
      const data = await res.json();
      
      if (data.valid) {
        alert('Backup verification passed!');
      } else {
        alert('Backup verification failed!');
      }
    } catch (err: any) {
      console.error('Verification failed:', err);
      alert('Verification failed: ' + err.message);
    } finally {
      setVerifying(null);
    }
  };
  
  const restoreBackup = async (backupId: string) => {
    const confirmed = confirm(
      'WARNING: This will restore the database to this backup point.\n\n' +
      'ALL CURRENT DATA WILL BE REPLACED!\n\n' +
      'Are you absolutely sure you want to proceed?'
    );
    
    if (!confirmed) return;
    
    const doubleCheck = confirm(
      'This is your last chance to cancel.\n\n' +
      'Click OK to confirm restoration.'
    );
    
    if (!doubleCheck) return;
    
    setRestoring(backupId);
    
    try {
      const res = await authenticatedFetch(`/api/admin/backup/restore/${backupId}`, {
        method: 'POST'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Restore failed');
      }
      
      alert('Database restored successfully!\n\nThe page will reload.');
      window.location.reload();
    } catch (err: any) {
      console.error('Restore failed:', err);
      alert('Restore failed: ' + err.message);
    } finally {
      setRestoring(null);
    }
  };
  
  if (!address) {
    return (
      <Card className="p-6 bg-black/60 border-purple-500/30">
        <div className="text-center text-gray-400 py-4">
          <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <div>Connect wallet to access backup management</div>
        </div>
      </Card>
    );
  }
  
  if (loading) {
    return (
      <Card className="p-6 bg-black/60 border-purple-500/30">
        <div className="flex items-center justify-center gap-2 py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
          <span className="text-gray-400">Loading backup data...</span>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6" data-testid="backup-manager">
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-black/60 border-blue-500/30" data-testid="stat-total">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-400">Total Backups</span>
          </div>
          <div className="text-3xl font-bold">{stats?.total || 0}</div>
        </Card>
        
        <Card className="p-4 bg-black/60 border-green-500/30" data-testid="stat-successful">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-sm text-gray-400">Successful</span>
          </div>
          <div className="text-3xl font-bold text-green-400">{stats?.successful || 0}</div>
        </Card>
        
        <Card className="p-4 bg-black/60 border-red-500/30" data-testid="stat-failed">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-gray-400">Failed</span>
          </div>
          <div className="text-3xl font-bold text-red-400">{stats?.failed || 0}</div>
        </Card>
        
        <Card className="p-4 bg-black/60 border-purple-500/30" data-testid="stat-size">
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-gray-400">Total Size</span>
          </div>
          <div className="text-2xl font-bold">{stats?.totalSize || '0 MB'}</div>
        </Card>
      </div>
      
      <Card className="p-6 bg-black/60 border-purple-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Create New Backup</h3>
            <p className="text-gray-400">
              Full database backup with compression and integrity verification
            </p>
          </div>
          <Button 
            onClick={createBackup} 
            disabled={creating}
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-blue-500"
            data-testid="button-create-backup"
          >
            {creating ? (
              <>
                <Clock className="w-5 h-5 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Database className="w-5 h-5 mr-2" />
                Create Backup
              </>
            )}
          </Button>
        </div>
      </Card>
      
      <Card className="p-6 bg-black/60 border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Available Backups</h3>
          <Button 
            onClick={fetchData} 
            variant="outline" 
            size="sm"
            data-testid="button-refresh-backups"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
        
        {backups.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <div>No backups available</div>
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((backup, i) => (
              <motion.div
                key={backup.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`p-4 rounded-lg border ${
                  backup.status === 'success' 
                    ? 'border-green-500/30 bg-green-500/5' 
                    : 'border-red-500/30 bg-red-500/5'
                }`}
                data-testid={`backup-item-${backup.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {backup.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className="font-bold font-mono">{backup.id}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        backup.type === 'full' 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {backup.type.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Created</div>
                        <div className="text-white">{new Date(backup.timestamp).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Size</div>
                        <div className="text-white">{(backup.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Duration</div>
                        <div className="text-white">{(backup.duration / 1000).toFixed(2)}s</div>
                      </div>
                      {backup.recordCount && (
                        <div>
                          <div className="text-gray-400">Tables</div>
                          <div className="text-white">{backup.recordCount}</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 mt-2 font-mono">
                      Checksum: {backup.checksum.substring(0, 32)}...
                    </div>
                  </div>
                  
                  {backup.status === 'success' && (
                    <div className="flex gap-2 ml-4">
                      <Button 
                        onClick={() => verifyBackup(backup.id)} 
                        size="sm" 
                        variant="outline"
                        disabled={verifying === backup.id}
                        data-testid={`button-verify-${backup.id}`}
                      >
                        {verifying === backup.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          'Verify'
                        )}
                      </Button>
                      <Button 
                        onClick={() => restoreBackup(backup.id)} 
                        size="sm"
                        className="bg-gradient-to-r from-orange-500 to-red-500"
                        disabled={restoring === backup.id}
                        data-testid={`button-restore-${backup.id}`}
                      >
                        {restoring === backup.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-1" />
                            Restore
                          </>
                        )}
                      </Button>
                    </div>
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
