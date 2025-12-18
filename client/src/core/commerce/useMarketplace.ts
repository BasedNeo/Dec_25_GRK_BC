/**
 * useMarketplace Hook
 * 
 * This hook handles all marketplace interactions:
 * - Listing NFTs for sale
 * - Buying listed NFTs
 * - Making and accepting offers
 * - Approving the marketplace to transfer NFTs
 * 
 * Contract V2: 0x2836f07Ed31a6DEc09E0d62Fb15D7c6c6Ddb139c (OpenSea-style - NFT stays in wallet!)
 * Network: BasedAI (Chain ID: 32323)
 */

import { useWriteContract, useReadContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useInterval } from '@/hooks/useInterval';
import { NFT_CONTRACT, CHAIN_ID, MARKETPLACE_CONTRACT, GAS_SETTINGS } from '@/lib/constants';
import { useTransactionContext } from '@/context/TransactionContext';
import { parseContractError } from '@/lib/errorParser';
import { SafeTransaction } from '@/lib/safeTransaction';
import { SafeMath } from '@/lib/safeMath';

// Marketplace ABI - all the functions we need
const MARKETPLACE_ABI = [
  {
    name: 'getListing',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'seller', type: 'address' },
      { name: 'price', type: 'uint256' },
      { name: 'listedAt', type: 'uint256' },
      { name: 'active', type: 'bool' }
    ],
  },
  {
    name: 'getOffer',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'offerer', type: 'address' }
    ],
    outputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'expiresAt', type: 'uint256' },
      { name: 'active', type: 'bool' }
    ],
  },
  {
    name: 'getActiveListings',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'getActiveListingCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isListingValid',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'platformFeeBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'listNFT',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'price', type: 'uint256' }
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
    name: 'updatePrice',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'newPrice', type: 'uint256' }
    ],
    outputs: [],
  },
  {
    name: 'buyNFT',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'makeOffer',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'expirationDays', type: 'uint256' }
    ],
    outputs: [],
  },
  {
    name: 'cancelOffer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'acceptOffer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'offerer', type: 'address' }
    ],
    outputs: [],
  },
] as const;

const NFT_ABI = [
  {
    name: 'isApprovedForAll',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'operator', type: 'address' }
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'setApprovalForAll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' }
    ],
    outputs: [],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

export interface Listing {
  tokenId: number;
  seller: string;
  price: string;
  priceWei: bigint;
  listedAt: number;
  active: boolean;
}

export interface Offer {
  tokenId: number;
  offerer: string;
  amount: string;
  amountWei: bigint;
  expiresAt: number;
  active: boolean;
}

export interface MarketplaceState {
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  txHash: `0x${string}` | undefined;
  action: 'idle' | 'approve' | 'list' | 'delist' | 'buy' | 'offer' | 'acceptOffer' | 'cancelOffer';
}

export function useMarketplace() {
  const { toast } = useToast();
  const { address, isConnected, chain } = useAccount();
  const { showTransaction, showError } = useTransactionContext();
  const lastActionRef = useRef<{ action: string; description: string; retryFn?: () => void }>({ action: 'idle', description: '' });

  const checkNetwork = (): boolean => {
    if (!isConnected) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet first", variant: "destructive" });
      return false;
    }
    if (chain?.id !== CHAIN_ID) {
      toast({ title: "Wrong Network", description: "Please switch to BasedAI network (Chain ID: 32323)", variant: "destructive" });
      return false;
    }
    return true;
  };
  
  const [state, setState] = useState<MarketplaceState>({
    isPending: false,
    isConfirming: false,
    isSuccess: false,
    isError: false,
    error: null,
    txHash: undefined,
    action: 'idle',
  });

  const { 
    writeContract, 
    data: txHash,
    isPending: isWritePending,
    isError: isWriteError,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    isError: isReceiptError,
    error: receiptError
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: NFT_CONTRACT as `0x${string}`,
    abi: NFT_ABI,
    functionName: 'isApprovedForAll',
    args: address ? [address, MARKETPLACE_CONTRACT as `0x${string}`] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  // Refetch approval after approval transaction confirms
  useEffect(() => {
    if (state.action === 'approve' && isConfirmed) {
      // Refetch multiple times to ensure we get the updated state
      refetchApproval();
      setTimeout(() => refetchApproval(), 1000);
      setTimeout(() => refetchApproval(), 3000);
    }
  }, [state.action, isConfirmed, refetchApproval]);

  const { data: listingCount, refetch: refetchListingCount } = useReadContract({
    address: MARKETPLACE_CONTRACT as `0x${string}`,
    abi: MARKETPLACE_ABI,
    functionName: 'getActiveListingCount',
    chainId: CHAIN_ID,
    query: { refetchInterval: 15000 },
  });

  const { data: activeListingIds, refetch: refetchListings } = useReadContract({
    address: MARKETPLACE_CONTRACT as `0x${string}`,
    abi: MARKETPLACE_ABI,
    functionName: 'getActiveListings',
    chainId: CHAIN_ID,
    query: { refetchInterval: 15000 },
  });

  useEffect(() => {
    const prevTxHash = state.txHash;
    setState(prev => ({
      ...prev,
      isPending: isWritePending,
      isConfirming: isConfirming,
      isSuccess: isConfirmed,
      txHash: txHash,
    }));

    if (txHash && !prevTxHash && lastActionRef.current.description) {
      const txType = state.action === 'buy' ? 'buy' : state.action === 'offer' ? 'offer' : state.action === 'approve' ? 'approve' : 'list';
      showTransaction(txHash, txType, lastActionRef.current.description, lastActionRef.current.retryFn);
    }

    if (isConfirmed && txHash) {
      refetchApproval();
      refetchListings();
      refetchListingCount();
    }
  }, [isWritePending, isConfirming, isConfirmed, txHash, state.action]);

  useEffect(() => {
    if (isWriteError || isReceiptError) {
      const friendlyError = parseContractError(writeError || receiptError);

      setState(prev => ({
        ...prev,
        isError: true,
        error: friendlyError,
      }));

      if (!txHash && lastActionRef.current.description) {
        const txType = state.action === 'buy' ? 'buy' : state.action === 'offer' ? 'offer' : state.action === 'approve' ? 'approve' : 'list';
        showError(friendlyError, txType, lastActionRef.current.description, lastActionRef.current.retryFn);
      }
    }
  }, [isWriteError, isReceiptError, writeError, receiptError]);

  const approveMarketplace = useCallback(async () => {
    if (!checkNetwork()) return;

    setState(prev => ({ ...prev, action: 'approve' }));
    lastActionRef.current = { action: 'approve', description: 'Approving marketplace for NFT transfers', retryFn: () => approveMarketplace() };
    
    toast({
      title: "Approve Marketplace",
      description: "Please confirm to allow the marketplace to transfer your NFTs...",
      className: "bg-black border-cyan-500 text-cyan-500 font-orbitron",
    });

    writeContract({
      address: NFT_CONTRACT as `0x${string}`,
      abi: NFT_ABI,
      functionName: 'setApprovalForAll',
      args: [MARKETPLACE_CONTRACT as `0x${string}`, true],
      chainId: CHAIN_ID,
      gas: GAS_SETTINGS.APPROVE,
    });
  }, [checkNetwork, toast, writeContract]);

  const listNFT = useCallback(async (tokenId: number, priceInBased: string) => {
    if (!checkNetwork() || !address) return;

    const priceWei = SafeMath.parseInput(priceInBased);
    if (!priceWei || !SafeMath.validate(priceWei).valid || priceWei < SafeMath.toWei('1')) {
      toast({ 
        title: "Price Too Low", 
        description: "Minimum listing price is 1 $BASED", 
        variant: "destructive" 
      });
      return;
    }

    // Pre-flight check: Verify NFT is not already listed
    try {
      const response = await fetch(`https://mainnet.basedaibridge.com/rpc/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_call',
          params: [{
            to: MARKETPLACE_CONTRACT,
            data: `0x107a274a${BigInt(tokenId).toString(16).padStart(64, '0')}` // getListing(uint256)
          }, 'latest']
        })
      });
      const result = await response.json();
      if (result.result && result.result !== '0x') {
        // Parse the active flag (4th return value, offset 96 bytes = 192 hex chars + 2 for 0x prefix)
        const activeHex = result.result.slice(194, 258);
        const isActive = parseInt(activeHex, 16) === 1;
        if (isActive) {
          toast({ 
            title: "Already Listed", 
            description: "This NFT is already listed for sale. Remove the existing listing first.", 
            variant: "destructive" 
          });
          return;
        }
      }
    } catch {
      // If check fails, continue anyway - the contract will revert if needed
    }

    // Refetch approval status before listing to ensure we have latest
    // Try multiple times with small delays to ensure blockchain state has propagated
    let approvalConfirmed = isApproved;
    
    for (let i = 0; i < 3 && !approvalConfirmed; i++) {
      const { data: currentApproval } = await refetchApproval();
      approvalConfirmed = currentApproval === true;
      if (!approvalConfirmed && i < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
      }
    }

    if (!approvalConfirmed) {
      toast({ 
        title: "Approval Required", 
        description: "Please approve the marketplace first. Click 'Approve Marketplace', confirm in your wallet, and wait for the transaction to complete before listing.", 
        variant: "destructive" 
      });
      return;
    }

    setState(prev => ({ ...prev, action: 'list' }));
    const priceFormatted = SafeMath.format(priceWei);
    lastActionRef.current = { action: 'list', description: `Listing Guardian #${tokenId} for ${priceFormatted} $BASED`, retryFn: () => listNFT(tokenId, priceInBased) };

    toast({
      title: "List NFT",
      description: `Listing Guardian #${tokenId} for ${priceFormatted} $BASED...`,
      className: "bg-black border-cyan-500 text-cyan-500 font-orbitron",
    });

    writeContract({
      address: MARKETPLACE_CONTRACT as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'listNFT',
      args: [BigInt(tokenId), priceWei],
      chainId: CHAIN_ID,
      gas: GAS_SETTINGS.LIST,
    });
  }, [checkNetwork, isApproved, toast, writeContract, refetchApproval, address]);

  const delistNFT = useCallback(async (tokenId: number) => {
    if (!checkNetwork()) return;

    setState(prev => ({ ...prev, action: 'delist' }));
    lastActionRef.current = { action: 'delist', description: `Delisting Guardian #${tokenId} from marketplace`, retryFn: () => delistNFT(tokenId) };

    toast({
      title: "Delist NFT",
      description: `Removing Guardian #${tokenId} from sale...`,
      className: "bg-black border-cyan-500 text-cyan-500 font-orbitron",
    });

    writeContract({
      address: MARKETPLACE_CONTRACT as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'delistNFT',
      args: [BigInt(tokenId)],
      chainId: CHAIN_ID,
      gas: GAS_SETTINGS.DELIST,
    });
  }, [checkNetwork, toast, writeContract]);

  const buyNFT = useCallback(async (tokenId: number, priceWei: bigint) => {
    if (!checkNetwork() || !address) return;

    try {
      toast({
        title: "Preparing Transaction",
        description: "Verifying balance and estimating gas...",
        className: "bg-black border-cyan-500 text-cyan-500",
      });

      const { ethers } = await import('ethers');
      const iface = new ethers.Interface([
        'function buyNFT(uint256 tokenId) external payable'
      ]);
      const calldata = iface.encodeFunctionData('buyNFT', [BigInt(tokenId)]);

      const estimatedGas = await SafeTransaction.estimateGas({
        from: address,
        to: MARKETPLACE_CONTRACT,
        value: priceWei,
        data: calldata,
      });

      const hasBalance = await SafeTransaction.verifyBalanceWithGas(address, priceWei, estimatedGas);
      if (!hasBalance) {
        toast({ 
          title: "Insufficient Balance", 
          description: "You don't have enough $BASED for this purchase (including gas)", 
          variant: "destructive" 
        });
        return;
      }

    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Transaction would likely fail. Please try again.";
      toast({
        title: "Pre-flight Check Failed",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    setState(prev => ({ ...prev, action: 'buy' }));
    const priceFormatted = formatEther(priceWei);
    lastActionRef.current = { action: 'buy', description: `Buying Guardian #${tokenId} for ${Number(priceFormatted).toLocaleString()} $BASED`, retryFn: () => buyNFT(tokenId, priceWei) };

    toast({
      title: "Buy NFT",
      description: `Purchasing Guardian #${tokenId} for ${Number(priceFormatted).toLocaleString()} $BASED...`,
      className: "bg-black border-cyan-500 text-cyan-500 font-orbitron",
    });

    writeContract({
      address: MARKETPLACE_CONTRACT as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'buyNFT',
      args: [BigInt(tokenId)],
      value: priceWei,
      chainId: CHAIN_ID,
      gas: GAS_SETTINGS.BUY,
    });
  }, [address, checkNetwork, toast, writeContract]);

  const makeOffer = useCallback(async (tokenId: number, offerAmountBased: number, expirationDays: number = 7) => {
    if (!checkNetwork()) return;

    setState(prev => ({ ...prev, action: 'offer' }));
    lastActionRef.current = { action: 'offer', description: `Making offer of ${offerAmountBased.toLocaleString()} $BASED for Guardian #${tokenId}`, retryFn: () => makeOffer(tokenId, offerAmountBased, expirationDays) };

    toast({
      title: "Make Offer",
      description: `Offering ${offerAmountBased.toLocaleString()} $BASED for Guardian #${tokenId}...`,
      className: "bg-black border-cyan-500 text-cyan-500 font-orbitron",
    });

    const offerWei = parseEther(String(offerAmountBased));

    writeContract({
      address: MARKETPLACE_CONTRACT as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'makeOffer',
      args: [BigInt(tokenId), BigInt(expirationDays)],
      value: offerWei,
      chainId: CHAIN_ID,
      gas: GAS_SETTINGS.OFFER,
    });
  }, [checkNetwork, toast, writeContract]);

  const cancelOffer = useCallback(async (tokenId: number) => {
    if (!checkNetwork()) return;

    setState(prev => ({ ...prev, action: 'cancelOffer' }));
    lastActionRef.current = { action: 'cancelOffer', description: `Cancelling offer for Guardian #${tokenId}`, retryFn: () => cancelOffer(tokenId) };

    writeContract({
      address: MARKETPLACE_CONTRACT as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'cancelOffer',
      args: [BigInt(tokenId)],
      chainId: CHAIN_ID,
      gas: GAS_SETTINGS.APPROVE,
    });
  }, [checkNetwork, writeContract]);

  const acceptOffer = useCallback(async (tokenId: number, offererAddress: string) => {
    if (!checkNetwork()) return;

    setState(prev => ({ ...prev, action: 'acceptOffer' }));
    lastActionRef.current = { action: 'acceptOffer', description: `Accepting offer for Guardian #${tokenId}`, retryFn: () => acceptOffer(tokenId, offererAddress) };

    writeContract({
      address: MARKETPLACE_CONTRACT as `0x${string}`,
      abi: MARKETPLACE_ABI,
      functionName: 'acceptOffer',
      args: [BigInt(tokenId), offererAddress as `0x${string}`],
      chainId: CHAIN_ID,
      gas: GAS_SETTINGS.BUY,
    });
  }, [checkNetwork, writeContract]);

  const reset = () => {
    resetWrite();
    setState({
      isPending: false,
      isConfirming: false,
      isSuccess: false,
      isError: false,
      error: null,
      txHash: undefined,
      action: 'idle',
    });
  };

  const refresh = () => {
    refetchApproval();
    refetchListings();
    refetchListingCount();
  };

  return {
    state,
    isApproved: isApproved ?? false,
    activeListingIds: activeListingIds as bigint[] | undefined,
    listingCount: listingCount ? Number(listingCount) : 0,
    approveMarketplace,
    listNFT,
    delistNFT,
    buyNFT,
    makeOffer,
    cancelOffer,
    acceptOffer,
    reset,
    refresh,
    marketplaceAddress: MARKETPLACE_CONTRACT,
    nftAddress: NFT_CONTRACT,
  };
}

export function useListing(tokenId: number | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: MARKETPLACE_CONTRACT as `0x${string}`,
    abi: MARKETPLACE_ABI,
    functionName: 'getListing',
    args: tokenId !== undefined ? [BigInt(tokenId)] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: tokenId !== undefined, refetchInterval: 15000 },
  });

  const listing: Listing | null = data ? {
    tokenId: tokenId!,
    seller: data[0] as string,
    price: formatEther(data[1] as bigint),
    priceWei: data[1] as bigint,
    listedAt: Number(data[2]),
    active: data[3] as boolean,
  } : null;

  return { listing, isLoading, refetch };
}

export function useOffer(tokenId: number | undefined, offererAddress: string | undefined) {
  const { data, isLoading, refetch } = useReadContract({
    address: MARKETPLACE_CONTRACT as `0x${string}`,
    abi: MARKETPLACE_ABI,
    functionName: 'getOffer',
    args: tokenId !== undefined && offererAddress ? [BigInt(tokenId), offererAddress as `0x${string}`] : undefined,
    chainId: CHAIN_ID,
    query: { enabled: tokenId !== undefined && !!offererAddress, refetchInterval: 15000 },
  });

  const offer: Offer | null = data ? {
    tokenId: tokenId!,
    offerer: offererAddress!,
    amount: formatEther(data[0] as bigint),
    amountWei: data[0] as bigint,
    expiresAt: Number(data[1]),
    active: data[2] as boolean,
  } : null;

  return { offer, isLoading, refetch };
}

export function useFloorPrice() {
  const [floorPrice, setFloorPrice] = useState<{ price: number; tokenId: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFloorPrice = useCallback(async () => {
    try {
      setIsLoading(true);
      const { ethers } = await import('ethers');
      const provider = new ethers.JsonRpcProvider('https://mainnet.basedaibridge.com/rpc/');
      
      const marketplaceContract = new ethers.Contract(
        MARKETPLACE_CONTRACT,
        [
          'function getActiveListings() view returns (uint256[])',
          'function getListing(uint256 tokenId) view returns (address seller, uint256 price, uint256 listedAt, bool active)'
        ],
        provider
      );

      const activeListings = await marketplaceContract.getActiveListings();
      
      if (!activeListings || activeListings.length === 0) {
        setFloorPrice(null);
        setIsLoading(false);
        return;
      }

      let lowestPrice: bigint | null = null;
      let lowestTokenId: number | null = null;

      for (const tokenId of activeListings) {
        try {
          const listing = await marketplaceContract.getListing(tokenId);
          const price = listing[1] as bigint;
          const active = listing[3] as boolean;
          
          if (active && price > BigInt(0)) {
            if (lowestPrice === null || price < lowestPrice) {
              lowestPrice = price;
              lowestTokenId = Number(tokenId);
            }
          }
        } catch {
          // Skip failed listings
        }
      }

      if (lowestPrice !== null && lowestTokenId !== null) {
        setFloorPrice({
          price: parseFloat(ethers.formatEther(lowestPrice)),
          tokenId: lowestTokenId
        });
      } else {
        setFloorPrice(null);
      }
    } catch (error) {
      console.error('Error fetching floor price:', error);
      setFloorPrice(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFloorPrice();
  }, [fetchFloorPrice]);

  useInterval(fetchFloorPrice, 30000);

  return { floorPrice, isLoading };
}
