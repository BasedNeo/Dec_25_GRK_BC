import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from '../lib/monitoring';
import { Logger } from '../lib/logger';

export function performanceMonitor(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    MonitoringService.recordMetric('api_response_time', duration, {
      method: req.method,
      path: req.path,
      status: res.statusCode.toString()
    });
    
    if (duration > 1000) {
      Logger.perf('API', `Slow request: ${req.method} ${req.path}`, duration);
    }
  });
  
  next();
}
