import { useGracefulDegradation } from '@/hooks/useGracefulDegradation';
import { AlertTriangle } from 'lucide-react';

export const DegradationBanner = () => {
  const { degraded, failedServices } = useGracefulDegradation({
    criticalServices: ['rpc-mainnet.basedaibridge.com', 'coingecko-api', 'binance-api', 'coincap-api']
  });
  
  if (!degraded) return null;
  
  return (
    <div className="bg-yellow-500/20 border-y border-yellow-500/50 p-3" data-testid="degradation-banner">
      <div className="container mx-auto flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-400" />
        <div className="flex-1">
          <div className="font-bold text-yellow-400">Degraded Performance</div>
          <div className="text-sm text-yellow-300">
            Some services are experiencing issues: {failedServices.join(', ')}. 
            Core functionality remains available.
          </div>
        </div>
      </div>
    </div>
  );
};
