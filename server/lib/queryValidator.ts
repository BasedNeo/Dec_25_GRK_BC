export class QueryValidator {
  static validateOrderByColumn(column: string, allowedColumns: string[]): string {
    const sanitized = column.trim().toLowerCase();
    
    if (!allowedColumns.includes(sanitized)) {
      throw new Error(`Invalid order by column: ${column}`);
    }
    
    return sanitized;
  }
  
  static validateSortDirection(direction: string): 'asc' | 'desc' {
    const sanitized = direction.trim().toLowerCase();
    
    if (sanitized !== 'asc' && sanitized !== 'desc') {
      throw new Error('Sort direction must be asc or desc');
    }
    
    return sanitized as 'asc' | 'desc';
  }
  
  static validateLimit(limit: any, maxLimit: number = 1000): number {
    const num = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    
    if (isNaN(num) || !Number.isInteger(num)) {
      throw new Error('Limit must be an integer');
    }
    
    if (num < 1) {
      throw new Error('Limit must be at least 1');
    }
    
    if (num > maxLimit) {
      return maxLimit;
    }
    
    return num;
  }
  
  static validateOffset(offset: any): number {
    const num = typeof offset === 'string' ? parseInt(offset, 10) : offset;
    
    if (isNaN(num) || !Number.isInteger(num)) {
      throw new Error('Offset must be an integer');
    }
    
    if (num < 0) {
      throw new Error('Offset must be non-negative');
    }
    
    return num;
  }
  
  static validateSearchQuery(query: string, maxLength: number = 100): string {
    if (typeof query !== 'string') {
      throw new Error('Search query must be a string');
    }
    
    let sanitized = query.trim();
    
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    sanitized = sanitized
      .replace(/[';"\-\-\/\*]/g, '')
      .replace(/(\bOR\b|\bAND\b|\bUNION\b|\bSELECT\b|\bDROP\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b)/gi, '');
    
    return sanitized;
  }
  
  static validateTableName(tableName: string, allowedTables: string[]): string {
    const sanitized = tableName.trim().toLowerCase();
    
    if (!allowedTables.includes(sanitized)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }
    
    if (!/^[a-z_][a-z0-9_]*$/.test(sanitized)) {
      throw new Error('Table name contains invalid characters');
    }
    
    return sanitized;
  }
  
  static detectSqlInjection(input: string): boolean {
    const sqlInjectionPatterns = [
      /(\bOR\b|\bAND\b)\s+[\d\w]+\s*=\s*[\d\w]+/i,
      /UNION\s+(ALL\s+)?SELECT/i,
      /;\s*(DROP|DELETE|UPDATE|INSERT|CREATE|ALTER)/i,
      /--/,
      /\/\*/,
      /\*\//,
      /xp_/i,
      /sp_/i,
      /exec(\s|\+)+(s|x)p\w+/i,
    ];
    
    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(input)) {
        console.warn('[SECURITY] Potential SQL injection detected:', input);
        return true;
      }
    }
    
    return false;
  }
  
  static sanitizeForLike(input: string): string {
    return input
      .replace(/[%_]/g, '\\$&')
      .replace(/[';"\-\-]/g, '');
  }
}

export class QueryAuditor {
  private static suspiciousQueries: Array<{
    timestamp: Date;
    query: string;
    source: string;
    blocked: boolean;
  }> = [];
  
  static logSuspiciousQuery(query: string, source: string, blocked: boolean) {
    this.suspiciousQueries.push({
      timestamp: new Date(),
      query,
      source,
      blocked
    });
    
    if (this.suspiciousQueries.length > 1000) {
      this.suspiciousQueries = this.suspiciousQueries.slice(-1000);
    }
    
    console.warn('[SECURITY AUDIT]', {
      timestamp: new Date().toISOString(),
      source,
      query: query.substring(0, 100),
      blocked
    });
  }
  
  static getSuspiciousQueries(limit: number = 100) {
    return this.suspiciousQueries.slice(-limit);
  }
  
  static clearAuditLog() {
    this.suspiciousQueries = [];
  }
}
