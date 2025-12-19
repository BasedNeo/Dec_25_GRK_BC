export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ValidationRule {
  type: 'string' | 'number' | 'email' | 'url' | 'wallet';
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export class ClientValidator {
  static validateField(value: any, rule: ValidationRule): ValidationResult {
    if (!value || value === '') {
      if (rule.required) {
        return { valid: false, error: 'This field is required' };
      }
      return { valid: true };
    }
    
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          return { valid: false, error: 'Must be text' };
        }
        
        if (rule.minLength && value.length < rule.minLength) {
          return { valid: false, error: `Must be at least ${rule.minLength} characters` };
        }
        
        if (rule.maxLength && value.length > rule.maxLength) {
          return { valid: false, error: `Must be at most ${rule.maxLength} characters` };
        }
        
        if (rule.pattern && !rule.pattern.test(value)) {
          return { valid: false, error: 'Invalid format' };
        }
        break;
        
      case 'number':
        const num = typeof value === 'string' ? parseFloat(value) : value;
        
        if (isNaN(num) || !isFinite(num)) {
          return { valid: false, error: 'Must be a valid number' };
        }
        
        if (rule.min !== undefined && num < rule.min) {
          return { valid: false, error: `Must be at least ${rule.min}` };
        }
        
        if (rule.max !== undefined && num > rule.max) {
          return { valid: false, error: `Must be at most ${rule.max}` };
        }
        break;
        
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return { valid: false, error: 'Must be a valid email' };
        }
        break;
        
      case 'url':
        try {
          new URL(value);
        } catch {
          return { valid: false, error: 'Must be a valid URL' };
        }
        break;
        
      case 'wallet':
        if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
          return { valid: false, error: 'Must be a valid wallet address' };
        }
        break;
    }
    
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        return { 
          valid: false, 
          error: typeof customResult === 'string' ? customResult : 'Invalid value' 
        };
      }
    }
    
    return { valid: true };
  }
  
  static validateForm(
    values: Record<string, any>,
    rules: Record<string, ValidationRule>
  ): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    
    for (const [field, rule] of Object.entries(rules)) {
      const result = this.validateField(values[field], rule);
      if (!result.valid && result.error) {
        errors[field] = result.error;
      }
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
}

export function validateMintQuantity(quantity: number, remainingSupply: number): ValidationResult {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { valid: false, error: 'Quantity must be at least 1' };
  }
  if (quantity > 10) {
    return { valid: false, error: 'Maximum 10 NFTs per transaction' };
  }
  if (quantity > remainingSupply) {
    return { valid: false, error: `Only ${remainingSupply} NFTs remaining` };
  }
  return { valid: true };
}

export function validateListPrice(price: number): ValidationResult {
  if (typeof price !== 'number' || isNaN(price)) {
    return { valid: false, error: 'Price must be a valid number' };
  }
  if (price <= 0) {
    return { valid: false, error: 'Price must be greater than 0' };
  }
  if (price > 1000000000) {
    return { valid: false, error: 'Price exceeds maximum allowed' };
  }
  return { valid: true };
}

export function validateOfferAmount(amount: number, userBalance: number): ValidationResult {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, error: 'Offer amount must be a valid number' };
  }
  if (amount <= 0) {
    return { valid: false, error: 'Offer must be greater than 0' };
  }
  if (amount > userBalance) {
    return { valid: false, error: 'Offer exceeds your balance' };
  }
  return { valid: true };
}

export function validateProposalTitle(title: string): ValidationResult {
  const trimmed = title.trim();
  if (trimmed.length < 1) {
    return { valid: false, error: 'Title is required' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Title must be 100 characters or less' };
  }
  return { valid: true };
}

export function validateProposalDescription(description: string): ValidationResult {
  const trimmed = description.trim();
  if (trimmed.length < 1) {
    return { valid: false, error: 'Description is required' };
  }
  if (trimmed.length > 2000) {
    return { valid: false, error: 'Description must be 2000 characters or less' };
  }
  return { valid: true };
}

export function validateAddress(address: string): ValidationResult {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required' };
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { valid: false, error: 'Invalid wallet address format' };
  }
  return { valid: true };
}

export function validateTokenId(tokenId: number, maxSupply: number = 3732): ValidationResult {
  if (!Number.isInteger(tokenId) || tokenId < 0) {
    return { valid: false, error: 'Invalid token ID' };
  }
  if (tokenId >= maxSupply) {
    return { valid: false, error: `Token ID must be less than ${maxSupply}` };
  }
  return { valid: true };
}
