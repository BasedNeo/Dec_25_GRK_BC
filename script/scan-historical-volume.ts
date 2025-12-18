import { ethers } from 'ethers';

const RPC_URL = 'https://mainnet.basedaibridge.com/rpc/';
const MARKETPLACE_CONTRACT = '0x2836f07Ed31a6DEc09E0d62Fb15D7c6c6Ddb139c';
const NFT_CONTRACT = '0xaE51dc5fD1499A129f8654963560f9340773ad59';

const MARKETPLACE_ABI = [
  'event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 fee)',
];

const NFT_ABI = [
  'function totalMinted() view returns (uint256)',
];

async function scanHistoricalVolume() {
  console.log('\n🔍 SCANNING BLOCKCHAIN FOR HISTORICAL VOLUME\n');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const currentBlock = await provider.getBlockNumber();
  
  console.log(`Current block: ${currentBlock}`);
  
  // Get total mints
  const nftContract = new ethers.Contract(NFT_CONTRACT, NFT_ABI, provider);
  const totalMinted = await nftContract.totalMinted();
  const MINT_PRICE = 69420;
  const totalMintVolume = Number(totalMinted) * MINT_PRICE;
  
  console.log(`\n📊 MINT DATA:`);
  console.log(`  Total NFTs minted: ${totalMinted}`);
  console.log(`  Mint price: ${MINT_PRICE} $BASED`);
  console.log(`  Total mint volume: ${totalMintVolume.toLocaleString()} $BASED`);
  
  // Scan for all Sold events from marketplace
  console.log(`\n🔎 Scanning for ALL secondary sales...`);
  console.log(`  This may take a while for large block ranges...`);
  
  const marketplaceContract = new ethers.Contract(MARKETPLACE_CONTRACT, MARKETPLACE_ABI, provider);
  
  // Scan in chunks to avoid timeout (10k blocks to stay under RPC 10s limit)
  const CHUNK_SIZE = 10000; // 10k blocks per chunk
  const DEPLOY_BLOCK = 2800000; // Start closer to current block to reduce scan time
  
  let allSoldEvents: any[] = [];
  let fromBlock = DEPLOY_BLOCK;
  
  while (fromBlock < currentBlock) {
    const toBlock = Math.min(fromBlock + CHUNK_SIZE, currentBlock);
    
    try {
      console.log(`  Scanning blocks ${fromBlock} to ${toBlock}...`);
      
      const events = await marketplaceContract.queryFilter(
        marketplaceContract.filters.Sold(),
        fromBlock,
        toBlock
      );
      
      allSoldEvents = allSoldEvents.concat(events);
      console.log(`    Found ${events.length} sales in this chunk (total: ${allSoldEvents.length})`);
      
    } catch (error) {
      console.error(`    Error scanning chunk:`, error);
    }
    
    fromBlock = toBlock + 1;
  }
  
  // Calculate total secondary sales volume
  let totalSecondaryVolume = 0;
  const salesDetails: any[] = [];
  
  for (const event of allSoldEvents) {
    const log = event as ethers.EventLog;
    const tokenId = Number(log.args[0]);
    const seller = log.args[1] as string;
    const buyer = log.args[2] as string;
    const price = log.args[3];
    const fee = log.args[4];
    
    const priceInBased = Number(ethers.formatEther(price));
    totalSecondaryVolume += priceInBased;
    
    salesDetails.push({
      tokenId,
      price: priceInBased,
      blockNumber: log.blockNumber,
      txHash: log.transactionHash,
    });
  }
  
  console.log(`\n📊 SECONDARY SALES DATA:`);
  console.log(`  Total secondary sales: ${allSoldEvents.length}`);
  console.log(`  Total secondary volume: ${totalSecondaryVolume.toLocaleString()} $BASED`);
  
  if (salesDetails.length > 0) {
    console.log(`\n  Recent sales:`);
    salesDetails.slice(-10).forEach(sale => {
      console.log(`    #${sale.tokenId} - ${sale.price.toLocaleString()} $BASED (block ${sale.blockNumber})`);
    });
  }
  
  // Calculate total volume
  const totalVolume = totalMintVolume + totalSecondaryVolume;
  
  console.log(`\n💰 TOTAL VOLUME:`);
  console.log(`  Mint volume: ${totalMintVolume.toLocaleString()} $BASED`);
  console.log(`  Secondary volume: ${totalSecondaryVolume.toLocaleString()} $BASED`);
  console.log(`  ───────────────────────────────────────`);
  console.log(`  TOTAL: ${totalVolume.toLocaleString()} $BASED`);
  
  console.log(`\n📝 UPDATE constants.ts WITH THIS:`);
  console.log(`
export const CUMULATIVE_SALES_BASELINE = {
  volume: ${totalSecondaryVolume},
  salesCount: ${allSoldEvents.length},
  asOfBlock: ${currentBlock},
  lastUpdated: "${new Date().toISOString().split('T')[0]}"
};
  `);
  
  console.log(`\n✅ Scan complete!\n`);
}

scanHistoricalVolume().catch(console.error);
