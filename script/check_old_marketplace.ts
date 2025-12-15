import { createPublicClient, http, formatEther } from 'viem';

const OLD_MARKETPLACE = '0x88161576266dCDedb19342aC2197267282520793';

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
  // Check if #149 is listed on old marketplace
  try {
    const listing = await client.readContract({
      address: OLD_MARKETPLACE as `0x${string}`,
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
    
    console.log('NFT #149 on OLD Marketplace:');
    console.log('  Seller:', listing[0]);
    console.log('  Price:', formatEther(listing[1]), 'BASED');
    console.log('  Active:', listing[3]);
    console.log('\nTo get it back, you need to call cancelListing(149) on the old marketplace');
  } catch (e: any) {
    console.log('Error checking old marketplace:', e.message);
  }
}

main().catch(console.error);
