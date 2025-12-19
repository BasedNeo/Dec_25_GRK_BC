import { SecurityMonitor } from './securityMonitor';
import { AdvancedRateLimiter } from './advancedRateLimiter';

interface IncidentAction {
  type: 'ban_ip' | 'notify_admin' | 'throttle' | 'block_endpoint' | 'force_logout';
  target: string;
  duration?: number;
  reason: string;
}

export class IncidentResponse {
  private static blockedEndpoints: Map<string, number> = new Map();
  private static initialized = false;
  
  static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    
    SecurityMonitor.onAlert((event) => {
      this.handleSecurityEvent(event);
    });
  }
  
  private static handleSecurityEvent(event: any): void {
    const actions: IncidentAction[] = [];
    
    if (event.severity === 'critical') {
      if (event.ipAddress) {
        actions.push({
          type: 'ban_ip',
          target: event.ipAddress,
          duration: 24 * 60 * 60 * 1000,
          reason: `Critical security event: ${event.type}`
        });
      }
      
      actions.push({
        type: 'notify_admin',
        target: 'security@basedguardians.com',
        reason: `Critical: ${event.type} at ${event.source}`
      });
    } else if (event.severity === 'high') {
      if (event.ipAddress) {
        actions.push({
          type: 'ban_ip',
          target: event.ipAddress,
          duration: 60 * 60 * 1000,
          reason: `High severity event: ${event.type}`
        });
      }
    }
    
    this.executeActions(actions);
  }
  
  private static executeActions(actions: IncidentAction[]): void {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'ban_ip':
            if (typeof AdvancedRateLimiter.banIP === 'function') {
              AdvancedRateLimiter.banIP(action.target, action.duration!, action.reason);
            }
            SecurityMonitor.logEvent({
              type: 'suspicious_activity',
              severity: 'high',
              source: 'IncidentResponse',
              details: { action: 'ban_ip', target: action.target, duration: action.duration, reason: action.reason },
              ipAddress: action.target
            });
            SecurityMonitor.incrementActiveBans();
            console.log(`[INCIDENT RESPONSE] Banned IP ${action.target} for ${action.duration}ms`);
            break;
            
          case 'notify_admin':
            this.notifyAdmin(action.target, action.reason);
            break;
            
          case 'block_endpoint':
            this.blockEndpoint(action.target, action.duration!);
            SecurityMonitor.logEvent({
              type: 'suspicious_activity',
              severity: 'medium',
              source: 'IncidentResponse',
              details: { action: 'block_endpoint', endpoint: action.target, duration: action.duration }
            });
            SecurityMonitor.addBlockedEndpoint(action.target, action.duration!);
            break;
            
          default:
            console.warn(`[INCIDENT RESPONSE] Unknown action type: ${action.type}`);
        }
      } catch (error) {
        console.error(`[INCIDENT RESPONSE] Failed to execute action:`, error);
      }
    }
  }
  
  private static notifyAdmin(recipient: string, message: string): void {
    console.error(`[ADMIN NOTIFICATION] ${recipient}: ${message}`);
  }
  
  private static blockEndpoint(endpoint: string, duration: number): void {
    this.blockedEndpoints.set(endpoint, Date.now() + duration);
    console.warn(`[INCIDENT RESPONSE] Blocked endpoint ${endpoint} for ${duration}ms`);
  }
  
  static isEndpointBlocked(endpoint: string): boolean {
    const blockedUntil = this.blockedEndpoints.get(endpoint);
    
    if (!blockedUntil) {
      return false;
    }
    
    if (Date.now() > blockedUntil) {
      this.blockedEndpoints.delete(endpoint);
      return false;
    }
    
    return true;
  }
  
  static getBlockedEndpoints(): Array<{ endpoint: string; until: Date }> {
    const blocked: Array<{ endpoint: string; until: Date }> = [];
    
    Array.from(this.blockedEndpoints.entries()).forEach(([endpoint, until]) => {
      if (Date.now() < until) {
        blocked.push({ endpoint, until: new Date(until) });
      } else {
        this.blockedEndpoints.delete(endpoint);
      }
    });
    
    return blocked;
  }
}

IncidentResponse.initialize();
