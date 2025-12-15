import { ethers } from 'ethers';

const RPC_URL = 'https://mainnet.basedaibridge.com/rpc/';
const NFT_CONTRACT = '0xaE51dc5fD1499A129f8654963560f9340773ad59';

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(NFT_CONTRACT, [
    'function totalSupply() view returns (uint256)',
  ], provider);
  
  const totalSupply = await contract.totalSupply();
  console.log('Total minted NFTs:', Number(totalSupply));
}

main().catch(console.error);
