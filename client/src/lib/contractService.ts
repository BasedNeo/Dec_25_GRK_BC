import { ethers } from 'ethers';
import { RPC_URL, NFT_CONTRACT, IPFS_ROOT, CHAIN_ID } from './constants';
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

  private config = {
    address: NFT_CONTRACT,
    rpcUrl: RPC_URL,
    chainId: CHAIN_ID,
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
    'function balanceOf(address owner) view returns (uint256)'
  ];

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<boolean> {
    try {
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
      this.contract = new ethers.Contract(this.config.address, this.abi, this.provider);

      await this.provider.getBlockNumber();
      this.isInitialized = true;
      console.log('[ContractService] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[ContractService] Initialization failed:', error);
      this.initPromise = null;
      return false;
    }
  }

  async getContractStats(): Promise<ContractStats | null> {
    const cached = CacheService.get<ContractStats>(CACHE_KEYS.CONTRACT_STATS, CACHE_DURATIONS.contractStats);
    if (cached) return cached;

    try {
      const initialized = await this.initialize();
      if (!initialized || !this.contract) return null;

      const [totalMinted, maxSupply, mintPrice, publicMintEnabled, revealed, paused] =
        await Promise.all([
          this.contract.totalSupply().catch(() => this.contract!.totalMinted().catch(() => BigInt(0))),
          this.contract.MAX_SUPPLY(),
          this.contract.MINT_PRICE(),
          this.contract.publicMintEnabled().catch(() => true),
          this.contract.revealed().catch(() => true),
          this.contract.paused().catch(() => false)
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
        totalMinted = Number(await this.contract.totalSupply());
      } catch {
        try {
          totalMinted = Number(await this.contract.totalMinted());
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

        const results = await Promise.all(batchPromises);
        results.forEach(result => {
          if (result) nfts.push(result);
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

      const tokenId = await this.contract.tokenByIndex(index);
      const owner = await this.contract.ownerOf(tokenId);
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
        signal: AbortSignal.timeout(10000)
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

      const balance = Number(await this.contract.balanceOf(userAddress));
      if (balance === 0) return [];

      const nfts: NFTData[] = [];

      let totalMinted: number;
      try {
        totalMinted = Number(await this.contract.totalSupply());
      } catch {
        totalMinted = Number(await this.contract.totalMinted());
      }

      for (let i = 0; i < totalMinted && nfts.length < balance; i++) {
        try {
          const tokenId = await this.contract.tokenByIndex(i);
          const owner = await this.contract.ownerOf(tokenId);

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

      const owner = await this.contract.ownerOf(tokenId);
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
        return Number(await this.contract.totalSupply());
      } catch {
        return Number(await this.contract.totalMinted());
      }
    } catch (error) {
      console.error('[ContractService] getTotalMinted failed:', error);
      return 0;
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  reset(): void {
    this.isInitialized = false;
    this.initPromise = null;
    this.provider = null;
    this.contract = null;
  }
}

export const ContractService = new ContractServiceClass();
