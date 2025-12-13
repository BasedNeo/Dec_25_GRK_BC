import { useReadContract } from 'wagmi';
import { NFT_CONTRACT } from '@/lib/constants';
import { getCached, setCache, CACHE_KEYS } from '@/lib/cache';

const totalSupplyAbi = [
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export function useTotalSupply() {
  // Check cache first for initial data
  const cachedSupply = getCached<string>(CACHE_KEYS.CONTRACT_STATE, 30 * 1000);

  const { data, isError, isLoading, refetch } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: totalSupplyAbi,
    functionName: 'totalSupply',
    query: {
        refetchInterval: 10000, // Refresh every 10 seconds
        initialData: cachedSupply ? BigInt(cachedSupply) : undefined,
    }
  });

  // Update cache when data changes
  if (data) {
      setCache(CACHE_KEYS.CONTRACT_STATE, data.toString());
  }

  return {
    totalSupply: data ? Number(data) : (cachedSupply ? Number(cachedSupply) : 0),
    isError,
    isLoading: isLoading && !cachedSupply,
    refetch
  };
}
