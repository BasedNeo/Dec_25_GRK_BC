import { DisasterRecoveryService } from '../server/lib/disasterRecovery';

async function testDR() {
  console.log('🆘 Testing Disaster Recovery System...\n');
  
  try {
    console.log('1. Running automated tests...');
    const testResults = await DisasterRecoveryService.testDisasterRecovery();
    
    console.log(`\n✅ Test Results: ${testResults.passed ? 'PASSED' : 'FAILED'}\n`);
    
    testResults.tests.forEach((test: any) => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${status} ${test.name}`);
      if (test.duration) console.log(`   Duration: ${test.duration}ms`);
      if (test.error) console.log(`   Error: ${test.error}`);
      console.log('');
    });
    
    console.log('2. Creating sample recovery plan...');
    const plan = await DisasterRecoveryService.createRecoveryPlan('DATA_LOSS');
    
    console.log(`✅ Plan created: ${plan.steps.length} steps`);
    console.log(`   Estimated duration: ${Math.ceil(plan.estimatedTotalDuration / 60)} minutes\n`);
    
    plan.steps.forEach((step, i) => {
      console.log(`   ${i + 1}. ${step.description}`);
      console.log(`      ${step.automated ? '🤖 Automated' : '👤 Manual'} • ${Math.ceil(step.estimatedDuration / 60)} min`);
    });
    
    console.log('\n✅ Disaster Recovery test complete');
    
    if (!testResults.passed) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testDR();
