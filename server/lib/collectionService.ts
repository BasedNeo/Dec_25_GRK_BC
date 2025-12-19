import { ethers } from 'ethers';
import { db } from '../db';
import { collections } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const RPC_URL = 'https://mainnet.basedaibridge.com/rpc/';

export class CollectionService {
  static async addCollection(contractAddress: string, rpcUrl: string = RPC_URL) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      const abi = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function totalSupply() view returns (uint256)',
        'function royaltyInfo(uint256 tokenId, uint256 salePrice) view returns (address, uint256)'
      ];
      
      const contract = new ethers.Contract(contractAddress, abi, provider);
      
      const [name, symbol, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.totalSupply().catch(() => BigInt(0))
      ]);
      
      let royaltyAddress = null;
      let royaltyPercent = 0;
      try {
        const [receiver, amount] = await contract.royaltyInfo(1, ethers.parseEther('1'));
        royaltyAddress = receiver;
        royaltyPercent = Number(amount) / 10000;
      } catch (e) {
        console.log('No ERC2981 royalty support');
      }
      
      const collection = await db.insert(collections).values({
        contractAddress: contractAddress.toLowerCase(),
        name,
        symbol,
        totalSupply: Number(totalSupply),
        royaltyAddress,
        royaltyPercent,
        isActive: true,
        isFeatured: false
      }).returning();
      
      return collection[0];
      
    } catch (error) {
      console.error('Failed to add collection:', error);
      throw new Error('Failed to fetch collection data from blockchain');
    }
  }
  
  static async getAllCollections() {
    return await db.select().from(collections).where(eq(collections.isActive, true));
  }
  
  static async getCollection(contractAddress: string) {
    const result = await db.select()
      .from(collections)
      .where(eq(collections.contractAddress, contractAddress.toLowerCase()))
      .limit(1);
    return result[0];
  }
  
  static async updateCollectionStats(contractAddress: string, stats: {
    floorPrice?: string;
    volumeTraded?: string;
    totalSupply?: number;
  }) {
    await db.update(collections)
      .set({
        ...stats,
        updatedAt: new Date()
      })
      .where(eq(collections.contractAddress, contractAddress.toLowerCase()));
  }
  
  static async toggleCollectionStatus(contractAddress: string, isActive: boolean) {
    await db.update(collections)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(collections.contractAddress, contractAddress.toLowerCase()));
  }
  
  static async setFeatured(contractAddress: string, isFeatured: boolean) {
    await db.update(collections)
      .set({ isFeatured, updatedAt: new Date() })
      .where(eq(collections.contractAddress, contractAddress.toLowerCase()));
  }
  
  /**
   * Get or create a collection - used for auto-registration when someone lists an NFT
   * from a new collection. This pulls metadata on-chain automatically.
   */
  static async getOrCreateCollection(contractAddress: string, rpcUrl: string = RPC_URL) {
    const normalizedAddress = contractAddress.toLowerCase();
    
    // Check if collection already exists
    const existing = await this.getCollection(normalizedAddress);
    if (existing) {
      return { collection: existing, created: false };
    }
    
    // Auto-create the collection by fetching on-chain metadata
    try {
      const collection = await this.addCollection(contractAddress, rpcUrl);
      console.log(`[CollectionService] Auto-registered new collection: ${collection.name} (${normalizedAddress})`);
      return { collection, created: true };
    } catch (error) {
      console.error(`[CollectionService] Failed to auto-register collection ${contractAddress}:`, error);
      throw error;
    }
  }
  
  /**
   * Seed the default Based Guardians collection if it doesn't exist
   */
  static async seedDefaultCollection(nftContractAddress: string) {
    const normalizedAddress = nftContractAddress.toLowerCase();
    
    const existing = await this.getCollection(normalizedAddress);
    if (existing) {
      return existing;
    }
    
    // Create Based Guardians with known metadata
    try {
      const collection = await db.insert(collections).values({
        contractAddress: normalizedAddress,
        name: 'Based Guardians',
        symbol: 'GUARDIAN',
        description: 'The official Based Guardians NFT collection - 3,732 unique cyberpunk guardians protecting the BasedAI ecosystem.',
        bannerImage: 'https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeie3c5ahzsiiparmbr6lgdbpiukorbphvclx73dwr6vrjfalfyu52y/1.png',
        thumbnailImage: 'https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeie3c5ahzsiiparmbr6lgdbpiukorbphvclx73dwr6vrjfalfyu52y/1.png',
        totalSupply: 3732,
        isActive: true,
        isFeatured: true
      }).returning();
      
      console.log('[CollectionService] Seeded default Based Guardians collection');
      return collection[0];
    } catch (error) {
      console.error('[CollectionService] Failed to seed default collection:', error);
      throw error;
    }
  }
}
