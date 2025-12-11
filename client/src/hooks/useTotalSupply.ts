import { useReadContract } from 'wagmi';
import { NFT_CONTRACT } from '@/lib/constants';

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
  const { data, isError, isLoading, refetch } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: totalSupplyAbi,
    functionName: 'totalSupply',
    query: {
        refetchInterval: 10000, // Refresh every 10 seconds
    }
  });

  return {
    totalSupply: data ? Number(data) : 0,
    isError,
    isLoading,
    refetch
  };
}
