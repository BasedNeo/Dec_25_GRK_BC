import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { MARKETPLACE_CONTRACT, RPC_URL, NFT_CONTRACT } from '@/lib/constants';
import { useAccount } from 'wagmi';
import { useMarketplace } from './useMarketplace';
import { useOffersV3, OffchainOffer } from './useOffersV3';

export interface MyOffer {
  id: string;
  tokenId: number;
  nftName: string;
  nftImage: string;
  amount: number;
  amountWei: bigint;
  expiresAt: number;
  createdAt: number;
  status: 'active' | 'expired' | 'cancelled' | 'accepted';
  seller?: string;
  isV3?: boolean;
  v3Offer?: OffchainOffer;
}

const MARKETPLACE_ABI = [
  'event OfferMade(uint256 indexed tokenId, address indexed offerer, uint256 amount, uint256 expiresAt)',
  'event OfferCancelled(uint256 indexed tokenId, address indexed offerer)',
  'event OfferAccepted(uint256 indexed tokenId, address indexed offerer, address indexed seller, uint256 amount)',
  'function getOffer(uint256 tokenId, address offerer) view returns (uint256 amount, uint256 expiresAt, bool active)'
];

const IPFS_ROOT = "https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeie3c5ahzsiiparmbr6lgdbpiukorbphvclx73dwr6vrjfalfyu52y/";

export function useMyOffers() {
  const { address } = useAccount();
  const marketplace = useMarketplace();
  const offersV3 = useOffersV3();
  const [offers, setOffers] = useState<MyOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyOffers = useCallback(async () => {
    if (!address) {
      setOffers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const allOffers: MyOffer[] = [];
      
      const v3Offers = offersV3.myOffers;
      for (const v3Offer of v3Offers) {
        const now = Math.floor(Date.now() / 1000);
        let status: MyOffer['status'] = 'active';
        
        if (v3Offer.status === 'accepted') {
          status = 'accepted';
        } else if (v3Offer.status === 'cancelled') {
          status = 'cancelled';
        } else if (v3Offer.status === 'expired' || v3Offer.expiration < now) {
          status = 'expired';
        }
        
        allOffers.push({
          id: v3Offer.id,
          tokenId: v3Offer.tokenId,
          nftName: `Guardian #${v3Offer.tokenId}`,
          nftImage: `${IPFS_ROOT}${v3Offer.tokenId}.png`,
          amount: parseFloat(v3Offer.price),
          amountWei: BigInt(v3Offer.priceWei),
          expiresAt: v3Offer.expiration,
          createdAt: v3Offer.createdAt,
          status,
          isV3: true,
          v3Offer,
        });
      }

      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, provider);
        
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 50000);
        
        const offerFilter = marketplaceContract.filters.OfferMade(null, address);
        const offerEvents = await marketplaceContract.queryFilter(offerFilter, fromBlock, currentBlock);
        
        const cancelFilter = marketplaceContract.filters.OfferCancelled(null, address);
        const cancelEvents = await marketplaceContract.queryFilter(cancelFilter, fromBlock, currentBlock);
        const cancelledTokenIds = new Set(cancelEvents.map(e => Number((e as ethers.EventLog).args[0])));
        
        const acceptFilter = marketplaceContract.filters.OfferAccepted(null, address);
        const acceptEvents = await marketplaceContract.queryFilter(acceptFilter, fromBlock, currentBlock);
        const acceptedTokenIds = new Set(acceptEvents.map(e => Number((e as ethers.EventLog).args[0])));
        
        const now = Math.floor(Date.now() / 1000);
        
        for (const event of offerEvents) {
          const log = event as ethers.EventLog;
          const tokenId = Number(log.args[0]);
          const amountWei = log.args[2] as bigint;
          const amount = parseFloat(ethers.formatEther(amountWei));
          const expiresAt = Number(log.args[3]);
          
          let createdAt = 0;
          try {
            const block = await log.getBlock();
            createdAt = block?.timestamp || 0;
          } catch {
            createdAt = Math.floor(Date.now() / 1000) - 86400;
          }
          
          let status: MyOffer['status'] = 'active';
          if (cancelledTokenIds.has(tokenId)) {
            status = 'cancelled';
          } else if (acceptedTokenIds.has(tokenId)) {
            status = 'accepted';
          } else if (expiresAt < now) {
            status = 'expired';
          } else {
            try {
              const offerData = await marketplaceContract.getOffer(tokenId, address);
              if (!offerData[2]) status = 'cancelled';
            } catch {
              status = 'cancelled';
            }
          }
          
          if (!allOffers.find(o => o.tokenId === tokenId)) {
            allOffers.push({
              id: `v2-${tokenId}-${log.transactionHash}`,
              tokenId,
              nftName: `Guardian #${tokenId}`,
              nftImage: `${IPFS_ROOT}${tokenId}.png`,
              amount,
              amountWei,
              expiresAt,
              createdAt,
              status,
              isV3: false,
            });
          }
        }
      } catch {
        // V2 fetch failed, continue with V3 offers only
      }
      
      allOffers.sort((a, b) => b.createdAt - a.createdAt);
      
      const uniqueOffers = new Map<number, MyOffer>();
      for (const offer of allOffers) {
        if (!uniqueOffers.has(offer.tokenId) || offer.createdAt > uniqueOffers.get(offer.tokenId)!.createdAt) {
          uniqueOffers.set(offer.tokenId, offer);
        }
      }
      
      setOffers(Array.from(uniqueOffers.values()));
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to fetch offers');
    } finally {
      setIsLoading(false);
    }
  }, [address, offersV3.myOffers]);

  useEffect(() => {
    fetchMyOffers();
    const interval = setInterval(fetchMyOffers, 30000);
    return () => clearInterval(interval);
  }, [fetchMyOffers]);

  const cancelOffer = useCallback(async (tokenId: number, isV3: boolean = false, v3OfferId?: string) => {
    try {
      if (isV3 && v3OfferId) {
        await offersV3.cancelOffer(v3OfferId);
      } else {
        await marketplace.cancelOffer(tokenId);
      }
      setOffers(prev => prev.map(o => 
        o.tokenId === tokenId ? { ...o, status: 'cancelled' as const } : o
      ));
    } catch (err) {
      throw err;
    }
  }, [marketplace, offersV3]);

  const activeCount = offers.filter(o => o.status === 'active').length;
  const pendingCount = offers.filter(o => o.status === 'active' || o.status === 'accepted').length;

  return {
    offers,
    activeOffers: offers.filter(o => o.status === 'active'),
    acceptedOffers: offers.filter(o => o.status === 'accepted'),
    expiredOffers: offers.filter(o => o.status === 'expired'),
    isLoading,
    error,
    refresh: fetchMyOffers,
    cancelOffer,
    activeCount,
    pendingCount,
  };
}
