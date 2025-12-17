import { motion, AnimatePresence } from 'framer-motion';
import { usePriceTicker } from '@/hooks/usePriceTicker';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function PriceTicker() {
  const { currentAsset, currentPrice, isLoading, dataSource } = usePriceTicker();

  if (isLoading || !currentAsset || !currentPrice) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-lg border border-white/10">
        <div className="w-4 h-4 rounded-full bg-gray-600 animate-pulse" />
        <div className="w-16 h-4 bg-gray-600 rounded animate-pulse" />
      </div>
    );
  }

  const isPositive = currentPrice.change24h >= 0;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-lg border border-white/10 hover:border-cyan-500/30 transition-colors cursor-default">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAsset.symbol}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2"
        >
          {currentAsset.logo && (
            <img 
              src={currentAsset.logo} 
              alt={currentAsset.symbol} 
              className="w-4 h-4 rounded-full"
            />
          )}
          <span className="text-white font-mono text-xs font-medium">
            {currentAsset.symbol}
          </span>
          <span className="text-cyan-400 font-mono text-xs">
            ${currentPrice.price.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: currentPrice.price < 1 ? 4 : 2 
            })}
          </span>
          <span className={`flex items-center gap-0.5 text-[10px] font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {isPositive ? '+' : ''}{currentPrice.change24h.toFixed(2)}%
          </span>
          <span className="text-gray-700 text-[8px] ml-0.5" title={`Data: ${dataSource}`}>
            {dataSource === 'binance' ? '◉' : dataSource === 'coingecko' ? '○' : '◌'}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
