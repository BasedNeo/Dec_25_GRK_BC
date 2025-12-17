/**
 * useOffers - Fetch offers for multiple NFTs efficiently
 */
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { MARKETPLACE_CONTRACT, RPC_URL } from '@/lib/constants';
import { useAccount } from 'wagmi';
import { useInterval } from '@/hooks/useInterval';

interface OfferData {
  tokenId: number;
  offerer: string;
  amount: string;
  expiresAt: number;
  active: boolean;
}

const MARKETPLACE_ABI = [
  'event OfferMade(uint256 indexed tokenId, address indexed offerer, uint256 amount, uint256 expiresAt)',
  'function getOffer(uint256 tokenId, address offerer) view returns (uint256 amount, uint256 expiresAt, bool active)'
];

export function useOffersForOwner() {
  const { address } = useAccount();
  const [offers, setOffers] = useState<Map<number, OfferData[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const fetchOffers = useCallback(async () => {
    if (!address) {
      setOffers(new Map());
      setIsLoading(false);
      return;
    }

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, provider);
      
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);
      
      const filter = contract.filters.OfferMade();
      const events = await contract.queryFilter(filter, fromBlock, currentBlock);
      
      const offerMap = new Map<number, OfferData[]>();
      
      for (const event of events) {
        const log = event as ethers.EventLog;
        const tokenId = Number(log.args[0]);
        const offerer = log.args[1] as string;
        const amount = ethers.formatEther(log.args[2]);
        const expiresAt = Number(log.args[3]);
        
        const now = Math.floor(Date.now() / 1000);
        if (expiresAt < now) continue;
        
        try {
          const offerData = await contract.getOffer(tokenId, offerer);
          if (!offerData[2]) continue;
          
          const existing = offerMap.get(tokenId) || [];
          existing.push({ tokenId, offerer, amount, expiresAt, active: true });
          offerMap.set(tokenId, existing);
        } catch {
          // Offer no longer exists
        }
      }
      
      setOffers(offerMap);
    } catch {
      // Silent fail - offers fetch is non-critical
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  useInterval(fetchOffers, address ? 60000 : null);

  return { offers, isLoading };
}
