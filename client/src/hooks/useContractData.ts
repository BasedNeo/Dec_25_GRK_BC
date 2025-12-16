import { useReadContract, useAccount } from 'wagmi';
import { CHAIN_ID, NFT_CONTRACT } from '@/lib/constants';

const CONTRACT_ABI = [
  { name: 'totalMinted', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'MAX_SUPPLY', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'MINT_PRICE', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'publicMintEnabled', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'paused', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'revealed', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'tokensOfOwner', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256[]' }] },
  { name: 'tokenURI', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'string' }] },
  { name: 'ownerOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ type: 'address' }] },
] as const;

export function useContractData() {
  const { address } = useAccount();

  const { data: totalMinted, isLoading: loadingMinted, refetch: refetchMinted } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'totalMinted',
    chainId: CHAIN_ID,
    query: { refetchInterval: 10000 }
  });

  const { data: maxSupply } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'MAX_SUPPLY',
    chainId: CHAIN_ID,
  });

  const { data: mintPrice } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'MINT_PRICE',
    chainId: CHAIN_ID,
  });

  const { data: publicMintEnabled } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'publicMintEnabled',
    chainId: CHAIN_ID,
    query: { refetchInterval: 30000 }
  });

  const { data: isPaused } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'paused',
    chainId: CHAIN_ID,
    query: { refetchInterval: 30000 }
  });

  const { data: isRevealed } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'revealed',
    chainId: CHAIN_ID,
  });

  const { data: userBalance } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 15000 }
  });

  const { data: userTokens, refetch: refetchUserTokens } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'tokensOfOwner',
    args: address ? [address] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address }
  });

  const mintedCount = totalMinted ? Number(totalMinted) : 0;
  const maxSupplyCount = maxSupply ? Number(maxSupply) : 3732;
  const mintPriceWei = mintPrice || BigInt(69420) * BigInt(10**18);
  const mintPriceBased = Number(mintPriceWei / BigInt(10**18));
  const remainingSupply = maxSupplyCount - mintedCount;
  const percentMinted = maxSupplyCount > 0 ? (mintedCount / maxSupplyCount) * 100 : 0;
  const isSoldOut = remainingSupply <= 0;
  const canMint = publicMintEnabled === true && isPaused !== true && !isSoldOut;

  return {
    totalMinted: mintedCount,
    maxSupply: maxSupplyCount,
    mintPrice: mintPriceBased,
    mintPriceWei,
    
    publicMintEnabled: publicMintEnabled ?? false,
    isPaused: isPaused ?? false,
    isRevealed: isRevealed ?? false,
    isSoldOut,
    canMint,
    
    remainingSupply,
    percentMinted,
    
    userBalance: userBalance ? Number(userBalance) : 0,
    userTokens: userTokens ? (userTokens as bigint[]).map(Number) : [],
    
    isLoading: loadingMinted,
    
    refetch: () => { refetchMinted(); refetchUserTokens(); }
  };
}

export function useTokenData(tokenId: number | undefined) {
  const { data: owner, isLoading: loadingOwner } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'ownerOf',
    args: tokenId !== undefined ? [BigInt(tokenId)] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: tokenId !== undefined }
  });

  const { data: tokenURI, isLoading: loadingURI } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'tokenURI',
    args: tokenId !== undefined ? [BigInt(tokenId)] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: tokenId !== undefined }
  });

  return {
    owner: owner as string | undefined,
    tokenURI: tokenURI as string | undefined,
    isLoading: loadingOwner || loadingURI
  };
}
