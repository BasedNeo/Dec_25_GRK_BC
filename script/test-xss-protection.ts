const API_URL = process.env.API_URL || 'http://localhost:5000';

const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  'javascript:alert("XSS")',
  '<svg onload=alert("XSS")>',
  '<iframe src="javascript:alert(\'XSS\')">',
  '"><script>alert(String.fromCharCode(88,83,83))</script>',
  '<body onload=alert("XSS")>',
];

async function testSanitization(payload: string, type: string) {
  try {
    const response = await fetch(`${API_URL}/api/admin/test-sanitization`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: payload, type })
    });
    
    const data = await response.json() as any;
    
    if (data.error) {
      console.log(`✅ PASSED: Payload rejected: ${payload.substring(0, 50)}...`);
      return true;
    }
    
    if (data.safe) {
      console.log(`❌ FAILED: Payload not sanitized: ${payload}`);
      return false;
    } else {
      console.log(`✅ PASSED: Payload sanitized: ${payload.substring(0, 50)}...`);
      console.log(`   Original: ${data.original.substring(0, 30)}...`);
      console.log(`   Sanitized: ${data.sanitized.substring(0, 30)}...`);
      return true;
    }
  } catch (error: any) {
    console.log(`⚠️  ERROR: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🔒 Running XSS Protection Tests...\n');
  console.log('Note: These tests require admin authentication to access the test endpoint.\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const payload of xssPayloads) {
    const result = await testSanitization(payload, 'default');
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('⚠️  Some XSS payloads were not properly sanitized!');
    process.exit(1);
  } else {
    console.log('✅ All XSS protection tests passed!');
  }
}

runTests();
