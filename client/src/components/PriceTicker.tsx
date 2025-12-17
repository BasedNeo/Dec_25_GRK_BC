import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePriceTicker } from '@/hooks/usePriceTicker';
import { useTokenPrice } from '@/hooks/useTokenPrice';
import { useInterval } from '@/hooks/useInterval';

const ROTATE_INTERVAL = 8000;

const elegantTransition = {
  initial: { opacity: 0, filter: 'blur(4px)', scale: 0.98 },
  animate: { opacity: 1, filter: 'blur(0px)', scale: 1 },
  exit: { opacity: 0, filter: 'blur(4px)', scale: 0.98 },
  transition: { 
    duration: 0.6, 
    ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },
};

export function PriceTicker() {
  const [showBased, setShowBased] = useState(true);
  const { btcPrice, ethPrice, isLoading: cryptoLoading, securityStatus } = usePriceTicker();
  const { data: basedPrice } = useTokenPrice();

  useInterval(() => {
    setShowBased(prev => !prev);
  }, ROTATE_INTERVAL);

  const formatPrice = (price: number, decimals: number) => {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  const isVerified = securityStatus === 'verified';

  return (
    <div 
      id="priceBadge"
      className="flex flex-col justify-center px-3 py-1.5 rounded-lg border border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-xl transition-all duration-500 w-[175px] md:w-[190px] hover:border-cyan-500/30 hover:shadow-[0_0_25px_rgba(0,255,255,0.12)]"
    >
      <AnimatePresence mode="wait">
        {showBased ? (
          <motion.div
            key="based"
            {...elegantTransition}
          >
            <div className="flex items-center justify-between gap-1.5 text-[9px] leading-tight">
              <div className="flex items-center gap-1">
                <span className="text-white/50 font-mono">BASED</span>
                <span className="text-white/30">·</span>
                <span className="text-white/40 text-[8px]">ETH</span>
                <span className="font-semibold text-white font-mono tracking-tight">
                  {basedPrice === undefined 
                    ? <span className="inline-block w-12 h-3 bg-white/10 rounded animate-pulse" />
                    : basedPrice.usdPrice > 0 
                      ? formatPrice(basedPrice.usdPrice, 4)
                      : '—'
                  }
                </span>
              </div>
              {basedPrice && basedPrice.usdPrice > 0 && basedPrice.change24h !== undefined && (
                <span className={`font-medium font-mono text-[8px] ${basedPrice.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {basedPrice.change24h >= 0 ? '↑' : '↓'}{Math.abs(basedPrice.change24h || 0).toFixed(1)}%
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1 text-[9px] leading-tight mt-0.5">
              <span className="text-white/50 font-mono">BASED</span>
              <span className="text-white/30">·</span>
              <span className="text-white/40 text-[8px]">L1</span>
              <span className="font-semibold text-cyan-400 font-mono tracking-tight">
                {basedPrice === undefined 
                  ? <span className="inline-block w-16 h-3 bg-cyan-500/10 rounded animate-pulse" />
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
            {...elegantTransition}
          >
            <div className="flex items-center justify-between gap-1.5 text-[9px] leading-tight">
              <div className="flex items-center gap-1">
                <span className="text-orange-400/70 font-mono">BTC</span>
                <span className="font-semibold text-orange-300 font-mono tracking-tight">
                  {cryptoLoading || !btcPrice
                    ? <span className="inline-block w-14 h-3 bg-orange-500/10 rounded animate-pulse" />
                    : formatPrice(btcPrice.price, 0)
                  }
                </span>
              </div>
              {btcPrice && (
                <span className={`font-medium font-mono text-[8px] ${btcPrice.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {btcPrice.change24h >= 0 ? '↑' : '↓'}{Math.abs(btcPrice.change24h).toFixed(1)}%
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between gap-1.5 text-[9px] leading-tight mt-0.5">
              <div className="flex items-center gap-1">
                <span className="text-purple-400/70 font-mono">ETH</span>
                <span className="font-semibold text-purple-300 font-mono tracking-tight">
                  {cryptoLoading || !ethPrice
                    ? <span className="inline-block w-12 h-3 bg-purple-500/10 rounded animate-pulse" />
                    : formatPrice(ethPrice.price, 0)
                  }
                </span>
              </div>
              <div className="flex items-center gap-1">
                {ethPrice && (
                  <span className={`font-medium font-mono text-[8px] ${ethPrice.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {ethPrice.change24h >= 0 ? '↑' : '↓'}{Math.abs(ethPrice.change24h).toFixed(1)}%
                  </span>
                )}
                {isVerified && (
                  <span className="text-emerald-500/60 text-[8px]" title="Multi-source verified">✓</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
