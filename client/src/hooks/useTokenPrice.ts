import { useQuery } from "@tanstack/react-query";

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";
const TOKEN_ID = "ethereum";

interface PriceData {
  ethPrice: number;
  basedL1Price: number;
  change: number;
}

export function useTokenPrice() {
  return useQuery<PriceData>({
    queryKey: ["tokenPrice", TOKEN_ID],
    queryFn: async () => {
      // Use a CORS proxy to avoid browser restrictions
      const targetUrl = `${COINGECKO_API}?ids=${TOKEN_ID}&vs_currencies=usd&include_24hr_change=true`;
      // Using allorigins as a reliable fallback for frontend-only demos
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      
      const res = await fetch(proxyUrl);
      
      if (!res.ok) {
        throw new Error("Failed to fetch price");
      }

      const data = await res.json();
      const tokenData = data[TOKEN_ID];
      
      const ethPrice = tokenData?.usd || 0;
      // Based L1 Price is 1000:1 of ETH (ETH Price / 1000)
      const basedL1Price = ethPrice / 1000;
      
      return {
        ethPrice,
        basedL1Price,
        change: tokenData?.usd_24h_change || 0
      };
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 60000,
  });
}
