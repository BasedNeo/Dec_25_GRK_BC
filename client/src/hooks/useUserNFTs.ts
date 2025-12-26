import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { NFT_CONTRACT, RPC_URL, IPFS_ROOT } from '@/lib/constants';

interface NFTData {
  tokenId: number;
  name: string;
  image: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
  owner: string;
  rarity?: string;
}

const NFT_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tokensOfOwner(address owner) view returns (uint256[])',
  'function tokenURI(uint256 tokenId) view returns (string)',
];

const nftCache = new Map<string, { data: NFTData[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000;

export function useUserNFTs() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [totalOwned, setTotalOwned] = useState<number | null>(null);

  const fetchUserNFTs = useCallback(async (userAddress: string) => {
    try {
      setLoading(true);
      setError(null);

      const cached = nftCache.get(userAddress.toLowerCase());
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('[useUserNFTs] Using cached data');
        setNfts(cached.data);
        setHasLoaded(true);
        setLoading(false);
        return;
      }

      console.log('[useUserNFTs] Fetching NFTs for', userAddress);

      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(NFT_CONTRACT, NFT_ABI, provider);

      const balancePromise = contract.balanceOf(userAddress);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Balance fetch timeout')), 10000)
      );

      const balance = await Promise.race([balancePromise, timeoutPromise]);
      const balanceNum = Number(balance);

      console.log('[useUserNFTs] User owns', balanceNum, 'NFTs');
      setTotalOwned(balanceNum);

      if (balanceNum > 20) {
        console.warn('[useUserNFTs] User owns more than 20 NFTs, will only fetch first 20');
      }

      if (balanceNum === 0) {
        setNfts([]);
        setHasLoaded(true);
        nftCache.set(userAddress.toLowerCase(), { data: [], timestamp: Date.now() });
        setLoading(false);
        return;
      }

      let tokenIds: number[] = [];
      
      try {
        const tokensPromise = contract.tokensOfOwner(userAddress);
        const tokensTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tokens fetch timeout')), 15000)
        );
        const tokenIdsBigInt = await Promise.race([tokensPromise, tokensTimeout]);
        tokenIds = tokenIdsBigInt.map((id: bigint) => Number(id));
        // Limit to 20 for safety
        tokenIds = tokenIds.slice(0, 20);
      } catch (e) {
        console.log('[useUserNFTs] tokensOfOwner failed, falling back to tokenOfOwnerByIndex');
        // Reduced from 50 to 20 for safety - prevents browser freezing
        const maxToFetch = Math.min(balanceNum, 20);
        const tokenIdPromises: Promise<bigint | null>[] = [];

        for (let i = 0; i < maxToFetch; i++) {
          tokenIdPromises.push(
            contract.tokenOfOwnerByIndex(userAddress, i).catch(() => null)
          );
        }

        const tokenIdsTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Token IDs timeout')), 15000)
        );

        const tokenIdsResults = await Promise.race([
          Promise.all(tokenIdPromises),
          tokenIdsTimeout,
        ]) as (bigint | null)[];

        tokenIds = tokenIdsResults
          .filter((id): id is bigint => id !== null)
          .map((id) => Number(id));
      }

      console.log('[useUserNFTs] Found token IDs:', tokenIds.slice(0, 10), tokenIds.length > 10 ? `... and ${tokenIds.length - 10} more` : '');

      const nftData: NFTData[] = [];

      for (const tokenId of tokenIds) {
        try {
          const metadata = await fetchNFTMetadata(contract, tokenId, userAddress);

          if (metadata) {
            nftData.push(metadata);
            setNfts([...nftData]);
          }
        } catch (err) {
          console.warn(`[useUserNFTs] Failed to fetch metadata for token ${tokenId}:`, err);
          nftData.push({
            tokenId,
            name: `Based Guardian #${tokenId}`,
            image: `${IPFS_ROOT}${tokenId}.png`,
            owner: userAddress,
            rarity: 'Common',
          });
          setNfts([...nftData]);
        }
      }

      nftCache.set(userAddress.toLowerCase(), {
        data: nftData,
        timestamp: Date.now(),
      });

      setNfts(nftData);
      setHasLoaded(true);
      console.log('[useUserNFTs] Fetch complete. Total NFTs:', nftData.length);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[useUserNFTs] Error fetching NFTs:', error);
      setError(error.message || 'Failed to fetch NFTs');
    } finally {
      setLoading(false);
    }
  }, []);

  // Track previous address to detect wallet switches
  const prevAddressRef = useRef<string | undefined>(undefined);

  // Auto-fetch NFTs on mount and wallet change
  useEffect(() => {
    // Always reset state when address changes (including wallet switch)
    if (address !== prevAddressRef.current) {
      setNfts([]);
      setError(null);
      setHasLoaded(false);
      setTotalOwned(null);
      setLoading(false);
      prevAddressRef.current = address;
      
      // Auto-fetch when wallet is connected
      if (address && isConnected) {
        fetchUserNFTs(address);
      }
    }
    
    // Also reset if not connected
    if (!address || !isConnected) {
      setNfts([]);
      setError(null);
      setHasLoaded(false);
      setTotalOwned(null);
    }
    
    // Cleanup function
    return () => {
      setLoading(false);
    };
  }, [address, isConnected, fetchUserNFTs]);

  const refetch = useCallback(() => {
    if (address) {
      nftCache.delete(address.toLowerCase());
      fetchUserNFTs(address);
    }
  }, [address, fetchUserNFTs]);

  return { nfts, loading, error, refetch, hasLoaded, totalOwned };
}

async function fetchNFTMetadata(
  contract: ethers.Contract,
  tokenId: number,
  owner: string
): Promise<NFTData | null> {
  try {
    let tokenURI = '';
    try {
      tokenURI = await contract.tokenURI(tokenId);
    } catch (e) {
      tokenURI = '';
    }

    let metadataUrl = tokenURI;
    if (!tokenURI) {
      metadataUrl = `${IPFS_ROOT}${tokenId}.json`;
    } else if (tokenURI.startsWith('ipfs://')) {
      metadataUrl = tokenURI.replace('ipfs://', 'https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(metadataUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Metadata fetch failed');
      }

      const metadata = await response.json();

      let imageUrl = metadata.image || `${IPFS_ROOT}${tokenId}.png`;
      if (imageUrl.startsWith('ipfs://')) {
        imageUrl = imageUrl.replace('ipfs://', 'https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/');
      }

      const rarityAttr = metadata.attributes?.find(
        (a: { trait_type: string }) => a.trait_type === 'Rarity' || a.trait_type === 'Rarity Level'
      );

      return {
        tokenId,
        name: metadata.name || `Based Guardian #${tokenId}`,
        image: imageUrl,
        attributes: metadata.attributes || [],
        owner,
        rarity: String(rarityAttr?.value || 'Common'),
      };
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      throw fetchErr;
    }
  } catch (err) {
    console.warn(`[fetchNFTMetadata] Failed for token ${tokenId}:`, err);
    return null;
  }
}
