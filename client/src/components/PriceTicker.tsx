import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePriceTicker } from '@/hooks/usePriceTicker';
import { useTokenPrice } from '@/hooks/useTokenPrice';

const ROTATE_INTERVAL = 5000;

export function PriceTicker() {
  const [showBased, setShowBased] = useState(true);
  const { btcPrice, ethPrice, isLoading: cryptoLoading, securityStatus } = usePriceTicker();
  const { data: basedPrice } = useTokenPrice();

  useEffect(() => {
    const interval = setInterval(() => {
      setShowBased(prev => !prev);
    }, ROTATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number, decimals: number) => {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  const isVerified = securityStatus === 'verified';

  return (
    <div 
      id="priceBadge"
      className="flex flex-col justify-center px-4 py-2 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-xl transition-all duration-300 min-w-[140px] md:min-w-[170px] hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(0,255,255,0.1)]"
    >
      <AnimatePresence mode="wait">
        {showBased ? (
          <motion.div
            key="based"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between gap-2 md:gap-3 text-[10px] leading-tight">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground font-mono font-bold">$BASED (ETH):</span>
                <span className="font-bold text-white font-mono">
                  {basedPrice === undefined 
                    ? <div className="h-3 w-12 rounded skeleton inline-block align-middle" />
                    : basedPrice.usdPrice > 0 
                      ? formatPrice(basedPrice.usdPrice, 4)
                      : '—'
                  }
                </span>
              </div>
              {basedPrice && basedPrice.usdPrice > 0 && basedPrice.change24h !== undefined && (
                <span className={`font-bold font-mono ${basedPrice.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {basedPrice.change24h >= 0 ? '▲' : '▼'} {Math.abs(basedPrice.change24h || 0).toFixed(1)}%
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-[10px] leading-tight mt-0.5">
              <span className="text-muted-foreground font-mono font-bold">$BASED (L1):</span>
              <span className="font-bold text-cyan-400 font-mono">
                {basedPrice === undefined 
                  ? <div className="h-3 w-16 rounded skeleton inline-block align-middle" />
                  : basedPrice.basedL1Price > 0 
                    ? formatPrice(basedPrice.basedL1Price, 7)
                    : '—'
                }
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="crypto"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between gap-2 md:gap-3 text-[10px] leading-tight">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground font-mono font-bold">$BTC:</span>
                <span className="font-bold text-orange-400 font-mono">
                  {cryptoLoading || !btcPrice
                    ? <div className="h-3 w-14 rounded skeleton inline-block align-middle" />
                    : formatPrice(btcPrice.price, 0)
                  }
                </span>
              </div>
              {btcPrice && (
                <span className={`font-bold font-mono text-[9px] ${btcPrice.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {btcPrice.change24h >= 0 ? '▲' : '▼'} {Math.abs(btcPrice.change24h).toFixed(1)}%
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between gap-2 text-[10px] leading-tight mt-0.5">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground font-mono font-bold">$ETH:</span>
                <span className="font-bold text-purple-400 font-mono">
                  {cryptoLoading || !ethPrice
                    ? <div className="h-3 w-12 rounded skeleton inline-block align-middle" />
                    : formatPrice(ethPrice.price, 0)
                  }
                </span>
              </div>
              {ethPrice && (
                <span className={`font-bold font-mono text-[9px] ${ethPrice.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {ethPrice.change24h >= 0 ? '▲' : '▼'} {Math.abs(ethPrice.change24h).toFixed(1)}%
                </span>
              )}
              {isVerified && (
                <span className="text-green-500 text-[8px]" title="Multi-source verified">✓</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
