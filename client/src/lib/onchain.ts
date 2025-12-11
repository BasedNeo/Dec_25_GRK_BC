import { createPublicClient, http, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { RPC_URL, CHAIN_ID, NFT_CONTRACT } from './constants';

// Define the custom chain
const basedChain = {
  ...mainnet,
  id: CHAIN_ID,
  name: 'BasedAI L1',
  network: 'basedai',
  nativeCurrency: {
    decimals: 18,
    name: 'BasedAI',
    symbol: 'BASED',
  },
  rpcUrls: {
    public: { http: [RPC_URL] },
    default: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'BasedScan', url: 'https://explorer.bf1337.org' },
  },
} as const;

export const publicClient = createPublicClient({
  chain: basedChain,
  transport: http()
});

// ABI for totalSupply
const minimalABI = [
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function fetchTotalSupply(): Promise<number | null> {
  try {
    if (!NFT_CONTRACT) return null;
    const data = await publicClient.readContract({
      address: NFT_CONTRACT as `0x${string}`,
      abi: minimalABI,
      functionName: 'totalSupply',
    });
    return Number(data);
  } catch (error) {
    console.error("Error fetching total supply:", error);
    return null;
  }
}
