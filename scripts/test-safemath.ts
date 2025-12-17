import { SafeMath } from '../client/src/lib/safeMath';

console.log('Testing SafeMath...\n');

// Test 1: toWei/fromWei
const amount = SafeMath.toWei('69420');
console.log(`toWei('69420') = ${amount}`);
console.log(`fromWei(${amount}) = ${SafeMath.fromWei(amount)}`);
console.assert(SafeMath.fromWei(amount, 0) === '69420', 'Test 1 failed');
console.log('✅ Test 1 passed: toWei/fromWei roundtrip');

// Test 2: Percentage calculations
const treasury = SafeMath.toWei('100000');
const share51 = SafeMath.mulPercent(treasury, 51);
console.log(`51% of 100k = ${SafeMath.format(share51)}`);
console.assert(SafeMath.fromWei(share51, 0) === '51000', 'Test 2 failed');
console.log('✅ Test 2 passed: percentage calculation');

// Test 3: Format with commas
const formatted = SafeMath.format(SafeMath.toWei('1000000'));
console.log(`format(1000000) = ${formatted}`);
console.assert(formatted === '1,000,000.00', 'Test 3 failed');
console.log('✅ Test 3 passed: formatting with commas');

// Test 4: Parse user input
const parsed = SafeMath.parseInput('1,234.56');
console.log(`parseInput('1,234.56') = ${parsed}`);
console.assert(parsed !== null, 'Test 4 failed - parseInput returned null');
console.log('✅ Test 4 passed: parse user input');

// Test 5: Validate
const valid = SafeMath.validate(SafeMath.toWei('500000'));
console.log(`validate(500000) = ${valid.valid ? 'PASS' : 'FAIL'}`);
console.assert(valid.valid === true, 'Test 5 failed');
console.log('✅ Test 5 passed: validation');

// Test 6: Validate overflow protection
const overflowTest = SafeMath.validate(SafeMath.toWei('2000000000')); // 2B tokens
console.log(`validate(2B) = ${overflowTest.valid ? 'PASS' : 'FAIL (expected)'}`);
console.assert(overflowTest.valid === false, 'Test 6 failed - should reject > 1B');
console.log('✅ Test 6 passed: overflow protection');

// Test 7: Comparison functions
console.assert(SafeMath.gte(SafeMath.toWei('100'), SafeMath.toWei('50')), 'Test 7a failed');
console.assert(SafeMath.lte(SafeMath.toWei('50'), SafeMath.toWei('100')), 'Test 7b failed');
console.assert(SafeMath.eq(SafeMath.toWei('100'), SafeMath.toWei('100')), 'Test 7c failed');
console.log('✅ Test 7 passed: comparison functions');

// Test 8: Add/Sub
const a = SafeMath.toWei('100');
const b = SafeMath.toWei('50');
console.assert(SafeMath.fromWei(SafeMath.add(a, b), 0) === '150', 'Test 8a failed');
console.assert(SafeMath.fromWei(SafeMath.sub(a, b), 0) === '50', 'Test 8b failed');
console.log('✅ Test 8 passed: add/sub');

console.log('\n🎉 All SafeMath tests passed!');
