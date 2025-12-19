interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: 'xss' | 'sql_injection' | 'rate_limit' | 'cors' | 'auth_failure' | 'suspicious_activity' | 'encryption_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  handled: boolean;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  blockedRequests: number;
  failedAuth: number;
  activeBans: number;
  activeThreats: number;
}

export class SecurityMonitor {
  private static events: SecurityEvent[] = [];
  private static readonly MAX_EVENTS = 10000;
  private static alertCallbacks: Array<(event: SecurityEvent) => void> = [];
  private static activeBansCount = 0;
  private static blockedEndpointsMap: Map<string, number> = new Map();
  
  static logEvent(
    typeOrEvent: SecurityEvent['type'] | {
      type: SecurityEvent['type'];
      severity: SecurityEvent['severity'];
      source: string;
      details: any;
      ipAddress?: string;
      userAgent?: string;
    },
    severity?: SecurityEvent['severity'],
    source?: string,
    details?: any,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): void {
    let type: SecurityEvent['type'];
    let eventSeverity: SecurityEvent['severity'];
    let eventSource: string;
    let eventDetails: any;
    let ipAddress: string | undefined;
    let userAgent: string | undefined;
    
    if (typeof typeOrEvent === 'object') {
      type = typeOrEvent.type;
      eventSeverity = typeOrEvent.severity;
      eventSource = typeOrEvent.source;
      eventDetails = typeOrEvent.details;
      ipAddress = typeOrEvent.ipAddress;
      userAgent = typeOrEvent.userAgent;
    } else {
      type = typeOrEvent;
      eventSeverity = severity!;
      eventSource = source!;
      eventDetails = details;
      ipAddress = metadata?.ipAddress;
      userAgent = metadata?.userAgent;
    }
    const event: SecurityEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date(),
      type,
      severity: eventSeverity,
      source: eventSource,
      details: eventDetails,
      ipAddress,
      userAgent,
      handled: false
    };
    
    this.events.unshift(event);
    
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(0, this.MAX_EVENTS);
    }
    
    console.log(`[SECURITY] ${eventSeverity.toUpperCase()} - ${type} at ${eventSource}:`, eventDetails);
    
    if (eventSeverity === 'critical' || eventSeverity === 'high') {
      this.triggerAlert(event);
    }
  }
  
  static triggerAlert(event: SecurityEvent): void {
    console.error(`[SECURITY ALERT] ${event.severity.toUpperCase()} - ${event.type}:`, {
      source: event.source,
      details: event.details,
      ipAddress: event.ipAddress
    });
    
    for (const callback of this.alertCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('[SECURITY] Alert callback failed:', error);
      }
    }
  }
  
  static onAlert(callback: (event: SecurityEvent) => void): void {
    this.alertCallbacks.push(callback);
  }
  
  static getEvents(filters?: {
    type?: SecurityEvent['type'];
    severity?: SecurityEvent['severity'];
    since?: Date;
    limit?: number;
  }): SecurityEvent[] {
    let filtered = [...this.events];
    
    if (filters?.type) {
      filtered = filtered.filter(e => e.type === filters.type);
    }
    
    if (filters?.severity) {
      filtered = filtered.filter(e => e.severity === filters.severity);
    }
    
    if (filters?.since) {
      const sinceDate = filters.since;
      filtered = filtered.filter(e => e.timestamp >= sinceDate);
    }
    
    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }
    
    return filtered;
  }
  
  static getMetrics(): SecurityMetrics {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = this.events.filter(e => e.timestamp >= last24h);
    
    return {
      totalEvents: recent.length,
      criticalEvents: recent.filter(e => e.severity === 'critical').length,
      highEvents: recent.filter(e => e.severity === 'high').length,
      mediumEvents: recent.filter(e => e.severity === 'medium').length,
      lowEvents: recent.filter(e => e.severity === 'low').length,
      blockedRequests: recent.filter(e => e.type === 'rate_limit').length,
      failedAuth: recent.filter(e => e.type === 'auth_failure').length,
      activeBans: this.activeBansCount,
      activeThreats: recent.filter(e => !e.handled && (e.severity === 'critical' || e.severity === 'high')).length
    };
  }
  
  static incrementActiveBans(): void {
    this.activeBansCount++;
  }
  
  static decrementActiveBans(): void {
    if (this.activeBansCount > 0) {
      this.activeBansCount--;
    }
  }
  
  static addBlockedEndpoint(endpoint: string, duration: number): void {
    this.blockedEndpointsMap.set(endpoint, Date.now() + duration);
  }
  
  static getBlockedEndpoints(): Array<{ endpoint: string; until: Date }> {
    const blocked: Array<{ endpoint: string; until: Date }> = [];
    const now = Date.now();
    
    Array.from(this.blockedEndpointsMap.entries()).forEach(([endpoint, until]) => {
      if (now < until) {
        blocked.push({ endpoint, until: new Date(until) });
      } else {
        this.blockedEndpointsMap.delete(endpoint);
      }
    });
    
    return blocked;
  }
  
  static getSecurityScore(): number {
    const metrics = this.getMetrics();
    
    let score = 100;
    
    score -= metrics.criticalEvents * 10;
    score -= metrics.highEvents * 5;
    score -= metrics.mediumEvents * 2;
    score -= metrics.lowEvents * 0.5;
    
    if (metrics.activeThreats > 0) {
      score -= 20;
    }
    
    if (metrics.failedAuth > 10) {
      score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  static markHandled(eventId: string): void {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      event.handled = true;
    }
  }
  
  static clearEvents(): void {
    this.events = [];
  }
  
  static exportEvents(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.events, null, 2);
    }
    
    const headers = ['Timestamp', 'Type', 'Severity', 'Source', 'IP Address', 'Details', 'Handled'];
    const rows = this.events.map(e => [
      e.timestamp.toISOString(),
      e.type,
      e.severity,
      e.source,
      e.ipAddress || '',
      JSON.stringify(e.details),
      e.handled ? 'Yes' : 'No'
    ]);
    
    return [
      headers.join(','),
      ...rows.map(r => r.map(c => `"${c}"`).join(','))
    ].join('\n');
  }
}
