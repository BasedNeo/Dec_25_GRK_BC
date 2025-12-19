import { Request, Response, NextFunction } from 'express';
import { SessionManager } from '../lib/sessionManager';

export interface AuthRequest extends Request {
  session?: {
    id: string;
    walletAddress: string;
    isAdmin: boolean;
  };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const sessionId = req.headers['x-session-id'] as string;
  
  if (!sessionId) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NO_SESSION' 
    });
  }
  
  const session = SessionManager.validateSession(sessionId);
  
  if (!session) {
    return res.status(401).json({ 
      error: 'Invalid or expired session',
      code: 'INVALID_SESSION' 
    });
  }
  
  req.session = {
    id: session.id,
    walletAddress: session.walletAddress,
    isAdmin: session.isAdmin
  };
  
  next();
}

export function requireSessionAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.session?.isAdmin) {
      return res.status(403).json({ 
        error: 'Admin access required',
        code: 'NOT_ADMIN' 
      });
    }
    next();
  });
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const sessionId = req.headers['x-session-id'] as string;
  
  if (sessionId) {
    const session = SessionManager.validateSession(sessionId);
    if (session) {
      req.session = {
        id: session.id,
        walletAddress: session.walletAddress,
        isAdmin: session.isAdmin
      };
    }
  }
  
  next();
}
