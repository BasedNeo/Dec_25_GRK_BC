import { useEffect, useRef } from 'react';
import { useAccount, useConnect, useSwitchChain, useChainId } from 'wagmi';
import { showToast } from "@/lib/customToast";
import { injected } from 'wagmi/connectors';

export function WalletWatcher() {
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const isFirstMount = useRef(true);

  // 1. Auto-reconnect on page load if previously connected
  useEffect(() => {
    if (isFirstMount.current) {
        isFirstMount.current = false;
        const savedAddress = localStorage.getItem('connectedWallet');
        
        if (savedAddress && !isConnected && window.ethereum) {
            connect({ connector: injected() });
        }
    }
  }, [connect, isConnected]);

  // 2. Persist connection state
  useEffect(() => {
    if (isConnected && address) {
        localStorage.setItem('connectedWallet', address);
    } else if (!isConnected) {
        // Only clear if explicitly disconnected by user action usually, 
        // but here we sync state. 
        // NOTE: We might not want to clear immediately on refresh if we want to persist.
        // But if isConnected is false after load, it might mean user disconnected.
        // Let's rely on Wagmi's state mostly, but update our key.
    }
  }, [isConnected, address]);

  // 3. Listen for account changes (Wagmi handles this, but we can add side effects)
  useEffect(() => {
      if (window.ethereum) {
          const handleAccountsChanged = (accounts: string[]) => {
              if (accounts.length === 0) {
                  localStorage.removeItem('connectedWallet');
                  showToast("Wallet Disconnected", "info");
              } else if (accounts[0] !== address) {
                  // Account switched
                  localStorage.setItem('connectedWallet', accounts[0]);
                  showToast(`Account Changed: ${accounts[0].slice(0,6)}...`, "info");
              }
          };

          const handleChainChanged = () => {
              window.location.reload();
          };

          window.ethereum.on('accountsChanged', handleAccountsChanged);
          window.ethereum.on('chainChanged', handleChainChanged);

          return () => {
              if (window.ethereum?.removeListener) {
                  window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                  window.ethereum.removeListener('chainChanged', handleChainChanged);
              }
          };
      }
  }, [address]);

  // 4. Prompt for correct network
  useEffect(() => {
    if (isConnected && chainId !== 32323) {
        showToast("Wrong Network: Please switch to BasedAI Network (Chain ID 32323)", "warning");
        // Also try to switch automatically
        switchChain({ chainId: 32323 });
    }
  }, [isConnected, chainId, switchChain]);

  return null; // Headless component
}
