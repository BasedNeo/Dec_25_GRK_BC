import { EncryptionService } from './encryption';

export class SensitiveDataHandler {
  private static sensitiveFields = [
    'privateKey',
    'seed',
    'mnemonic',
    'password',
    'token',
    'secret',
    'apiKey',
    'sessionId'
  ];
  
  static maskSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item));
    }
    
    const masked: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.sensitiveFields.some(field => lowerKey.includes(field));
      
      if (isSensitive && typeof value === 'string') {
        masked[key] = this.maskString(value);
      } else if (typeof value === 'object') {
        masked[key] = this.maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  }
  
  static maskString(str: string): string {
    if (str.length <= 8) {
      return '***';
    }
    
    const start = str.substring(0, 4);
    const end = str.substring(str.length - 4);
    const middle = '*'.repeat(Math.min(str.length - 8, 10));
    
    return `${start}${middle}${end}`;
  }
  
  static encryptSensitiveFields(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.encryptSensitiveFields(item));
    }
    
    const encrypted: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.sensitiveFields.some(field => lowerKey.includes(field));
      
      if (isSensitive && typeof value === 'string') {
        encrypted[key] = EncryptionService.encrypt(value);
      } else if (typeof value === 'object') {
        encrypted[key] = this.encryptSensitiveFields(value);
      } else {
        encrypted[key] = value;
      }
    }
    
    return encrypted;
  }
  
  static decryptSensitiveFields(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.decryptSensitiveFields(item));
    }
    
    const decrypted: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.sensitiveFields.some(field => lowerKey.includes(field));
      
      if (isSensitive && typeof value === 'string') {
        try {
          decrypted[key] = EncryptionService.decrypt(value);
        } catch {
          decrypted[key] = value;
        }
      } else if (typeof value === 'object') {
        decrypted[key] = this.decryptSensitiveFields(value);
      } else {
        decrypted[key] = value;
      }
    }
    
    return decrypted;
  }
  
  static redactForLogging(data: any): any {
    return this.maskSensitiveData(data);
  }
}
