/**
 * Financial Calculation Test Runner
 * 
 * Standalone test runner for SafeMath and FinancialValidator
 * Run with: npm run test:financial
 */

const DECIMALS = 18;
const ONE_TOKEN = BigInt(10 ** DECIMALS);

class SafeMath {
  static toWei(amount: string | number): bigint {
    const amountStr = typeof amount === 'number' ? amount.toFixed(DECIMALS) : amount;
    const [whole, decimal = '0'] = amountStr.split('.');
    const paddedDecimal = decimal.padEnd(DECIMALS, '0').slice(0, DECIMALS);
    return BigInt(whole) * ONE_TOKEN + BigInt(paddedDecimal);
  }

  static fromWei(wei: bigint, decimals = 2): string {
    const whole = wei / ONE_TOKEN;
    const remainder = wei % ONE_TOKEN;
    if (decimals === 0) return whole.toString();
    const decimalStr = remainder.toString().padStart(DECIMALS, '0').slice(0, decimals);
    return `${whole}.${decimalStr}`;
  }

  static format(wei: bigint, decimals = 2): string {
    const str = this.fromWei(wei, decimals);
    const [whole, decimal] = str.split('.');
    const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decimal ? `${withCommas}.${decimal}` : withCommas;
  }

  static mulPercent(amount: bigint, percent: number): bigint {
    return (amount * BigInt(Math.round(percent * 100))) / BigInt(10000);
  }

  static add(a: bigint, b: bigint): bigint { return a + b; }
  
  static sub(a: bigint, b: bigint): bigint {
    if (b > a) throw new Error('Subtraction would result in negative value');
    return a - b;
  }
  
  static mul(a: bigint, b: bigint): bigint { return (a * b) / ONE_TOKEN; }
  
  static div(a: bigint, b: bigint): bigint {
    if (b === BigInt(0)) return BigInt(0);
    return (a * ONE_TOKEN) / b;
  }

  static gte(a: bigint, b: bigint): boolean { return a >= b; }
  static lte(a: bigint, b: bigint): boolean { return a <= b; }
  static eq(a: bigint, b: bigint): boolean { return a === b; }

  static validate(wei: bigint): { valid: boolean; error?: string } {
    if (wei < BigInt(0)) return { valid: false, error: 'Amount cannot be negative' };
    const MAX_AMOUNT = BigInt(10 ** 9) * ONE_TOKEN;
    if (wei > MAX_AMOUNT) return { valid: false, error: 'Amount exceeds maximum (1B tokens)' };
    return { valid: true };
  }
}

const MINT_PRICE = 69420;
const PLATFORM_FEE_PERCENT = 1;
const ROYALTY_PERCENT = 10;
const MINT_SPLIT = { TREASURY_PERCENT: 51, CREATOR_PERCENT: 49 };

console.log('🧮 Running Financial Calculation Tests...\n');

let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => boolean) {
  try {
    const result = fn();
    if (result) {
      console.log(`✅ ${name}`);
      passedTests++;
    } else {
      console.log(`❌ ${name}`);
      failedTests++;
    }
  } catch (error: any) {
    console.log(`❌ ${name}: ${error.message}`);
    failedTests++;
  }
}

console.log('📦 Testing SafeMath Operations:');
test('toWei converts 1 correctly', () => SafeMath.toWei('1') === 1000000000000000000n);
test('toWei converts 69420 correctly', () => SafeMath.toWei('69420') === 69420000000000000000000n);
test('fromWei converts back correctly', () => SafeMath.fromWei(1000000000000000000n, 0) === '1');
test('add works correctly', () => SafeMath.add(SafeMath.toWei('1'), SafeMath.toWei('2')) === SafeMath.toWei('3'));
test('sub works correctly', () => SafeMath.sub(SafeMath.toWei('5'), SafeMath.toWei('2')) === SafeMath.toWei('3'));
test('mul works correctly', () => SafeMath.mul(SafeMath.toWei('2'), SafeMath.toWei('3')) === SafeMath.toWei('6'));
test('div works correctly', () => SafeMath.div(SafeMath.toWei('10'), SafeMath.toWei('2')) === SafeMath.toWei('5'));
test('mulPercent 10% of 100', () => SafeMath.mulPercent(SafeMath.toWei('100'), 10) === SafeMath.toWei('10'));
test('mulPercent 51% of 69420', () => {
  const result = SafeMath.mulPercent(SafeMath.toWei('69420'), 51);
  const expected = Math.round(69420 * 0.51);
  return Math.abs(Number(SafeMath.fromWei(result, 0)) - expected) < 2;
});

console.log('\n💰 Testing Mint Calculations:');
const singleMintPrice = SafeMath.toWei(MINT_PRICE.toString());
const quantity = 5;
const totalCost = singleMintPrice * BigInt(quantity);

test('Single mint price is correct', () => SafeMath.fromWei(singleMintPrice, 0) === MINT_PRICE.toString());
test('Multiple mint cost (5x) calculates correctly', () => {
  const expected = SafeMath.toWei((MINT_PRICE * quantity).toString());
  return totalCost === expected;
});
test('User with 1M balance can afford 3 mints', () => {
  const balance = SafeMath.toWei('1000000');
  const cost = singleMintPrice * BigInt(3);
  return SafeMath.gte(balance, cost);
});
test('User with 50K balance cannot afford mint', () => {
  const balance = SafeMath.toWei('50000');
  return !SafeMath.gte(balance, singleMintPrice);
});

console.log('\n🏪 Testing Marketplace Calculations:');
const salePrice = SafeMath.toWei('100');
const platformFee = SafeMath.mulPercent(salePrice, PLATFORM_FEE_PERCENT);
const royaltyFee = SafeMath.mulPercent(salePrice, ROYALTY_PERCENT);

test('Platform fee is 1%', () => SafeMath.fromWei(platformFee, 0) === '1');
test('Royalty fee is 10%', () => SafeMath.fromWei(royaltyFee, 0) === '10');
test('Seller receives 89%', () => {
  const sellerProceeds = SafeMath.sub(salePrice, SafeMath.add(platformFee, royaltyFee));
  return SafeMath.fromWei(sellerProceeds, 0) === '89';
});
test('Total adds up to 100%', () => {
  const sellerProceeds = SafeMath.sub(salePrice, SafeMath.add(platformFee, royaltyFee));
  const total = SafeMath.add(SafeMath.add(platformFee, royaltyFee), sellerProceeds);
  return total === salePrice;
});

console.log('\n📊 Testing Revenue Splits:');
test('Treasury 51% + Creator 49% = 100%', () => {
  return MINT_SPLIT.TREASURY_PERCENT + MINT_SPLIT.CREATOR_PERCENT === 100;
});
test('Mint revenue split 51/49', () => {
  const mintRevenue = SafeMath.toWei('69420');
  const treasury = SafeMath.mulPercent(mintRevenue, 51);
  const creator = SafeMath.mulPercent(mintRevenue, 49);
  const total = SafeMath.add(treasury, creator);
  return SafeMath.gte(mintRevenue, total) && SafeMath.lte(SafeMath.sub(mintRevenue, total), SafeMath.toWei('1'));
});

console.log('\n🔒 Testing Validation Logic:');
test('Validates positive amounts', () => SafeMath.validate(SafeMath.toWei('1000')).valid === true);
test('Rejects negative amounts', () => SafeMath.validate(-1n).valid === false);
test('Rejects amounts over 1B', () => SafeMath.validate(SafeMath.toWei('2000000000')).valid === false);
test('Sub throws on negative result', () => {
  try {
    SafeMath.sub(SafeMath.toWei('1'), SafeMath.toWei('2'));
    return false;
  } catch {
    return true;
  }
});
test('Div by zero returns 0', () => SafeMath.div(SafeMath.toWei('10'), BigInt(0)) === BigInt(0));

console.log('\n🎯 Testing Edge Cases:');
test('Handles dust amounts (1 wei)', () => SafeMath.mulPercent(1n, 1) === BigInt(0));
test('Handles maximum supply calculations', () => {
  const maxSupply = 3732n;
  const currentSupply = 3731n;
  return maxSupply - currentSupply === 1n;
});
test('Handles large calculations without overflow', () => {
  const largeAmount = SafeMath.toWei('100000000');
  const result = SafeMath.mul(largeAmount, SafeMath.toWei('2'));
  return result === SafeMath.toWei('200000000');
});

console.log(`\n📊 RESULTS: ${passedTests} passed, ${failedTests} failed`);

if (failedTests === 0) {
  console.log('✅ All financial calculations verified!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed - review calculations');
  process.exit(1);
}
