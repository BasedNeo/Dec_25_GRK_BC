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

// ABI for contract interaction
const contractABI = [
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_SUPPLY",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MINT_PRICE",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "publicMintEnabled",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "revealed",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "index", type: "uint256" }],
    name: "tokenByIndex",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export async function fetchTokenURI(tokenId: number): Promise<string | null> {
    try {
        if (!NFT_CONTRACT) return null;
        const uri = await publicClient.readContract({
            address: NFT_CONTRACT as `0x${string}`,
            abi: contractABI,
            functionName: 'tokenURI',
            args: [BigInt(tokenId)]
        });
        return uri as string;
    } catch (error) {
        console.error(`Error fetching token URI for ${tokenId}:`, error);
        return null;
    }
}

export async function fetchTotalSupply(): Promise<number | null> {
  try {
    if (!NFT_CONTRACT) return null;
    const data = await publicClient.readContract({
      address: NFT_CONTRACT as `0x${string}`,
      abi: contractABI,
      functionName: 'totalSupply',
    });
    return Number(data);
  } catch (error) {
    console.error("Error fetching total supply:", error);
    return null;
  }
}

export async function fetchContractStats() {
    try {
        if (!NFT_CONTRACT) return null;
        const [maxSupply, mintPrice, isPublicMint, isRevealed, isPaused] = await publicClient.multicall({
            contracts: [
                { address: NFT_CONTRACT as `0x${string}`, abi: contractABI, functionName: 'MAX_SUPPLY' },
                { address: NFT_CONTRACT as `0x${string}`, abi: contractABI, functionName: 'MINT_PRICE' },
                { address: NFT_CONTRACT as `0x${string}`, abi: contractABI, functionName: 'publicMintEnabled' },
                { address: NFT_CONTRACT as `0x${string}`, abi: contractABI, functionName: 'revealed' },
                { address: NFT_CONTRACT as `0x${string}`, abi: contractABI, functionName: 'paused' },
            ]
        });

        return {
            maxSupply: Number(maxSupply.result),
            mintPrice: formatUnits(maxSupply.result ? (mintPrice.result as bigint) : BigInt(0), 18), // Helper format
            rawMintPrice: mintPrice.result,
            isPublicMint: isPublicMint.result,
            isRevealed: isRevealed.result,
            isPaused: isPaused.result
        };
    } catch (error) {
        console.error("Error fetching contract stats:", error);
        return null;
    }
}

export async function fetchTokenOwner(tokenId: number): Promise<string | null> {
    try {
        if (!NFT_CONTRACT) return null;
        const owner = await publicClient.readContract({
            address: NFT_CONTRACT as `0x${string}`,
            abi: contractABI,
            functionName: 'ownerOf',
            args: [BigInt(tokenId)]
        });
        return owner as string;
    } catch (error) {
        // console.warn(`Error fetching owner for token ${tokenId}:`, error);
        return null;
    }
}

export async function fetchTokenByIndex(index: number): Promise<number | null> {
    try {
        if (!NFT_CONTRACT) return null;
        const tokenId = await publicClient.readContract({
            address: NFT_CONTRACT as `0x${string}`,
            abi: contractABI,
            functionName: 'tokenByIndex',
            args: [BigInt(index)]
        });
        return Number(tokenId);
    } catch (error) {
        console.error(`Error fetching token by index ${index}:`, error);
        return null;
    }
}
