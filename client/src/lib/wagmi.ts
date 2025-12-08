import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { Chain } from "wagmi/chains";
import { RPC_URL, CHAIN_ID, BLOCK_EXPLORER } from "@/lib/constants";

const basedAI = {
  id: CHAIN_ID,
  name: 'BasedAI',
  nativeCurrency: {
    decimals: 18,
    name: 'BasedAI',
    symbol: 'BASED',
  },
  rpcUrls: {
    public: { http: [RPC_URL] },
    default: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'BasedScan', url: BLOCK_EXPLORER },
  },
} as const satisfies Chain;

export const config = getDefaultConfig({
  appName: "Based Guardians",
  projectId: import.meta.env.VITE_WALLET_CONNECT_ID || "3a8170812b534d0ff9d794f19a901d64", // Fallback ID for demo
  chains: [basedAI],
  ssr: false,
});
