import { useQuery } from "@tanstack/react-query";
import { getCached, setCache, CACHE_KEYS } from "@/lib/cache";

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";
const TOKEN_ID = "basedai";

function isMobileConnection(): boolean {
  if (typeof navigator === 'undefined') return false;
  if ('connection' in navigator) {
    const conn = (navigator as any).connection;
    if (conn) {
      const effectiveType = conn.effectiveType;
      return effectiveType === '2g' || effectiveType === 'slow-2g' || effectiveType === '3g';
    }
  }
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
}

function getTimeout(): number {
  return isMobileConnection() ? 3000 : 8000;
}

interface PriceData {
  usdPrice: number;
  basedL1Price: number;
  change24h: number;
  lastUpdated: number;
}

let lastKnownPrice: PriceData | null = null;

export function useTokenPrice() {
  return useQuery<PriceData>({
    queryKey: ["tokenPrice", TOKEN_ID],
    queryFn: async () => {
      const cached = getCached<PriceData>(CACHE_KEYS.PRICE_DATA, 30 * 1000);
      if (cached) {
        lastKnownPrice = cached;
        return cached;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), getTimeout());
        const res = await fetch('/api/price/basedai', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const data = await res.json();
          const tokenData = data[TOKEN_ID];
          
          if (tokenData && tokenData.usd) {
            const usdPrice = tokenData.usd;
            const priceData: PriceData = {
              usdPrice,
              basedL1Price: usdPrice / 1000,
              change24h: tokenData.usd_24h_change || 0,
              lastUpdated: Date.now()
            };
            
            setCache(CACHE_KEYS.PRICE_DATA, priceData);
            lastKnownPrice = priceData;
            return priceData;
          }
        }
      } catch (e) {
        // Server proxy failed, will use fallback
      }

      if (lastKnownPrice) return lastKnownPrice;
      
      return {
        usdPrice: 0,
        basedL1Price: 0,
        change24h: 0,
        lastUpdated: 0
      };
    },
    refetchInterval: 30000,
    staleTime: 30000,
  });
}
