export class OriginValidator {
  private static allowedOrigins: Set<string> = new Set([
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'https://basedguardians.com',
    'https://www.basedguardians.com'
  ]);
  
  private static suspiciousOrigins: Map<string, number> = new Map();
  
  static addAllowedOrigin(origin: string) {
    this.allowedOrigins.add(origin);
  }
  
  static removeAllowedOrigin(origin: string) {
    this.allowedOrigins.delete(origin);
  }
  
  static isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) {
      return true;
    }
    
    if (this.allowedOrigins.has(origin)) {
      return true;
    }
    
    if (process.env.NODE_ENV === 'development') {
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return true;
      }
    }
    
    if (origin.includes('.replit.dev') || origin.includes('.repl.co')) {
      return true;
    }
    
    return false;
  }
  
  static trackSuspiciousOrigin(origin: string) {
    const count = this.suspiciousOrigins.get(origin) || 0;
    this.suspiciousOrigins.set(origin, count + 1);
    
    if (count > 10) {
      console.error(`[SECURITY] Multiple CORS violations from: ${origin} (${count} attempts)`);
    }
  }
  
  static getSuspiciousOrigins() {
    return Array.from(this.suspiciousOrigins.entries()).map(([origin, count]) => ({
      origin,
      count
    }));
  }
  
  static clearSuspiciousOrigins() {
    this.suspiciousOrigins.clear();
  }
  
  static getAllowedOrigins(): string[] {
    return Array.from(this.allowedOrigins);
  }
}
