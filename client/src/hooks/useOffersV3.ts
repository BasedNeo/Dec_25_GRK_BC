import { useState, useCallback, useEffect } from 'react';
import { useAccount, useSignTypedData, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { useInterval } from '@/hooks/useInterval';
import { CHAIN_ID, MARKETPLACE_V3_CONTRACT } from '@/lib/constants';
import { SecureStorage } from '@/lib/secureStorage';
import { requestDedup } from '@/lib/requestDeduplicator';
import { asyncMutex } from '@/lib/asyncMutex';

const DOMAIN = {
  name: 'BasedGuardiansMarketplace',
  version: '3',
  chainId: 32323,
  verifyingContract: MARKETPLACE_V3_CONTRACT as `0x${string}`,
};

const OFFER_TYPES = {
  Offer: [
    { name: 'tokenId', type: 'uint256' },
    { name: 'buyer', type: 'address' },
    { name: 'price', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiration', type: 'uint256' },
  ],
};

export interface OffchainOffer {
  id: string;
  tokenId: number;
  buyer: string;
  price: string;
  priceWei: string;
  nonce: number;
  expiration: number;
  signature: string;
  status: 'pending' | 'accepted' | 'completed' | 'expired' | 'cancelled';
  createdAt: number;
  acceptedAt?: number;
  completionDeadline?: number;
  message?: string;
}

export interface PendingSale {
  tokenId: number;
  seller: string;
  buyer: string;
  price: string;
  priceWei: bigint;
  acceptedAt: number;
  deadline: number;
  active: boolean;
}

const OFFERS_STORAGE_KEY = 'basedguardians_offers_v3';

const RETENTION = {
  MAX_OFFERS: 500,
  MAX_PER_WALLET: 50,
  RATE_LIMIT_HOURLY: 5,
};

function cleanupOffers(offers: OffchainOffer[]): OffchainOffer[] {
  const now = Date.now();
  return offers
    .filter(o => {
      if (o.status === 'pending' && o.expiration * 1000 < now) return false;
      if (o.status === 'cancelled') return now - (o.createdAt * 1000) < 86400000;
      if (o.status === 'completed') return now - (o.createdAt * 1000) < 2592000000;
      return true;
    })
    .slice(0, RETENTION.MAX_OFFERS);
}

const MARKETPLACE_V3_ABI = [
  {
    name: 'acceptOffer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'buyer', type: 'address' },
      { name: 'price', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'expiration', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'completePurchase',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'expirePendingSale',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'cancelAllOffers',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'getNonce',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getPendingSale',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'seller', type: 'address' },
      { name: 'buyer', type: 'address' },
      { name: 'price', type: 'uint256' },
      { name: 'acceptedAt', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    name: 'listNFT',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'price', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'delistNFT',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'buyNFT',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
] as const;

function getStoredOffers(): OffchainOffer[] {
  try {
    const offers = SecureStorage.get<OffchainOffer[]>('offers_v3');
    if (offers) {
      const cleaned = cleanupOffers(offers);
      if (cleaned.length !== offers.length) saveOffers(cleaned);
      return cleaned;
    }
    
    const oldStored = localStorage.getItem(OFFERS_STORAGE_KEY);
    if (oldStored) {
      const oldOffers = JSON.parse(oldStored) as OffchainOffer[];
      saveOffers(oldOffers);
      localStorage.removeItem(OFFERS_STORAGE_KEY);
      return cleanupOffers(oldOffers);
    }
    
    return [];
  } catch (e) {
    console.error('[Offers] Storage read error:', e);
    return [];
  }
}

function saveOffers(offers: OffchainOffer[]) {
  const success = SecureStorage.set('offers_v3', offers);
  if (!success) {
    console.error('[Offers] Failed to save - storage full or error');
    const trimmed = offers.slice(-100);
    SecureStorage.set('offers_v3', trimmed);
  }
}

function addOffer(offer: OffchainOffer) {
  const offers = getStoredOffers();
  const filtered = offers.filter(o => !(o.tokenId === offer.tokenId && o.buyer.toLowerCase() === offer.buyer.toLowerCase()));
  filtered.push(offer);
  saveOffers(filtered);
}

function updateOfferStatus(id: string, status: OffchainOffer['status'], extra?: Partial<OffchainOffer>) {
  const offers = getStoredOffers();
  const updated = offers.map(o => o.id === id ? { ...o, status, ...extra } : o);
  saveOffers(updated);
}

function removeOffer(id: string) {
  const offers = getStoredOffers();
  saveOffers(offers.filter(o => o.id !== id));
}

export function useOffersV3() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [myOffers, setMyOffers] = useState<OffchainOffer[]>([]);
  const [offersForToken, setOffersForToken] = useState<Map<number, OffchainOffer[]>>(new Map());
  const [pendingSales, setPendingSales] = useState<Map<number, PendingSale>>(new Map());
  const [userNonce, setUserNonce] = useState<number>(0);
  
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const fetchNonce = useCallback(async () => {
    if (!address) return;
    
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.JsonRpcProvider('https://mainnet.basedaibridge.com/rpc/');
      const contract = new ethers.Contract(MARKETPLACE_V3_CONTRACT, MARKETPLACE_V3_ABI, provider);
      const nonce = await contract.getNonce(address);
      setUserNonce(Number(nonce));
    } catch {
      // Nonce fetch failed
    }
  }, [address]);

  const loadOffers = useCallback(() => {
    const allOffers = getStoredOffers();
    
    const now = Math.floor(Date.now() / 1000);
    const validOffers = allOffers.filter(o => {
      if (o.status === 'completed' || o.status === 'cancelled') return false;
      if (o.status === 'pending' && o.expiration < now) {
        updateOfferStatus(o.id, 'expired');
        return false;
      }
      return true;
    });
    
    if (address) {
      setMyOffers(validOffers.filter(o => o.buyer.toLowerCase() === address.toLowerCase()));
    }
    
    const byToken = new Map<number, OffchainOffer[]>();
    validOffers.forEach(o => {
      const existing = byToken.get(o.tokenId) || [];
      existing.push(o);
      byToken.set(o.tokenId, existing);
    });
    setOffersForToken(byToken);
  }, [address]);

  useEffect(() => {
    loadOffers();
    fetchNonce();
  }, [loadOffers, fetchNonce]);

  useInterval(loadOffers, 30000);

  const makeOffer = useCallback(async (
    tokenId: number, 
    priceInBased: number, 
    expirationDays: number = 7,
    message?: string
  ): Promise<boolean> => {
    const opKey = `make-offer-${tokenId}-${address}`;
    
    return await requestDedup.execute(opKey, async () => {
      return await asyncMutex.runExclusive(`offer-${address}`, async () => {
        if (!isConnected || !address) {
          toast({ title: "Connect Wallet", description: "Please connect your wallet first", variant: "destructive" });
          return false;
        }

        if (chainId !== CHAIN_ID) {
          toast({ title: "Wrong Network", description: "Please switch to BasedAI network", variant: "destructive" });
          return false;
        }

        const existing = getStoredOffers();
        const recent = existing.filter(o => o.buyer.toLowerCase() === address.toLowerCase() && Date.now() - (o.createdAt * 1000) < 3600000);
        if (recent.length >= RETENTION.RATE_LIMIT_HOURLY) {
          toast({ title: "Slow down", description: "Max 5 offers per hour", variant: "destructive" });
          return false;
        }

        try {
          setIsLoading(true);
          
          await fetchNonce();
          
          const priceWei = parseEther(priceInBased.toString());
          const expiration = Math.floor(Date.now() / 1000) + (expirationDays * 24 * 60 * 60);
          
          const offerData = {
            tokenId: BigInt(tokenId),
            buyer: address,
            price: priceWei,
            nonce: BigInt(userNonce),
            expiration: BigInt(expiration),
          };

          toast({
            title: "Sign Offer",
            description: "Please sign the message in your wallet. This is FREE - no gas needed!",
            className: "bg-black border-cyan-500 text-cyan-400",
          });

          const signature = await signTypedDataAsync({
            domain: DOMAIN,
            types: OFFER_TYPES,
            primaryType: 'Offer',
            message: offerData,
          });

          let cleanMessage: string | undefined;
          if (message?.trim()) {
            const DOMPurify = (await import('dompurify')).default;
            cleanMessage = DOMPurify.sanitize(message.trim().slice(0, 280));
          }

          const offer: OffchainOffer = {
            id: `${tokenId}-${address}-${Date.now()}`,
            tokenId,
            buyer: address,
            price: priceInBased.toString(),
            priceWei: priceWei.toString(),
            nonce: userNonce,
            expiration,
            signature,
            status: 'pending',
            createdAt: Math.floor(Date.now() / 1000),
            message: cleanMessage,
          };

          addOffer(offer);
          loadOffers();

          toast({
            title: "Offer Created!",
            description: `Offer of ${priceInBased.toLocaleString()} $BASED submitted. Funds stay in your wallet until seller accepts!`,
            className: "bg-black border-green-500 text-green-400",
          });

          return true;

        } catch (e: unknown) {
          const error = e as Error;
          if (error.message?.includes('rejected') || error.message?.includes('denied')) {
            toast({ title: "Cancelled", description: "You cancelled the signature request" });
          } else {
            toast({ title: "Error", description: "Failed to create offer", variant: "destructive" });
          }
          return false;
        } finally {
          setIsLoading(false);
        }
      });
    });
  }, [isConnected, address, chainId, userNonce, signTypedDataAsync, toast, fetchNonce, loadOffers]);

  const acceptOffer = useCallback(async (offer: OffchainOffer): Promise<boolean> => {
    const opKey = `accept-offer-${offer.id}`;
    
    return await requestDedup.execute(opKey, async () => {
      return await asyncMutex.runExclusive(`accept-${address}`, async () => {
        if (!isConnected || !address) {
          toast({ title: "Connect Wallet", description: "Please connect your wallet", variant: "destructive" });
          return false;
        }

        try {
          setIsLoading(true);

          toast({
            title: "Accept Offer",
            description: "Confirm in your wallet to accept this offer...",
            className: "bg-black border-cyan-500 text-cyan-400",
          });

          writeContract({
            address: MARKETPLACE_V3_CONTRACT as `0x${string}`,
            abi: MARKETPLACE_V3_ABI,
            functionName: 'acceptOffer',
            args: [
              BigInt(offer.tokenId),
              offer.buyer as `0x${string}`,
              BigInt(offer.priceWei),
              BigInt(offer.nonce),
              BigInt(offer.expiration),
              offer.signature as `0x${string}`,
            ],
            gas: BigInt(500000),
            gasPrice: BigInt(10000000000),
          });

          return true;
        } catch {
          toast({ title: "Error", description: "Failed to accept offer", variant: "destructive" });
          return false;
        } finally {
          setIsLoading(false);
        }
      });
    });
  }, [isConnected, address, writeContract, toast]);

  const completePurchase = useCallback(async (tokenId: number, priceWei: bigint): Promise<boolean> => {
    if (!isConnected || !address) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet", variant: "destructive" });
      return false;
    }

    try {
      setIsLoading(true);

      toast({
        title: "Complete Purchase",
        description: "Confirm in your wallet to complete the purchase...",
        className: "bg-black border-cyan-500 text-cyan-400",
      });

      writeContract({
        address: MARKETPLACE_V3_CONTRACT as `0x${string}`,
        abi: MARKETPLACE_V3_ABI,
        functionName: 'completePurchase',
        args: [BigInt(tokenId)],
        value: priceWei,
        gas: BigInt(500000),
        gasPrice: BigInt(10000000000),
      });

      return true;
    } catch {
      toast({ title: "Error", description: "Failed to complete purchase", variant: "destructive" });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, writeContract, toast]);

  const cancelOffer = useCallback(async (offerId: string, invalidateOnChain: boolean = false): Promise<boolean> => {
    try {
      removeOffer(offerId);
      loadOffers();

      if (invalidateOnChain) {
        writeContract({
          address: MARKETPLACE_V3_CONTRACT as `0x${string}`,
          abi: MARKETPLACE_V3_ABI,
          functionName: 'cancelAllOffers',
          args: [],
          gas: BigInt(100000),
          gasPrice: BigInt(10000000000),
        });
      }

      toast({
        title: "Offer Cancelled",
        description: "Your offer has been removed",
        className: "bg-black border-cyan-500 text-cyan-400",
      });

      return true;
    } catch {
      return false;
    }
  }, [writeContract, toast, loadOffers]);

  const getOffersForToken = useCallback((tokenId: number): OffchainOffer[] => {
    return offersForToken.get(tokenId) || [];
  }, [offersForToken]);

  const fetchPendingSale = useCallback(async (tokenId: number): Promise<PendingSale | null> => {
    try {
      const { ethers } = await import('ethers');
      const provider = new ethers.JsonRpcProvider('https://mainnet.basedaibridge.com/rpc/');
      const contract = new ethers.Contract(MARKETPLACE_V3_CONTRACT, MARKETPLACE_V3_ABI, provider);
      const result = await contract.getPendingSale(tokenId);
      
      if (result.active) {
        return {
          tokenId,
          seller: result.seller,
          buyer: result.buyer,
          price: formatEther(result.price),
          priceWei: result.price,
          acceptedAt: Number(result.acceptedAt),
          deadline: Number(result.deadline),
          active: result.active,
        };
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (isSuccess && txHash) {
      toast({
        title: "Transaction Confirmed!",
        description: "The transaction was successful",
        className: "bg-black border-green-500 text-green-400",
      });
      loadOffers();
      fetchNonce();
    }
  }, [isSuccess, txHash, toast, loadOffers, fetchNonce]);

  return {
    isLoading: isLoading || isPending || isConfirming,
    isPending,
    isConfirming,
    isSuccess,
    txHash,
    myOffers,
    userNonce,
    pendingSales,
    
    makeOffer,
    acceptOffer,
    completePurchase,
    cancelOffer,
    getOffersForToken,
    fetchPendingSale,
    
    refresh: loadOffers,
    reset,
  };
}

export default useOffersV3;
