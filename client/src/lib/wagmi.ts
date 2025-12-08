import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Based Guardians",
  projectId: import.meta.env.VITE_WALLET_CONNECT_ID || "3a8170812b534d0ff9d794f19a901d64", // Fallback ID for demo
  chains: [baseSepolia],
  ssr: false,
});
