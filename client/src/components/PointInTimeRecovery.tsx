import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, CheckCircle, Search, RotateCcw, RefreshCw, Database } from 'lucide-react';
import { motion } from 'framer-motion';

interface TransactionLogStats {
  total: number | string;
  unique_transactions: number | string;
  oldest: string | null;
  newest: string | null;
  inserts: number | string;
  updates: number | string;
  deletes: number | string;
}

interface RecoveryPoint {
  timestamp: string;
  backupId: string;
  logEntries: number;
}

interface TestResult {
  success: boolean;
  canRecover: boolean;
  error?: string;
  recoveryPoint?: RecoveryPoint;
  backupDetails?: {
    id: string;
    timestamp: string;
    size: number;
    valid: boolean;
  };
  transactionLogs?: {
    count: number;
    operations: {
      inserts: number;
      updates: number;
      deletes: number;
    };
  };
  estimatedDuration?: number;
  warnings?: string[];
}

export const PointInTimeRecovery = () => {
  const { address } = useAccount();
  const [recoveryPoints, setRecoveryPoints] = useState<RecoveryPoint[]>([]);
  const [stats, setStats] = useState<TransactionLogStats | null>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [recovering, setRecovering] = useState(false);
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
      const [pointsRes, statsRes] = await Promise.all([
        authenticatedFetch('/api/admin/pitr/recovery-points'),
        authenticatedFetch('/api/admin/pitr/transaction-logs/stats')
      ]);
      
      if (!pointsRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch PITR data');
      }
      
      const pointsData = await pointsRes.json();
      const statsData = await statsRes.json();
      
      setRecoveryPoints(pointsData.points || []);
      setStats(statsData.stats);
    } catch (err: any) {
      console.error('Failed to fetch PITR data:', err);
      setError(err.message || 'Failed to fetch PITR data');
    } finally {
      setLoading(false);
    }
  }, [address, authenticatedFetch]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const testRecovery = async () => {
    if (!selectedTimestamp) {
      alert('Please enter a timestamp');
      return;
    }
    
    setTesting(true);
    setError(null);
    setTestResult(null);
    
    try {
      const res = await authenticatedFetch('/api/admin/pitr/test', {
        method: 'POST',
        body: JSON.stringify({ timestamp: selectedTimestamp })
      });
      
      const result = await res.json();
      setTestResult(result);
    } catch (err: any) {
      console.error('Recovery test failed:', err);
      setError(err.message);
      alert('Recovery test failed. Check console for details.');
    } finally {
      setTesting(false);
    }
  };
  
  const performRecovery = async () => {
    if (!selectedTimestamp) {
      alert('Please enter a timestamp');
      return;
    }
    
    const confirmed = confirm(
      'WARNING: This will restore the database to a previous point in time.\n\n' +
      'ALL CHANGES AFTER THIS TIME WILL BE LOST!\n\n' +
      'A backup will be created before recovery.\n\n' +
      'Are you absolutely sure?'
    );
    
    if (!confirmed) return;
    
    const doubleCheck = prompt(
      'Type "RECOVER" to confirm point-in-time recovery:'
    );
    
    if (doubleCheck !== 'RECOVER') return;
    
    setRecovering(true);
    setError(null);
    
    try {
      const res = await authenticatedFetch('/api/admin/pitr/recover', {
        method: 'POST',
        body: JSON.stringify({ timestamp: selectedTimestamp })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Recovery failed');
      }
      
      alert('Recovery completed!\n\nThe page will reload.');
      window.location.reload();
    } catch (err: any) {
      console.error('Recovery failed:', err);
      setError(err.message);
      alert('Recovery failed: ' + err.message);
    } finally {
      setRecovering(false);
    }
  };
  
  if (!address) {
    return (
      <Card className="p-6 bg-black/60 border-purple-500/30">
        <div className="text-center text-gray-400 py-4">
          <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <div>Connect wallet to access point-in-time recovery</div>
        </div>
      </Card>
    );
  }
  
  if (loading) {
    return (
      <Card className="p-6 bg-black/60 border-purple-500/30">
        <div className="flex items-center justify-center gap-2 py-8">
          <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
          <span className="text-gray-400">Loading recovery data...</span>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6" data-testid="pitr-manager">
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}
      
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-black/60 border-blue-500/30" data-testid="stat-total-logs">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400">Total Logs</span>
            </div>
            <div className="text-3xl font-bold">{stats.total || 0}</div>
          </Card>
          
          <Card className="p-4 bg-black/60 border-green-500/30" data-testid="stat-inserts">
            <div className="text-xs text-gray-400 mb-2">Inserts</div>
            <div className="text-2xl font-bold text-green-400">{stats.inserts || 0}</div>
          </Card>
          
          <Card className="p-4 bg-black/60 border-yellow-500/30" data-testid="stat-updates">
            <div className="text-xs text-gray-400 mb-2">Updates</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.updates || 0}</div>
          </Card>
          
          <Card className="p-4 bg-black/60 border-red-500/30" data-testid="stat-deletes">
            <div className="text-xs text-gray-400 mb-2">Deletes</div>
            <div className="text-2xl font-bold text-red-400">{stats.deletes || 0}</div>
          </Card>
        </div>
      )}
      
      <Card className="p-6 bg-black/60 border-purple-500/30">
        <h3 className="text-xl font-bold mb-4">Recover to Specific Time</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Target Timestamp
            </label>
            <input
              type="datetime-local"
              value={selectedTimestamp}
              onChange={(e) => setSelectedTimestamp(e.target.value)}
              className="w-full px-4 py-2 bg-black/60 border border-purple-500/30 rounded text-white"
              data-testid="input-timestamp"
            />
            <div className="text-xs text-gray-400 mt-1">
              Select the point in time to recover the database to
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={testRecovery} 
              disabled={testing || !selectedTimestamp}
              variant="outline"
              data-testid="button-test-recovery"
            >
              {testing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Test Recovery
            </Button>
            <Button 
              onClick={performRecovery} 
              disabled={recovering || !selectedTimestamp || !testResult?.canRecover}
              className="bg-gradient-to-r from-orange-500 to-red-500"
              data-testid="button-perform-recovery"
            >
              {recovering ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-2" />
              )}
              Recover
            </Button>
          </div>
        </div>
      </Card>
      
      {testResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={`p-6 border ${
            testResult.canRecover 
              ? 'border-green-500/30 bg-green-500/5' 
              : 'border-red-500/30 bg-red-500/5'
          }`} data-testid="test-result">
            <div className="flex items-start gap-3 mb-4">
              {testResult.canRecover ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              )}
              <div>
                <h4 className="text-lg font-bold mb-1">
                  {testResult.canRecover ? 'Recovery Available' : 'Cannot Recover'}
                </h4>
                <p className="text-sm text-gray-300">
                  {testResult.canRecover 
                    ? 'Database can be recovered to this point in time'
                    : testResult.error || 'Recovery not possible'
                  }
                </p>
              </div>
            </div>
            
            {testResult.canRecover && testResult.backupDetails && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-black/40 rounded">
                    <div className="text-xs text-gray-400">Backup</div>
                    <div className="font-mono text-sm">{testResult.backupDetails.id}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(testResult.backupDetails.timestamp).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="p-3 bg-black/40 rounded">
                    <div className="text-xs text-gray-400">Transactions to Replay</div>
                    <div className="text-2xl font-bold">{testResult.transactionLogs?.count || 0}</div>
                    <div className="text-xs text-gray-400">
                      {testResult.transactionLogs?.operations.inserts || 0} inserts, {' '}
                      {testResult.transactionLogs?.operations.updates || 0} updates, {' '}
                      {testResult.transactionLogs?.operations.deletes || 0} deletes
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                  <div className="text-sm font-bold text-blue-400">Estimated Duration</div>
                  <div className="text-xs text-blue-300">~{testResult.estimatedDuration || 60} seconds</div>
                </div>
                
                {testResult.warnings && testResult.warnings.length > 0 && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                    <div className="text-sm font-bold text-yellow-400">Warnings</div>
                    <ul className="text-xs text-yellow-300 list-disc list-inside mt-1">
                      {testResult.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      )}
      
      <Card className="p-6 bg-black/60 border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Available Recovery Points</h3>
          <Button 
            onClick={fetchData} 
            variant="outline" 
            size="sm"
            data-testid="button-refresh-points"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </div>
        
        {recoveryPoints.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <div>No recovery points available</div>
            <div className="text-xs mt-1">Create a backup to enable recovery</div>
          </div>
        ) : (
          <div className="space-y-3">
            {recoveryPoints.map((point, i) => (
              <motion.div
                key={point.backupId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-lg border border-purple-500/30 bg-purple-500/5"
                data-testid={`recovery-point-${point.backupId}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <span className="font-mono text-sm">{point.backupId}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(point.timestamp).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {point.logEntries} transaction logs since this point
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const date = new Date(point.timestamp);
                      const localDatetime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                        .toISOString()
                        .slice(0, 16);
                      setSelectedTimestamp(localDatetime);
                    }}
                    data-testid={`button-select-point-${point.backupId}`}
                  >
                    Select
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
