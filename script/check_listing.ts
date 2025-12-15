import { createPublicClient, http, formatEther } from 'viem';

const MARKETPLACE = '0x2836f07Ed31a6DEc09E0d62Fb15D7c6c6Ddb139c';
const NFT_CONTRACT = '0xaE51dc5fD1499A129f8654963560f9340773ad59';

const client = createPublicClient({
  chain: {
    id: 32323,
    name: 'BasedAI',
    nativeCurrency: { name: 'BASED', symbol: 'BASED', decimals: 18 },
    rpcUrls: { default: { http: ['https://mainnet.basedaibridge.com/rpc/'] } },
  },
  transport: http('https://mainnet.basedaibridge.com/rpc/'),
});

async function main() {
  // Check listing for #149
  try {
    const listing = await client.readContract({
      address: MARKETPLACE as `0x${string}`,
      abi: [{
        name: 'getListing',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        outputs: [
          { name: 'seller', type: 'address' },
          { name: 'price', type: 'uint256' },
          { name: 'listedAt', type: 'uint256' },
          { name: 'active', type: 'bool' }
        ],
      }],
      functionName: 'getListing',
      args: [149n],
    });
    
    console.log('NFT #149 Listing:');
    console.log('  Seller:', listing[0]);
    console.log('  Price:', formatEther(listing[1]), 'BASED');
    console.log('  Active:', listing[3]);
  } catch (e: any) {
    console.log('No listing found for #149:', e.message);
  }

  // Check all active listings
  try {
    const activeIds = await client.readContract({
      address: MARKETPLACE as `0x${string}`,
      abi: [{
        name: 'getActiveListings',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256[]' }],
      }],
      functionName: 'getActiveListings',
    }) as bigint[];
    
    console.log('\nAll active listings:', activeIds.map(id => Number(id)));
  } catch (e: any) {
    console.log('Could not fetch active listings:', e.message);
  }
}

main().catch(console.error);
