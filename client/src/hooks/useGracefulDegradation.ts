import { useState, useEffect } from 'react';
import { circuitBreakerManager } from '@/lib/circuitBreaker';

interface DegradationOptions {
  criticalServices: string[];
  checkInterval?: number;
}

export const useGracefulDegradation = (options: DegradationOptions) => {
  const [degraded, setDegraded] = useState(false);
  const [failedServices, setFailedServices] = useState<string[]>([]);
  
  useEffect(() => {
    const checkHealth = () => {
      const stats = circuitBreakerManager.getAllStats();
      const failed: string[] = [];
      
      for (const service of options.criticalServices) {
        const stat = stats[service];
        if (stat && stat.state === 'OPEN') {
          failed.push(service);
        }
      }
      
      setFailedServices(failed);
      setDegraded(failed.length > 0);
    };
    
    checkHealth();
    const interval = setInterval(checkHealth, options.checkInterval || 5000);
    
    return () => clearInterval(interval);
  }, [options.criticalServices, options.checkInterval]);
  
  return { degraded, failedServices };
};
