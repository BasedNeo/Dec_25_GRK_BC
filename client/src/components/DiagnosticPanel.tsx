import { useState } from 'react';
import { ethers } from 'ethers';
import { RPC_URL, NFT_CONTRACT, MARKETPLACE_CONTRACT, GOVERNANCE_CONTRACT, CHAIN_ID } from '@/lib/constants';
import { useAccount, useChainId } from 'wagmi';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function DiagnosticPanel() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [diagnostics, setDiagnostics] = useState<Record<string, string>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: Record<string, string> = {};
    
    // Test 1: RPC Connection
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const blockNumber = await provider.getBlockNumber();
      results['RPC Connection'] = `✅ Connected (Block #${blockNumber})`;
    } catch (e: any) {
      results['RPC Connection'] = `❌ Failed: ${e.message?.slice(0, 50)}`;
    }
    
    // Test 2: NFT Contract
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const nft = new ethers.Contract(NFT_CONTRACT, [
        'function totalMinted() view returns (uint256)',
        'function MAX_SUPPLY() view returns (uint256)',
        'function MINT_PRICE() view returns (uint256)',
        'function publicMintEnabled() view returns (bool)',
        'function paused() view returns (bool)'
      ], provider);
      
      const [totalMinted, maxSupply, mintPrice, publicMintEnabled, paused] = await Promise.all([
        nft.totalMinted(),
        nft.MAX_SUPPLY(),
        nft.MINT_PRICE(),
        nft.publicMintEnabled(),
        nft.paused()
      ]);
      
      results['NFT Contract'] = `✅ Connected`;
      results['├─ Total Minted'] = `${totalMinted} / ${maxSupply}`;
      results['├─ Mint Price'] = `${ethers.formatEther(mintPrice)} $BASED`;
      results['├─ Public Mint'] = publicMintEnabled ? '✅ Enabled' : '❌ Disabled';
      results['└─ Paused'] = paused ? '⚠️ Yes' : '✅ No';
    } catch (e: any) {
      results['NFT Contract'] = `❌ Failed: ${e.message?.slice(0, 50)}`;
    }
    
    // Test 3: Marketplace Contract
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const code = await provider.getCode(MARKETPLACE_CONTRACT);
      if (code === '0x') {
        results['Marketplace Contract'] = `❌ Not deployed`;
      } else {
        results['Marketplace Contract'] = `✅ Deployed (${code.length} bytes)`;
      }
    } catch (e: any) {
      results['Marketplace Contract'] = `❌ Failed: ${e.message?.slice(0, 50)}`;
    }
    
    // Test 4: Governance Contract
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const code = await provider.getCode(GOVERNANCE_CONTRACT);
      if (code === '0x') {
        results['Governance Contract'] = `❌ Not deployed`;
      } else {
        results['Governance Contract'] = `✅ Deployed (${code.length} bytes)`;
      }
    } catch (e: any) {
      results['Governance Contract'] = `❌ Failed: ${e.message?.slice(0, 50)}`;
    }
    
    // Test 5: Wallet Connection
    results['Wallet Connected'] = isConnected ? `✅ ${address?.slice(0,6)}...${address?.slice(-4)}` : '❌ Not connected';
    results['Chain ID'] = chainId === CHAIN_ID ? `✅ Correct (${chainId})` : `❌ Wrong chain (${chainId}, expected ${CHAIN_ID})`;
    
    setDiagnostics(results);
    setIsRunning(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/95 border border-cyan-500/50 rounded-lg p-4 max-w-md font-mono text-xs shadow-lg shadow-cyan-500/20" data-testid="diagnostic-panel">
      <div className="flex justify-between items-center mb-3">
        <span className="text-cyan-400 font-bold">🔬 DIAGNOSTICS</span>
        <div className="flex gap-2">
          <Button 
            size="sm"
            onClick={runDiagnostics}
            disabled={isRunning}
            className="px-2 py-1 h-6 bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400"
            data-testid="diagnostic-run-btn"
          >
            {isRunning ? 'Running...' : 'Run Tests'}
          </Button>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white"
            data-testid="diagnostic-close-btn"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {Object.keys(diagnostics).length === 0 ? (
          <p className="text-gray-500">Click "Run Tests" to check connectivity</p>
        ) : (
          Object.entries(diagnostics).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-2">
              <span className="text-gray-400 truncate">{key}:</span>
              <span className={`text-right ${value.includes('✅') ? 'text-green-400' : value.includes('❌') ? 'text-red-400' : 'text-yellow-400'}`}>
                {value}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
