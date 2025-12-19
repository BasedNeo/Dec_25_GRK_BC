import DOMPurify from 'isomorphic-dompurify';

interface SanitizationOptions {
  maxLength?: number;
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  stripHtml?: boolean;
}

export class InputSanitizer {
  static sanitizeString(
    input: string, 
    options: SanitizationOptions = {}
  ): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    
    let sanitized = input.trim();
    
    if (options.stripHtml) {
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    } else {
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: options.allowedTags || [],
        ALLOWED_ATTR: options.allowedAttributes ? 
          Object.keys(options.allowedAttributes).reduce((acc, key) => {
            acc.push(...options.allowedAttributes![key]);
            return acc;
          }, [] as string[]) : []
      });
    }
    
    sanitized = sanitized
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/eval\s*\(/gi, '');
    
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }
    
    return sanitized;
  }
  
  static sanitizeCustomName(name: string): string {
    const sanitized = this.sanitizeString(name, { 
      maxLength: 32, 
      stripHtml: true 
    });
    
    if (!/^[a-zA-Z0-9_\s-]+$/.test(sanitized)) {
      throw new Error('Custom name contains invalid characters');
    }
    
    return sanitized;
  }
  
  static sanitizeProposalTitle(title: string): string {
    return this.sanitizeString(title, { 
      maxLength: 100, 
      stripHtml: true 
    });
  }
  
  static sanitizeProposalDescription(description: string): string {
    return this.sanitizeString(description, { 
      maxLength: 2000,
      allowedTags: ['b', 'i', 'u', 'br', 'p'],
      allowedAttributes: {}
    });
  }
  
  static sanitizeWalletAddress(address: string): string {
    const sanitized = address.trim().toLowerCase();
    
    if (!/^0x[a-f0-9]{40}$/i.test(sanitized)) {
      throw new Error('Invalid wallet address format');
    }
    
    return sanitized;
  }
  
  static sanitizeNumericInput(input: string | number): number {
    const num = typeof input === 'string' ? parseFloat(input) : input;
    
    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid numeric input');
    }
    
    if (num < 0) {
      throw new Error('Negative numbers not allowed');
    }
    
    return num;
  }
  
  static sanitizeTokenId(tokenId: string | number): number {
    const id = this.sanitizeNumericInput(tokenId);
    
    if (!Number.isInteger(id)) {
      throw new Error('Token ID must be an integer');
    }
    
    if (id < 0 || id > 10000) {
      throw new Error('Token ID out of valid range');
    }
    
    return id;
  }
  
  static sanitizeUrl(url: string): string {
    const sanitized = this.sanitizeString(url, { maxLength: 500 });
    
    try {
      const parsed = new URL(sanitized);
      
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid URL protocol');
      }
      
      return parsed.toString();
    } catch (error) {
      throw new Error('Invalid URL format');
    }
  }
  
  static sanitizeJson(input: string): any {
    try {
      const parsed = JSON.parse(input);
      
      const jsonString = JSON.stringify(parsed);
      if (jsonString.length > 10000) {
        throw new Error('JSON payload too large');
      }
      
      return parsed;
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }
  
  static validateAndSanitizeRequest(data: Record<string, any>, rules: Record<string, {
    type: 'string' | 'number' | 'wallet' | 'tokenId' | 'url' | 'json';
    required?: boolean;
    maxLength?: number;
    min?: number;
    max?: number;
  }>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, rule] of Object.entries(rules)) {
      const value = data[key];
      
      if (rule.required && (value === undefined || value === null || value === '')) {
        throw new Error(`${key} is required`);
      }
      
      if (value === undefined || value === null || value === '') {
        continue;
      }
      
      try {
        switch (rule.type) {
          case 'string':
            sanitized[key] = this.sanitizeString(value, { maxLength: rule.maxLength, stripHtml: true });
            break;
          case 'number':
            sanitized[key] = this.sanitizeNumericInput(value);
            if (rule.min !== undefined && sanitized[key] < rule.min) {
              throw new Error(`${key} must be at least ${rule.min}`);
            }
            if (rule.max !== undefined && sanitized[key] > rule.max) {
              throw new Error(`${key} must be at most ${rule.max}`);
            }
            break;
          case 'wallet':
            sanitized[key] = this.sanitizeWalletAddress(value);
            break;
          case 'tokenId':
            sanitized[key] = this.sanitizeTokenId(value);
            break;
          case 'url':
            sanitized[key] = this.sanitizeUrl(value);
            break;
          case 'json':
            sanitized[key] = this.sanitizeJson(value);
            break;
        }
      } catch (error: any) {
        throw new Error(`Invalid ${key}: ${error.message}`);
      }
    }
    
    return sanitized;
  }
}
