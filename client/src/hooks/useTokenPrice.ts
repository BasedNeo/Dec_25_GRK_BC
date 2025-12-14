import { useQuery } from "@tanstack/react-query";
import { getCached, setCache, CACHE_KEYS } from "@/lib/cache";

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";
const TOKEN_ID = "basedai";

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
        const directUrl = `${COINGECKO_API}?ids=${TOKEN_ID}&vs_currencies=usd&include_24hr_change=true`;
        const res = await fetch(directUrl);
        
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
        console.warn("Direct CoinGecko fetch failed, trying proxy...");
      }

      try {
        const targetUrl = `${COINGECKO_API}?ids=${TOKEN_ID}&vs_currencies=usd&include_24hr_change=true`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        
        const res = await fetch(proxyUrl);
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
        console.warn("Proxy fetch also failed");
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
