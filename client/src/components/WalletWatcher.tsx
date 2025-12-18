import { useEffect, useRef, useCallback } from 'react';
import { useAccount, useDisconnect, useSwitchChain, useChainId } from 'wagmi';
import { showToast } from "@/lib/customToast";
import { analytics } from '@/lib/analytics';

export function WalletWatcher() {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const isFirstMount = useRef(true);
  const previousAddress = useRef<string | undefined>(undefined);

  const handleSafeDisconnect = useCallback(() => {
    try {
      localStorage.removeItem('connectedWallet');
      localStorage.removeItem('wallet_address');
      
      disconnect();
      
      showToast("Wallet Disconnected", "info");
    } catch (error) {
      console.error("Error during disconnect:", error);
    }
  }, [disconnect]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      previousAddress.current = address;
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) {
      localStorage.setItem('connectedWallet', address);
      localStorage.setItem('wallet_address', address);
      
      if (previousAddress.current && previousAddress.current !== address) {
        showToast(`Account Changed: ${address.slice(0,6)}...${address.slice(-4)}`, "info");
      } else if (!previousAddress.current) {
        analytics.walletConnected(address);
      }
      previousAddress.current = address;
    } else if (!isConnected && previousAddress.current) {
      analytics.walletDisconnected();
      previousAddress.current = undefined;
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      try {
        if (accounts.length === 0) {
          handleSafeDisconnect();
        }
      } catch (error) {
        console.error("Error handling account change:", error);
      }
    };

    const handleChainChanged = (_chainId: string) => {
      try {
        const newChainId = parseInt(_chainId, 16);
        if (newChainId !== 32323 && isConnected) {
          showToast("Network changed. Please switch to BasedAI Network.", "warning");
        }
      } catch (error) {
        console.error("Error handling chain change:", error);
      }
    };

    const handleDisconnect = () => {
      try {
        handleSafeDisconnect();
      } catch (error) {
        console.error("Error handling disconnect event:", error);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [handleSafeDisconnect, isConnected]);

  useEffect(() => {
    if (isConnected && chainId && chainId !== 32323) {
      showToast("Wrong Network: Please switch to BasedAI Network (Chain ID 32323)", "warning");
      try {
        switchChain({ chainId: 32323 });
      } catch (error) {
        console.error("Failed to switch chain:", error);
      }
    }
  }, [isConnected, chainId, switchChain]);

  return null;
}

export function useWalletDisconnect() {
  const { disconnect } = useDisconnect();
  
  return useCallback(() => {
    try {
      localStorage.removeItem('connectedWallet');
      localStorage.removeItem('wallet_address');
      disconnect();
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  }, [disconnect]);
}
