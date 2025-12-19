import crypto from 'crypto';

interface Session {
  id: string;
  walletAddress: string;
  createdAt: number;
  expiresAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
  isAdmin: boolean;
}

export class SessionManager {
  private static sessions: Map<string, Session> = new Map();
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour
  
  static createSession(
    walletAddress: string, 
    ipAddress: string, 
    userAgent: string,
    isAdmin: boolean = false
  ): string {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    
    const session: Session = {
      id: sessionId,
      walletAddress: walletAddress.toLowerCase(),
      createdAt: now,
      expiresAt: now + this.SESSION_DURATION,
      lastActivity: now,
      ipAddress,
      userAgent,
      isAdmin
    };
    
    this.sessions.set(sessionId, session);
    
    console.log(`[SESSION] Created session for ${walletAddress}: ${sessionId.slice(0, 8)}...`);
    
    return sessionId;
  }
  
  static validateSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    const now = Date.now();
    
    if (now > session.expiresAt) {
      console.log(`[SESSION] Expired session: ${sessionId.slice(0, 8)}...`);
      this.sessions.delete(sessionId);
      return null;
    }
    
    if (now - session.lastActivity > this.INACTIVITY_TIMEOUT) {
      console.log(`[SESSION] Inactive session: ${sessionId.slice(0, 8)}...`);
      this.sessions.delete(sessionId);
      return null;
    }
    
    session.lastActivity = now;
    
    return session;
  }
  
  static refreshSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    const now = Date.now();
    session.expiresAt = now + this.SESSION_DURATION;
    session.lastActivity = now;
    
    return true;
  }
  
  static destroySession(sessionId: string): boolean {
    const deleted = this.sessions.delete(sessionId);
    
    if (deleted) {
      console.log(`[SESSION] Destroyed session: ${sessionId.slice(0, 8)}...`);
    }
    
    return deleted;
  }
  
  static destroyAllUserSessions(walletAddress: string): number {
    const lowerAddress = walletAddress.toLowerCase();
    let count = 0;
    
    const entries = Array.from(this.sessions.entries());
    for (const [sessionId, session] of entries) {
      if (session.walletAddress === lowerAddress) {
        this.sessions.delete(sessionId);
        count++;
      }
    }
    
    console.log(`[SESSION] Destroyed ${count} sessions for ${walletAddress}`);
    
    return count;
  }
  
  static getActiveSessions(): Session[] {
    const now = Date.now();
    const active: Session[] = [];
    
    const entries = Array.from(this.sessions.entries());
    for (const [sessionId, session] of entries) {
      if (now <= session.expiresAt && now - session.lastActivity <= this.INACTIVITY_TIMEOUT) {
        active.push(session);
      } else {
        this.sessions.delete(sessionId);
      }
    }
    
    return active;
  }
  
  static getUserSessions(walletAddress: string): Session[] {
    const lowerAddress = walletAddress.toLowerCase();
    return this.getActiveSessions().filter(s => s.walletAddress === lowerAddress);
  }
  
  static cleanupExpiredSessions(): number {
    const now = Date.now();
    let cleaned = 0;
    
    const entries = Array.from(this.sessions.entries());
    for (const [sessionId, session] of entries) {
      if (now > session.expiresAt || now - session.lastActivity > this.INACTIVITY_TIMEOUT) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[SESSION] Cleaned up ${cleaned} expired sessions`);
    }
    
    return cleaned;
  }
  
  static getStats() {
    const sessions = this.getActiveSessions();
    const uniqueUsers = new Set(sessions.map(s => s.walletAddress)).size;
    const adminSessions = sessions.filter(s => s.isAdmin).length;
    
    return {
      total: sessions.length,
      uniqueUsers,
      adminSessions,
      regularSessions: sessions.length - adminSessions
    };
  }
}

setInterval(() => {
  SessionManager.cleanupExpiredSessions();
}, 5 * 60 * 1000);
