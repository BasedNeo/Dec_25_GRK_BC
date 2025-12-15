import { useWriteContract, useWaitForTransactionReceipt, useAccount, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CHAIN_ID } from '@/lib/constants';
import { useContractData } from './useContractData';
import { useTransactionContext } from '@/context/TransactionContext';
import { parseContractError } from '@/lib/errorParser';

const NFT_CONTRACT = "0xaE51dc5fD1499A129f8654963560f9340773ad59";

const MINT_ABI = [
  { name: 'mint', type: 'function', stateMutability: 'payable', inputs: [{ name: 'quantity', type: 'uint256' }], outputs: [] },
] as const;

export function useMint() {
  const { toast } = useToast();
  const { address, isConnected, chain } = useAccount();
  const { showTransaction, showError } = useTransactionContext();
  const lastQuantityRef = useRef(1);
  
  const { 
    totalMinted, maxSupply, mintPrice,
    publicMintEnabled, isPaused, isSoldOut, canMint, remainingSupply,
    refetch: refetchContractData
  } = useContractData();
  
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address,
    chainId: CHAIN_ID,
  });

  const [state, setState] = useState({
    isPending: false,
    isConfirming: false,
    isSuccess: false,
    isError: false,
    error: null as string | null,
    txHash: undefined as `0x${string}` | undefined,
  });

  const { writeContract, data: txHash, isPending, isError: isWriteError, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isReceiptError, error: receiptError } = useWaitForTransactionReceipt({ hash: txHash });

  const retryMint = useCallback(() => {
    mint(lastQuantityRef.current);
  }, []);

  useEffect(() => {
    setState(prev => ({ ...prev, isPending, isConfirming, isSuccess: isConfirmed, txHash }));
    
    if (txHash && !state.txHash) {
      showTransaction(txHash, 'mint', `Minting ${lastQuantityRef.current} Guardian NFT${lastQuantityRef.current > 1 ? 's' : ''}`, retryMint);
    }
    
    if (isConfirmed && txHash) {
      refetchContractData();
      refetchBalance();
    }
  }, [isPending, isConfirming, isConfirmed, txHash]);

  useEffect(() => {
    if (isWriteError || isReceiptError) {
      const friendly = parseContractError(writeError || receiptError);
      setState(prev => ({ ...prev, isError: true, error: friendly }));
      if (!txHash) {
        showError(friendly, 'mint', `Minting ${lastQuantityRef.current} Guardian NFT${lastQuantityRef.current > 1 ? 's' : ''}`, retryMint);
      }
    }
  }, [isWriteError, isReceiptError, writeError, receiptError]);

  const canAfford = (qty: number) => {
    if (!balanceData) return false;
    const cost = BigInt(mintPrice) * BigInt(qty) * BigInt(10**18);
    return balanceData.value >= cost;
  };

  const maxAffordable = () => {
    if (!balanceData) return 0;
    const bal = Number(formatEther(balanceData.value));
    return Math.min(Math.floor(bal / mintPrice), remainingSupply, 10);
  };

  const mint = async (quantity: number) => {
    if (!isConnected) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet first", variant: "destructive" });
      return;
    }
    if (chain?.id !== CHAIN_ID) {
      toast({ title: "Wrong Network", description: "Please switch to BasedAI network", variant: "destructive" });
      return;
    }
    if (!publicMintEnabled) {
      toast({ title: "Mint Not Open", description: "Public minting is not enabled yet", variant: "destructive" });
      return;
    }
    if (isPaused) {
      toast({ title: "Paused", description: "Minting is temporarily paused", variant: "destructive" });
      return;
    }
    if (quantity < 1 || quantity > Math.min(10, remainingSupply)) {
      toast({ title: "Invalid Quantity", description: `You can mint 1-${Math.min(10, remainingSupply)} NFTs`, variant: "destructive" });
      return;
    }
    if (!canAfford(quantity)) {
      toast({ title: "Insufficient Balance", description: `Need ${(mintPrice * quantity).toLocaleString()} $BASED`, variant: "destructive" });
      return;
    }

    const totalCost = parseEther(String(mintPrice * quantity));
    lastQuantityRef.current = quantity;
    toast({ title: "Confirm Transaction", description: "Please confirm in your wallet..." });

    try {
      writeContract({
        address: NFT_CONTRACT as `0x${string}`,
        abi: MINT_ABI,
        functionName: 'mint',
        args: [BigInt(quantity)],
        value: totalCost,
        chainId: CHAIN_ID,
      });
    } catch (err: any) {
      setState(prev => ({ ...prev, isError: true, error: err.message }));
    }
  };

  const reset = () => {
    resetWrite();
    setState({ isPending: false, isConfirming: false, isSuccess: false, isError: false, error: null, txHash: undefined });
  };

  return {
    mint,
    reset,
    
    state,
    isMinting: state.isPending || state.isConfirming,
    
    totalMinted,
    maxSupply,
    mintPrice,
    remainingSupply,
    publicMintEnabled,
    isPaused,
    isSoldOut,
    canMint,
    
    balance: balanceData ? formatEther(balanceData.value) : null,
    balanceFormatted: balanceData ? Number(formatEther(balanceData.value)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0',
    canAfford,
    maxAffordable: maxAffordable(),
  };
}
