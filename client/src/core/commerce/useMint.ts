import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance, usePublicClient } from 'wagmi';
import { formatEther } from 'viem';
import { NFT_CONTRACT, CHAIN_ID } from '@/lib/constants';
import { useContractData } from '@/hooks/useContractData';
import { parseContractError, isUserRejection } from '@/lib/errorParser';
import { SafeMath } from '@/lib/safeMath';
import { SafeTransaction } from '@/lib/safeTransaction';
import { FinancialValidator } from '@/lib/financialValidator';
import { requestDedup } from '@/lib/requestDeduplicator';
import { asyncMutex } from '@/lib/asyncMutex';
import { analytics } from '@/lib/analytics';
import { useFeatureFlags } from '@/lib/featureFlags';

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
  const { flags } = useFeatureFlags();

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
    totalMinted, maxSupply, mintPrice, mintPriceWei,
    publicMintEnabled, isPaused, isSoldOut, canMint, remainingSupply,
  } = useContractData();

  const { data: balanceData } = useBalance({
    address,
    chainId: CHAIN_ID,
  });

  const canAfford = useCallback((qty: number) => {
    if (!balanceData || !mintPriceWei) return false;
    const balanceWei = balanceData.value;
    const cost = SafeMath.mul(mintPriceWei, BigInt(qty));
    return SafeMath.gte(balanceWei, cost);
  }, [balanceData, mintPriceWei]);

  const maxAffordable = useMemo(() => {
    if (!balanceData || !mintPriceWei || mintPriceWei === BigInt(0)) return 0;
    const balanceWei = balanceData.value;
    const maxTokens = SafeMath.div(balanceWei, mintPriceWei);
    return Math.min(Number(maxTokens), remainingSupply, 10);
  }, [balanceData, mintPriceWei, remainingSupply]);

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
    if (!flags.mintingEnabled) {
      setError('Minting is currently disabled');
      return;
    }

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

    analytics.mintStarted(quantity);

    try {
      setIsLoading(true);
      setError(null);
      setStatus('Preparing transaction...');

      const valueInWei = SafeMath.mul(mintPriceWei, BigInt(quantity));

      if (!SafeMath.validate(valueInWei).valid) {
        throw new Error('Invalid mint amount');
      }

      const validation = FinancialValidator.preTransactionCheck(
        'mint',
        valueInWei,
        balanceData?.value,
        quantity
      );

      if (!validation.valid) {
        console.error('[MINT] Validation failed:', validation.errors);
        throw new Error(`Mint validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('[MINT] Warnings:', validation.warnings);
      }

      const preFlightResult = await SafeTransaction.preFlightCheck(
        {
          to: NFT_CONTRACT,
          data: '0x',
          value: valueInWei,
          from: address,
        },
        valueInWei
      );

      if (!preFlightResult.canProceed) {
        throw new Error(preFlightResult.error || 'Pre-flight check failed');
      }

      setStatus('Waiting for wallet approval...');

      const totalCost = Number(formatEther(valueInWei));
      
      writeContract({
        address: NFT_CONTRACT as `0x${string}`,
        abi: NFT_ABI,
        functionName: 'mint',
        args: [BigInt(quantity)],
        value: valueInWei,
        gas: preFlightResult.gasEstimate || BigInt(8000000),
        gasPrice: BigInt(10000000000),
      });

    } catch (e: unknown) {
      const parsedError = parseContractError(e);
      analytics.mintFailed(quantity, parsedError);
      setError(parsedError);
      setIsLoading(false);
      setStatus('idle');
    }
  }, [flags.mintingEnabled, isConnected, address, writeContract, canMint, isPaused, isSoldOut, publicMintEnabled, canAfford, mintPriceWei]);

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
    maxAffordable,
  };
}

export default useMint;
