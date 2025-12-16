import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { NFT_CONTRACT, CHAIN_ID } from '@/lib/constants';
import { useContractData } from './useContractData';

const MINT_PRICE = 69420; // $BASED per NFT

const NFT_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'quantity', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'totalMinted',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export function useMint() {
  const { address, isConnected } = useAccount();
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: hash,
  });

  const { 
    totalMinted, maxSupply, mintPrice,
    publicMintEnabled, isPaused, isSoldOut, canMint, remainingSupply,
  } = useContractData();

  const { data: balanceData } = useBalance({
    address,
    chainId: CHAIN_ID,
  });

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

  const mint = useCallback(async (quantity: number = 1) => {
    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setError(null);

      const totalPrice = MINT_PRICE * quantity;

      writeContract({
        address: NFT_CONTRACT as `0x${string}`,
        abi: NFT_ABI,
        functionName: 'mint',
        args: [BigInt(quantity)],
        value: parseEther(totalPrice.toString()),
        gas: BigInt(500000), // Explicit gas limit - THIS WAS KEY
      });

    } catch (e: any) {
      console.error('Mint error:', e);
      setError(e?.message || 'Failed to mint');
    }
  }, [isConnected, address, writeContract]);

  // Reset function
  const resetMint = useCallback(() => {
    setError(null);
    reset();
  }, [reset]);

  // State object for backward compatibility
  const state = {
    isPending,
    isConfirming,
    isSuccess,
    isError: !!error,
    error,
    txHash: hash,
  };

  return {
    mint,
    reset: resetMint,
    
    // State
    state,
    isMinting: isPending || isConfirming,
    isLoading: isPending || isConfirming,
    isPending,
    isConfirming,
    isSuccess,
    error,
    txHash: hash,
    
    // Contract data
    totalMinted,
    maxSupply,
    mintPrice,
    remainingSupply,
    publicMintEnabled,
    isPaused,
    isSoldOut,
    canMint,
    
    // Balance
    balance: balanceData ? formatEther(balanceData.value) : null,
    balanceFormatted: balanceData ? Number(formatEther(balanceData.value)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0',
    canAfford,
    maxAffordable: maxAffordable(),
  };
}

export default useMint;
