export type ValidationType = 
  | 'string' 
  | 'number' 
  | 'integer' 
  | 'boolean' 
  | 'email' 
  | 'url' 
  | 'wallet' 
  | 'tokenId' 
  | 'date' 
  | 'enum' 
  | 'array' 
  | 'object';

export interface ValidationRule {
  type: ValidationType;
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
  default?: any;
  sanitize?: (value: any) => any;
  arrayOf?: ValidationRule;
  schema?: Record<string, ValidationRule>;
  errorMessage?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  sanitized?: any;
}

export class ValidationRulesEngine {
  static validate(
    data: Record<string, any>,
    rules: Record<string, ValidationRule>
  ): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];
    const sanitized: Record<string, any> = {};
    
    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];
      
      if (value === undefined || value === null || value === '') {
        if (rule.required) {
          errors.push({
            field,
            message: rule.errorMessage || `${field} is required`
          });
        } else if (rule.default !== undefined) {
          sanitized[field] = rule.default;
        }
        continue;
      }
      
      const fieldResult = this.validateField(field, value, rule);
      
      if (!fieldResult.valid) {
        errors.push(...fieldResult.errors);
      } else {
        sanitized[field] = fieldResult.sanitized;
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : undefined
    };
  }
  
  private static validateField(
    field: string,
    value: any,
    rule: ValidationRule
  ): ValidationResult {
    const errors: Array<{ field: string; message: string }> = [];
    let sanitized = value;
    
    if (rule.sanitize) {
      sanitized = rule.sanitize(value);
    }
    
    switch (rule.type) {
      case 'string':
        if (typeof sanitized !== 'string') {
          errors.push({ field, message: `${field} must be a string` });
          break;
        }
        
        if (rule.minLength && sanitized.length < rule.minLength) {
          errors.push({ 
            field, 
            message: `${field} must be at least ${rule.minLength} characters` 
          });
        }
        
        if (rule.maxLength && sanitized.length > rule.maxLength) {
          errors.push({ 
            field, 
            message: `${field} must be at most ${rule.maxLength} characters` 
          });
        }
        
        if (rule.pattern && !rule.pattern.test(sanitized)) {
          errors.push({ 
            field, 
            message: rule.errorMessage || `${field} has invalid format` 
          });
        }
        break;
        
      case 'number':
      case 'integer':
        const num = typeof sanitized === 'string' ? parseFloat(sanitized) : sanitized;
        
        if (isNaN(num) || !isFinite(num)) {
          errors.push({ field, message: `${field} must be a valid number` });
          break;
        }
        
        if (rule.type === 'integer' && !Number.isInteger(num)) {
          errors.push({ field, message: `${field} must be an integer` });
          break;
        }
        
        if (rule.min !== undefined && num < rule.min) {
          errors.push({ field, message: `${field} must be at least ${rule.min}` });
        }
        
        if (rule.max !== undefined && num > rule.max) {
          errors.push({ field, message: `${field} must be at most ${rule.max}` });
        }
        
        sanitized = num;
        break;
        
      case 'boolean':
        if (typeof sanitized === 'string') {
          sanitized = sanitized === 'true' || sanitized === '1';
        } else if (typeof sanitized !== 'boolean') {
          errors.push({ field, message: `${field} must be a boolean` });
        }
        break;
        
      case 'email':
        if (typeof sanitized !== 'string') {
          errors.push({ field, message: `${field} must be a string` });
          break;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitized)) {
          errors.push({ field, message: `${field} must be a valid email` });
        }
        
        sanitized = sanitized.toLowerCase().trim();
        break;
        
      case 'url':
        if (typeof sanitized !== 'string') {
          errors.push({ field, message: `${field} must be a string` });
          break;
        }
        
        try {
          const url = new URL(sanitized);
          if (!['http:', 'https:'].includes(url.protocol)) {
            errors.push({ field, message: `${field} must use http or https` });
          }
        } catch {
          errors.push({ field, message: `${field} must be a valid URL` });
        }
        break;
        
      case 'wallet':
        if (typeof sanitized !== 'string') {
          errors.push({ field, message: `${field} must be a string` });
          break;
        }
        
        if (!/^0x[a-fA-F0-9]{40}$/.test(sanitized)) {
          errors.push({ field, message: `${field} must be a valid wallet address` });
        }
        
        sanitized = sanitized.toLowerCase();
        break;
        
      case 'tokenId':
        const tokenId = typeof sanitized === 'string' ? parseInt(sanitized) : sanitized;
        
        if (isNaN(tokenId) || !Number.isInteger(tokenId)) {
          errors.push({ field, message: `${field} must be a valid token ID` });
          break;
        }
        
        if (tokenId < 0 || tokenId > 10000) {
          errors.push({ field, message: `${field} must be between 0 and 10000` });
        }
        
        sanitized = tokenId;
        break;
        
      case 'date':
        const date = new Date(sanitized);
        if (isNaN(date.getTime())) {
          errors.push({ field, message: `${field} must be a valid date` });
        }
        sanitized = date;
        break;
        
      case 'enum':
        if (!rule.enum || !rule.enum.includes(sanitized)) {
          errors.push({ 
            field, 
            message: `${field} must be one of: ${rule.enum?.join(', ')}` 
          });
        }
        break;
        
      case 'array':
        if (!Array.isArray(sanitized)) {
          errors.push({ field, message: `${field} must be an array` });
          break;
        }
        
        if (rule.minLength && sanitized.length < rule.minLength) {
          errors.push({ 
            field, 
            message: `${field} must contain at least ${rule.minLength} items` 
          });
        }
        
        if (rule.maxLength && sanitized.length > rule.maxLength) {
          errors.push({ 
            field, 
            message: `${field} must contain at most ${rule.maxLength} items` 
          });
        }
        
        if (rule.arrayOf) {
          const arrayErrors: any[] = [];
          const sanitizedArray: any[] = [];
          
          for (let i = 0; i < sanitized.length; i++) {
            const itemResult = this.validateField(`${field}[${i}]`, sanitized[i], rule.arrayOf);
            if (!itemResult.valid) {
              arrayErrors.push(...itemResult.errors);
            } else {
              sanitizedArray.push(itemResult.sanitized);
            }
          }
          
          if (arrayErrors.length > 0) {
            errors.push(...arrayErrors);
          } else {
            sanitized = sanitizedArray;
          }
        }
        break;
        
      case 'object':
        if (typeof sanitized !== 'object' || sanitized === null || Array.isArray(sanitized)) {
          errors.push({ field, message: `${field} must be an object` });
          break;
        }
        
        if (rule.schema) {
          const objectResult = this.validate(sanitized, rule.schema);
          if (!objectResult.valid) {
            errors.push(...objectResult.errors.map(e => ({
              field: `${field}.${e.field}`,
              message: e.message
            })));
          } else {
            sanitized = objectResult.sanitized;
          }
        }
        break;
    }
    
    if (rule.custom && errors.length === 0) {
      const customResult = rule.custom(sanitized);
      if (customResult !== true) {
        errors.push({
          field,
          message: typeof customResult === 'string' ? customResult : `${field} failed custom validation`
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : undefined
    };
  }
}
