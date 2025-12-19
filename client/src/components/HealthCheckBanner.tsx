import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RPC_URL, NFT_CONTRACT, ADMIN_WALLETS } from '@/lib/constants';
import { useAccount } from 'wagmi';
import { useInterval } from '@/hooks/useInterval';

interface HealthStatus {
  rpc: 'checking' | 'healthy' | 'degraded' | 'down';
  contracts: 'checking' | 'healthy' | 'paused' | 'error';
  message?: string;
}

const AGGRESSIVE_TIMEOUT = 5000;

export function HealthCheckBanner() {
  const { address, isConnected } = useAccount();
  const [health, setHealth] = useState<HealthStatus>({ rpc: 'checking', contracts: 'checking' });
  const [dismissed, setDismissed] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [checkComplete, setCheckComplete] = useState(false);
  const mountedRef = useRef(true);

  const isAdmin = isConnected && address && ADMIN_WALLETS.some(
    admin => admin.toLowerCase() === address.toLowerCase()
  );

  useEffect(() => {
    mountedRef.current = true;
    
    const delay = setTimeout(() => {
      if (mountedRef.current) {
        setInitialLoading(false);
      }
    }, 3000);

    const aggressiveTimeout = setTimeout(() => {
      if (mountedRef.current && !checkComplete) {
        console.log('[HealthCheck] Aggressive timeout - assuming healthy');
        setHealth({ rpc: 'healthy', contracts: 'healthy' });
        setCheckComplete(true);
        setInitialLoading(false);
      }
    }, AGGRESSIVE_TIMEOUT);
    
    return () => {
      mountedRef.current = false;
      clearTimeout(delay);
      clearTimeout(aggressiveTimeout);
    };
  }, [checkComplete]);

  const checkHealth = useCallback(async () => {
    if (!mountedRef.current) return;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AGGRESSIVE_TIMEOUT);
    
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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
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
      clearTimeout(timeoutId);
      if (e instanceof Error && e.name === 'AbortError') {
        console.log('[HealthCheck] RPC check timed out - assuming healthy');
        rpcStatus = 'healthy';
      } else {
        rpcStatus = 'down';
        message = 'Cannot connect to BasedAI network. Please check your connection.';
      }
    }

    if (rpcStatus !== 'down') {
      try {
        const contractController = new AbortController();
        const contractTimeout = setTimeout(() => contractController.abort(), 3000);
        
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
          signal: contractController.signal,
        });

        clearTimeout(contractTimeout);

        if (response.ok) {
          contractsStatus = 'healthy';
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          console.log('[HealthCheck] Contract check timed out - assuming healthy');
          contractsStatus = 'healthy';
        } else {
          contractsStatus = 'error';
          message = message || 'Contract may be unavailable.';
        }
      }
    } else {
      contractsStatus = 'error';
    }

    if (mountedRef.current) {
      setHealth({ rpc: rpcStatus, contracts: contractsStatus, message });
      setLastCheck(new Date());
      setCheckComplete(true);
    }
  }, []);

  useEffect(() => {
    if (!initialLoading && !checkComplete) {
      checkHealth();
    }
  }, [initialLoading, checkComplete, checkHealth]);

  useInterval(() => {
    if (!initialLoading) {
      checkHealth();
    }
  }, 60000);

  const hasIssues = health.rpc === 'down' || health.rpc === 'degraded' || health.contracts === 'paused' || health.contracts === 'error';

  if (initialLoading || !isAdmin || !hasIssues || dismissed) return null;

  const bgColor = health.rpc === 'down' ? 'bg-red-500/10 border-red-500/50' : 'bg-amber-500/10 border-amber-500/50';
  const textColor = health.rpc === 'down' ? 'text-red-400' : 'text-amber-400';

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
            <AlertTriangle className={`w-5 h-5 ${textColor}`} />
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
