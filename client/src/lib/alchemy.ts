import { Network, Alchemy } from "alchemy-sdk";

const settings = {
  apiKey: import.meta.env.VITE_ALCHEMY_KEY || "demo",
  network: Network.BASE_SEPOLIA, // Default to testnet for safety, or check env
};

export const alchemy = new Alchemy(settings);
