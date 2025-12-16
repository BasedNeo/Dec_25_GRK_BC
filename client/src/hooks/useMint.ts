import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance, usePublicClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { NFT_CONTRACT, CHAIN_ID } from '@/lib/constants';
import { useContractData } from './useContractData';

const MINT_PRICE = 69420;

const NFT_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'quantity', type: 'uint256' }],
    outputs: [],
  },
] as const;

export function useMint() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('idle');

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();

  const { isLoading: isConfirming, isSuccess, isError: confirmError } = useWaitForTransactionReceipt({
    hash: hash,
    timeout: 60000,
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

  useEffect(() => {
    if (isPending) {
      setStatus('Waiting for wallet approval...');
    }
  }, [isPending]);

  useEffect(() => {
    if (hash) {
      setStatus(`Transaction submitted! Confirming...`);
    }
  }, [hash]);

  useEffect(() => {
    if (isConfirming) {
      setStatus('Confirming on blockchain...');
    }
  }, [isConfirming]);

  useEffect(() => {
    if (isSuccess) {
      setStatus('Mint successful!');
      setIsLoading(false);
    }
  }, [isSuccess]);

  useEffect(() => {
    if (writeError) {
      console.error('Write error:', writeError);
      setError(writeError.message || 'Transaction failed');
      setIsLoading(false);
      setStatus('idle');
    }
  }, [writeError]);

  useEffect(() => {
    if (confirmError) {
      console.error('Confirmation error');
      setError('Transaction may have failed. Check your wallet.');
      setIsLoading(false);
      setStatus('idle');
    }
  }, [confirmError]);

  const mint = useCallback(async (quantity: number = 1) => {
    console.log('🟢 MINT FUNCTION CALLED');
    console.log('   quantity:', quantity);
    console.log('   isConnected:', isConnected);
    console.log('   address:', address);
    
    if (!isConnected || !address) {
      console.log('❌ Not connected or no address - aborting');
      setError('Please connect your wallet');
      return;
    }

    console.log('✅ Validation passed, starting mint...');

    try {
      setIsLoading(true);
      setError(null);
      setStatus('Starting mint...');

      const totalPrice = MINT_PRICE * quantity;

      writeContract({
        address: NFT_CONTRACT as `0x${string}`,
        abi: NFT_ABI,
        functionName: 'mint',
        args: [BigInt(quantity)],
        value: parseEther(totalPrice.toString()),
        gas: BigInt(300000),
        gasPrice: BigInt(1000000000),
      });

    } catch (e: any) {
      console.error('Mint error:', e);
      setError(e?.message || 'Failed to mint');
      setIsLoading(false);
      setStatus('idle');
    }
  }, [isConnected, address, writeContract]);

  const checkTransaction = useCallback(async () => {
    if (!hash || !publicClient) return null;
    
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      return receipt;
    } catch (e) {
      return null;
    }
  }, [hash, publicClient]);

  const resetMint = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setStatus('idle');
    reset();
  }, [reset]);

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
    checkTransaction,
    
    state,
    status,
    isMinting: isPending || isConfirming,
    isLoading: isLoading || isPending || isConfirming,
    isPending,
    isConfirming,
    isSuccess,
    error,
    txHash: hash,
    
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

export default useMint;
