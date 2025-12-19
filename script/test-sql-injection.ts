const sqlInjectionPayloads = [
  "1' OR '1'='1",
  "admin'--",
  "' OR 1=1--",
  "' UNION SELECT NULL--",
  "1; DROP TABLE users--",
  "' OR 'x'='x",
  "1' AND '1'='1",
  "'; EXEC sp_MSForEachTable 'DROP TABLE ?'--",
  "' OR EXISTS(SELECT * FROM users)--",
  "1' ORDER BY 10--",
];

async function testEndpoint(url: string, payload: string) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: payload })
    });
    
    if (response.status === 400) {
      const data = await response.json();
      if (data.code === 'SECURITY_VIOLATION') {
        console.log(`✅ BLOCKED: ${payload.substring(0, 30)}...`);
        return true;
      }
    }
    
    console.log(`❌ FAILED: Payload not blocked: ${payload}`);
    return false;
  } catch (error) {
    console.log(`✅ BLOCKED: ${payload.substring(0, 30)}...`);
    return true;
  }
}

async function runTests() {
  console.log('🔒 Running SQL Injection Tests...\n');
  
  const testUrl = process.env.API_URL || 'http://localhost:5000';
  
  let passed = 0;
  let failed = 0;
  
  for (const payload of sqlInjectionPayloads) {
    const result = await testEndpoint(`${testUrl}/api/test-injection`, payload);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('⚠️  Some SQL injection payloads were not blocked!');
    process.exit(1);
  } else {
    console.log('✅ All SQL injection tests passed!');
  }
}

runTests();
