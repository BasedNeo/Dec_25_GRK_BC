import { useQuery } from "@tanstack/react-query";

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/token_price/ethereum";
const TOKEN_ADDRESS = "0x44971abf0251958492fee97da3e5c5ada88b9185";

interface PriceData {
  usd: number;
  eth: number;
}

export function useTokenPrice() {
  return useQuery<PriceData>({
    queryKey: ["tokenPrice", TOKEN_ADDRESS],
    queryFn: async () => {
      const res = await fetch(
        `${COINGECKO_API}?contract_addresses=${TOKEN_ADDRESS}&vs_currencies=usd,eth`
      );
      
      if (!res.ok) {
        throw new Error("Failed to fetch price");
      }

      const data = await res.json();
      // CoinGecko returns object with address as key (lowercase)
      const prices = data[TOKEN_ADDRESS.toLowerCase()];
      
      return {
        usd: prices?.usd || 0,
        eth: prices?.eth || 0
      };
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 60000,
  });
}
