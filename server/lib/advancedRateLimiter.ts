import rateLimit from 'express-rate-limit';
import { Request } from 'express';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export class AdvancedRateLimiter {
  private static bannedIPs: Map<string, { until: number; reason: string }> = new Map();
  private static suspiciousIPs: Map<string, { count: number; firstSeen: number }> = new Map();
  
  static createLimiter(config: RateLimitConfig) {
    return rateLimit({
      windowMs: config.windowMs,
      max: config.max,
      message: config.message || 'Too many requests, please try again later',
      standardHeaders: config.standardHeaders !== false,
      legacyHeaders: config.legacyHeaders !== false,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
      keyGenerator: (req: Request) => {
        return this.getClientIdentifier(req);
      },
      skip: (req: Request) => {
        const clientId = this.getClientIdentifier(req);
        return this.isWhitelisted(clientId);
      },
      handler: (req, res) => {
        const clientId = this.getClientIdentifier(req);
        this.trackSuspiciousActivity(clientId, req.path);
        
        res.status(429).json({
          error: config.message || 'Too many requests',
          retryAfter: Math.ceil(config.windowMs / 1000),
          limit: config.max,
          window: config.windowMs
        });
      }
    });
  }
  
  static getClientIdentifier(req: Request): string {
    const forwarded = req.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    const walletAddress = req.headers['x-wallet-address'] as string;
    
    return walletAddress || ip || 'unknown';
  }
  
  static isWhitelisted(clientId: string): boolean {
    const whitelist = (process.env.RATE_LIMIT_WHITELIST || '').split(',');
    return whitelist.includes(clientId);
  }
  
  static isBanned(clientId: string): boolean {
    const ban = this.bannedIPs.get(clientId);
    
    if (!ban) return false;
    
    if (Date.now() > ban.until) {
      this.bannedIPs.delete(clientId);
      const { SecurityMonitor } = require('./securityMonitor');
      if (typeof SecurityMonitor?.decrementActiveBans === 'function') {
        SecurityMonitor.decrementActiveBans();
      }
      return false;
    }
    
    return true;
  }
  
  static banIP(clientId: string, durationMs: number, reason: string) {
    this.bannedIPs.set(clientId, {
      until: Date.now() + durationMs,
      reason
    });
    
    console.warn(`[SECURITY] Banned ${clientId} for ${durationMs}ms: ${reason}`);
  }
  
  static unbanIP(clientId: string) {
    this.bannedIPs.delete(clientId);
    const { SecurityMonitor } = require('./securityMonitor');
    if (typeof SecurityMonitor?.decrementActiveBans === 'function') {
      SecurityMonitor.decrementActiveBans();
    }
    console.log(`[SECURITY] Unbanned ${clientId}`);
  }
  
  static trackSuspiciousActivity(clientId: string, endpoint: string) {
    const existing = this.suspiciousIPs.get(clientId);
    
    if (!existing) {
      this.suspiciousIPs.set(clientId, {
        count: 1,
        firstSeen: Date.now()
      });
      return;
    }
    
    existing.count++;
    
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - existing.firstSeen > fiveMinutes) {
      existing.count = 1;
      existing.firstSeen = Date.now();
      return;
    }
    
    if (existing.count >= 10) {
      this.banIP(clientId, 60 * 60 * 1000, 'Repeated rate limit violations');
    } else if (existing.count >= 5) {
      console.warn(`[SECURITY] Suspicious activity from ${clientId}: ${existing.count} violations`);
    }
  }
  
  static getSuspiciousIPs() {
    return Array.from(this.suspiciousIPs.entries()).map(([ip, data]) => ({
      ip,
      count: data.count,
      firstSeen: new Date(data.firstSeen),
      active: Date.now() - data.firstSeen < 5 * 60 * 1000
    }));
  }
  
  static getBannedIPs() {
    return Array.from(this.bannedIPs.entries()).map(([ip, data]) => ({
      ip,
      reason: data.reason,
      until: new Date(data.until),
      remaining: Math.max(0, data.until - Date.now())
    }));
  }
  
  static clearSuspiciousIPs() {
    this.suspiciousIPs.clear();
  }
}

export const strictLimiter = AdvancedRateLimiter.createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many requests from this IP, please try again later'
});

export const authLimiter = AdvancedRateLimiter.createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true
});

export const writeLimiter = AdvancedRateLimiter.createLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many write operations, please slow down'
});

export const gameLimiter = AdvancedRateLimiter.createLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many game requests, please wait before playing again'
});

export const readLimiter = AdvancedRateLimiter.createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please slow down'
});
