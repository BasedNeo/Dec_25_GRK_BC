import { ethers } from 'ethers';
import { NFT_CONTRACT, CHAIN_ID } from './constants';

type WalletEvent = 'connected' | 'disconnected' | 'chainChanged' | 'wrongNetwork';
type WalletListener = (event: WalletEvent, data: any) => void;

interface ChainConfig {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

const NFT_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function totalMinted() view returns (uint256)',
  'function MAX_SUPPLY() view returns (uint256)',
  'function MINT_PRICE() view returns (uint256)',
  'function publicMintEnabled() view returns (bool)',
  'function revealed() view returns (bool)',
  'function paused() view returns (bool)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function tokenByIndex(uint256 index) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function mint(uint256 quantity) payable',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

class WalletServiceClass {
  address: string | null = null;
  signer: ethers.Signer | null = null;
  chainId: string | null = null;
  isConnected: boolean = false;
  private listeners: Set<WalletListener> = new Set();
  private initialized: boolean = false;

  REQUIRED_CHAIN: ChainConfig = {
    chainId: '0x7E53',
    chainName: 'BasedAI',
    nativeCurrency: {
      name: 'BASED',
      symbol: 'BASED',
      decimals: 18
    },
    rpcUrls: ['https://mainnet.basedaibridge.com/rpc/'],
    blockExplorerUrls: ['https://explorer.bf1337.org']
  };

  async initialize(): Promise<boolean> {
    if (this.initialized) return this.isConnected;
    this.initialized = true;

    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
      return false;
    }

    this._setupListeners();

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_accounts' 
      }) as string[];

      if (accounts.length > 0) {
        await this._handleConnection(accounts[0]);
        return true;
      }
    } catch (error) {
      // Wallet init check failed silently
    }

    const savedAddress = localStorage.getItem('wallet_address');
    if (savedAddress) {
      try {
        await this.connect();
      } catch (e) {
        localStorage.removeItem('wallet_address');
      }
    }

    return false;
  }

  private _setupListeners(): void {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length === 0) {
        this._handleDisconnection();
      } else {
        this._handleConnection(accounts[0]);
      }
    });

    window.ethereum.on('chainChanged', (chainId: string) => {
      this.chainId = chainId;
      this._notify('chainChanged', { chainId });

      if (chainId !== this.REQUIRED_CHAIN.chainId) {
        this._notify('wrongNetwork', { 
          current: chainId, 
          required: this.REQUIRED_CHAIN.chainId 
        });
      }
    });

    window.ethereum.on('disconnect', () => {
      this._handleDisconnection();
    });
  }

  async connect(): Promise<string> {
    if (!window.ethereum) {
      throw new Error('No wallet detected. Please install MetaMask or a compatible wallet.');
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      }) as string[];

      if (accounts.length === 0) {
        throw new Error('No accounts returned');
      }

      await this._handleConnection(accounts[0]);
      await this.ensureCorrectNetwork();

      return this.address!;

    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('Connection request was rejected');
      }
      throw error;
    }
  }

  private async _handleConnection(address: string): Promise<void> {
    this.address = address;
    this.chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;
    this.isConnected = true;

    const provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await provider.getSigner();

    localStorage.setItem('wallet_address', address);

    this._notify('connected', { address: this.address, chainId: this.chainId });
  }

  private _handleDisconnection(): void {
    this.address = null;
    this.signer = null;
    this.chainId = null;
    this.isConnected = false;

    localStorage.removeItem('wallet_address');

    this._notify('disconnected', {});
  }

  disconnect(): void {
    this._handleDisconnection();
  }

  async ensureCorrectNetwork(): Promise<boolean> {
    if (!this.chainId || this.chainId === this.REQUIRED_CHAIN.chainId) {
      return true;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: this.REQUIRED_CHAIN.chainId }]
      });
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [this.REQUIRED_CHAIN]
        });
        return true;
      }
      throw error;
    }
  }

  getShortAddress(): string | null {
    if (!this.address) return null;
    return `${this.address.slice(0, 6)}...${this.address.slice(-4)}`;
  }

  isOnCorrectNetwork(): boolean {
    return this.chainId === this.REQUIRED_CHAIN.chainId;
  }

  subscribe(callback: WalletListener): () => void {
    this.listeners.add(callback);

    if (this.isConnected) {
      callback('connected', { address: this.address, chainId: this.chainId });
    }

    return () => this.listeners.delete(callback);
  }

  private _notify(event: WalletEvent, data: any): void {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (e) {
        // Listener error silently caught
      }
    });
  }

  async getSignedContract(): Promise<ethers.Contract> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    await this.ensureCorrectNetwork();

    return new ethers.Contract(
      NFT_CONTRACT,
      NFT_ABI,
      this.signer
    );
  }
}

export const WalletService = new WalletServiceClass();

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    WalletService.initialize();
  });
  
  (window as any).WalletService = WalletService;
}
