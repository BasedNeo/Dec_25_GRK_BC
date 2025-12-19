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
}
