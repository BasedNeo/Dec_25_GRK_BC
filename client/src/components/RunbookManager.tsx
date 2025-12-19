import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Book, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface RunbookStep {
  id: string;
  title: string;
  description: string;
  command?: string;
  automated: boolean;
  critical: boolean;
  estimatedMinutes: number;
  validation?: string;
}

interface Runbook {
  id: string;
  title: string;
  category: 'backup' | 'restore' | 'failover' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  steps: RunbookStep[];
  totalEstimatedTime: number;
  executionCount: number;
  successRate: number;
}

interface RunbookExecution {
  runbookId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  executedBy: string;
  completedSteps: string[];
  logs: Array<{
    timestamp: string;
    level: 'info' | 'warning' | 'error';
    message: string;
  }>;
}

export const RunbookManager = () => {
  const { address } = useAccount();
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [selectedRunbook, setSelectedRunbook] = useState<Runbook | null>(null);
  const [execution, setExecution] = useState<RunbookExecution | null>(null);
  const [executing, setExecuting] = useState(false);
  const [loading, setLoading] = useState(true);
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

  const fetchRunbooks = useCallback(async () => {
    if (!address) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const res = await authenticatedFetch('/api/admin/runbooks');
      if (!res.ok) throw new Error('Failed to fetch runbooks');
      const data = await res.json();
      setRunbooks(data.runbooks || []);
    } catch (err: any) {
      console.error('Failed to fetch runbooks:', err);
      setError(err.message || 'Failed to fetch runbooks');
    } finally {
      setLoading(false);
    }
  }, [address, authenticatedFetch]);

  useEffect(() => {
    fetchRunbooks();
  }, [fetchRunbooks]);

  const executeRunbook = async (runbookId: string) => {
    const confirmed = confirm(
      '⚠️ Execute Runbook?\n\n' +
      'This will execute the automated steps of this runbook.\n\n' +
      'Continue?'
    );
    
    if (!confirmed) return;

    setExecuting(true);
    setError(null);
    try {
      const res = await authenticatedFetch(`/api/admin/runbooks/${runbookId}/execute`, {
        method: 'POST',
        body: JSON.stringify({ automated: true })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Execution failed');
      }

      setExecution(data.execution);
      
      if (data.execution.status === 'completed') {
        alert('✅ Runbook executed successfully!');
      } else {
        alert(`⚠️ Runbook execution ${data.execution.status}`);
      }
      
      await fetchRunbooks();
    } catch (err: any) {
      console.error('Execution failed:', err);
      setError(err.message || 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'backup': return 'border-blue-500/30 bg-blue-500/5';
      case 'restore': return 'border-green-500/30 bg-green-500/5';
      case 'security': return 'border-red-500/30 bg-red-500/5';
      case 'performance': return 'border-yellow-500/30 bg-yellow-500/5';
      default: return 'border-purple-500/30 bg-purple-500/5';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-blue-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        <span className="ml-2 text-gray-400">Loading runbooks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <p className="text-red-400">{error}</p>
        <Button onClick={fetchRunbooks} variant="outline" size="sm" className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="runbook-manager">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {runbooks.map((runbook) => (
          <Card 
            key={runbook.id}
            className={`p-6 ${getCategoryColor(runbook.category)} cursor-pointer hover:border-opacity-100 transition-all`}
            onClick={() => setSelectedRunbook(runbook)}
            data-testid={`runbook-card-${runbook.id}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Book className="w-5 h-5" />
                  <span className="font-bold text-lg">{runbook.title}</span>
                </div>
                <p className="text-sm text-gray-400 mb-3">{runbook.description}</p>
                
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Category:</span>
                    <span className="ml-1 font-medium">{runbook.category}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Severity:</span>
                    <span className={`ml-1 font-bold ${getSeverityColor(runbook.severity)}`}>
                      {runbook.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-400">
                {runbook.steps.length} steps • ~{runbook.totalEstimatedTime} min
              </div>
              <div className="text-gray-400">
                {runbook.executionCount > 0 && (
                  <span>{runbook.successRate.toFixed(0)}% success rate</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {selectedRunbook && (
        <Card className="p-6 bg-black/60 border-purple-500/30" data-testid="runbook-detail">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold mb-2">{selectedRunbook.title}</h3>
              <p className="text-gray-400 mb-4">{selectedRunbook.description}</p>
              <div className="flex items-center gap-4 text-sm mb-4">
                <div className={`font-bold ${getSeverityColor(selectedRunbook.severity)}`}>
                  {selectedRunbook.severity.toUpperCase()} SEVERITY
                </div>
                <div className="text-gray-400">
                  Estimated Time: {selectedRunbook.totalEstimatedTime} minutes
                </div>
              </div>
            </div>
            <Button 
              onClick={() => executeRunbook(selectedRunbook.id)}
              disabled={executing}
              className="bg-gradient-to-r from-purple-500 to-blue-500"
              data-testid="execute-runbook-btn"
            >
              {executing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Execute
            </Button>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-bold text-lg mb-3">Runbook Steps:</h4>
            {selectedRunbook.steps.map((step, i) => (
              <div 
                key={step.id}
                className={`p-4 rounded-lg border ${
                  step.critical 
                    ? 'border-red-500/30 bg-red-500/5' 
                    : 'border-blue-500/30 bg-blue-500/5'
                }`}
                data-testid={`runbook-step-${step.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-bold mb-1">
                      {i + 1}. {step.title}
                    </div>
                    <div className="text-sm text-gray-300 mb-2">
                      {step.description}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className={step.automated ? 'text-green-400' : 'text-yellow-400'}>
                        {step.automated ? '🤖 Automated' : '👤 Manual'}
                      </div>
                      <div className="text-gray-400">
                        ~{step.estimatedMinutes} min
                      </div>
                      {step.critical && (
                        <div className="text-red-400 font-bold">⚠️ CRITICAL</div>
                      )}
                    </div>
                    {step.command && (
                      <div className="mt-2 text-xs font-mono bg-black/60 p-2 rounded">
                        $ {step.command}
                      </div>
                    )}
                    {step.validation && (
                      <div className="mt-1 text-xs text-green-400">
                        ✓ Validation: {step.validation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 flex gap-2">
            <Button onClick={() => setSelectedRunbook(null)} variant="outline" data-testid="close-runbook-btn">
              Close
            </Button>
          </div>
        </Card>
      )}
      
      {execution && (
        <Card className={`p-6 border ${
          execution.status === 'completed' 
            ? 'border-green-500/30 bg-green-500/5'
            : execution.status === 'failed'
            ? 'border-red-500/30 bg-red-500/5'
            : 'border-blue-500/30 bg-blue-500/5'
        }`} data-testid="execution-result">
          <div className="flex items-center gap-3 mb-4">
            {execution.status === 'completed' ? (
              <CheckCircle className="w-6 h-6 text-green-400" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-400" />
            )}
            <h3 className="text-xl font-bold">
              Execution {execution.status.toUpperCase()}
            </h3>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="text-sm">
              <span className="text-gray-400">Started:</span> {new Date(execution.startTime).toLocaleString()}
            </div>
            {execution.endTime && (
              <div className="text-sm">
                <span className="text-gray-400">Ended:</span> {new Date(execution.endTime).toLocaleString()}
              </div>
            )}
            <div className="text-sm">
              <span className="text-gray-400">Completed Steps:</span> {execution.completedSteps.length}
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-1 bg-black/60 p-3 rounded font-mono text-xs">
            {execution.logs.map((log, i) => (
              <div key={i} className={
                log.level === 'error' ? 'text-red-400' :
                log.level === 'warning' ? 'text-yellow-400' :
                'text-gray-300'
              }>
                [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
              </div>
            ))}
          </div>
          
          <Button onClick={() => setExecution(null)} className="mt-4" variant="outline" data-testid="close-execution-btn">
            Close
          </Button>
        </Card>
      )}
    </div>
  );
};
