import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { Chain } from "wagmi/chains";

const basedAI = {
  id: 32323,
  name: 'BasedAI',
  nativeCurrency: {
    decimals: 18,
    name: 'BasedAI',
    symbol: 'BASED',
  },
  rpcUrls: {
    public: { http: ['https://mainnet.basedaibridge.com/rpc/'] },
    default: { http: ['https://mainnet.basedaibridge.com/rpc/'] },
  },
  blockExplorers: {
    default: { name: 'BasedScan', url: 'https://explorer.bf1337.org/' },
  },
} as const satisfies Chain;

export const config = getDefaultConfig({
  appName: "Based Guardians",
  projectId: import.meta.env.VITE_WALLET_CONNECT_ID || "3a8170812b534d0ff9d794f19a901d64", // Fallback ID for demo
  chains: [basedAI],
  ssr: false,
});
