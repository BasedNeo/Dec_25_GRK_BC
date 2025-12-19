import { Request, Response, NextFunction } from 'express';
import { QueryValidator, QueryAuditor } from '../lib/queryValidator';
import { SecurityMonitor } from '../lib/securityMonitor';

export function sqlInjectionGuard(req: Request, res: Response, next: NextFunction) {
  const clientId = req.ip || 'unknown';
  
  const checkValue = (value: any, path: string): boolean => {
    if (typeof value === 'string') {
      if (QueryValidator.detectSqlInjection(value)) {
        QueryAuditor.logSuspiciousQuery(value, path, true);
        console.error(`[SECURITY] SQL injection attempt detected at ${path}:`, value);
        
        SecurityMonitor.logEvent(
          'sql_injection',
          'critical',
          path,
          { value: value.substring(0, 100) },
          { ipAddress: clientId, userAgent: req.get('user-agent') }
        );
        
        return false;
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const [key, val] of Object.entries(value)) {
        if (!checkValue(val, `${path}.${key}`)) {
          return false;
        }
      }
    }
    return true;
  };
  
  if (!checkValue(req.body, 'body')) {
    return res.status(400).json({ 
      error: 'Invalid input detected',
      code: 'SECURITY_VIOLATION'
    });
  }
  
  if (!checkValue(req.query, 'query')) {
    return res.status(400).json({ 
      error: 'Invalid query parameters',
      code: 'SECURITY_VIOLATION'
    });
  }
  
  if (!checkValue(req.params, 'params')) {
    return res.status(400).json({ 
      error: 'Invalid path parameters',
      code: 'SECURITY_VIOLATION'
    });
  }
  
  next();
}
