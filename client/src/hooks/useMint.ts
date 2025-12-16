import { useState, useCallback, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance, usePublicClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { NFT_CONTRACT, CHAIN_ID } from '@/lib/constants';
import { useContractData } from './useContractData';
import { parseContractError, isUserRejection } from '@/lib/errorParser';

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
      console.log('🔵 [Mint] Waiting for wallet approval...');
      setStatus('Waiting for wallet approval...');
      setError(null);
    }
  }, [isPending]);

  useEffect(() => {
    if (hash) {
      console.log('🟢 [Mint] Transaction submitted:', hash);
      setStatus('Transaction submitted! Waiting for confirmation...');
    }
  }, [hash]);

  useEffect(() => {
    if (isConfirming && hash) {
      console.log('🟡 [Mint] Confirming transaction...');
      setStatus('Confirming on blockchain...');
    }
  }, [isConfirming, hash]);

  useEffect(() => {
    if (isSuccess) {
      console.log('✅ [Mint] Transaction confirmed successfully!');
      setStatus('Mint successful!');
      setIsLoading(false);
      setError(null);
    }
  }, [isSuccess]);

  useEffect(() => {
    if (writeError) {
      console.error('❌ [Mint] Write error:', writeError);
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
      console.error('❌ [Mint] Confirmation error:', confirmationError);
      const parsedError = confirmationError 
        ? parseContractError(confirmationError)
        : 'Transaction may have failed. Check your wallet.';
      setError(parsedError);
      setIsLoading(false);
      setStatus('idle');
    }
  }, [isConfirmError, confirmationError]);

  // Handle visibility change - check transaction when user comes back to app
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && hash && isLoading && !isSuccess) {
        console.log('🔄 [Mint] App became visible, checking transaction status...');
        if (publicClient) {
          try {
            const receipt = await publicClient.getTransactionReceipt({ hash });
            if (receipt) {
              console.log('✅ [Mint] Transaction confirmed while away!', receipt);
              if (receipt.status === 'success') {
                setStatus('Mint successful!');
                setIsLoading(false);
              }
            }
          } catch (e) {
            console.log('🔵 [Mint] Transaction still pending...');
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hash, isLoading, isSuccess, publicClient]);

  const mint = useCallback(async (quantity: number = 1) => {
    console.log('🚀 [Mint] MINT FUNCTION CALLED - Qty:', quantity, 'Address:', address);
    
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
      const valueInWei = parseEther(totalPrice.toString());
      
      console.log('📝 [Mint] Price:', totalPrice, 'Gas: 500k, GasPrice: 5 gwei');

      writeContract({
        address: NFT_CONTRACT as `0x${string}`,
        abi: NFT_ABI,
        functionName: 'mint',
        args: [BigInt(quantity)],
        value: valueInWei,
        gas: BigInt(500000),
        gasPrice: BigInt(5000000000),
      });

    } catch (e: any) {
      console.error('❌ [Mint] Error:', e);
      setError(parseContractError(e));
      setIsLoading(false);
      setStatus('idle');
    }
  }, [isConnected, address, writeContract, canMint, isPaused, isSoldOut, publicMintEnabled, canAfford]);

  const checkTransaction = useCallback(async () => {
    if (!hash || !publicClient) return null;
    try {
      return await publicClient.getTransactionReceipt({ hash });
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
    isError: !!error || isConfirmError,
    error,
    txHash: hash,
  };

  return {
    mint, reset: resetMint, checkTransaction, state, status,
    isMinting: isPending || isConfirming,
    isLoading: isLoading || isPending || isConfirming,
    isPending, isConfirming, isSuccess, error, txHash: hash,
    totalMinted, maxSupply, mintPrice, remainingSupply,
    publicMintEnabled, isPaused, isSoldOut, canMint,
    balance: balanceData ? formatEther(balanceData.value) : null,
    balanceFormatted: balanceData ? Number(formatEther(balanceData.value)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0',
    canAfford, maxAffordable: maxAffordable(),
  };
}

export default useMint;
