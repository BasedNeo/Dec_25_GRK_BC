import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [localHash, setLocalHash] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
    hash: hash || (localHash as `0x${string}` | undefined),
    timeout: 180000,
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

  const pollTransaction = useCallback(async (txHash: string) => {
    if (!publicClient) return;
    
    console.log('🔄 [Mint] Polling for transaction:', txHash);
    
    try {
      const receipt = await publicClient.getTransactionReceipt({ 
        hash: txHash as `0x${string}` 
      });
      
      if (receipt) {
        console.log('✅ [Mint] Receipt found via polling!', receipt);
        if (receipt.status === 'success') {
          setStatus('Mint successful!');
          setError(null);
          setIsLoading(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        } else {
          setStatus('idle');
          setError('Transaction failed on chain');
          setIsLoading(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      }
    } catch (e) {
      console.log('⏳ [Mint] Transaction not yet mined, still polling...');
    }
  }, [publicClient]);

  useEffect(() => {
    const txHash = hash || localHash;
    if (txHash && isLoading && !isSuccess) {
      console.log('🔄 [Mint] Starting polling for:', txHash);
      
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      
      pollIntervalRef.current = setInterval(() => {
        pollTransaction(txHash);
      }, 3000);
      
      pollTransaction(txHash);
      
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };
    }
  }, [hash, localHash, isLoading, isSuccess, pollTransaction]);

  useEffect(() => {
    if (isPending) {
      console.log('🔵 [Mint] isPending = true, waiting for wallet...');
      setStatus('Approve in your wallet...');
    }
  }, [isPending]);

  useEffect(() => {
    if (hash) {
      console.log('🟢 [Mint] Hash received from wagmi:', hash);
      setLocalHash(hash);
      setStatus('Transaction submitted! Confirming...');
    }
  }, [hash]);

  useEffect(() => {
    if (isConfirming) {
      console.log('🟡 [Mint] isConfirming = true');
      setStatus('Confirming on blockchain...');
    }
  }, [isConfirming]);

  useEffect(() => {
    if (isSuccess) {
      console.log('✅ [Mint] SUCCESS!');
      setStatus('Mint successful!');
      setIsLoading(false);
      setError(null);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [isSuccess]);

  useEffect(() => {
    if (writeError) {
      console.error('❌ [Mint] writeError:', writeError);
      if (isUserRejection(writeError)) {
        setError('Transaction cancelled');
      } else {
        setError(parseContractError(writeError));
      }
      setIsLoading(false);
      setStatus('idle');
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [writeError]);

  useEffect(() => {
    if (isConfirmError && confirmationError) {
      console.error('❌ [Mint] confirmationError:', confirmationError);
      console.log('⚠️ [Mint] Confirmation error but polling may still succeed');
    }
  }, [isConfirmError, confirmationError]);

  useEffect(() => {
    if (isLoading && (hash || localHash)) {
      const timeout = setTimeout(() => {
        if (isLoading && !isSuccess) {
          console.log('⏰ [Mint] Timeout reached');
          setError('Transaction taking too long. Check your wallet or block explorer.');
          setIsLoading(false);
          setStatus('idle');
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      }, 180000);
      
      return () => clearTimeout(timeout);
    }
  }, [isLoading, hash, localHash, isSuccess]);

  const mint = useCallback(async (quantity: number = 1) => {
    console.log('========================================');
    console.log('🚀 [Mint] MINT CALLED');
    console.log('   Quantity:', quantity);
    console.log('   Address:', address);
    console.log('   Connected:', isConnected);
    console.log('   Contract:', NFT_CONTRACT);
    console.log('========================================');
    
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

    setIsLoading(true);
    setError(null);
    setLocalHash(null);
    setStatus('Opening wallet...');

    try {
      const totalPrice = MINT_PRICE * quantity;
      const valueInWei = parseEther(totalPrice.toString());
      
      console.log('📝 [Mint] Sending transaction:');
      console.log('   Value:', totalPrice, '$BASED');
      console.log('   Gas Limit: 8,000,000 (required for random ID search)');
      console.log('   Gas Price: 10 gwei');

      writeContract({
        address: NFT_CONTRACT as `0x${string}`,
        abi: NFT_ABI,
        functionName: 'mint',
        args: [BigInt(quantity)],
        value: valueInWei,
        gas: BigInt(8000000),        // 8M gas - CRITICAL: random ID search needs this!
        gasPrice: BigInt(10000000000), // 10 gwei
      });

      console.log('📤 [Mint] writeContract called');

    } catch (e: any) {
      console.error('❌ [Mint] Immediate error:', e);
      setError(parseContractError(e));
      setIsLoading(false);
      setStatus('idle');
    }
  }, [isConnected, address, writeContract, canMint, isPaused, isSoldOut, publicMintEnabled, canAfford]);

  const resetMint = useCallback(() => {
    console.log('🔄 [Mint] Resetting');
    setIsLoading(false);
    setError(null);
    setStatus('idle');
    setLocalHash(null);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    reset();
  }, [reset]);

  const combinedLoading = isLoading || isPending || isConfirming;
  const currentHash = hash || localHash;

  const state = {
    isPending,
    isConfirming,
    isSuccess,
    isError: !!error,
    error,
    txHash: currentHash,
  };

  return {
    mint,
    reset: resetMint,
    state,
    status,
    isMinting: combinedLoading,
    isLoading: combinedLoading,
    isPending,
    isConfirming,
    isSuccess,
    error,
    txHash: currentHash,
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
