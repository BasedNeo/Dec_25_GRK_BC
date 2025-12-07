import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Based Guardians",
  projectId: import.meta.env.VITE_WALLET_CONNECT_ID || "YOUR_PROJECT_ID",
  chains: [base, baseSepolia],
  ssr: false,
});
