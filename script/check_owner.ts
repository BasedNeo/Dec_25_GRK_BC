import { ethers } from 'ethers';

const RPC_URL = 'https://mainnet.basedaibridge.com/rpc/';
const NFT_CONTRACT = '0xaE51dc5fD1499A129f8654963560f9340773ad59';
const TOKEN_ID = 149;

const ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokensOfOwner(address owner) view returns (uint256[])',
  'function balanceOf(address owner) view returns (uint256)'
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(NFT_CONTRACT, ABI, provider);
  
  // Check who owns #149
  const owner = await contract.ownerOf(TOKEN_ID);
  console.log(`NFT #149 owner: ${owner}`);
  
  // Check if this is the marketplace contract
  const MARKETPLACE = '0x2836f07Ed31a6DEc09E0d62Fb15D7c6c6Ddb139c';
  if (owner.toLowerCase() === MARKETPLACE.toLowerCase()) {
    console.log('>>> NFT #149 is held by the MARKETPLACE (V1 escrow style)');
  } else {
    console.log('>>> NFT #149 is in a regular wallet');
    const balance = await contract.balanceOf(owner);
    console.log(`Owner balance: ${balance}`);
    
    try {
      const tokens = await contract.tokensOfOwner(owner);
      console.log(`All tokens for ${owner}: ${tokens.map((t: bigint) => Number(t)).join(', ')}`);
    } catch(e: any) {
      console.log('Could not fetch tokensOfOwner:', e.message);
    }
  }
}

main().catch(console.error);
