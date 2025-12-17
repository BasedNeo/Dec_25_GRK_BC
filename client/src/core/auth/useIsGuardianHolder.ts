import { useAccount, useReadContract } from 'wagmi';
import { NFT_CONTRACT, CHAIN_ID } from '@/lib/constants';

const NFT_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export function useIsGuardianHolder() {
  const { address, isConnected } = useAccount();

  const { data: balance, isLoading } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address && isConnected, staleTime: 30000 },
  });

  const isHolder = balance ? Number(balance) >= 1 : false;

  return { isHolder, isLoading };
}

export default useIsGuardianHolder;
