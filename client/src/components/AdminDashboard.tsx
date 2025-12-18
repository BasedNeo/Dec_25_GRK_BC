import { useState, useEffect } from 'react';
import { useInterval } from '@/hooks/useInterval';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { 
  X, Shield, RefreshCw, Trash2, Database, Activity, 
  Zap, AlertTriangle, Eye, EyeOff, Server,
  Download, Wrench, Inbox, Mail, Bug, HardDrive, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RPC_URL, NFT_CONTRACT, MARKETPLACE_CONTRACT, ADMIN_WALLETS } from '@/lib/constants';
import { errorReporter } from '@/lib/errorReporter';
import { SecureStorage } from '@/lib/secureStorage';
import { useToast } from '@/hooks/use-toast';
import { type FeatureFlags, updateFeatureFlag, invalidateFeatureFlagsCache } from '@/lib/featureFlags';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInbox: () => void;
}

interface HealthStatus {
  nftContract: { status: boolean; latency: number };
  marketplace: { status: boolean; latency: number };
  brainWallet: { status: boolean; balance: number };
  basedaiRpc: { status: boolean; latency: number };
  ethRpc: { status: boolean; latency: number };
}

export function AdminDashboard({ isOpen, onClose, onOpenInbox }: AdminDashboardProps) {
  const { address } = useAccount();
  const { toast } = useToast();
  const isAdmin = address && ADMIN_WALLETS.some(
    admin => admin.toLowerCase() === address.toLowerCase()
  );
  
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [storageInfo, setStorageInfo] = useState(SecureStorage.getStorageInfo());
  const [loading, setLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [cacheStats, setCacheStats] = useState({ size: 0, entries: 0 });
  const [showLogs, setShowLogs] = useState(false);
  const [mintDiagnostics, setMintDiagnostics] = useState<Record<string, any> | null>(null);
  const [emailCount, setEmailCount] = useState<number>(0);
  const [errorLogs, setErrorLogs] = useState(errorReporter.getLogs());
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [conversions, setConversions] = useState<any>(null);
  const [featureFlags, setFeatureFlags] = useState<Array<{key: string; enabled: boolean; description: string | null; updatedAt: string; updatedBy: string | null}>>([]);
  const [flagsLoading, setFlagsLoading] = useState<string | null>(null);
  
  useInterval(() => {
    setErrorLogs(errorReporter.getLogs());
  }, isOpen ? 5000 : null);
  
  useEffect(() => {
    if (isOpen && isAdmin) {
      fetch('/api/analytics/summary')
        .then(r => r.json())
        .then(data => setAnalyticsData(data))
        .catch(() => {});
      
      fetch('/api/analytics/conversions')
        .then(r => r.json())
        .then(data => setConversions(data))
        .catch(() => {});
      
      fetch('/api/feature-flags')
        .then(r => r.json())
        .then(data => setFeatureFlags(data))
        .catch(() => {});
    }
  }, [isOpen, isAdmin]);
  
  const handleToggleFlag = async (key: string, currentEnabled: boolean) => {
    if (!address) return;
    setFlagsLoading(key);
    
    const success = await updateFeatureFlag(key as keyof FeatureFlags, !currentEnabled, address);
    if (success) {
      setFeatureFlags(prev => prev.map(f => 
        f.key === key ? { ...f, enabled: !currentEnabled, updatedAt: new Date().toISOString(), updatedBy: address } : f
      ));
      toast({
        title: `${key} ${!currentEnabled ? 'Enabled' : 'Disabled'}`,
        description: `Feature flag updated successfully`,
        className: 'bg-black border-cyan-500 text-cyan-400',
      });
      addLog(`🎚️ ${key} → ${!currentEnabled ? 'ON' : 'OFF'}`);
    } else {
      toast({
        title: 'Update Failed',
        description: 'Could not update feature flag',
        variant: 'destructive',
      });
    }
    setFlagsLoading(null);
  };
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const runHealthCheck = async () => {
    setLoading('health');
    addLog('Starting system health check...');
    
    const results: HealthStatus = {
      nftContract: { status: false, latency: 0 },
      marketplace: { status: false, latency: 0 },
      brainWallet: { status: false, balance: 0 },
      basedaiRpc: { status: false, latency: 0 },
      ethRpc: { status: false, latency: 0 },
    };
    
    try {
      const start = Date.now();
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const nft = new ethers.Contract(NFT_CONTRACT, ['function totalMinted() view returns (uint256)'], provider);
      await nft.totalMinted();
      results.nftContract = { status: true, latency: Date.now() - start };
      addLog('✅ NFT Contract: OK');
    } catch (e) {
      addLog('❌ NFT Contract: FAILED');
    }
    
    try {
      const start = Date.now();
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const mp = new ethers.Contract(MARKETPLACE_CONTRACT, ['function feeRecipient() view returns (address)'], provider);
      await mp.feeRecipient();
      results.marketplace = { status: true, latency: Date.now() - start };
      addLog('✅ Marketplace: OK');
    } catch (e) {
      addLog('❌ Marketplace: FAILED');
    }
    
    try {
      const start = Date.now();
      const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
      const token = new ethers.Contract(
        '0x758db5be97ddf623a501f607ff822792a8f2d8f2',
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      const balance = await token.balanceOf('0xB0974F12C7BA2f1dC31f2C2545B71Ef1998815a4');
      results.brainWallet = { status: true, balance: parseFloat(ethers.formatEther(balance)) };
      results.ethRpc = { status: true, latency: Date.now() - start };
      addLog(`✅ Brain Wallet: ${results.brainWallet.balance.toLocaleString()} $BASED`);
    } catch (e) {
      addLog('❌ Brain Wallet: FAILED');
    }
    
    try {
      const start = Date.now();
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      await provider.getBlockNumber();
      results.basedaiRpc = { status: true, latency: Date.now() - start };
      addLog(`✅ BasedAI RPC: ${results.basedaiRpc.latency}ms`);
    } catch (e) {
      addLog('❌ BasedAI RPC: FAILED');
    }
    
    setHealth(results);
    setLoading(null);
    addLog('Health check complete.');
  };
  
  const clearAllCache = () => {
    setLoading('cache');
    addLog('Clearing all cached data...');
    
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('cache') || key.includes('Cache') || key.includes('wagmi'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
    
    addLog(`Cleared ${keysToRemove.length} cached entries.`);
    setCacheStats({ size: 0, entries: 0 });
    setLoading(null);
  };
  
  const getCacheStats = () => {
    let totalSize = 0;
    let entries = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
          entries++;
        }
      }
    }
    
    setCacheStats({ size: Math.round(totalSize / 1024), entries });
  };
  
  const forceRefreshAll = () => {
    setLoading('refresh');
    addLog('Force refreshing all data...');
    window.dispatchEvent(new CustomEvent('force-refresh-all'));
    clearAllCache();
    setTimeout(() => {
      addLog('Reloading page...');
      window.location.reload();
    }, 1000);
  };
  
  const refreshMarketplace = async () => {
    setLoading('marketplace');
    addLog('Refreshing marketplace data...');
    window.dispatchEvent(new CustomEvent('refresh-marketplace'));
    setTimeout(() => {
      setLoading(null);
      addLog('Marketplace refresh triggered.');
    }, 500);
  };
  
  const refreshEmissions = async () => {
    setLoading('emissions');
    addLog('Refreshing emissions data...');
    window.dispatchEvent(new CustomEvent('refresh-emissions'));
    setTimeout(() => {
      setLoading(null);
      addLog('Emissions refresh triggered.');
    }, 500);
  };
  
  const exportDiagnostics = () => {
    addLog('Exporting diagnostics...');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      health,
      cacheStats,
      logs,
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      localStorage: localStorage.length,
      connectedWallet: address,
    };
    
    const blob = new Blob([JSON.stringify(diagnostics, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    addLog('Diagnostics exported.');
  };

  const diagnoseMinting = async () => {
    if (!address) return;
    setLoading('mintDebug');
    addLog('🔍 Starting mint diagnostics...');
    
    const results: Record<string, any> = {};
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    
    try {
      const blockNumber = await provider.getBlockNumber();
      results.rpcConnection = { status: '✅', blockNumber };
      addLog(`✅ RPC Connected - Block: ${blockNumber}`);
    } catch (e: any) {
      results.rpcConnection = { status: '❌', error: e.message };
      addLog(`❌ RPC Failed: ${e.message}`);
    }
    
    try {
      const balance = await provider.getBalance(address);
      const balanceInBased = parseFloat(ethers.formatEther(balance));
      results.userBalance = { status: balanceInBased >= 69420 ? '✅' : '❌', balance: balanceInBased };
      addLog(`💰 Balance: ${balanceInBased.toLocaleString()} $BASED ${balanceInBased >= 69420 ? '✅' : '❌ (Need 69,420)'}`);
    } catch (e: any) {
      results.userBalance = { status: '❌', error: e.message };
      addLog(`❌ Balance check failed: ${e.message}`);
    }
    
    const nftContract = new ethers.Contract(
      NFT_CONTRACT,
      [
        'function paused() view returns (bool)',
        'function publicMintEnabled() view returns (bool)',
        'function totalMinted() view returns (uint256)',
        'function maxSupply() view returns (uint256)',
        'function mintPrice() view returns (uint256)',
        'function maxPerWallet() view returns (uint256)',
        'function numberMinted(address) view returns (uint256)',
        'function mint(uint256) payable'
      ],
      provider
    );
    
    try {
      const [paused, publicMintEnabled, totalMinted, maxSupply, mintPrice, maxPerWallet] = await Promise.all([
        nftContract.paused().catch(() => 'N/A'),
        nftContract.publicMintEnabled().catch(() => 'N/A'),
        nftContract.totalMinted().catch(() => 'N/A'),
        nftContract.maxSupply().catch(() => 'N/A'),
        nftContract.mintPrice().catch(() => 'N/A'),
        nftContract.maxPerWallet().catch(() => 'N/A'),
      ]);
      
      results.contractState = {
        paused: paused === 'N/A' ? 'N/A' : (paused ? '❌ YES' : '✅ NO'),
        publicMintEnabled: publicMintEnabled === 'N/A' ? 'N/A' : (publicMintEnabled ? '✅ YES' : '❌ NO'),
        totalMinted: totalMinted?.toString() || 'N/A',
        maxSupply: maxSupply?.toString() || 'N/A',
        mintPrice: mintPrice ? ethers.formatEther(mintPrice) : 'N/A',
        maxPerWallet: maxPerWallet?.toString() || 'N/A',
      };
      
      addLog(`📋 Contract: Paused=${results.contractState.paused}, PublicMint=${results.contractState.publicMintEnabled}`);
      addLog(`📋 Minted: ${results.contractState.totalMinted}/${results.contractState.maxSupply}, Price: ${results.contractState.mintPrice} $BASED`);
    } catch (e: any) {
      results.contractState = { status: '❌', error: e.message };
      addLog(`❌ Contract state check failed: ${e.message}`);
    }
    
    try {
      const userMinted = await nftContract.numberMinted(address);
      const maxPerWallet = await nftContract.maxPerWallet().catch(() => BigInt(10));
      const canMintMore = Number(userMinted) < Number(maxPerWallet);
      results.userMintStatus = {
        minted: Number(userMinted),
        maxAllowed: Number(maxPerWallet),
        canMintMore: canMintMore ? '✅ YES' : '❌ NO (limit reached)'
      };
      addLog(`👤 User minted: ${Number(userMinted)}/${Number(maxPerWallet)} - Can mint: ${results.userMintStatus.canMintMore}`);
    } catch (e: any) {
      results.userMintStatus = { status: '❌', error: e.message };
      addLog(`❌ User mint status check failed: ${e.message}`);
    }
    
    try {
      const mintPrice = await nftContract.mintPrice();
      const gasEstimate = await provider.estimateGas({
        from: address,
        to: NFT_CONTRACT,
        value: mintPrice,
        data: nftContract.interface.encodeFunctionData('mint', [1])
      });
      results.gasEstimate = { status: '✅', gas: gasEstimate.toString() };
      addLog(`⛽ Gas Estimate: ${gasEstimate.toString()}`);
    } catch (e: any) {
      results.gasEstimate = { status: '❌', error: e.message };
      addLog(`❌ Gas estimation failed: ${e.message}`);
      addLog(`⚠️ This usually means the transaction would REVERT!`);
    }
    
    try {
      const feeData = await provider.getFeeData();
      results.gasPrice = {
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : 'N/A',
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') + ' gwei' : 'N/A',
      };
      addLog(`💨 Gas Price: ${results.gasPrice.gasPrice}`);
      
      if (feeData.gasPrice && feeData.gasPrice < BigInt(100000)) {
        addLog(`⚠️ WARNING: Gas price extremely low!`);
      }
    } catch (e: any) {
      results.gasPrice = { status: '❌', error: e.message };
      addLog(`❌ Gas price check failed: ${e.message}`);
    }
    
    setMintDiagnostics(results);
    setLoading(null);
    addLog('📊 Mint diagnostics complete.');
  };
  
  const fetchEmailCount = async () => {
    try {
      const res = await fetch('/api/emails');
      if (res.ok) {
        const data = await res.json();
        setEmailCount(data.count || 0);
        addLog(`📧 Email list: ${data.count}/4000`);
      }
    } catch {
      // Silent fail - email count is optional
    }
  };

  const downloadEmailCsv = () => {
    addLog('📥 Downloading email list CSV...');
    window.open('/api/emails/csv', '_blank');
  };

  useEffect(() => {
    if (isOpen && isAdmin) {
      getCacheStats();
      runHealthCheck();
      fetchEmailCount();
    }
  }, [isOpen, isAdmin]);
  
  if (!isAdmin || !isOpen) return null;
  
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 top-16 bg-black/95 backdrop-blur-sm z-40 flex items-start justify-center p-4 pt-8 overflow-y-auto">
      <div className="bg-gray-900 border border-red-500/30 rounded-xl w-full max-w-4xl max-h-[calc(100vh-120px)] overflow-hidden my-4">
        
        <div className="flex items-center justify-between p-4 border-b border-red-500/20 bg-red-500/10 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Shield className="text-red-400" size={24} />
            <h2 className="text-xl font-bold text-white font-orbitron">Admin Dashboard</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClose} 
            className="text-white hover:bg-white/10 hover:text-red-400 transition-colors"
            data-testid="button-close-admin"
          >
            <X size={24} />
          </Button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Activity size={16} className="text-cyan-400" />
              System Health
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { label: 'NFT Contract', key: 'nftContract' },
                { label: 'Marketplace', key: 'marketplace' },
                { label: 'Brain Wallet', key: 'brainWallet' },
                { label: 'BasedAI RPC', key: 'basedaiRpc' },
                { label: 'ETH RPC', key: 'ethRpc' },
              ].map(({ label, key }) => (
                <div key={key} className="bg-black/40 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-gray-400 mb-1">{label}</p>
                  {health ? (
                    <p className={health[key as keyof HealthStatus]?.status ? 'text-green-400' : 'text-red-400'}>
                      {health[key as keyof HealthStatus]?.status ? '✅ OK' : '❌ FAIL'}
                    </p>
                  ) : (
                    <p className="text-gray-500">...</p>
                  )}
                  {health && 'latency' in (health[key as keyof HealthStatus] || {}) && (health[key as keyof HealthStatus] as { latency: number }).latency > 0 && (
                    <p className="text-[9px] text-gray-500">{(health[key as keyof HealthStatus] as { latency: number }).latency}ms</p>
                  )}
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={runHealthCheck}
              disabled={loading === 'health'}
              className="mt-2 text-xs border-cyan-500/30 text-cyan-400"
            >
              <RefreshCw size={12} className={`mr-2 ${loading === 'health' ? 'animate-spin' : ''}`} />
              Re-run Health Check
            </Button>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => { onClose(); onOpenInbox(); }}
                className="flex flex-col items-center p-4 h-auto border-cyan-500/30 hover:bg-cyan-500/10"
              >
                <Inbox size={20} className="mb-2 text-cyan-400" />
                <span className="text-xs">View Inbox</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={forceRefreshAll}
                disabled={loading === 'refresh'}
                className="flex flex-col items-center p-4 h-auto border-cyan-500/30 hover:bg-cyan-500/10"
              >
                <RefreshCw size={20} className={`mb-2 text-cyan-400 ${loading === 'refresh' ? 'animate-spin' : ''}`} />
                <span className="text-xs">Force Refresh All</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllCache}
                disabled={loading === 'cache'}
                className="flex flex-col items-center p-4 h-auto border-orange-500/30 hover:bg-orange-500/10"
              >
                <Trash2 size={20} className="mb-2 text-orange-400" />
                <span className="text-xs">Clear Cache</span>
                <span className="text-[9px] text-gray-500">{cacheStats.entries} entries</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={refreshMarketplace}
                disabled={loading === 'marketplace'}
                className="flex flex-col items-center p-4 h-auto border-pink-500/30 hover:bg-pink-500/10"
              >
                <Database size={20} className={`mb-2 text-pink-400 ${loading === 'marketplace' ? 'animate-spin' : ''}`} />
                <span className="text-xs">Refresh Marketplace</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={refreshEmissions}
                disabled={loading === 'emissions'}
                className="flex flex-col items-center p-4 h-auto border-green-500/30 hover:bg-green-500/10"
              >
                <Zap size={20} className={`mb-2 text-green-400 ${loading === 'emissions' ? 'animate-spin' : ''}`} />
                <span className="text-xs">Refresh Emissions</span>
              </Button>
              
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <ToggleRight size={16} className="text-emerald-400" />
              Feature Flags (Global)
            </h3>
            <div className="bg-black/40 rounded-lg p-4 border border-emerald-500/20">
              <p className="text-[10px] text-gray-400 mb-3">Toggle features on/off for ALL users instantly. Changes take effect within 30 seconds.</p>
              <div className="space-y-3">
                {featureFlags.map(flag => (
                  <div key={flag.key} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium">{flag.key.replace('Enabled', '')}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${flag.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {flag.enabled ? 'ON' : 'OFF'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500">{flag.description}</p>
                      {flag.updatedBy && (
                        <p className="text-[9px] text-gray-600 mt-1">
                          Last updated: {new Date(flag.updatedAt).toLocaleString()} by {flag.updatedBy.slice(0, 6)}...
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={() => handleToggleFlag(flag.key, flag.enabled)}
                      disabled={flagsLoading === flag.key}
                      className={flagsLoading === flag.key ? 'opacity-50' : ''}
                      data-testid={`toggle-${flag.key}`}
                    />
                  </div>
                ))}
                {featureFlags.length === 0 && (
                  <p className="text-gray-500 text-xs text-center py-4">Loading feature flags...</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Wrench size={16} className="text-purple-400" />
              Diagnostics & Tools
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              
              <Button
                variant="outline"
                size="sm"
                onClick={diagnoseMinting}
                disabled={loading === 'mintDebug'}
                className="flex flex-col items-center p-4 h-auto border-yellow-500/30 hover:bg-yellow-500/10"
              >
                <AlertTriangle size={20} className={`mb-2 text-yellow-400 ${loading === 'mintDebug' ? 'animate-pulse' : ''}`} />
                <span className="text-xs">🔍 Debug Mint</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={exportDiagnostics}
                className="flex flex-col items-center p-4 h-auto border-purple-500/30 hover:bg-purple-500/10"
              >
                <Download size={20} className="mb-2 text-purple-400" />
                <span className="text-xs">Export Diagnostics</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={downloadEmailCsv}
                className="flex flex-col items-center p-4 h-auto border-blue-500/30 hover:bg-blue-500/10"
              >
                <Mail size={20} className="mb-2 text-blue-400" />
                <span className="text-xs">Download Emails</span>
                <span className="text-[9px] text-gray-500">{emailCount}/4000</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogs(!showLogs)}
                className="flex flex-col items-center p-4 h-auto border-gray-500/30 hover:bg-gray-500/10"
              >
                {showLogs ? <EyeOff size={20} className="mb-2 text-gray-400" /> : <Eye size={20} className="mb-2 text-gray-400" />}
                <span className="text-xs">{showLogs ? 'Hide' : 'Show'} Logs</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => { localStorage.clear(); addLog('localStorage cleared'); getCacheStats(); }}
                className="flex flex-col items-center p-4 h-auto border-red-500/30 hover:bg-red-500/10"
              >
                <AlertTriangle size={20} className="mb-2 text-red-400" />
                <span className="text-xs">Clear All Storage</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="flex flex-col items-center p-4 h-auto border-blue-500/30 hover:bg-blue-500/10"
              >
                <RefreshCw size={20} className="mb-2 text-blue-400" />
                <span className="text-xs">Hard Reload</span>
              </Button>
              
            </div>
          </div>
          
          {mintDiagnostics && (
            <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
              <h3 className="text-sm font-bold text-yellow-400 mb-3">🔍 Mint Diagnostics Results</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-black/40 p-2 rounded">
                  <span className="text-gray-400">RPC:</span>
                  <span className="ml-2 text-white">{mintDiagnostics.rpcConnection?.status}</span>
                </div>
                <div className="bg-black/40 p-2 rounded">
                  <span className="text-gray-400">Balance:</span>
                  <span className="ml-2 text-white">{mintDiagnostics.userBalance?.balance?.toLocaleString()} $BASED {mintDiagnostics.userBalance?.status}</span>
                </div>
                <div className="bg-black/40 p-2 rounded">
                  <span className="text-gray-400">Contract Paused:</span>
                  <span className="ml-2 text-white">{mintDiagnostics.contractState?.paused}</span>
                </div>
                <div className="bg-black/40 p-2 rounded">
                  <span className="text-gray-400">Public Mint:</span>
                  <span className="ml-2 text-white">{mintDiagnostics.contractState?.publicMintEnabled}</span>
                </div>
                <div className="bg-black/40 p-2 rounded">
                  <span className="text-gray-400">Minted:</span>
                  <span className="ml-2 text-white">{mintDiagnostics.contractState?.totalMinted}/{mintDiagnostics.contractState?.maxSupply}</span>
                </div>
                <div className="bg-black/40 p-2 rounded">
                  <span className="text-gray-400">User Minted:</span>
                  <span className="ml-2 text-white">{mintDiagnostics.userMintStatus?.minted}/{mintDiagnostics.userMintStatus?.maxAllowed} {mintDiagnostics.userMintStatus?.canMintMore}</span>
                </div>
                <div className="bg-black/40 p-2 rounded">
                  <span className="text-gray-400">Gas Estimate:</span>
                  <span className="ml-2 text-white">{mintDiagnostics.gasEstimate?.status} {mintDiagnostics.gasEstimate?.gas || mintDiagnostics.gasEstimate?.error?.slice(0, 30)}</span>
                </div>
                <div className="bg-black/40 p-2 rounded">
                  <span className="text-gray-400">Gas Price:</span>
                  <span className="ml-2 text-white">{mintDiagnostics.gasPrice?.gasPrice}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMintDiagnostics(null)}
                className="mt-3 text-xs text-gray-400"
              >
                Dismiss
              </Button>
            </div>
          )}
          
          <div className="mb-6 p-3 bg-black/40 rounded-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Cache Size:</span>
              <span className="text-white font-mono">{cacheStats.size} KB ({cacheStats.entries} entries)</span>
            </div>
          </div>
          
          <Card className="mb-6 p-4 bg-black/40 border-red-500/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                <Bug size={14} />
                Recent Errors ({errorLogs.length})
              </h3>
              {errorLogs.length > 0 && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => { errorReporter.clearLogs(); setErrorLogs([]); }}
                  className="text-xs text-gray-400 h-6"
                >
                  Clear
                </Button>
              )}
            </div>
            
            {errorLogs.length === 0 ? (
              <p className="text-gray-500 text-xs">No errors logged</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {errorLogs.slice(-5).reverse().map((log, idx) => (
                  <div key={log.id || idx} className="p-2 bg-red-500/10 border border-red-500/20 rounded text-[10px]">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-mono text-red-400">{log.feature || 'Unknown'}</span>
                      <span className="text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-300 truncate">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
            
            {errorLogs.length > 0 && (
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full mt-3 text-xs h-7 border-gray-600"
                onClick={() => {
                  const data = errorReporter.exportLogs();
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `error-logs-${Date.now()}.json`;
                  a.click();
                }}
              >
                <Download size={12} className="mr-1" />
                Export All Logs
              </Button>
            )}
          </Card>
          
          {showLogs && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Server size={16} className="text-gray-400" />
                Activity Log
              </h3>
              <div className="bg-black rounded-lg p-3 h-48 overflow-y-auto font-mono text-[10px]">
                {logs.length === 0 ? (
                  <p className="text-gray-500">No activity yet.</p>
                ) : (
                  logs.map((log, i) => (
                    <p key={i} className="text-gray-400 mb-1">{log}</p>
                  ))
                )}
              </div>
            </div>
          )}
          
          <Card className="bg-black/60 border-cyan-500/30 p-4 mb-6">
            <h3 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
              <HardDrive size={16} />
              Storage Management
            </h3>
            
            <div className="space-y-3">
              <div className="bg-white/5 rounded p-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-gray-400">Items Stored:</div>
                    <div className="text-white font-bold">{storageInfo.itemCount}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Storage Used:</div>
                    <div className="text-white font-bold">{storageInfo.percentUsed}%</div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => {
                    const result = SecureStorage.validateAllItems();
                    setStorageInfo(SecureStorage.getStorageInfo());
                    toast({
                      title: 'Storage Validated',
                      description: `Valid: ${result.valid}, Corrupted: ${result.corrupted}, Removed: ${result.removed}`,
                    });
                  }}
                >
                  Validate All
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs h-7"
                  onClick={() => {
                    if (confirm('Clear all secure storage? This will reset preferences and local scores.')) {
                      SecureStorage.clear();
                      setStorageInfo(SecureStorage.getStorageInfo());
                      toast({ title: 'Storage cleared' });
                    }
                  }}
                >
                  Clear Storage
                </Button>
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-[10px] text-yellow-400">
                ⚠️ Secure storage has size limits (4.5MB) and auto-cleanup. Old items are removed when storage is full.
              </div>
            </div>
          </Card>
          
          <Card className="bg-black/60 border-cyan-500/30 p-6 mb-6">
            <h3 className="text-xl font-orbitron font-bold text-cyan-400 mb-4">
              📊 Analytics (Last 7 Days)
            </h3>
            
            {conversions && (
              <div className="space-y-4">
                <div className="bg-white/5 rounded p-4">
                  <div className="text-sm text-gray-400 mb-2">Mint Conversion</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-white">{conversions.mint.conversionRate}%</div>
                      <div className="text-xs text-gray-500">{conversions.mint.completed}/{conversions.mint.started} completed</div>
                    </div>
                    <div className={`text-3xl ${Number(conversions.mint.conversionRate) > 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {Number(conversions.mint.conversionRate) > 50 ? '✅' : '⚠️'}
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded p-4">
                  <div className="text-sm text-gray-400 mb-2">Buy Conversion</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-white">{conversions.buy.conversionRate}%</div>
                      <div className="text-xs text-gray-500">{conversions.buy.completed}/{conversions.buy.started} completed</div>
                    </div>
                    <div className={`text-3xl ${Number(conversions.buy.conversionRate) > 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {Number(conversions.buy.conversionRate) > 50 ? '✅' : '⚠️'}
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded p-4">
                  <div className="text-sm text-gray-400 mb-2">Offer Conversion</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-white">{conversions.offer.conversionRate}%</div>
                      <div className="text-xs text-gray-500">{conversions.offer.completed}/{conversions.offer.started} completed</div>
                    </div>
                    <div className={`text-3xl ${Number(conversions.offer.conversionRate) > 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {Number(conversions.offer.conversionRate) > 50 ? '✅' : '⚠️'}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {analyticsData && analyticsData.events?.length > 0 && (
              <div className="mt-6">
                <div className="text-sm text-gray-400 mb-2">Top Events</div>
                <div className="space-y-2">
                  {analyticsData.events.slice(0, 10).map((e: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs bg-white/5 rounded p-2">
                      <span className="text-white">{e.event}</span>
                      <span className="text-gray-400">{e.count} times • {e.uniqueUsers} users</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {!conversions && !analyticsData && (
              <div className="text-gray-500 text-sm">No analytics data yet. Analytics will appear as users interact with the app.</div>
            )}
          </Card>
          
          <div className="text-[10px] text-gray-500 text-center pt-4 border-t border-white/5">
            Admin: {address?.slice(0, 6)}...{address?.slice(-4)} | 
            Session: {new Date().toLocaleString()}
          </div>
          
        </div>
      </div>
    </div>
  );
}
