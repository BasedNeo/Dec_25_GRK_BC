import { useWalletBalance } from '@/hooks/useWalletBalance';
import { cn } from '@/lib/utils';

const MINT_PRICE = 69420;

export function WalletBalanceDisplay() {
  const { balance, isLoading, isConnected, canAffordMint, isLowBalance } = useWalletBalance();

  if (!isConnected) {
    return null;
  }

  const getBalanceClass = () => {
    if (!balance) return '';
    if (balance.raw < MINT_PRICE) return 'text-red-400';
    if (balance.raw < MINT_PRICE * 2) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const getTitle = () => {
    if (!balance) return '';
    if (balance.raw < MINT_PRICE) return 'Insufficient balance to mint';
    if (balance.raw < MINT_PRICE * 2) return 'Balance is running low';
    return `${balance.formatted} $BASED`;
  };

  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-black/40 backdrop-blur-md"
      data-testid="wallet-balance-display"
    >
      <span className="text-base">💎</span>
      <div className="flex flex-col leading-tight">
        <span className="text-[9px] text-muted-foreground font-mono tracking-wider hidden sm:block">
          $BASED BALANCE
        </span>
        <span 
          className={cn(
            "text-sm font-semibold font-mono transition-colors",
            getBalanceClass()
          )}
          title={getTitle()}
          data-testid="balance-amount"
        >
          {isLoading ? (
            <span className="animate-pulse">Loading...</span>
          ) : balance ? (
            `${balance.formatted}`
          ) : (
            '--'
          )}
        </span>
      </div>
    </div>
  );
}
