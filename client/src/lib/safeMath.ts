/**
 * SafeMath - Precision-safe financial calculations
 * ALL token amounts MUST use BigInt
 * NEVER use JavaScript numbers for token amounts
 */

const DECIMALS = 18;
const ONE_TOKEN = BigInt(10 ** DECIMALS);

export class SafeMath {
  /**
   * Convert human-readable token amount to Wei (BigInt)
   * Example: toWei("69420") => 69420000000000000000000n
   */
  static toWei(amount: string | number): bigint {
    try {
      const amountStr = typeof amount === 'number' ? amount.toFixed(DECIMALS) : amount;
      const [whole, decimal = '0'] = amountStr.split('.');
      
      const paddedDecimal = decimal.padEnd(DECIMALS, '0').slice(0, DECIMALS);
      
      return BigInt(whole) * ONE_TOKEN + BigInt(paddedDecimal);
    } catch (error) {
      console.error('[SafeMath] toWei failed:', error);
      throw new Error(`Invalid amount: ${amount}`);
    }
  }

  /**
   * Convert Wei (BigInt) to human-readable token amount
   * Example: fromWei(69420000000000000000000n) => "69420.0"
   */
  static fromWei(wei: bigint, decimals = 2): string {
    const whole = wei / ONE_TOKEN;
    const remainder = wei % ONE_TOKEN;
    
    if (decimals === 0) {
      return whole.toString();
    }
    
    const decimalStr = remainder.toString().padStart(DECIMALS, '0').slice(0, decimals);
    return `${whole}.${decimalStr}`;
  }

  /**
   * Format for display with commas
   * Example: format(69420000000000000000000n) => "69,420.00"
   */
  static format(wei: bigint, decimals = 2): string {
    const str = this.fromWei(wei, decimals);
    const [whole, decimal] = str.split('.');
    const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decimal ? `${withCommas}.${decimal}` : withCommas;
  }

  /**
   * Safely multiply token amount by percentage
   * Example: mulPercent(100000n, 51) => 51000n
   */
  static mulPercent(amount: bigint, percent: number): bigint {
    if (percent < 0 || percent > 100) {
      throw new Error('Percent must be between 0 and 100');
    }
    return (amount * BigInt(Math.round(percent * 100))) / BigInt(10000);
  }

  /**
   * Add two amounts safely
   */
  static add(a: bigint, b: bigint): bigint {
    return a + b;
  }

  /**
   * Subtract safely (throws if result would be negative)
   */
  static sub(a: bigint, b: bigint): bigint {
    if (b > a) {
      throw new Error('Subtraction would result in negative value');
    }
    return a - b;
  }

  /**
   * Multiply two amounts (both in Wei, result in Wei)
   */
  static mul(a: bigint, b: bigint): bigint {
    return (a * b) / ONE_TOKEN;
  }

  /**
   * Divide safely (returns 0 if divisor is 0)
   */
  static div(a: bigint, b: bigint): bigint {
    if (b === BigInt(0)) return BigInt(0);
    return (a * ONE_TOKEN) / b;
  }

  /**
   * Compare amounts
   */
  static gte(a: bigint, b: bigint): boolean {
    return a >= b;
  }

  static lte(a: bigint, b: bigint): boolean {
    return a <= b;
  }

  static eq(a: bigint, b: bigint): boolean {
    return a === b;
  }

  /**
   * Parse user input safely (handles commas, spaces)
   */
  static parseInput(input: string): bigint | null {
    try {
      const cleaned = input.replace(/[,\s]/g, '');
      if (!/^\d+\.?\d*$/.test(cleaned)) return null;
      return this.toWei(cleaned);
    } catch {
      return null;
    }
  }

  /**
   * Validate amount is within safe range
   */
  static validate(wei: bigint): { valid: boolean; error?: string } {
    if (wei < BigInt(0)) {
      return { valid: false, error: 'Amount cannot be negative' };
    }
    
    const MAX_AMOUNT = BigInt(10 ** 9) * ONE_TOKEN;
    if (wei > MAX_AMOUNT) {
      return { valid: false, error: 'Amount exceeds maximum (1B tokens)' };
    }
    
    return { valid: true };
  }
}

(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};
