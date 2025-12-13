import { ethers } from 'ethers';
import { NFT_CONTRACT, IPFS_ROOT, CHAIN_ID } from './constants';
import { CacheService, CACHE_DURATIONS, CACHE_KEYS } from './cache';

export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

export interface ContractStats {
  totalMinted: number;
  maxSupply: number;
  mintPrice: string;
  publicMintEnabled: boolean;
  revealed: boolean;
  paused: boolean;
  remaining: number;
  progress: string;
}

export interface NFTData {
  tokenId: number;
  owner: string;
  metadata: NFTMetadata | null;
  index: number;
}

class ContractServiceClass {
  private provider: ethers.JsonRpcProvider | null = null;
  private contract: ethers.Contract | null = null;
  private isInitialized: boolean = false;
  private initPromise: Promise<boolean> | null = null;
  private currentRpcIndex: number = 0;

  private config = {
    address: NFT_CONTRACT,
    chainId: CHAIN_ID,
    rpcUrls: [
      'https://mainnet.basedaibridge.com/rpc',
      'https://rpc.basedaibridge.com'
    ],
    metadataBaseUri: IPFS_ROOT
  };

  private abi = [
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

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._tryConnect();
    return this.initPromise;
  }

  private async _tryConnect(): Promise<boolean> {
    const maxAttempts = 3;
    const rpcUrls = this.config.rpcUrls;

    for (let rpcIndex = 0; rpcIndex < rpcUrls.length; rpcIndex++) {
      const rpcUrl = rpcUrls[rpcIndex];

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          console.log(`[ContractService] Connecting to ${rpcUrl} (attempt ${attempt + 1})`);

          this.provider = new ethers.JsonRpcProvider(rpcUrl, {
            chainId: this.config.chainId,
            name: 'BasedAI'
          });

          const blockPromise = this.provider.getBlockNumber();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 10000)
          );

          await Promise.race([blockPromise, timeoutPromise]);

          this.contract = new ethers.Contract(
            this.config.address,
            this.abi,
            this.provider
          );

          await this.contract.name();

          this.isInitialized = true;
          this.currentRpcIndex = rpcIndex;
          console.log(`[ContractService] Connected successfully to ${rpcUrl}`);
          return true;

        } catch (error: any) {
          console.warn(`[ContractService] Attempt ${attempt + 1} failed for ${rpcUrl}:`, error.message);
          await this._delay(1000 * (attempt + 1));
        }
      }
    }

    this.initPromise = null;
    console.error('[ContractService] Failed to connect after all retries');
    return false;
  }

  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async callContract<T>(method: string, ...args: any[]): Promise<T> {
    await this.initialize();
    if (!this.contract) throw new Error('Contract not initialized');

    let lastError: Error | null = null;
    for (let i = 0; i < 3; i++) {
      try {
        return await this.contract[method](...args);
      } catch (error: any) {
        lastError = error;
        if (error.code === 'CALL_EXCEPTION') {
          throw error;
        }
        await this._delay(1000 * (i + 1));
      }
    }
    throw lastError || new Error(`Contract call ${method} failed`);
  }

  async getContractStats(): Promise<ContractStats | null> {
    const cached = CacheService.get<ContractStats>(CACHE_KEYS.CONTRACT_STATS, CACHE_DURATIONS.contractStats);
    if (cached) return cached;

    try {
      const initialized = await this.initialize();
      if (!initialized || !this.contract) return null;

      const [totalMinted, maxSupply, mintPrice, publicMintEnabled, revealed, paused] =
        await Promise.all([
          this.callContract<bigint>('totalSupply').catch(() => 
            this.callContract<bigint>('totalMinted').catch(() => BigInt(0))
          ),
          this.callContract<bigint>('MAX_SUPPLY'),
          this.callContract<bigint>('MINT_PRICE'),
          this.callContract<boolean>('publicMintEnabled').catch(() => true),
          this.callContract<boolean>('revealed').catch(() => true),
          this.callContract<boolean>('paused').catch(() => false)
        ]);

      const mintedNum = Number(totalMinted);
      const maxNum = Number(maxSupply);

      const stats: ContractStats = {
        totalMinted: mintedNum,
        maxSupply: maxNum,
        mintPrice: ethers.formatEther(mintPrice),
        publicMintEnabled: Boolean(publicMintEnabled),
        revealed: Boolean(revealed),
        paused: Boolean(paused),
        remaining: maxNum - mintedNum,
        progress: ((mintedNum / maxNum) * 100).toFixed(2)
      };

      CacheService.set(CACHE_KEYS.CONTRACT_STATS, stats);
      return stats;
    } catch (error) {
      console.error('[ContractService] getContractStats failed:', error);
      return null;
    }
  }

  async getMintedNFTs(limit: number = 20, offset: number = 0): Promise<{ nfts: NFTData[]; total: number; hasMore: boolean }> {
    try {
      const initialized = await this.initialize();
      if (!initialized || !this.contract) {
        return { nfts: [], total: 0, hasMore: false };
      }

      let totalMinted: number;
      try {
        totalMinted = Number(await this.callContract<bigint>('totalSupply'));
      } catch {
        try {
          totalMinted = Number(await this.callContract<bigint>('totalMinted'));
        } catch {
          return { nfts: [], total: 0, hasMore: false };
        }
      }

      const nfts: NFTData[] = [];
      const start = Math.max(0, totalMinted - offset - limit);
      const end = totalMinted - offset;

      const batchSize = 5;
      for (let batchStart = end - 1; batchStart >= start; batchStart -= batchSize) {
        const batchEnd = Math.max(start, batchStart - batchSize + 1);
        const batchPromises: Promise<NFTData | null>[] = [];

        for (let i = batchStart; i >= batchEnd; i--) {
          batchPromises.push(this.fetchNFTByIndex(i));
        }

        const results = await Promise.allSettled(batchPromises);
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            nfts.push(result.value);
          }
        });
      }

      return { nfts, total: totalMinted, hasMore: start > 0 };
    } catch (error) {
      console.error('[ContractService] getMintedNFTs failed:', error);
      return { nfts: [], total: 0, hasMore: false };
    }
  }

  private async fetchNFTByIndex(index: number): Promise<NFTData | null> {
    try {
      if (!this.contract) return null;

      const tokenId = await this.callContract<bigint>('tokenByIndex', index);
      const owner = await this.callContract<string>('ownerOf', tokenId);
      const metadata = await this.fetchMetadata(Number(tokenId));

      return {
        tokenId: Number(tokenId),
        owner,
        metadata,
        index
      };
    } catch (e) {
      console.warn(`[ContractService] Failed to fetch token at index ${index}`);
      return null;
    }
  }

  async fetchMetadata(tokenId: number): Promise<NFTMetadata | null> {
    try {
      const url = `${this.config.metadataBaseUri}${tokenId}.json`;
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(10000),
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Metadata fetch failed');
      return await response.json();
    } catch (error) {
      console.warn(`[ContractService] Metadata fetch failed for token ${tokenId}`);
      return null;
    }
  }

  async getUserNFTs(userAddress: string): Promise<NFTData[]> {
    try {
      const initialized = await this.initialize();
      if (!initialized || !this.contract) return [];

      const balance = Number(await this.callContract<bigint>('balanceOf', userAddress));
      if (balance === 0) return [];

      const nfts: NFTData[] = [];

      let totalMinted: number;
      try {
        totalMinted = Number(await this.callContract<bigint>('totalSupply'));
      } catch {
        totalMinted = Number(await this.callContract<bigint>('totalMinted'));
      }

      for (let i = 0; i < totalMinted && nfts.length < balance; i++) {
        try {
          const tokenId = await this.callContract<bigint>('tokenByIndex', i);
          const owner = await this.callContract<string>('ownerOf', tokenId);

          if (owner.toLowerCase() === userAddress.toLowerCase()) {
            const metadata = await this.fetchMetadata(Number(tokenId));
            nfts.push({ tokenId: Number(tokenId), owner, metadata, index: i });
          }
        } catch (e) {
          continue;
        }
      }

      return nfts;
    } catch (error) {
      console.error('[ContractService] getUserNFTs failed:', error);
      return [];
    }
  }

  async getTokenOwner(tokenId: number): Promise<string | null> {
    try {
      const initialized = await this.initialize();
      if (!initialized || !this.contract) return null;

      const owner = await this.callContract<string>('ownerOf', tokenId);
      return owner;
    } catch (error) {
      console.warn(`[ContractService] getTokenOwner failed for token ${tokenId}`);
      return null;
    }
  }

  async getTotalMinted(): Promise<number> {
    try {
      const initialized = await this.initialize();
      if (!initialized || !this.contract) return 0;

      try {
        return Number(await this.callContract<bigint>('totalSupply'));
      } catch {
        return Number(await this.callContract<bigint>('totalMinted'));
      }
    } catch (error) {
      console.error('[ContractService] getTotalMinted failed:', error);
      return 0;
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getCurrentRpc(): string {
    return this.config.rpcUrls[this.currentRpcIndex] || 'Not connected';
  }

  reset(): void {
    this.isInitialized = false;
    this.initPromise = null;
    this.provider = null;
    this.contract = null;
  }
}

export const ContractService = new ContractServiceClass();
