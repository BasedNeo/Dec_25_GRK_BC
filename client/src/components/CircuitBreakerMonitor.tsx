import { useEffect, useState } from 'react';
import { circuitBreakerManager } from '@/lib/circuitBreaker';
import { Card } from '@/components/ui/card';

export const CircuitBreakerMonitor = () => {
  const [stats, setStats] = useState<Record<string, any>>({});
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(circuitBreakerManager.getAllStats());
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  const getStateColor = (state: string) => {
    switch (state) {
      case 'CLOSED': return 'text-green-400';
      case 'HALF_OPEN': return 'text-yellow-400';
      case 'OPEN': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };
  
  const getStateEmoji = (state: string) => {
    switch (state) {
      case 'CLOSED': return '✅';
      case 'HALF_OPEN': return '⚠️';
      case 'OPEN': return '🔴';
      default: return '❓';
    }
  };
  
  return (
    <Card className="p-4 bg-black/60 border-purple-500/30" data-testid="circuit-breaker-monitor">
      <h3 className="text-lg font-bold mb-4">Circuit Breaker Status</h3>
      
      {Object.entries(stats).length === 0 && (
        <div className="text-gray-400 text-sm">No circuit breakers active</div>
      )}
      
      <div className="space-y-3">
        {Object.entries(stats).map(([name, stat]) => (
          <div key={name} className="p-3 bg-black/40 rounded border border-purple-500/20" data-testid={`circuit-breaker-${name}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">{name}</span>
              <span className={`font-bold ${getStateColor(stat.state)}`}>
                {getStateEmoji(stat.state)} {stat.state}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-gray-400">Total Calls</div>
                <div className="text-white font-mono">{stat.totalCalls}</div>
              </div>
              <div>
                <div className="text-gray-400">Failures</div>
                <div className="text-red-400 font-mono">{stat.failures}</div>
              </div>
              <div>
                <div className="text-gray-400">Successes</div>
                <div className="text-green-400 font-mono">{stat.successes}</div>
              </div>
            </div>
            
            {stat.lastFailureTime && (
              <div className="text-xs text-gray-400 mt-2">
                Last failure: {new Date(stat.lastFailureTime).toLocaleTimeString()}
              </div>
            )}
            
            {stat.openedAt && (
              <div className="text-xs text-red-400 mt-1">
                Opened at: {new Date(stat.openedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
