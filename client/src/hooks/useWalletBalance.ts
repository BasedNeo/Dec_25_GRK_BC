import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { WalletBalanceService } from '@/lib/walletBalanceService';

const MINT_PRICE = 69420;

export function useWalletBalance() {
  const { address, isConnected } = useAccount();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['walletBalance', address],
    queryFn: async () => {
      if (!address) return null;
      return WalletBalanceService.getBalance(address);
    },
    enabled: isConnected && !!address,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const canAffordMint = data ? data.raw >= MINT_PRICE : false;
  const isLowBalance = data ? data.raw < MINT_PRICE * 2 : false;

  const clearAndRefetch = () => {
    WalletBalanceService.clearCache();
    refetch();
  };

  return {
    balance: data,
    isLoading,
    error,
    refetch: clearAndRefetch,
    canAffordMint,
    isLowBalance,
    isConnected
  };
}
