/**
 * DiagnosticPanel - ADMIN ONLY
 * 
 * Shows live contract diagnostics only to approved admin wallets.
 * Regular users will never see this panel.
 */

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  RPC_URL, 
  NFT_CONTRACT, 
  MARKETPLACE_CONTRACT, 
  GOVERNANCE_CONTRACT, 
  CHAIN_ID
} from '@/lib/constants';
import { useAccount, useChainId } from 'wagmi';
import { X, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const ADMIN_WALLETS = [
  '0xae543104fdbe456478e19894f7f0e01f0971c9b4',
  '0xb1362caf09189887599ed40f056712b1a138210c',
  '0xabce9e63a9ae51e215bb10c9648f4c0f400c5847',
  '0xbba49256a93a06fcf3b0681fead2b4e3042b9124',
  '0xc5ca5cb0acf8f7d4c6cd307d0d875ee2e09fb1af',
];

export function DiagnosticPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [diagnostics, setDiagnostics] = useState<Record<string, { status: 'pass' | 'fail' | 'warn'; message: string }>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const isAdmin = isConnected && address && ADMIN_WALLETS.some(
    admin => admin.toLowerCase() === address.toLowerCase()
  );
  
  if (!isAdmin) {
    return null;
  }

  const runDiagnostics = async () => {
    setIsRunning(true);
    setHasRun(true);
    const results: Record<string, { status: 'pass' | 'fail' | 'warn'; message: string }> = {};

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const blockNumber = await provider.getBlockNumber();
      results['RPC Connection'] = { status: 'pass', message: `Block #${blockNumber.toLocaleString()}` };
    } catch (e: any) {
      results['RPC Connection'] = { status: 'fail', message: e.message?.slice(0, 50) || 'Failed' };
    }

    if (chainId === CHAIN_ID) {
      results['Network'] = { status: 'pass', message: `BasedAI (${chainId})` };
    } else {
      results['Network'] = { status: 'fail', message: `Wrong chain: ${chainId} (need ${CHAIN_ID})` };
    }

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const nft = new ethers.Contract(NFT_CONTRACT, [
        'function totalMinted() view returns (uint256)',
        'function MAX_SUPPLY() view returns (uint256)',
        'function MINT_PRICE() view returns (uint256)',
        'function publicMintEnabled() view returns (bool)',
        'function paused() view returns (bool)'
      ], provider);

      // Add timeout wrapper for slow RPC
      const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
        ]);
      };

      // Try to get totalMinted first with a 15s timeout
      const totalMinted = await withTimeout(nft.totalMinted(), 15000);
      
      // If that works, get the rest
      const [maxSupply, mintPrice, publicMintEnabled, paused] = await Promise.all([
        withTimeout(nft.MAX_SUPPLY(), 10000),
        withTimeout(nft.MINT_PRICE(), 10000),
        withTimeout(nft.publicMintEnabled(), 10000),
        withTimeout(nft.paused(), 10000)
      ]);

      results['NFT Contract'] = { status: 'pass', message: 'Connected' };
      results['  └ Minted'] = { status: 'pass', message: `${totalMinted} / ${maxSupply}` };
      results['  └ Price'] = { status: 'pass', message: `${ethers.formatEther(mintPrice)} $BASED` };
      results['  └ Public Mint'] = { 
        status: publicMintEnabled ? 'pass' : 'warn', 
        message: publicMintEnabled ? 'Enabled' : 'Disabled' 
      };
      results['  └ Paused'] = { 
        status: paused ? 'warn' : 'pass', 
        message: paused ? 'YES - Paused!' : 'No' 
      };
    } catch (e: any) {
      const msg = e.message?.includes('Timeout') ? 'RPC timeout - try again' : (e.message?.slice(0, 50) || 'Failed');
      results['NFT Contract'] = { status: 'fail', message: msg };
    }

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const code = await provider.getCode(MARKETPLACE_CONTRACT);
      if (code === '0x' || code.length < 10) {
        results['Marketplace'] = { status: 'fail', message: 'Not deployed' };
      } else {
        results['Marketplace'] = { status: 'pass', message: `Deployed (${Math.floor(code.length/2)} bytes)` };
      }
    } catch (e: any) {
      results['Marketplace'] = { status: 'fail', message: e.message?.slice(0, 50) || 'Failed' };
    }

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const code = await provider.getCode(GOVERNANCE_CONTRACT);
      if (code === '0x' || code.length < 10) {
        results['Governance'] = { status: 'fail', message: 'Not deployed' };
      } else {
        results['Governance'] = { status: 'pass', message: `Deployed (${Math.floor(code.length/2)} bytes)` };
      }
    } catch (e: any) {
      results['Governance'] = { status: 'fail', message: e.message?.slice(0, 50) || 'Failed' };
    }

    results['Your Wallet'] = { status: 'pass', message: `${address?.slice(0,6)}...${address?.slice(-4)}` };
    results['Admin Status'] = { status: 'pass', message: '✓ Authorized' };

    setDiagnostics(results);
    setIsRunning(false);
  };

  useEffect(() => {
    if (isAdmin && !hasRun) {
      runDiagnostics();
    }
  }, [isAdmin]);

  const StatusIcon = ({ status }: { status: 'pass' | 'fail' | 'warn' }) => {
    if (status === 'pass') return <CheckCircle size={12} className="text-green-400" />;
    if (status === 'fail') return <XCircle size={12} className="text-red-400" />;
    return <AlertTriangle size={12} className="text-yellow-400" />;
  };

  const passCount = Object.values(diagnostics).filter(d => d.status === 'pass').length;
  const failCount = Object.values(diagnostics).filter(d => d.status === 'fail').length;
  const warnCount = Object.values(diagnostics).filter(d => d.status === 'warn').length;

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-[9999] bg-black/90 border border-cyan-500/50 rounded-full p-3 hover:bg-cyan-500/20 transition-colors"
        title="Open Diagnostics"
        data-testid="diagnostic-expand-btn"
      >
        <span className="text-lg">🔬</span>
        {failCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
            {failCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-black/95 border border-cyan-500/50 rounded-lg shadow-2xl shadow-cyan-500/20 max-w-sm w-80 font-mono text-xs" data-testid="diagnostic-panel">
      <div className="flex justify-between items-center p-3 border-b border-cyan-500/30 bg-cyan-500/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔬</span>
          <span className="text-cyan-400 font-bold text-sm">ADMIN DIAGNOSTICS</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
            title="Refresh"
            data-testid="diagnostic-refresh-btn"
          >
            <RefreshCw size={14} className={`text-cyan-400 ${isRunning ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
            title="Minimize"
            data-testid="diagnostic-minimize-btn"
          >
            <X size={14} className="text-gray-400" />
          </button>
        </div>
      </div>

      <div className="flex gap-3 p-2 border-b border-white/10 text-[10px]">
        <span className="text-green-400">✓ {passCount} passed</span>
        {warnCount > 0 && <span className="text-yellow-400">⚠ {warnCount} warnings</span>}
        {failCount > 0 && <span className="text-red-400">✗ {failCount} failed</span>}
      </div>

      <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
        {Object.entries(diagnostics).map(([key, { status, message }]) => (
          <div key={key} className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <StatusIcon status={status} />
              <span className="text-gray-300 truncate">{key}</span>
            </div>
            <span className={`text-right truncate max-w-[120px] ${
              status === 'pass' ? 'text-green-400' : 
              status === 'fail' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {message}
            </span>
          </div>
        ))}
        {Object.keys(diagnostics).length === 0 && !isRunning && (
          <p className="text-gray-500 text-center py-4">Click refresh to run diagnostics</p>
        )}
        {isRunning && (
          <p className="text-cyan-400 text-center py-4 animate-pulse">Running diagnostics...</p>
        )}
      </div>

      <div className="p-2 border-t border-white/10 text-[10px] text-gray-500 text-center">
        Visible to {ADMIN_WALLETS.length} authorized wallets only
      </div>
    </div>
  );
}

export default DiagnosticPanel;
