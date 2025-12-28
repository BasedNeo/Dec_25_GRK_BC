import { ethers } from 'ethers';

interface NFTCollection {
  contractAddress: string;
  name: string;
  symbol: string;
  balance: number;
  tokenIds: string[];
}

interface NFTMetadata {
  tokenId: number;
  name: string;
  image: string;
  attributes?: any[];
}

export class WalletScanner {
  
  static async scanWalletCollections(walletAddress: string, rpcUrl: string): Promise<NFTCollection[]> {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const collections: NFTCollection[] = [];
      
      console.log(`Scanning wallet: ${walletAddress}`);
      
      const transferTopic = ethers.id('Transfer(address,address,uint256)');
      const toAddressFilter = ethers.zeroPadValue(walletAddress.toLowerCase(), 32);
      
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 500000);
      
      console.log(`Scanning blocks ${fromBlock} to ${currentBlock}`);
      
      const logs = await provider.getLogs({
        fromBlock,
        toBlock: currentBlock,
        topics: [
          transferTopic,
          null,
          toAddressFilter
        ]
      });
      
      console.log(`Found ${logs.length} transfer events`);
      
      const contractMap = new Map<string, Set<string>>();
      
      for (const log of logs) {
        const contractAddress = log.address.toLowerCase();
        const tokenId = BigInt(log.topics[3]).toString();
        
        if (!contractMap.has(contractAddress)) {
          contractMap.set(contractAddress, new Set());
        }
        contractMap.get(contractAddress)!.add(tokenId);
      }
      
      console.log(`Found ${contractMap.size} unique collections`);
      
      for (const [contractAddress, tokenIdsSet] of Array.from(contractMap.entries())) {
        try {
          const collectionData = await this.verifyAndGetCollection(
            contractAddress,
            walletAddress,
            Array.from(tokenIdsSet),
            provider
          );
          
          if (collectionData && collectionData.balance > 0) {
            collections.push(collectionData);
          }
        } catch (error) {
          console.warn(`Failed to verify collection ${contractAddress}:`, error);
        }
      }
      
      console.log(`Verified ${collections.length} collections with current ownership`);
      
      return collections;
      
    } catch (error) {
      console.error('Wallet scan failed:', error);
      throw error;
    }
  }
  
  private static async verifyAndGetCollection(
    contractAddress: string,
    walletAddress: string,
    potentialTokenIds: string[],
    provider: ethers.JsonRpcProvider
  ): Promise<NFTCollection | null> {
    const abi = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function balanceOf(address owner) view returns (uint256)',
      'function ownerOf(uint256 tokenId) view returns (address)',
      'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
      'function supportsInterface(bytes4 interfaceId) view returns (bool)'
    ];
    
    try {
      const contract = new ethers.Contract(contractAddress, abi, provider);
      
      const isERC721 = await contract.supportsInterface('0x80ac58cd').catch(() => false);
      if (!isERC721) {
        return null;
      }
      
      const [name, symbol, balance] = await Promise.all([
        contract.name().catch(() => 'Unknown Collection'),
        contract.symbol().catch(() => 'UNKNOWN'),
        contract.balanceOf(walletAddress)
      ]);
      
      const balanceNum = Number(balance);
      
      if (balanceNum === 0) {
        return null;
      }
      
      const ownedTokenIds: string[] = [];
      
      try {
        for (let i = 0; i < balanceNum && i < 100; i++) {
          const tokenId = await contract.tokenOfOwnerByIndex(walletAddress, i);
          ownedTokenIds.push(tokenId.toString());
        }
      } catch (error) {
        for (const tokenId of potentialTokenIds.slice(0, 100)) {
          try {
            const owner = await contract.ownerOf(tokenId);
            if (owner.toLowerCase() === walletAddress.toLowerCase()) {
              ownedTokenIds.push(tokenId);
            }
          } catch (e) {
          }
        }
      }
      
      return {
        contractAddress: contractAddress.toLowerCase(),
        name,
        symbol,
        balance: balanceNum,
        tokenIds: ownedTokenIds
      };
      
    } catch (error) {
      console.error(`Failed to get collection info for ${contractAddress}:`, error);
      return null;
    }
  }
  
  static async getNFTMetadata(
    contractAddress: string,
    tokenId: string | number,
    provider: ethers.JsonRpcProvider
  ): Promise<NFTMetadata | null> {
    try {
      const abi = [
        'function tokenURI(uint256 tokenId) view returns (string)'
      ];
      
      const contract = new ethers.Contract(contractAddress, abi, provider);
      const tokenURI = await contract.tokenURI(tokenId);
      
      let metadataUrl = tokenURI;
      if (tokenURI.startsWith('ipfs://')) {
        metadataUrl = tokenURI.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }
      
      const response = await fetch(metadataUrl, { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch metadata');
      }
      
      const metadata = await response.json();
      
      let image = metadata.image || '';
      if (image.startsWith('ipfs://')) {
        image = image.replace('ipfs://', 'https://ipfs.io/ipfs/');
      }
      
      return {
        tokenId: typeof tokenId === 'string' ? parseInt(tokenId, 10) : tokenId,
        name: metadata.name || `#${tokenId}`,
        image,
        attributes: metadata.attributes || []
      };
      
    } catch (error) {
      console.error(`Failed to get metadata for ${contractAddress} #${tokenId}:`, error);
      return null;
    }
  }
}
