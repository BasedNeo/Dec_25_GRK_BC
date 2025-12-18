import { usePriceTicker } from '@/hooks/usePriceTicker';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function PriceTicker() {
  const { btcPrice, ethPrice, isLoading, securityStatus, refresh } = usePriceTicker();

  const btc = btcPrice?.price || 0;
  const eth = ethPrice?.price || 0;
  const btcChange = btcPrice?.change24h || 0;
  const ethChange = ethPrice?.change24h || 0;
  const lastUpdated = btcPrice?.timestamp || 0;
  const isStale = securityStatus === 'stale';
  const hasError = securityStatus === 'error';

  const formatPrice = (price: number) => {
    if (!price || price === 0) return '--';
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const formatChange = (change: number) => {
    if (!change) return '0.0%';
    return `${change > 0 ? '↑' : '↓'}${Math.abs(change).toFixed(1)}%`;
  };

  const getTimeSinceUpdate = () => {
    if (!lastUpdated) return 'Never';
    const seconds = Math.floor((Date.now() - lastUpdated) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-20 left-4 z-40"
    >
      <div className="bg-black/95 backdrop-blur-md border border-cyan-500/30 rounded-lg p-3 shadow-lg min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse bg-cyan-400" />
            <span className="text-[10px] text-gray-400 font-mono uppercase">Live Prices</span>
          </div>
          
          <button
            onClick={refresh}
            disabled={isLoading}
            className="text-gray-400 hover:text-cyan-400 transition-colors"
            title={`Last updated: ${getTimeSinceUpdate()}`}
            data-testid="button-refresh-prices"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {hasError && !btc ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-red-400 text-xs py-2"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Price unavailable</span>
            </motion.div>
          ) : (
            <motion.div
              key="prices"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-orange-400 font-bold text-sm">BTC</span>
                  <span className="text-white font-mono text-sm" data-testid="text-btc-price">
                    {formatPrice(btc)}
                  </span>
                </div>
                <div className={`flex items-center gap-1 text-xs ${btcChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {btcChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span className="font-mono">{formatChange(btcChange)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-purple-400 font-bold text-sm">ETH</span>
                  <span className="text-white font-mono text-sm" data-testid="text-eth-price">
                    {formatPrice(eth)}
                  </span>
                </div>
                <div className={`flex items-center gap-1 text-xs ${ethChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {ethChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span className="font-mono">{formatChange(ethChange)}</span>
                </div>
              </div>

              {isStale && (
                <div className="text-[9px] text-yellow-400 flex items-center gap-1 pt-1 border-t border-white/10">
                  <AlertCircle className="w-2.5 h-2.5" />
                  <span>Stale data ({getTimeSinceUpdate()})</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
