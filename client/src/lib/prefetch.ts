import { queryClient } from './queryClient';
import { ContractService } from './contractService';
import { MARKETPLACE_CONTRACT, CHAIN_ID } from './constants';
import { createPublicClient, http, formatEther } from 'viem';

const publicClient = createPublicClient({
  chain: {
    id: CHAIN_ID,
    name: 'BasedAI',
    nativeCurrency: { name: 'BASED', symbol: 'BASED', decimals: 18 },
    rpcUrls: { default: { http: ['https://mainnet.basedaibridge.com/rpc/'] } },
  },
  transport: http('https://mainnet.basedaibridge.com/rpc/'),
});

const MARKETPLACE_ABI = [
  {
    name: 'getListing',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'seller', type: 'address' },
      { name: 'price', type: 'uint256' },
      { name: 'listedAt', type: 'uint256' },
      { name: 'active', type: 'bool' }
    ],
  },
] as const;

export async function prefetchNFTListing(tokenId: number): Promise<void> {
  const queryKey = ['listing', tokenId];
  
  const existingData = queryClient.getQueryData(queryKey);
  if (existingData) return;
  
  try {
    const listing = await publicClient.readContract({
      address: MARKETPLACE_CONTRACT as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'getListing',
      args: [BigInt(tokenId)],
    });
    
    if (listing) {
      const data = {
        seller: listing[0] as string,
        price: Number(formatEther(listing[1] as bigint)),
        listedAt: Number(listing[2]),
        active: listing[3] as boolean,
      };
      
      queryClient.setQueryData(queryKey, data);
    }
  } catch {
    // Silent fail - prefetch is best-effort
  }
}

export function prefetchOnHover(tokenId: number): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      prefetchNFTListing(tokenId);
    }, 100);
  };
}

export const CACHE_TIMES = {
  LISTINGS: {
    staleTime: 20 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  NFT_DATA: {
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  },
  PRICE_FEEDS: {
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  },
  STATIC_DATA: {
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  },
  GAME_SCORES: {
    staleTime: 10 * 1000,
    gcTime: 2 * 60 * 1000,
  },
} as const;
