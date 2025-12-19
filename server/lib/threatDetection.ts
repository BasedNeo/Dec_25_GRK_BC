import { SecurityMonitor } from './securityMonitor';

interface ThreatPattern {
  name: string;
  description: string;
  pattern: RegExp | ((data: any) => boolean);
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'log' | 'block' | 'ban';
}

export class ThreatDetection {
  private static patterns: ThreatPattern[] = [
    {
      name: 'SQL Injection Attempt',
      description: 'Detected SQL injection pattern in input',
      pattern: /(\bOR\b|\bAND\b)\s+[\d\w]+\s*=\s*[\d\w]+|UNION\s+SELECT|;\s*DROP/i,
      severity: 'critical',
      action: 'block'
    },
    {
      name: 'XSS Attack',
      description: 'Detected XSS pattern in input',
      pattern: /<script|javascript:|onerror=|onload=/i,
      severity: 'critical',
      action: 'block'
    },
    {
      name: 'Path Traversal',
      description: 'Detected path traversal attempt',
      pattern: /\.\.[\/\\]|\.\.%2[fF]|\.\.%5[cC]/,
      severity: 'high',
      action: 'block'
    },
    {
      name: 'Command Injection',
      description: 'Detected command injection pattern',
      pattern: /[;&|`$\(\)]/,
      severity: 'critical',
      action: 'block'
    },
    {
      name: 'Excessive Requests',
      description: 'Abnormal request volume detected',
      pattern: (data: any) => data.requestCount > 100,
      severity: 'medium',
      action: 'log'
    }
  ];
  
  static scanInput(input: string, source: string, metadata?: any): boolean {
    let threatDetected = false;
    
    for (const pattern of this.patterns) {
      let matches = false;
      
      if (pattern.pattern instanceof RegExp) {
        matches = pattern.pattern.test(input);
      } else if (typeof pattern.pattern === 'function') {
        matches = pattern.pattern({ input, ...metadata });
      }
      
      if (matches) {
        threatDetected = true;
        
        SecurityMonitor.logEvent(
          'suspicious_activity',
          pattern.severity,
          source,
          {
            pattern: pattern.name,
            description: pattern.description,
            input: input.substring(0, 100),
            action: pattern.action
          },
          metadata
        );
        
        if (pattern.action === 'block' || pattern.action === 'ban') {
          return false;
        }
      }
    }
    
    return !threatDetected;
  }
  
  static addPattern(pattern: ThreatPattern): void {
    this.patterns.push(pattern);
  }
  
  static getPatterns(): Array<{ name: string; description: string; severity: string; action: string }> {
    return this.patterns.map(p => ({
      name: p.name,
      description: p.description,
      severity: p.severity,
      action: p.action
    }));
  }
  
  static analyzeTraffic(requests: Array<{ ip: string; endpoint: string; timestamp: number }>): void {
    const now = Date.now();
    const recentWindow = 60000;
    
    const ipCounts: Map<string, number> = new Map();
    
    for (const req of requests) {
      if (now - req.timestamp < recentWindow) {
        ipCounts.set(req.ip, (ipCounts.get(req.ip) || 0) + 1);
      }
    }
    
    Array.from(ipCounts.entries()).forEach(([ip, count]) => {
      if (count > 100) {
        SecurityMonitor.logEvent(
          'suspicious_activity',
          'high',
          'traffic_analyzer',
          {
            ip,
            requestCount: count,
            timeWindow: '1 minute',
            threshold: 100
          },
          { ipAddress: ip }
        );
      }
    });
  }
}
