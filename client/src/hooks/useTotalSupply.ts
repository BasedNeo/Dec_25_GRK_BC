/**
 * useTotalSupply Hook - FIXED
 * Now uses 'totalMinted' instead of 'totalSupply' for accurate count
 */
import { useReadContract } from 'wagmi';
import { NFT_CONTRACT, CHAIN_ID } from '@/lib/constants';
import { getCached, setCache, CACHE_KEYS } from '@/lib/cache';

const contractAbi = [
  { inputs: [], name: "totalMinted", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "MAX_SUPPLY", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "publicMintEnabled", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "paused", outputs: [{ name: "", type: "bool" }], stateMutability: "view", type: "function" },
] as const;

export function useTotalSupply() {
  const cachedSupply = getCached<string>(CACHE_KEYS.CONTRACT_STATE, 30 * 1000);

  const { data: totalMinted, isError, isLoading, refetch } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: contractAbi,
    functionName: 'totalMinted',
    chainId: CHAIN_ID,
    query: { refetchInterval: 30000, initialData: cachedSupply ? BigInt(cachedSupply) : undefined }
  });

  const { data: maxSupply } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`, abi: contractAbi, functionName: 'MAX_SUPPLY', chainId: CHAIN_ID
  });

  const { data: publicMintEnabled } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`, abi: contractAbi, functionName: 'publicMintEnabled', chainId: CHAIN_ID, query: { refetchInterval: 30000 }
  });

  const { data: isPaused } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`, abi: contractAbi, functionName: 'paused', chainId: CHAIN_ID, query: { refetchInterval: 30000 }
  });

  if (totalMinted) setCache(CACHE_KEYS.CONTRACT_STATE, totalMinted.toString());

  const minted = totalMinted ? Number(totalMinted) : (cachedSupply ? Number(cachedSupply) : 0);
  const max = maxSupply ? Number(maxSupply) : 3732;

  return {
    totalSupply: minted, totalMinted: minted, maxSupply: max,
    remainingSupply: max - minted, percentMinted: max > 0 ? (minted / max) * 100 : 0, isSoldOut: minted >= max,
    publicMintEnabled: publicMintEnabled ?? false, isPaused: isPaused ?? false,
    canMint: (publicMintEnabled ?? false) && !(isPaused ?? false) && minted < max,
    isError, isLoading: isLoading && !cachedSupply, refetch
  };
}
