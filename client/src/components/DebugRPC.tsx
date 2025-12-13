import { useEffect } from 'react';

export function DebugRPC() {
  useEffect(() => {
    // DEBUG: Test RPC connection
    async function testRPCConnection() {
      console.log('🔍 Testing RPC connection...');
      
      const RPC_URL = 'https://mainnet.basedaibridge.com/rpc/';
      const CONTRACT_ADDRESS = '0xaE51dc5fD1499A129f8654963560f9340773ad59';
      
      try {
        // Test 1: Basic RPC call
        const response = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1
          })
        });
        
        const data = await response.json();
        console.log('✅ RPC connected. Block:', parseInt(data.result, 16));
        
        // Test 2: Contract call (totalMinted)
        const totalMintedCall = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{
              to: CONTRACT_ADDRESS,
              data: '0xa2309ff8' // totalMinted() function selector
            }, 'latest'],
            id: 2
          })
        });
        
        const mintedData = await totalMintedCall.json();
        const totalMinted = parseInt(mintedData.result, 16);
        console.log('✅ Total minted:', totalMinted);
        
        return { connected: true, totalMinted };
        
      } catch (error: any) {
        console.error('❌ RPC connection failed:', error);
        return { connected: false, error: error.message };
      }
    }

    // Run on page load
    testRPCConnection();
  }, []);

  return null; // This component renders nothing
}
