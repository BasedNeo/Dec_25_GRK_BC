import { ReactNode, useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Loader2, ShoppingBag, Wallet } from 'lucide-react';
import { Link } from 'wouter';
import { ADMIN_WALLETS, NFT_CONTRACT, CHAIN_ID } from '@/lib/constants';

const NFT_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

interface NFTGateProps {
  children: ReactNode;
  featureKey: string;
}

interface GatingRule {
  featureKey: string;
  featureName: string;
  requiresNFT: boolean;
  requiredCollection: string | null;
  minimumBalance: number;
  bypassForAdmin: boolean;
  enabled: boolean;
  gateMessage: string;
}

export default function NFTGate({ children, featureKey }: NFTGateProps) {
  const { address, isConnected } = useAccount();
  const [rule, setRule] = useState<GatingRule | null>(null);
  const [ruleLoading, setRuleLoading] = useState(true);
  
  const isAdmin = address && ADMIN_WALLETS.map(w => w.toLowerCase()).includes(address.toLowerCase());
  
  const contractAddress = rule?.requiredCollection || NFT_CONTRACT;
  
  const { data: balance, isLoading: balanceLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address && isConnected && !ruleLoading && rule?.requiresNFT === true, staleTime: 30000 },
  });
  
  const ownedCount = balance ? Number(balance) : 0;
  const isHolder = ownedCount >= 1;
  
  useEffect(() => {
    async function fetchRule() {
      try {
        const res = await fetch(`/api/gating/rules/${featureKey}`);
        if (res.ok) {
          const data = await res.json();
          setRule(data);
        } else {
          setRule(null);
        }
      } catch (error) {
        console.error('Failed to fetch gating rule:', error);
        setRule(null);
      } finally {
        setRuleLoading(false);
      }
    }
    fetchRule();
  }, [featureKey]);

  if (ruleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!rule || !rule.enabled) {
    return <>{children}</>;
  }

  if (isAdmin && rule.bypassForAdmin) {
    return (
      <>
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3 mb-4 text-center">
          <p className="text-sm text-yellow-400">👑 Admin Mode: Bypassing NFT gate for {rule.featureName}</p>
        </div>
        {children}
      </>
    );
  }

  if (!rule.requiresNFT) {
    return <>{children}</>;
  }

  if (balanceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mx-auto" />
          <p className="text-gray-400">Verifying NFT ownership...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto border-2 border-cyan-500/20 bg-black/60">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-10 h-10 text-cyan-400" />
            </div>
            <CardTitle className="text-3xl mb-2 text-white font-orbitron">Connect Your Wallet</CardTitle>
            <p className="text-gray-400">{rule.gateMessage || 'Connect your wallet to access this feature'}</p>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              size="lg" 
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold" 
              onClick={() => {
                const btn = document.querySelector('[data-testid="rk-connect-button"]') as HTMLElement;
                btn?.click();
              }}
              data-testid="button-connect-wallet"
            >
              <Wallet className="w-5 h-5 mr-2" />
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasEnoughNFTs = isHolder && ownedCount >= rule.minimumBalance;

  if (!hasEnoughNFTs) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
          <CardHeader className="text-center">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-yellow-500" />
            </div>
            <CardTitle className="text-3xl mb-2 text-white font-orbitron">🔒 {rule.featureName}</CardTitle>
            <p className="text-lg text-gray-400">{rule.gateMessage}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-black/40 border border-gray-700 rounded-lg p-6 text-center">
              <h3 className="font-bold text-xl mb-2 text-white">
                {rule.minimumBalance > 1 ? `Hold ${rule.minimumBalance} Guardian NFTs to Unlock` : 'Hold a Guardian NFT to Unlock'}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                You own {ownedCount} NFT{ownedCount !== 1 ? 's' : ''}.
                {rule.minimumBalance > ownedCount && ` Need ${rule.minimumBalance - ownedCount} more.`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/mint">
                <Button size="lg" className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold" data-testid="button-mint-nft">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Mint Guardian NFT
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button size="lg" className="w-full" variant="outline" data-testid="button-browse-marketplace">
                  Browse Marketplace
                </Button>
              </Link>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Connected: {address?.slice(0, 6)}...{address?.slice(-4)} • {ownedCount === 0 ? 'No NFTs found' : `${ownedCount} NFT${ownedCount > 1 ? 's' : ''}`}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
