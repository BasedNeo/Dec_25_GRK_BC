import { ethers } from 'ethers';

const RPC_URL = 'https://mainnet.basedaibridge.com/rpc/';
const NFT_CONTRACT = '0xaE51dc5fD1499A129f8654963560f9340773ad59';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(NFT_CONTRACT, [
    'function totalSupply() view returns (uint256)',
    'function tokenByIndex(uint256 index) view returns (uint256)',
    'function ownerOf(uint256 tokenId) view returns (address)',
  ], provider);
  
  const totalSupply = await contract.totalSupply();
  console.log('Total minted NFTs:', Number(totalSupply));
  
  console.log('\nMinted token IDs:');
  for (let i = 0; i < Number(totalSupply); i++) {
    try {
      const tokenId = await contract.tokenByIndex(i);
      const owner = await contract.ownerOf(tokenId);
      console.log(`  Index ${i}: Token #${Number(tokenId)} - Owner: ${owner}`);
    } catch(e) {
      console.log(`  Index ${i}: Error`);
    }
  }
}

main().catch(console.error);
