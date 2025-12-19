import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export class CSRFProtection {
  private static tokens: Map<string, { token: string; createdAt: number }> = new Map();
  private static readonly TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
  
  static generateToken(sessionId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    
    this.tokens.set(sessionId, {
      token,
      createdAt: Date.now()
    });
    
    this.cleanupExpiredTokens();
    
    return token;
  }
  
  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId);
    
    if (!stored) {
      console.warn('[CSRF] No token found for session:', sessionId.slice(0, 8) + '...');
      return false;
    }
    
    if (Date.now() - stored.createdAt > this.TOKEN_EXPIRY) {
      console.warn('[CSRF] Token expired for session:', sessionId.slice(0, 8) + '...');
      this.tokens.delete(sessionId);
      return false;
    }
    
    if (stored.token !== token) {
      console.warn('[CSRF] Token mismatch for session:', sessionId.slice(0, 8) + '...');
      return false;
    }
    
    return true;
  }
  
  static middleware(req: Request, res: Response, next: NextFunction) {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }
    
    const sessionId = req.headers['x-session-id'] as string;
    const csrfToken = req.headers['x-csrf-token'] as string;
    
    if (!sessionId) {
      return next();
    }
    
    if (!csrfToken) {
      return res.status(403).json({ error: 'CSRF token required', code: 'NO_CSRF_TOKEN' });
    }
    
    if (!this.validateToken(sessionId, csrfToken)) {
      return res.status(403).json({ error: 'Invalid CSRF token', code: 'INVALID_CSRF_TOKEN' });
    }
    
    next();
  }
  
  static cleanupExpiredTokens() {
    const now = Date.now();
    const entries = Array.from(this.tokens.entries());
    
    for (const [sessionId, data] of entries) {
      if (now - data.createdAt > this.TOKEN_EXPIRY) {
        this.tokens.delete(sessionId);
      }
    }
  }
  
  static invalidateToken(sessionId: string) {
    this.tokens.delete(sessionId);
  }
  
  static getStats() {
    return {
      activeTokens: this.tokens.size
    };
  }
}

setInterval(() => {
  CSRFProtection.cleanupExpiredTokens();
}, 5 * 60 * 1000);
