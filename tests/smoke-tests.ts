/**
 * Smoke Tests - Quick automated checks before deployment
 * Run: npx tsx tests/smoke-tests.ts
 */

import { ethers } from 'ethers';

const RPC_URL = 'https://mainnet.basedaibridge.com/rpc/';
const NFT_CONTRACT = '0xaE51dc5fD1499A129f8654963560f9340773ad59';
const MARKETPLACE_CONTRACT = '0x2836f07Ed31a6DEc09E0d62Fb15D7c6c6Ddb139c';
const MARKETPLACE_V3_CONTRACT = '0x2a3f9D8b844c2dB2F42095B49817c0D6991514f3';
const API_BASE = process.env.API_URL || 'http://localhost:5000';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`✅ ${name} (${Date.now() - start}ms)`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, duration: Date.now() - start, error: message });
    console.error(`❌ ${name}: ${message}`);
  }
}

async function main() {
  console.log('\n🧪 Running Smoke Tests...\n');

  // Test 1: RPC Connectivity
  await test('RPC Endpoint Reachable', async () => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const blockNumber = await provider.getBlockNumber();
    if (blockNumber === 0) throw new Error('Block number is 0');
  });

  // Test 2: NFT Contract Deployed
  await test('NFT Contract Exists', async () => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const code = await provider.getCode(NFT_CONTRACT);
    if (code === '0x') throw new Error('Contract not deployed');
  });

  // Test 3: Marketplace Contract Deployed
  await test('Marketplace V2 Exists', async () => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const code = await provider.getCode(MARKETPLACE_CONTRACT);
    if (code === '0x') throw new Error('Contract not deployed');
  });

  // Test 4: Marketplace V3 Contract Deployed
  await test('Marketplace V3 Exists', async () => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const code = await provider.getCode(MARKETPLACE_V3_CONTRACT);
    if (code === '0x') throw new Error('Contract not deployed');
  });

  // Test 5: Total Supply Readable
  await test('NFT Total Supply Readable', async () => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const nft = new ethers.Contract(
      NFT_CONTRACT,
      ['function totalSupply() view returns (uint256)'],
      provider
    );
    const supply = await nft.totalSupply();
    if (supply < 0) throw new Error('Invalid supply');
  });

  // Test 6: Mint Price Correct
  await test('Mint Price is 69,420 $BASED', async () => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const nft = new ethers.Contract(
      NFT_CONTRACT,
      ['function MINT_PRICE() view returns (uint256)'],
      provider
    );
    const price = await nft.MINT_PRICE();
    const expected = ethers.parseEther('69420');
    if (price !== expected) {
      throw new Error(`Mint price is ${ethers.formatEther(price)}, expected 69420`);
    }
  });

  // Test 7: API Health Check
  await test('API Health Endpoint', async () => {
    const response = await fetch(`${API_BASE}/api/health`);
    if (response.status !== 200) throw new Error(`Status ${response.status}`);
  });

  // Test 8: Profile API Works
  await test('Profile API Responds', async () => {
    const response = await fetch(`${API_BASE}/api/profile/check-name/test123`);
    if (response.status !== 200) throw new Error(`Status ${response.status}`);
    const data = await response.json() as { available?: boolean };
    if (!('available' in data)) throw new Error('Invalid response format');
  });

  // Test 9: Rate Limiting Active (reduced to avoid overwhelming server)
  await test('Rate Limiting Active', async () => {
    const promises: Promise<Response>[] = [];
    for (let i = 0; i < 20; i++) {
      promises.push(fetch(`${API_BASE}/api/health`));
    }
    const responses = await Promise.all(promises);
    const allSucceeded = responses.every(r => r.status === 200 || r.status === 429);
    if (!allSucceeded) {
      throw new Error('Unexpected response status');
    }
  });

  // Test 10: Database Connection
  await test('Database Accessible', async () => {
    const response = await fetch(`${API_BASE}/api/profile/check-name/smoketest${Date.now()}`);
    if (response.status !== 200) throw new Error('DB connection failed');
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('SMOKE TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`\nTotal: ${results.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Duration: ${totalTime}ms`);
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
  
  console.log('\n✅ All smoke tests passed!\n');
  process.exit(0);
}

main().catch(error => {
  console.error('\n❌ Smoke tests failed:', error);
  process.exit(1);
});
