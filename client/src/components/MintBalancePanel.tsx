import { useState } from 'react';
import { RefreshCw, AlertTriangle, Zap, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { cn } from '@/lib/utils';

const MINT_PRICE = 69420;
const AFTERMINT_URL = "https://aftermint.trade/mint/based-guardians";

interface MintBalancePanelProps {
  onMaxAffordableChange?: (max: number) => void;
}

export function MintBalancePanel({ onMaxAffordableChange }: MintBalancePanelProps) {
  const { balance, isLoading, isConnected, refetch } = useWalletBalance();
  const { openConnectModal } = useConnectModal();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const maxAffordable = balance ? Math.floor(balance.raw / MINT_PRICE) : 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (onMaxAffordableChange && balance) {
    onMaxAffordableChange(maxAffordable);
  }

  const getAffordCountClass = () => {
    if (maxAffordable === 0) return 'text-red-400';
    if (maxAffordable <= 2) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const getWarningMessage = () => {
    if (!isConnected) return null;
    if (maxAffordable === 0) {
      return `You need at least ${MINT_PRICE.toLocaleString()} $BASED to mint. Get more $BASED to continue.`;
    }
    if (maxAffordable <= 2) {
      return `Balance is low. You can only mint ${maxAffordable} NFT${maxAffordable > 1 ? 's' : ''}.`;
    }
    return null;
  };

  const warningMessage = getWarningMessage();

  return (
    <Card 
      className={cn(
        "p-5 mb-6 max-w-md border rounded-2xl backdrop-blur-md",
        isConnected 
          ? "bg-gradient-to-br from-emerald-500/10 to-emerald-900/20 border-emerald-500/30" 
          : "bg-white/5 border-white/10"
      )}
      data-testid="mint-balance-panel"
    >
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-semibold text-white/70 uppercase tracking-wider">
          Your Wallet
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={!isConnected || isRefreshing}
          className="h-8 w-8 p-0 bg-white/10 hover:bg-white/20 rounded-lg"
          data-testid="refresh-balance-btn"
        >
          <RefreshCw 
            size={14} 
            className={cn(isRefreshing && "animate-spin")} 
          />
        </Button>
      </div>

      <div className="mb-5">
        <div className="flex items-baseline gap-2">
          <span 
            className={cn(
              "text-3xl font-bold transition-colors",
              isConnected ? "text-emerald-400" : "text-white/30"
            )}
            data-testid="mint-page-balance"
          >
            {isLoading ? (
              'Loading...'
            ) : !isConnected ? (
              'Connect Wallet'
            ) : balance ? (
              balance.formatted
            ) : (
              'Error'
            )}
          </span>
          <span className="text-base text-white/60">$BASED</span>
        </div>
      </div>

      <div className="bg-black/20 rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <span className="text-sm text-white/60">Mint Price:</span>
          <span className="text-sm font-semibold text-white">
            {MINT_PRICE.toLocaleString()} $BASED
          </span>
        </div>
        <div className="flex justify-between items-center pt-1">
          <span className="text-sm text-white/60">You Can Mint:</span>
          <span 
            className={cn("text-xl font-bold", getAffordCountClass())}
            data-testid="max-affordable-mints"
          >
            {!isConnected ? '--' : maxAffordable}
          </span>
        </div>
      </div>

      {warningMessage && (
        <div 
          className="flex items-center gap-2 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
          data-testid="balance-warning"
        >
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <span className="text-[13px] text-red-300">{warningMessage}</span>
        </div>
      )}

      {!isConnected ? (
        <Button 
          onClick={openConnectModal}
          className="w-full mt-4 py-5 bg-[#35dbba] hover:bg-[#35dbba]/90 text-black font-bold font-orbitron tracking-wider text-lg shadow-[0_0_20px_rgba(53,219,186,0.4)]"
          data-testid="connect-wallet-mint-btn"
        >
          <Wallet size={18} className="mr-2" /> CONNECT WALLET
        </Button>
      ) : (
        <a 
          href={AFTERMINT_URL} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block mt-4"
        >
          <Button 
            className="w-full py-5 bg-[#6cff61] hover:bg-[#6cff61]/90 text-black font-bold font-orbitron tracking-wider text-lg shadow-[0_0_20px_rgba(108,255,97,0.4)]"
            data-testid="mint-aftermint-btn"
          >
            <Zap size={18} className="mr-2" /> MINT NOW
          </Button>
        </a>
      )}
    </Card>
  );
}
