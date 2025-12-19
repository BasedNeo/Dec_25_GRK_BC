import { useState, useEffect, useRef, useMemo } from 'react';
import { circuitBreakerManager } from '@/lib/circuitBreaker';

interface DegradationOptions {
  criticalServices: string[];
  checkInterval?: number;
}

export const useGracefulDegradation = (options: DegradationOptions) => {
  const [degraded, setDegraded] = useState(false);
  const [failedServices, setFailedServices] = useState<string[]>([]);
  
  const servicesKey = useMemo(() => options.criticalServices.join(','), [options.criticalServices]);
  const checkInterval = options.checkInterval || 5000;
  
  useEffect(() => {
    const services = servicesKey.split(',');
    
    const checkHealth = () => {
      const stats = circuitBreakerManager.getAllStats();
      const failed: string[] = [];
      
      for (const service of services) {
        const stat = stats[service];
        if (stat && stat.state === 'OPEN') {
          failed.push(service);
        }
      }
      
      setFailedServices(prev => {
        const prevKey = prev.join(',');
        const newKey = failed.join(',');
        return prevKey === newKey ? prev : failed;
      });
      setDegraded(failed.length > 0);
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, checkInterval);
    
    return () => clearInterval(interval);
  }, [servicesKey, checkInterval]);
  
  return { degraded, failedServices };
};
