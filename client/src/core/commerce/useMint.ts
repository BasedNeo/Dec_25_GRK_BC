import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { NFT_CONTRACT, CHAIN_ID } from '@/lib/constants';
import { useContractData } from './useContractData';
import { parseContractError, isUserRejection } from '@/lib/errorParser';
import { SafeMath } from '@/lib/safeMath';

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

  const { 
    writeContract, 
    data: hash, 
    isPending, 
    error: writeError, 
    reset 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess, 
    isError: isConfirmError,
    error: confirmationError 
  } = useWaitForTransactionReceipt({
    hash: hash,
    timeout: 120000,
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
    try {
      const cost = SafeMath.toWei(mintPrice.toString()) * BigInt(qty);
      return SafeMath.gte(balanceData.value, cost);
    } catch {
      return false;
    }
  };

  const maxAffordable = () => {
    if (!balanceData) return 0;
    try {
      const mintPriceWei = SafeMath.toWei(mintPrice.toString());
      const maxQty = Number(balanceData.value / mintPriceWei);
      return Math.min(Math.floor(maxQty), remainingSupply, 10);
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    if (isPending) {
      setStatus('Waiting for wallet approval...');
      setError(null);
    }
  }, [isPending]);

  useEffect(() => {
    if (hash) {
      setStatus('Transaction submitted! Waiting for confirmation...');
    }
  }, [hash]);

  useEffect(() => {
    if (isConfirming && hash) {
      setStatus('Confirming on blockchain...');
    }
  }, [isConfirming, hash]);

  useEffect(() => {
    if (isSuccess) {
      setStatus('Mint successful!');
      setIsLoading(false);
      setError(null);
    }
  }, [isSuccess]);

  useEffect(() => {
    if (writeError) {
      if (isUserRejection(writeError)) {
        setError('Transaction cancelled');
        setStatus('idle');
      } else {
        const parsedError = parseContractError(writeError);
        setError(parsedError);
        setStatus('idle');
      }
      setIsLoading(false);
    }
  }, [writeError]);

  useEffect(() => {
    if (isConfirmError) {
      const parsedError = confirmationError 
        ? parseContractError(confirmationError)
        : 'Transaction may have failed. Check your wallet.';
      setError(parsedError);
      setIsLoading(false);
      setStatus('idle');
    }
  }, [isConfirmError, confirmationError]);

  const mint = useCallback(async (quantity: number = 1) => {
    if (!isConnected || !address) {
      setError('Please connect your wallet');
      return;
    }

    if (!canMint) {
      if (isPaused) setError('Minting is paused');
      else if (isSoldOut) setError('Sold out!');
      else if (!publicMintEnabled) setError('Public mint not enabled');
      return;
    }

    if (!canAfford(quantity)) {
      setError('Insufficient $BASED balance');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setStatus('Preparing transaction...');

      const totalPrice = MINT_PRICE * quantity;
      const valueInWei = SafeMath.toWei(totalPrice.toString());

      const validation = SafeMath.validate(valueInWei);
      if (!validation.valid) {
        setError(validation.error || 'Invalid amount');
        setIsLoading(false);
        return;
      }

      writeContract({
        address: NFT_CONTRACT as `0x${string}`,
        abi: NFT_ABI,
        functionName: 'mint',
        args: [BigInt(quantity)],
        value: valueInWei,
        gas: BigInt(8000000),
        gasPrice: BigInt(10000000000),
      });

    } catch (e: unknown) {
      const parsedError = parseContractError(e);
      setError(parsedError);
      setIsLoading(false);
      setStatus('idle');
    }
  }, [isConnected, address, writeContract, canMint, isPaused, isSoldOut, publicMintEnabled, canAfford]);

  const checkTransaction = useCallback(async () => {
    if (!hash || !publicClient) return null;
    
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      return receipt;
    } catch {
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
    isError: !!error || isConfirmError,
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
