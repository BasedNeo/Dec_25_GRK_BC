/**
 * useMint Hook
 * 
 * This hook handles minting NFTs from the BasedGuardians contract.
 * It uses wagmi's useWriteContract to send transactions.
 * 
 * IMPORTANT: The mint function requires payment in $BASED (native token).
 * Price: 69,420 $BASED per NFT
 */

import { useWriteContract, useWaitForTransactionReceipt, useAccount, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { NFT_CONTRACT, CHAIN_ID } from '@/lib/constants';

export const MINT_PRICE_BASED = 69420;

const MINT_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'quantity', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'publicMintEnabled',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'paused',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'totalMinted',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'MAX_SUPPLY',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export interface MintState {
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  txHash: `0x${string}` | undefined;
}

export interface UseMintReturn {
  mint: (quantity: number) => Promise<void>;
  state: MintState;
  reset: () => void;
  balance: string | null;
  canAfford: (quantity: number) => boolean;
  maxAffordable: number;
}

export function useMint(): UseMintReturn {
  const { toast } = useToast();
  const { address, isConnected, chain } = useAccount();
  
  const { data: balanceData } = useBalance({
    address: address,
    chainId: CHAIN_ID,
  });

  const [state, setState] = useState<MintState>({
    isPending: false,
    isConfirming: false,
    isSuccess: false,
    isError: false,
    error: null,
    txHash: undefined,
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

  useEffect(() => {
    setState(prev => ({
      ...prev,
      isPending: isWritePending,
      isConfirming: isConfirming,
      isSuccess: isConfirmed,
      txHash: txHash,
    }));

    if (isConfirmed && txHash) {
      toast({
        title: "Mint Successful!",
        description: "Your Based Guardian has been minted! Check your wallet.",
        className: "bg-black border-green-500 text-green-500 font-orbitron",
      });
    }
  }, [isWritePending, isConfirming, isConfirmed, txHash, toast]);

  useEffect(() => {
    if (isWriteError || isReceiptError) {
      const errorMessage = writeError?.message || receiptError?.message || 'Transaction failed';
      
      let friendlyError = errorMessage;
      if (errorMessage.includes('insufficient funds')) {
        friendlyError = 'Insufficient $BASED balance for this transaction';
      } else if (errorMessage.includes('user rejected')) {
        friendlyError = 'Transaction was cancelled';
      } else if (errorMessage.includes('Public mint not enabled')) {
        friendlyError = 'Public minting is not currently enabled';
      } else if (errorMessage.includes('Exceeds max supply')) {
        friendlyError = 'Not enough NFTs remaining';
      } else if (errorMessage.includes('Incorrect payment')) {
        friendlyError = 'Incorrect payment amount';
      }

      setState(prev => ({
        ...prev,
        isError: true,
        error: friendlyError,
      }));

      toast({
        title: "Mint Failed",
        description: friendlyError,
        variant: "destructive",
      });
    }
  }, [isWriteError, isReceiptError, writeError, receiptError, toast]);

  const canAfford = (quantity: number): boolean => {
    if (!balanceData) return false;
    const totalCost = BigInt(MINT_PRICE_BASED) * BigInt(quantity) * BigInt(10 ** 18);
    return balanceData.value >= totalCost;
  };

  const maxAffordable = (): number => {
    if (!balanceData) return 0;
    const balanceInBased = Number(formatEther(balanceData.value));
    return Math.floor(balanceInBased / MINT_PRICE_BASED);
  };

  const mint = async (quantity: number): Promise<void> => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (chain?.id !== CHAIN_ID) {
      toast({
        title: "Wrong Network",
        description: "Please switch to BasedAI network (Chain ID: 32323)",
        variant: "destructive",
      });
      return;
    }

    if (quantity < 1 || quantity > 10) {
      toast({
        title: "Invalid Quantity",
        description: "You can mint between 1 and 10 NFTs at a time",
        variant: "destructive",
      });
      return;
    }

    if (!canAfford(quantity)) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${(MINT_PRICE_BASED * quantity).toLocaleString()} $BASED to mint ${quantity} NFT(s)`,
        variant: "destructive",
      });
      return;
    }

    const totalCostWei = parseEther(String(MINT_PRICE_BASED * quantity));

    toast({
      title: "Confirm Transaction",
      description: "Please confirm the transaction in your wallet...",
      className: "bg-black border-cyan-500 text-cyan-500 font-orbitron",
    });

    try {
      writeContract({
        address: NFT_CONTRACT as `0x${string}`,
        abi: MINT_ABI,
        functionName: 'mint',
        args: [BigInt(quantity)],
        value: totalCostWei,
        chainId: CHAIN_ID,
      });
    } catch (err: any) {
      console.error('[useMint] Error:', err);
      setState(prev => ({
        ...prev,
        isError: true,
        error: err.message || 'Failed to submit transaction',
      }));
    }
  };

  const reset = () => {
    resetWrite();
    setState({
      isPending: false,
      isConfirming: false,
      isSuccess: false,
      isError: false,
      error: null,
      txHash: undefined,
    });
  };

  return {
    mint,
    state,
    reset,
    balance: balanceData ? formatEther(balanceData.value) : null,
    canAfford,
    maxAffordable: maxAffordable(),
  };
}
