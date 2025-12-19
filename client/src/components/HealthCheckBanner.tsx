import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RPC_URL, NFT_CONTRACT, MARKETPLACE_CONTRACT, ADMIN_WALLETS } from '@/lib/constants';
import { useAccount } from 'wagmi';
import { useInterval } from '@/hooks/useInterval';

interface HealthStatus {
  rpc: 'checking' | 'healthy' | 'degraded' | 'down';
  contracts: 'checking' | 'healthy' | 'paused' | 'error';
  message?: string;
}

export function HealthCheckBanner() {
  const { address, isConnected } = useAccount();
  const [health, setHealth] = useState<HealthStatus>({ rpc: 'checking', contracts: 'checking' });
  const [dismissed, setDismissed] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const isAdmin = isConnected && address && ADMIN_WALLETS.some(
    admin => admin.toLowerCase() === address.toLowerCase()
  );

  useEffect(() => {
    const delay = setTimeout(() => {
      setInitialLoading(false);
    }, 3000);
    
    return () => clearTimeout(delay);
  }, []);

  if (initialLoading) return null;

  const checkHealth = async () => {
    setHealth({ rpc: 'checking', contracts: 'checking' });
    
    let rpcStatus: HealthStatus['rpc'] = 'down';
    let contractsStatus: HealthStatus['contracts'] = 'error';
    let message = '';

    try {
      const startTime = Date.now();
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          rpcStatus = latency < 2000 ? 'healthy' : 'degraded';
          if (rpcStatus === 'degraded') {
            message = 'Network is slow. Transactions may take longer.';
          }
        }
      }
    } catch (e) {
      rpcStatus = 'down';
      message = 'Cannot connect to BasedAI network. Please check your connection.';
    }

    if (rpcStatus !== 'down') {
      try {
        const response = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: NFT_CONTRACT,
              data: '0x8456cb59',
            }, 'latest'],
            id: 2,
          }),
        });

        if (response.ok) {
          contractsStatus = 'healthy';
        }
      } catch (e) {
        contractsStatus = 'error';
        message = message || 'Contract may be unavailable.';
      }
    } else {
      contractsStatus = 'error';
    }

    setHealth({ rpc: rpcStatus, contracts: contractsStatus, message });
    setLastCheck(new Date());
  };

  useEffect(() => {
    checkHealth();
  }, []);

  useInterval(checkHealth, 60000);

  const hasIssues = health.rpc === 'down' || health.rpc === 'degraded' || health.contracts === 'paused' || health.contracts === 'error';

  if (!isAdmin || !hasIssues || dismissed) return null;

  const bgColor = health.rpc === 'down' ? 'bg-red-500/10 border-red-500/50' : 'bg-amber-500/10 border-amber-500/50';
  const textColor = health.rpc === 'down' ? 'text-red-400' : 'text-amber-400';
  const Icon = health.rpc === 'down' ? AlertTriangle : AlertTriangle;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className={`fixed top-0 left-0 right-0 z-[9999] ${bgColor} border-b backdrop-blur-sm`}
        data-testid="health-check-banner"
      >
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${textColor}`} />
            <div>
              <p className={`text-sm font-mono ${textColor}`}>
                {health.message || 'Network issues detected'}
              </p>
              {lastCheck && (
                <p className="text-[10px] text-muted-foreground">
                  Last checked: {lastCheck.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={checkHealth}
              className={`p-2 rounded hover:bg-white/10 ${textColor}`}
              data-testid="button-health-recheck"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-2 rounded hover:bg-white/10 text-muted-foreground"
              data-testid="button-health-dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
