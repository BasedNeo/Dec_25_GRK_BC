import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { NFT_CONTRACT, RPC_URL, IPFS_ROOT } from '@/lib/constants';
import { Guardian } from '@/lib/mockData';
import { CacheService, CACHE_KEYS } from '@/lib/cache';

const NFT_ABI = [
  'function tokensOfOwner(address owner) view returns (uint256[])',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
];

export function useOwnedNFTs() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<Guardian[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);

  const fetchOwnedNFTs = useCallback(async () => {
    if (!address || !isConnected) { setNfts([]); setBalance(0); return; }
    setIsLoading(true);
    setError(null);

    // Clear any cached user NFT data to ensure fresh fetch
    CacheService.invalidate(`${CACHE_KEYS.USER_NFTS}${address.toLowerCase()}`);

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(NFT_CONTRACT, NFT_ABI, provider);
      const balanceBigInt = await contract.balanceOf(address);
      const userBalance = Number(balanceBigInt);
      setBalance(userBalance);

      if (userBalance === 0) { 
        setNfts([]); setIsLoading(false); return; 
      }

      let tokenIds: number[] = [];
      try {
        const tokenIdsBigInt = await contract.tokensOfOwner(address);
        tokenIds = tokenIdsBigInt.map((id: bigint) => Number(id));
      } catch (e) {
        setError('Could not fetch owned tokens');
        setIsLoading(false);
        return;
      }

      const fetchedNFTs: Guardian[] = [];
      for (const tokenId of tokenIds) {
        try {
          let uri = '';
          try { uri = await contract.tokenURI(tokenId); } catch (e) { uri = ''; }

          let metadataUrl = uri;
          if (!uri) metadataUrl = `${IPFS_ROOT}${tokenId}.json`;
          else if (uri.startsWith('ipfs://')) metadataUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/');

          let metadata: any = { name: `Guardian #${tokenId}`, attributes: [] };
          try {
            const res = await fetch(metadataUrl);
            if (res.ok) metadata = await res.json();
          } catch (e) {}

          let imageUrl = metadata.image || '';
          if (imageUrl.startsWith('ipfs://')) imageUrl = imageUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
          if (!imageUrl) imageUrl = `https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeif47552u34c3r46iy3p26h7j3a7b63d333p4m4r4v3r4b6x3d3d3y/${tokenId}.png`;

          const rarityAttr = metadata.attributes?.find((a: any) => a.trait_type === 'Rarity' || a.trait_type === 'Rarity Level');

          fetchedNFTs.push({
            id: tokenId,
            name: metadata.name || `Guardian #${tokenId}`,
            image: imageUrl,
            rarity: rarityAttr?.value || 'Common',
            owner: address,
            traits: metadata.attributes?.map((a: any) => ({ type: a.trait_type, value: String(a.value) })) || [],
          });
        } catch (e) {}
      }
      setNfts(fetchedNFTs);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch owned NFTs');
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => { fetchOwnedNFTs(); }, [fetchOwnedNFTs]);

  // Auto-refresh every 15 seconds to catch ownership changes
  useEffect(() => {
    if (!isConnected || !address) return;
    const interval = setInterval(() => {
      fetchOwnedNFTs();
    }, 15000);
    return () => clearInterval(interval);
  }, [isConnected, address, fetchOwnedNFTs]);

  return { nfts, isLoading, error, balance, refetch: fetchOwnedNFTs };
}
