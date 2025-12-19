import { useAccount } from 'wagmi';

interface CollectionSummary {
  contractAddress: string;
  name: string;
  symbol: string;
  balance: number;
  tokenIds: string[];
  representativeImage?: string;
}

export function useWalletCollections() {
  const { address } = useAccount();

  function clearCache() {
    if (address) {
      sessionStorage.removeItem(`wallet_collections_${address}`);
    }
  }

  return {
    collections: [] as CollectionSummary[],
    loading: false,
    error: null as string | null,
    refetch: () => Promise.resolve(),
    clearCache
  };
}
