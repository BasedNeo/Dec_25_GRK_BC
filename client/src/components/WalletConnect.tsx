import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut, AlertTriangle, User, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { getExplorerUrl, getOwnerTokens, getTokenDetails } from '../lib/contractService';
import './WalletConnect.css';

// Network Config
const NETWORK_CONFIG = {
  chainId: 32323,
  chainIdHex: '0x7E43',
  chainName: 'BasedAI',
  rpcUrls: ['https://mainnet.basedaibridge.com/rpc/'],
  nativeCurrency: {
    name: 'BASED',
    symbol: 'BASED',
    decimals: 18
  },
  blockExplorerUrls: ['https://explorer.bf1337.org']
};

interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

interface UserNFT {
  tokenId: number;
  image: string;
  name: string;
}

export function WalletConnect() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    error: null
  });

  const [userNFTs, setUserNFTs] = useState<UserNFT[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Auto-connect on load
  useEffect(() => {
    const savedAddress = localStorage.getItem('connected_wallet');
    if (savedAddress && window.ethereum) {
      connectWallet(true);
    }

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  // Fetch User NFTs when connected
  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      fetchUserNFTs(wallet.address);
    } else {
      setUserNFTs([]);
    }
  }, [wallet.isConnected, wallet.address]);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      handleDisconnect();
    } else {
      setWallet(prev => ({ ...prev, address: accounts[0], isConnected: true }));
      localStorage.setItem('connected_wallet', accounts[0]);
    }
  };

  const handleChainChanged = (chainId: string) => {
    setWallet(prev => ({ ...prev, chainId: parseInt(chainId, 16) }));
    // Ideally reload page here as recommended by MetaMask, but we'll just update state for SPA
  };

  const handleDisconnect = () => {
    setWallet({
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      error: null
    });
    localStorage.removeItem('connected_wallet');
    setUserNFTs([]);
  };

  const connectWallet = async (silent = false) => {
    if (!window.ethereum) {
      if (!silent) setWallet(prev => ({ ...prev, error: "No wallet detected" }));
      return;
    }

    try {
      if (!silent) setWallet(prev => ({ ...prev, isConnecting: true, error: null }));
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      
      setWallet({
        address: accounts[0],
        chainId: Number(network.chainId),
        isConnected: true,
        isConnecting: false,
        error: null
      });
      
      localStorage.setItem('connected_wallet', accounts[0]);
      setShowModal(false);

    } catch (err: any) {
      console.error("Connection failed", err);
      if (!silent) {
        setWallet(prev => ({ 
          ...prev, 
          isConnecting: false, 
          error: err.code === 4001 ? "User rejected connection" : "Failed to connect" 
        }));
      }
    }
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK_CONFIG.chainIdHex }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [NETWORK_CONFIG],
          });
        } catch (addError) {
          console.error("Failed to add network", addError);
        }
      } else {
        console.error("Failed to switch network", switchError);
      }
    }
  };

  const fetchUserNFTs = async (address: string) => {
    setLoadingNFTs(true);
    try {
      // This uses our contractService which handles the contract calls
      const tokenIds = await getOwnerTokens(address);
      
      if (Array.isArray(tokenIds) && tokenIds.length > 0) {
        // Fetch details for first 3 tokens for preview
        const promises = tokenIds.slice(0, 3).map(id => getTokenDetails(id));
        const details = await Promise.all(promises);
        
        const nfts = details.map((d: any) => ({
          tokenId: d.tokenId,
          image: d.metadata?.image?.replace("ipfs://", "https://ipfs.io/ipfs/") || "",
          name: d.metadata?.name || `Guardian #${d.tokenId}`
        }));
        
        setUserNFTs(nfts);
      }
    } catch (err) {
      console.error("Failed to fetch user NFTs", err);
    } finally {
      setLoadingNFTs(false);
    }
  };

  const copyAddress = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
    }
  };

  const isWrongNetwork = wallet.isConnected && wallet.chainId !== NETWORK_CONFIG.chainId;

  // Render Logic

  if (wallet.isConnected && wallet.address) {
    return (
      <div className="wc-container">
        {isWrongNetwork && (
          <Button 
            variant="destructive" 
            size="sm" 
            className="wc-network-btn animate-pulse"
            onClick={switchNetwork}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Switch Network
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="wc-connected-btn">
              <div className="wc-avatar-gradient">
                <User size={14} className="text-white" />
              </div>
              <span className="wc-address">
                {wallet.address.substring(0, 6)}...{wallet.address.substring(wallet.address.length - 4)}
              </span>
              <ChevronDown size={14} className="text-muted-foreground ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="wc-dropdown" align="end">
            <div className="wc-dropdown-header">
               <span className="text-xs text-muted-foreground">Connected Wallet</span>
               <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono font-bold text-sm">
                    {wallet.address.substring(0, 6)}...{wallet.address.substring(wallet.address.length - 4)}
                  </span>
                  <Copy size={12} className="cursor-pointer hover:text-primary" onClick={copyAddress} />
               </div>
            </div>
            <DropdownMenuSeparator />
            
            {/* User NFTs Preview */}
            <div className="wc-nft-section">
               <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-muted-foreground">MY GUARDIANS</span>
                  {loadingNFTs ? <Loader2 size={10} className="animate-spin" /> : <span className="text-xs bg-primary/20 text-primary px-1.5 rounded">{userNFTs.length}</span>}
               </div>
               
               {userNFTs.length > 0 ? (
                 <div className="flex gap-2">
                    {userNFTs.map(nft => (
                      <div key={nft.tokenId} className="wc-nft-thumb">
                        <img src={nft.image} alt={nft.name} />
                      </div>
                    ))}
                    {userNFTs.length > 3 && <div className="wc-nft-more">+{userNFTs.length - 3}</div>}
                 </div>
               ) : (
                 <div className="text-xs text-muted-foreground italic py-2 text-center border border-dashed border-white/10 rounded">
                    No Guardians found
                 </div>
               )}
            </div>

            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => window.open(getExplorerUrl('address', wallet.address!), '_blank')}>
              <ExternalLink size={14} className="mr-2" /> View on Explorer
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-red-400 focus:text-red-400" onClick={handleDisconnect}>
              <LogOut size={14} className="mr-2" /> Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <>
      <Button 
        onClick={() => setShowModal(true)} 
        className="wc-connect-btn"
        disabled={wallet.isConnecting}
      >
        {wallet.isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting...
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4 mr-2" /> Connect Wallet
          </>
        )}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="wc-modal">
          <DialogHeader>
            <DialogTitle className="text-center font-orbitron">Connect Wallet</DialogTitle>
          </DialogHeader>
          
          <div className="wc-wallet-options">
            <button className="wc-wallet-option" onClick={() => connectWallet()}>
               <div className="wc-wallet-icon metamask"></div>
               <span>MetaMask</span>
               <span className="wc-rec-badge">RECOMMENDED</span>
            </button>
            <button className="wc-wallet-option" onClick={() => connectWallet()}>
               <div className="wc-wallet-icon walletconnect"></div>
               <span>WalletConnect</span>
            </button>
            <button className="wc-wallet-option" onClick={() => connectWallet()}>
               <div className="wc-wallet-icon coinbase"></div>
               <span>Coinbase Wallet</span>
            </button>
          </div>

          {wallet.error && (
            <div className="wc-error-msg">
              <AlertTriangle size={14} />
              {wallet.error}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Add types for window.ethereum
declare global {
  interface Window {
    ethereum: any;
  }
}
