import { useEffect, useRef } from 'react';
import { useAccount, useConnect, useSwitchChain, useChainId } from 'wagmi';
import { useToast } from "@/hooks/use-toast";
import { injected } from 'wagmi/connectors';

export function WalletWatcher() {
  const { isConnected, address } = useAccount();
  const { connect } = useConnect();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const { toast } = useToast();
  const isFirstMount = useRef(true);

  // 1. Auto-reconnect on page load if previously connected
  useEffect(() => {
    if (isFirstMount.current) {
        isFirstMount.current = false;
        const savedAddress = localStorage.getItem('connectedWallet');
        
        if (savedAddress && !isConnected && window.ethereum) {
            console.log("Attempting auto-reconnect to", savedAddress);
            // Wagmi handles this mostly, but we can force a check or update local state
            // If using injected connector (MetaMask etc), we can try to connect silently
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
                  toast({
                      title: "Wallet Disconnected",
                      description: "You have been disconnected.",
                      variant: "default"
                  });
              } else if (accounts[0] !== address) {
                  // Account switched
                  localStorage.setItem('connectedWallet', accounts[0]);
                  toast({
                      title: "Account Changed",
                      description: `Switched to ${accounts[0].slice(0,6)}...`,
                  });
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
  }, [address, toast]);

  // 4. Prompt for correct network
  useEffect(() => {
    if (isConnected && chainId !== 32323) {
        toast({
            title: "Wrong Network",
            description: "Please switch to BasedAI Network (Chain ID 32323)",
            variant: "destructive",
            action: (
                <button 
                    onClick={() => switchChain({ chainId: 32323 })}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs font-bold border border-white/20"
                >
                    Switch Network
                </button>
            ),
            duration: 10000
        });
    }
  }, [isConnected, chainId, switchChain, toast]);

  return null; // Headless component
}
