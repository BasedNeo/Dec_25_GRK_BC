import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { type Chain } from 'wagmi/chains';

const basedL1 = {
  id: 32323,
  name: 'Based L1 V1',
  nativeCurrency: { name: 'Based', symbol: 'BASED', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.basedaibridge.com/rpc'] },
  },
  blockExplorers: {
    default: { name: 'Based Explorer', url: 'https://explorer.bf1337.org' },
  },
} as const satisfies Chain;

export const config = getDefaultConfig({
  appName: "Based Guardians",
  projectId: import.meta.env.VITE_WALLET_CONNECT_ID || "3a8170812b534d0ff9d794f19a901d64", // Fallback ID for demo
  chains: [basedL1],
  ssr: false,
});
