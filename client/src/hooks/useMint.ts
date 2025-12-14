import { useWriteContract, useWaitForTransactionReceipt, useAccount, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CHAIN_ID, BLOCK_EXPLORER } from '@/lib/constants';
import { useContractData } from './useContractData';
import { savePendingTx } from '@/hooks/usePendingTransactions';

const NFT_CONTRACT = "0xaE51dc5fD1499A129f8654963560f9340773ad59";

const MINT_ABI = [
  { name: 'mint', type: 'function', stateMutability: 'payable', inputs: [{ name: 'quantity', type: 'uint256' }], outputs: [] },
] as const;

export function useMint() {
  const { toast } = useToast();
  const { address, isConnected, chain } = useAccount();
  
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

  useEffect(() => {
    setState(prev => ({ ...prev, isPending, isConfirming, isSuccess: isConfirmed, txHash }));
    
    if (isConfirmed && txHash) {
      toast({
        title: "Mint Successful!",
        description: `Your Based Guardian has been minted! View transaction: ${BLOCK_EXPLORER}/tx/${txHash}`,
      });
      refetchContractData();
      refetchBalance();
    }
  }, [isPending, isConfirming, isConfirmed, txHash]);

  useEffect(() => {
    if (isWriteError || isReceiptError) {
      const msg = writeError?.message || receiptError?.message || 'Transaction failed';
      let friendly = msg;
      if (msg.includes('insufficient funds')) friendly = 'Insufficient $BASED balance';
      else if (msg.includes('user rejected')) friendly = 'Transaction cancelled';
      else if (msg.includes('Public mint not enabled')) friendly = 'Public minting is not enabled yet';
      else if (msg.includes('Exceeds max supply')) friendly = 'Not enough NFTs remaining';
      else if (msg.includes('paused')) friendly = 'Minting is currently paused';
      
      setState(prev => ({ ...prev, isError: true, error: friendly }));
      toast({ title: "Mint Failed", description: friendly, variant: "destructive" });
    }
  }, [isWriteError, isReceiptError, writeError, receiptError]);

  useEffect(() => {
    if (txHash && !state.isSuccess && !state.isError) {
      savePendingTx(txHash, 'mint', 'Minting Guardian NFT(s)');
    }
  }, [txHash, state.isSuccess, state.isError]);

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
