import { Network, Alchemy } from "alchemy-sdk";
import { CHAIN_ID } from "./constants";

// Map our chain ID to Alchemy network if possible, otherwise default to a supported one
// Since Based L1 is custom, Alchemy SDK might not support it directly unless we override.
// However, we'll configure it for Base Sepolia as a fallback or placeholder.
const settings = {
  apiKey: import.meta.env.VITE_ALCHEMY_KEY || "demo",
  network: Network.BASE_SEPOLIA, 
  maxRetries: 1,
};

export const alchemy = new Alchemy(settings);
