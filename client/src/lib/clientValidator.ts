export class ClientValidator {
  static validateCustomName(name: string): { valid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Name cannot be empty' };
    }
    
    if (name.length > 32) {
      return { valid: false, error: 'Name must be 32 characters or less' };
    }
    
    if (!/^[a-zA-Z0-9_\s-]+$/.test(name)) {
      return { valid: false, error: 'Name can only contain letters, numbers, spaces, hyphens, and underscores' };
    }
    
    if (name.trim().length < 3) {
      return { valid: false, error: 'Name must be at least 3 characters' };
    }
    
    return { valid: true };
  }
  
  static validateProposalTitle(title: string): { valid: boolean; error?: string } {
    if (!title || title.trim().length === 0) {
      return { valid: false, error: 'Title cannot be empty' };
    }
    
    if (title.length > 100) {
      return { valid: false, error: 'Title must be 100 characters or less' };
    }
    
    if (title.trim().length < 10) {
      return { valid: false, error: 'Title must be at least 10 characters' };
    }
    
    return { valid: true };
  }
  
  static validateProposalDescription(description: string): { valid: boolean; error?: string } {
    if (!description || description.trim().length === 0) {
      return { valid: false, error: 'Description cannot be empty' };
    }
    
    if (description.length > 2000) {
      return { valid: false, error: 'Description must be 2000 characters or less' };
    }
    
    if (description.trim().length < 50) {
      return { valid: false, error: 'Description must be at least 50 characters' };
    }
    
    return { valid: true };
  }
  
  static validatePrice(price: string): { valid: boolean; error?: string } {
    if (!price || price.trim().length === 0) {
      return { valid: false, error: 'Price cannot be empty' };
    }
    
    const num = parseFloat(price);
    
    if (isNaN(num) || !isFinite(num)) {
      return { valid: false, error: 'Price must be a valid number' };
    }
    
    if (num <= 0) {
      return { valid: false, error: 'Price must be greater than 0' };
    }
    
    if (num > 1000000000) {
      return { valid: false, error: 'Price is too large' };
    }
    
    return { valid: true };
  }
  
  static sanitizeDisplayText(text: string): string {
    return text
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
}
