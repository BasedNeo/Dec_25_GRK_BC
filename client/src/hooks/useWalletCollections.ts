import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface CollectionSummary {
  contractAddress: string;
  name: string;
  symbol: string;
  balance: number;
  tokenIds: string[];
  representativeImage?: string;
}

export function useWalletCollections() {
  // STRIPPED FOR LAUNCH: Wallet scanning is too slow, disabled for now
  // Returns empty state - can be re-enabled later when optimized
  const { address, isConnected } = useAccount();
  const [collections] = useState<CollectionSummary[]>([]);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  // Scanning disabled - was causing slow API calls
  /*
  useEffect(() => {
    if (!isConnected || !address) {
      setCollections([]);
      return;
    }

    scanWallet();
  }, [address, isConnected]);
  */

  async function scanWallet() {
    if (!address) return;

    const cacheKey = `wallet_collections_${address}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      
      if (age < 30 * 60 * 1000) {
        setCollections(data);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/wallet/scan/${address}`);
      
      if (!response.ok) {
        throw new Error('Failed to scan wallet');
      }

      const data = await response.json();
      const collectionsData = data.collections || [];

      const collectionsWithImages = await Promise.all(
        collectionsData.map(async (col: CollectionSummary) => {
          if (col.tokenIds.length > 0) {
            try {
              const tokenId = col.tokenIds[0];
              const metadataRes = await fetch(
                `/api/nft/metadata/${col.contractAddress}/${tokenId}`
              );
              
              if (metadataRes.ok) {
                const metadata = await metadataRes.json();
                return { ...col, representativeImage: metadata.image };
              }
            } catch (error) {
              console.warn(`Failed to fetch representative image for ${col.name}`);
            }
          }
          return col;
        })
      );

      sessionStorage.setItem(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: collectionsWithImages
      }));

      setCollections(collectionsWithImages);

    } catch (err: any) {
      console.error('Wallet scan error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function clearCache() {
    if (address) {
      sessionStorage.removeItem(`wallet_collections_${address}`);
    }
  }

  return {
    collections,
    loading,
    error,
    refetch: scanWallet,
    clearCache
  };
}
