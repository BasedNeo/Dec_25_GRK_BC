import { useQuery } from "@tanstack/react-query";

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";
const TOKEN_ID = "basedai";

interface PriceData {
  usd: number;
  change: number;
}

export function useTokenPrice() {
  return useQuery<PriceData>({
    queryKey: ["tokenPrice", TOKEN_ID],
    queryFn: async () => {
      // Fetch directly by ID as requested
      const res = await fetch(
        `${COINGECKO_API}?ids=${TOKEN_ID}&vs_currencies=usd&include_24hr_change=true`
      );
      
      if (!res.ok) {
        throw new Error("Failed to fetch price");
      }

      const data = await res.json();
      const tokenData = data[TOKEN_ID];
      
      return {
        usd: tokenData?.usd || 0,
        change: tokenData?.usd_24h_change || 0
      };
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 60000,
  });
}
