/**
 * Financial Validator - Pre-transaction validation for financial operations
 * 
 * Validates mint calculations, marketplace fees, balances, and revenue splits
 * before transactions are executed to catch errors early.
 */

import { SafeMath } from './safeMath';
import { 
  MINT_SPLIT, 
  ROYALTY_SPLIT,
  PLATFORM_FEE_PERCENT 
} from './constants';

const MINT_PRICE = 69420;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class FinancialValidator {
  /**
   * Validate mint calculation before transaction
   */
  static validateMintCalculation(quantity: number, totalCost: bigint): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (quantity <= 0) {
      errors.push('Quantity must be positive');
    }
    
    if (quantity > 20) {
      warnings.push('Large quantity may cause gas issues');
    }

    if (!Number.isInteger(quantity)) {
      errors.push('Quantity must be a whole number');
    }
    
    const mintPriceWei = SafeMath.toWei(MINT_PRICE.toString());
    const expectedCost = mintPriceWei * BigInt(quantity);
    
    if (totalCost !== expectedCost) {
      errors.push(`Cost mismatch: expected ${SafeMath.format(expectedCost)}, got ${SafeMath.format(totalCost)}`);
    }

    const validation = SafeMath.validate(totalCost);
    if (!validation.valid) {
      errors.push(validation.error || 'Invalid total cost');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate marketplace fees before transaction
   */
  static validateMarketplaceFees(
    salePrice: bigint, 
    platformFee: bigint, 
    royaltyFee: bigint
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (salePrice === BigInt(0)) {
      errors.push('Sale price cannot be zero');
      return { valid: false, errors, warnings };
    }
    
    const expectedPlatformFee = SafeMath.mulPercent(salePrice, PLATFORM_FEE_PERCENT);
    const expectedRoyaltyFee = SafeMath.mulPercent(salePrice, ROYALTY_SPLIT.TOTAL_ROYALTY_PERCENT);
    
    if (platformFee !== expectedPlatformFee) {
      errors.push(`Platform fee mismatch: expected ${SafeMath.format(expectedPlatformFee)}, got ${SafeMath.format(platformFee)}`);
    }
    
    if (royaltyFee !== expectedRoyaltyFee) {
      errors.push(`Royalty fee mismatch: expected ${SafeMath.format(expectedRoyaltyFee)}, got ${SafeMath.format(royaltyFee)}`);
    }
    
    const totalFees = SafeMath.add(platformFee, royaltyFee);
    if (SafeMath.gte(totalFees, salePrice)) {
      errors.push('Total fees exceed sale price');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate user balance before transaction
   */
  static validateBalance(userBalance: bigint, requiredAmount: bigint): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (SafeMath.lte(userBalance, BigInt(0))) {
      errors.push('Insufficient balance: balance is zero');
      return { valid: false, errors, warnings };
    }
    
    if (!SafeMath.gte(userBalance, requiredAmount)) {
      errors.push(`Insufficient balance: have ${SafeMath.format(userBalance)}, need ${SafeMath.format(requiredAmount)}`);
      return { valid: false, errors, warnings };
    }
    
    const margin = SafeMath.sub(userBalance, requiredAmount);
    const gasEstimate = SafeMath.toWei('100');
    
    if (SafeMath.lte(margin, gasEstimate)) {
      warnings.push('Balance is close to required amount, may fail due to gas costs');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate revenue split adds up correctly
   */
  static validateRevenueSplit(totalRevenue: bigint, splits: Record<string, bigint>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    let sumOfSplits = BigInt(0);
    for (const split of Object.values(splits)) {
      sumOfSplits = SafeMath.add(sumOfSplits, split);
    }
    
    const difference = totalRevenue > sumOfSplits 
      ? SafeMath.sub(totalRevenue, sumOfSplits)
      : SafeMath.sub(sumOfSplits, totalRevenue);
    
    const tolerance = SafeMath.toWei('0.000001');
    
    if (difference > tolerance) {
      errors.push(`Revenue split mismatch: total ${SafeMath.format(totalRevenue)}, splits sum to ${SafeMath.format(sumOfSplits)}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate listing price meets minimum
   */
  static validateListingPrice(priceWei: bigint): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const minPrice = SafeMath.toWei('1');
    
    if (!SafeMath.gte(priceWei, minPrice)) {
      errors.push('Minimum listing price is 1 $BASED');
    }

    const validation = SafeMath.validate(priceWei);
    if (!validation.valid) {
      errors.push(validation.error || 'Invalid price');
    }

    const veryLowPrice = SafeMath.toWei('1000');
    if (SafeMath.lte(priceWei, veryLowPrice)) {
      warnings.push('Price is very low - consider if this is intentional');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate offer amount meets minimum
   */
  static validateOfferAmount(offerWei: bigint): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const minOffer = SafeMath.toWei('1000');
    
    if (!SafeMath.gte(offerWei, minOffer)) {
      errors.push('Minimum offer is 1,000 $BASED');
    }

    const validation = SafeMath.validate(offerWei);
    if (!validation.valid) {
      errors.push(validation.error || 'Invalid offer amount');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Run all pre-transaction checks
   */
  static preTransactionCheck(
    type: 'mint' | 'buy' | 'list' | 'offer',
    amount: bigint,
    userBalance?: bigint,
    quantity?: number
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (userBalance !== undefined) {
      const balanceCheck = this.validateBalance(userBalance, amount);
      errors.push(...balanceCheck.errors);
      warnings.push(...balanceCheck.warnings);
    }

    switch (type) {
      case 'mint':
        if (quantity !== undefined) {
          const mintCheck = this.validateMintCalculation(quantity, amount);
          errors.push(...mintCheck.errors);
          warnings.push(...mintCheck.warnings);
        }
        break;
      case 'list':
        const listCheck = this.validateListingPrice(amount);
        errors.push(...listCheck.errors);
        warnings.push(...listCheck.warnings);
        break;
      case 'offer':
        const offerCheck = this.validateOfferAmount(amount);
        errors.push(...offerCheck.errors);
        warnings.push(...offerCheck.warnings);
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}
