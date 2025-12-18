import { useState, useEffect, useCallback } from 'react';
import { ContractService, ContractStats, NFTData } from '@/lib/contractService';

interface ContractStatsResult {
  stats: ContractStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useContractStats(): ContractStatsResult {
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ContractService.getContractStats();
      if (data) {
        setStats(data);
      } else {
        setError('Failed to load contract stats');
      }
    } catch (e) {
      setError('Failed to connect to contract');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

interface MintedNFTsResult {
  nfts: NFTData[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMintedNFTs(limit: number = 20, offset: number = 0): MintedNFTsResult {
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNFTs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ContractService.getMintedNFTs(limit, offset);
      setNfts(data.nfts);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (e) {
      setError('Failed to load NFTs');
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  return { nfts, total, hasMore, loading, error, refetch: fetchNFTs };
}

interface UserNFTsResult {
  nfts: NFTData[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserNFTs(userAddress: string | undefined): UserNFTsResult {
  const [nfts, setNfts] = useState<NFTData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNFTs = useCallback(async () => {
    if (!userAddress) {
      setNfts([]);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const data = await ContractService.getUserNFTs(userAddress);
      setNfts(data);
    } catch (e) {
      setError('Failed to load your NFTs');
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  return { nfts, loading, error, refetch: fetchNFTs };
}

interface TotalMintedResult {
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTotalMinted(): TotalMintedResult {
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTotal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ContractService.getTotalMinted();
      setTotal(data);
    } catch (e) {
      setError('Failed to load minted count');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTotal();
  }, [fetchTotal]);

  return { total, loading, error, refetch: fetchTotal };
}
