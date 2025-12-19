async function runSmokeTests() {
  console.log('Running Production Smoke Tests...\n');
  
  const baseUrl = process.env.API_URL || 'http://localhost:5000';
  
  const tests = [
    {
      name: 'Health Check',
      test: async () => {
        const res = await fetch(`${baseUrl}/api/health/complete`);
        const data = await res.json();
        return data.healthy;
      }
    },
    {
      name: 'Database Connection',
      test: async () => {
        const res = await fetch(`${baseUrl}/api/health/system`);
        const data = await res.json();
        return data.healthy;
      }
    },
    {
      name: 'Contract Connection',
      test: async () => {
        const res = await fetch(`${baseUrl}/api/nfts?limit=1`);
        return res.ok;
      }
    },
    {
      name: 'NFT Gallery',
      test: async () => {
        const res = await fetch(`${baseUrl}/api/nfts?page=1&limit=10`);
        return res.ok;
      }
    },
    {
      name: 'Marketplace Listings',
      test: async () => {
        const res = await fetch(`${baseUrl}/api/marketplace/listings`);
        return res.ok;
      }
    },
    {
      name: 'Governance Proposals',
      test: async () => {
        const res = await fetch(`${baseUrl}/api/proposals`);
        return res.ok;
      }
    },
    {
      name: 'Activity Feed',
      test: async () => {
        const res = await fetch(`${baseUrl}/api/activity/recent`);
        return res.ok;
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.test();
      if (result) {
        console.log(`PASS ${test.name}`);
        passed++;
      } else {
        console.log(`FAIL ${test.name}`);
        failed++;
      }
    } catch (error) {
      console.log(`FAIL ${test.name}: ${error}`);
      failed++;
    }
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\nSome smoke tests failed!');
    process.exit(1);
  } else {
    console.log('\nAll smoke tests passed!');
  }
}

runSmokeTests();
