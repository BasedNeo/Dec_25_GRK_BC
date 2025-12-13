import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useRef } from "react";

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";
const TOKEN_ID = "basedai";

interface PriceData {
  ethPrice: number;
  basedL1Price: number;
  change: number;
}

// Cache for last known good price
let lastKnownPrice: PriceData | null = null;

export function useTokenPrice() {
  const isFirstLoad = useRef(true);

  return useQuery<PriceData>({
    queryKey: ["tokenPrice", TOKEN_ID],
    queryFn: async () => {
      // Use a CORS proxy to avoid browser restrictions
      const targetUrl = `${COINGECKO_API}?ids=${TOKEN_ID}&vs_currencies=usd&include_24hr_change=true`;
      // Using allorigins as a reliable fallback for frontend-only demos
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      
      try {
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error("Failed to fetch price");
        
        const data = await res.json();
        const tokenData = data[TOKEN_ID];
        
        if (!tokenData || !tokenData.usd) {
            throw new Error("BasedAI price data missing");
        }

        const ethPrice = parseFloat(tokenData.usd);
        
        // Based L1 Price is 1000:1 of ETH (ETH Price / 1000)
        // Explicitly ensuring float division
        const basedL1Price = ethPrice / 1000.0;
        
        console.log("Price Debug:", { ethPrice, basedL1Price });

        const newPrice = {
          ethPrice,
          basedL1Price,
          change: tokenData.usd_24h_change || 0
        };

        lastKnownPrice = newPrice;
        isFirstLoad.current = false;
        return newPrice;

      } catch (e) {
        console.warn("Price fetch failed:", e);
        
        if (isFirstLoad.current) {
             toast({
                title: "Price Update Failed",
                description: "Using cached/mock data while retrying connection...",
                variant: "destructive",
                duration: 5000,
            });
            isFirstLoad.current = false;
        }

        // Return last known price if available, otherwise mock data
        if (lastKnownPrice) {
            return lastKnownPrice;
        }

        // Fallback to mock data matching user examples ($0.105 range)
        return {
          ethPrice: 0.1052,
          basedL1Price: 0.0001052,
          change: 2.5
        };
      }
    },
    refetchInterval: 60000, 
    staleTime: 60000,
  });
}
