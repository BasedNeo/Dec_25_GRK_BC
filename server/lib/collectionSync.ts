import { ethers } from 'ethers';
import { db } from '../db';
import { collections } from '../../shared/schema';
import { eq, desc, sql } from 'drizzle-orm';

const RPC_URL = 'https://mainnet.basedaibridge.com/rpc/';

export class CollectionSync {
  private static provider = new ethers.JsonRpcProvider(RPC_URL);
  private static isSyncing = false;
  
  private static readonly BASEDAI_COLLECTIONS = [
    '0x74f442F6bd614389cA63731f80901f603CDe1b53',
    '0x8EB23fefe4900ecEb8354Bee78B6f49c5983b87C',
    '0x3BFa8d4a9D77A54B623a272A558F9b471DbDd21f',
    '0x6fAEF90f2016980C656aE0577705581De6C65210',
    '0xECfc059EbB477FecEC139dD231e706C63a49901C',
    '0x0DCDaBeC6814EFe61BC7a0CD6fDcF00B905E1C2c',
    '0x7AD3ae91cA94A5e100C98C7E8Eb0b15a2e5B12bf',
    '0xCD52129Fb19FC09DCc75985897aEe6B25e294dB3',
    '0x54c2c028373D61ABe282aa227DC1e1f754B72C9e',
    '0x6B0313d189E3aFAfBeD3Ab31802B2489cE352Fe8',
    '0xc29A57D0Fe4fba9a4eC5296b7314cF28E85fc1d0',
    '0x405977B925D93189ba7A843AEA020108a7681dcf',
    '0x3eCd7dCd88F30342112Cc417E351A651D9950089',
    '0xBc3d1062A6A7B6450C785108f962fD6A9A4C3759',
    '0xa9500589CFC530dB57581E3c3eda4930FbDA90C1',
    '0x6aA2D24932E0AEB94Ac84b8C7545D040BD99999A',
    '0x332EF57B5f4e9A65B940453cFe83DC733b8e2b83',
    '0xaE51dc5fD1499A129f8654963560f9340773ad59',
  ];

  static async syncAll() {
    if (this.isSyncing) {
      console.log('[CollectionSync] Sync already in progress, skipping');
      return { success: 0, failed: 0, skipped: this.BASEDAI_COLLECTIONS.length };
    }
    
    this.isSyncing = true;
    console.log('[CollectionSync] Starting sync for', this.BASEDAI_COLLECTIONS.length, 'collections');
    
    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
    };

    try {
      for (const address of this.BASEDAI_COLLECTIONS) {
        try {
          await this.syncCollection(address);
          results.success++;
          
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          results.failed++;
          console.error(`[CollectionSync] Failed ${address}:`, error);
        }
      }
    } finally {
      this.isSyncing = false;
    }

    console.log('[CollectionSync] Sync complete:', results);
    return results;
  }

  private static async syncCollection(address: string) {
    const contract = new ethers.Contract(
      address,
      [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function totalSupply() view returns (uint256)',
        'function tokenURI(uint256) view returns (string)',
      ],
      this.provider
    );

    const timeout = 10000;
    const [name, symbol, totalSupply] = await Promise.race([
      Promise.all([
        contract.name(),
        contract.symbol(),
        contract.totalSupply(),
      ]),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeout)
      ),
    ]);

    let imageUrl: string | null = null;
    try {
      if (Number(totalSupply) > 0) {
        console.log(`[CollectionSync] Fetching image for ${symbol}...`);
        
        const tokenIdsToTry = [0, 1, 2, 3, 4, 5];
        
        for (const tokenId of tokenIdsToTry) {
          try {
            console.log(`[CollectionSync] Trying token #${tokenId} for ${symbol}`);
            
            const tokenURIPromise = contract.tokenURI(tokenId);
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('TokenURI timeout')), 5000)
            );
            
            const tokenURI = await Promise.race([tokenURIPromise, timeoutPromise]);
            
            if (tokenURI) {
              let metadataUrl = tokenURI;
              
              if (tokenURI.startsWith('ipfs://')) {
                const ipfsHash = tokenURI.replace('ipfs://', '');
                metadataUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
              } else if (tokenURI.startsWith('data:application/json;base64,')) {
                const base64Data = tokenURI.split(',')[1];
                const jsonString = Buffer.from(base64Data, 'base64').toString();
                const metadata = JSON.parse(jsonString);
                
                if (metadata.image) {
                  let imgUrl = metadata.image;
                  if (imgUrl.startsWith('ipfs://')) {
                    const ipfsHash = imgUrl.replace('ipfs://', '');
                    imgUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
                  }
                  imageUrl = imgUrl;
                  console.log(`[CollectionSync] Found base64 image for ${symbol}: token #${tokenId}`);
                  break;
                }
              }
              
              if (metadataUrl.startsWith('http')) {
                const metadataPromise = fetch(metadataUrl, { 
                  signal: AbortSignal.timeout(5000),
                  headers: {
                    'User-Agent': 'Mozilla/5.0',
                  }
                }).then(r => r.json());
                
                const metadataTimeoutPromise = new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Metadata timeout')), 5000)
                );
                
                const metadata = await Promise.race([metadataPromise, metadataTimeoutPromise]);
                
                if (metadata && metadata.image) {
                  let imgUrl = metadata.image;
                  
                  if (imgUrl.startsWith('ipfs://')) {
                    const ipfsHash = imgUrl.replace('ipfs://', '');
                    imgUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
                  }
                  
                  imageUrl = imgUrl;
                  console.log(`[CollectionSync] Found image for ${symbol}: token #${tokenId}`);
                  break;
                }
              }
            }
          } catch (tokenError) {
            console.warn(`[CollectionSync] Token #${tokenId} failed for ${symbol}:`, tokenError instanceof Error ? tokenError.message : tokenError);
            continue;
          }
        }
        
        if (!imageUrl) {
          console.warn(`[CollectionSync] Could not fetch image for ${symbol}, will use placeholder`);
        }
      }
    } catch (error) {
      console.error(`[CollectionSync] Error fetching image for ${address}:`, error);
    }
    
    if (!imageUrl) {
      imageUrl = `https://via.placeholder.com/400/6366f1/ffffff?text=${encodeURIComponent(symbol)}`;
    }

    // Set banner image - use NFT #345 for Based Guardians (Star Systems Officers)
    const isBasedGuardians = address.toLowerCase() === '0xae51dc5fd1499a129f8654963560f9340773ad59';
    const bannerImage = isBasedGuardians 
      ? 'https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeigklna3comgshfndjcbmdjechrj6qkl74dnn77piysmfli7jvlzfq/Star%20Systems%20Officers/Star_Systems_Officers_345.jpg'
      : imageUrl;

    await this.upsertCollection({
      contractAddress: address,
      name,
      symbol,
      totalSupply: Number(totalSupply),
      thumbnailImage: imageUrl,
      bannerImage: bannerImage,
      isFeatured: isBasedGuardians,
    });
  }

  private static async upsertCollection(data: {
    contractAddress: string;
    name: string;
    symbol: string;
    totalSupply: number;
    thumbnailImage?: string | null;
    bannerImage?: string | null;
    isFeatured?: boolean;
  }) {
    const normalizedAddress = data.contractAddress.toLowerCase();
    
    const existing = await db.select()
      .from(collections)
      .where(eq(collections.contractAddress, normalizedAddress))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(collections)
        .set({
          name: data.name,
          symbol: data.symbol,
          totalSupply: data.totalSupply,
          thumbnailImage: data.thumbnailImage || existing[0].thumbnailImage,
          bannerImage: data.bannerImage || existing[0].bannerImage,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(collections.contractAddress, normalizedAddress));
    } else {
      await db.insert(collections).values({
        contractAddress: normalizedAddress,
        name: data.name,
        symbol: data.symbol,
        totalSupply: data.totalSupply,
        thumbnailImage: data.thumbnailImage,
        bannerImage: data.bannerImage,
        isFeatured: data.isFeatured || false,
        isActive: true,
        lastSyncedAt: new Date(),
      });
    }
  }

  static async needsSync(): Promise<boolean> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(collections);
    
    if (!result[0] || result[0].count === 0) return true;
    
    const recent = await db.select()
      .from(collections)
      .orderBy(desc(collections.lastSyncedAt))
      .limit(1);
    
    if (!recent[0] || !recent[0].lastSyncedAt) return true;
    
    const hourAgo = Date.now() - (60 * 60 * 1000);
    return recent[0].lastSyncedAt.getTime() < hourAgo;
  }
}
