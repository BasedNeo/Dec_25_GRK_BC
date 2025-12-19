import fetch from 'node-fetch';

interface TestResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  duration: number;
}

const results: TestResult[] = [];
const BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000';

async function testAPI() {
  console.log('\n🔍 Testing API Endpoints...\n');
  
  // Health check
  const healthStart = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json() as any;
    results.push({
      category: 'API',
      test: 'Health Check',
      status: res.ok ? 'PASS' : 'FAIL',
      message: `Status: ${data.status}`,
      duration: Date.now() - healthStart
    });
  } catch (error: any) {
    results.push({
      category: 'API',
      test: 'Health Check',
      status: 'FAIL',
      message: error.message,
      duration: Date.now() - healthStart
    });
  }
  
  // NFTs endpoint
  const nftStart = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/nfts?limit=10`, { signal: AbortSignal.timeout(10000) });
    const data = await res.json() as any;
    const count = Array.isArray(data) ? data.length : (data.nfts?.length || 0);
    results.push({
      category: 'API',
      test: 'Fetch NFTs',
      status: res.ok ? 'PASS' : 'FAIL',
      message: `Returned ${count} NFTs`,
      duration: Date.now() - nftStart
    });
  } catch (error: any) {
    results.push({
      category: 'API',
      test: 'Fetch NFTs',
      status: 'FAIL',
      message: error.message,
      duration: Date.now() - nftStart
    });
  }
  
  // Proposals endpoint
  const propStart = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/proposals`, { signal: AbortSignal.timeout(5000) });
    results.push({
      category: 'API',
      test: 'Fetch Proposals',
      status: res.ok ? 'PASS' : 'FAIL',
      message: `Response: ${res.status}`,
      duration: Date.now() - propStart
    });
  } catch (error: any) {
    results.push({
      category: 'API',
      test: 'Fetch Proposals',
      status: 'FAIL',
      message: error.message,
      duration: Date.now() - propStart
    });
  }

  // Leaderboard endpoint
  const leaderStart = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/game/leaderboard`, { signal: AbortSignal.timeout(5000) });
    results.push({
      category: 'API',
      test: 'Game Leaderboard',
      status: res.ok ? 'PASS' : 'FAIL',
      message: `Response: ${res.status}`,
      duration: Date.now() - leaderStart
    });
  } catch (error: any) {
    results.push({
      category: 'API',
      test: 'Game Leaderboard',
      status: 'FAIL',
      message: error.message,
      duration: Date.now() - leaderStart
    });
  }

  // Feedback endpoint
  const feedbackStart = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/feedback`, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000) 
    });
    results.push({
      category: 'API',
      test: 'Feedback System',
      status: res.ok || res.status === 405 ? 'PASS' : 'FAIL',
      message: `Response: ${res.status}`,
      duration: Date.now() - feedbackStart
    });
  } catch (error: any) {
    results.push({
      category: 'API',
      test: 'Feedback System',
      status: 'WARN',
      message: error.message,
      duration: Date.now() - feedbackStart
    });
  }
}

async function testRPC() {
  console.log('\n🔗 Testing RPC Connection...\n');
  
  const RPC_URL = 'https://mainnet.basedaibridge.com/rpc/';
  const start = Date.now();
  
  try {
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    const data = await res.json() as any;
    const blockNumber = parseInt(data.result, 16);
    
    results.push({
      category: 'RPC',
      test: 'BasedAI RPC Connection',
      status: 'PASS',
      message: `Block: ${blockNumber}`,
      duration: Date.now() - start
    });
  } catch (error: any) {
    results.push({
      category: 'RPC',
      test: 'BasedAI RPC Connection',
      status: 'FAIL',
      message: error.message,
      duration: Date.now() - start
    });
  }
}

async function testContracts() {
  console.log('\n📜 Testing Contract Interactions...\n');
  
  const RPC_URL = 'https://mainnet.basedaibridge.com/rpc/';
  const NFT_CONTRACT = '0xaE51dc5fD1499A129f8654963560f9340773ad59';
  
  // Test totalSupply
  const supplyStart = Date.now();
  try {
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: NFT_CONTRACT,
          data: '0x18160ddd' // totalSupply()
        }, 'latest'],
        id: 1
      }),
      signal: AbortSignal.timeout(10000)
    });
    
    const data = await res.json() as any;
    const totalSupply = parseInt(data.result, 16);
    
    results.push({
      category: 'Contract',
      test: 'NFT Total Supply',
      status: 'PASS',
      message: `Minted: ${totalSupply} / 3732`,
      duration: Date.now() - supplyStart
    });
  } catch (error: any) {
    results.push({
      category: 'Contract',
      test: 'NFT Total Supply',
      status: 'FAIL',
      message: error.message,
      duration: Date.now() - supplyStart
    });
  }
}

async function testDatabase() {
  console.log('\n🗄️ Testing Database Connection...\n');
  
  const dbStart = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    const data = await res.json() as any;
    
    const dbOk = data.database === 'ok' || data.status === 'healthy';
    results.push({
      category: 'Database',
      test: 'PostgreSQL Connection',
      status: dbOk ? 'PASS' : 'WARN',
      message: dbOk ? 'Connected' : 'Check database status',
      duration: Date.now() - dbStart
    });
  } catch (error: any) {
    results.push({
      category: 'Database',
      test: 'PostgreSQL Connection',
      status: 'FAIL',
      message: error.message,
      duration: Date.now() - dbStart
    });
  }
}

async function testExternalAPIs() {
  console.log('\n🌐 Testing External APIs...\n');
  
  // CoinGecko
  const cgStart = Date.now();
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json() as any;
    
    results.push({
      category: 'External',
      test: 'CoinGecko Price API',
      status: res.ok && data.bitcoin?.usd ? 'PASS' : 'WARN',
      message: data.bitcoin?.usd ? `BTC: $${data.bitcoin.usd}` : 'Rate limited',
      duration: Date.now() - cgStart
    });
  } catch (error: any) {
    results.push({
      category: 'External',
      test: 'CoinGecko Price API',
      status: 'WARN',
      message: error.message,
      duration: Date.now() - cgStart
    });
  }
  
  // IPFS Gateway
  const ipfsStart = Date.now();
  try {
    const res = await fetch(
      'https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeie3c5ahzsiiparmbr6lgdbpiukorbphvclx73dwr6vrjfalfyu52y/1.json',
      { signal: AbortSignal.timeout(10000) }
    );
    
    results.push({
      category: 'External',
      test: 'IPFS Gateway (Pinata)',
      status: res.ok ? 'PASS' : 'WARN',
      message: res.ok ? 'Accessible' : `Status: ${res.status}`,
      duration: Date.now() - ipfsStart
    });
  } catch (error: any) {
    results.push({
      category: 'External',
      test: 'IPFS Gateway (Pinata)',
      status: 'WARN',
      message: error.message,
      duration: Date.now() - ipfsStart
    });
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🧪 BASED GUARDIANS - CRITICAL FEATURE TESTING');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);
  
  await testAPI();
  await testRPC();
  await testContracts();
  await testDatabase();
  await testExternalAPIs();
  
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  
  // Group by category
  const categories = [...new Set(results.map(r => r.category))];
  
  for (const category of categories) {
    console.log(`\n📁 ${category.toUpperCase()}`);
    console.log('─'.repeat(50));
    
    const categoryResults = results.filter(r => r.category === category);
    for (const r of categoryResults) {
      const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${r.test}`);
      console.log(`   ${r.message} (${r.duration}ms)`);
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(`✅ PASSED: ${passed}`);
  console.log(`❌ FAILED: ${failed}`);
  console.log(`⚠️  WARNINGS: ${warned}`);
  console.log(`📊 TOTAL: ${results.length} tests`);
  console.log('═══════════════════════════════════════════════════════════════════\n');
  
  if (failed > 0) {
    console.log('🚨 CRITICAL FAILURES DETECTED - REVIEW BEFORE DEPLOYMENT');
    process.exit(1);
  } else if (warned > 0) {
    console.log('⚠️  SOME WARNINGS - REVIEW BUT DEPLOYMENT MAY PROCEED');
  } else {
    console.log('✅ ALL CRITICAL TESTS PASSED - READY FOR DEPLOYMENT\n');
  }
}

runAllTests().catch(console.error);
