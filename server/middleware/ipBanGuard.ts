import { Request, Response, NextFunction } from 'express';
import { AdvancedRateLimiter } from '../lib/advancedRateLimiter';

export function ipBanGuard(req: Request, res: Response, next: NextFunction) {
  const clientId = AdvancedRateLimiter.getClientIdentifier(req);
  
  if (AdvancedRateLimiter.isBanned(clientId)) {
    const bannedIPs = AdvancedRateLimiter.getBannedIPs();
    const banInfo = bannedIPs.find(b => b.ip === clientId);
    
    console.warn(`[SECURITY] Blocked request from banned IP: ${clientId}`);
    
    return res.status(403).json({
      error: 'Access forbidden',
      reason: banInfo?.reason || 'IP address banned',
      bannedUntil: banInfo?.until,
      code: 'IP_BANNED'
    });
  }
  
  next();
}
