import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { type Chain } from 'wagmi/chains';

// BasedAI L1 Chain Configuration (Chain ID: 32323)
const basedL1 = {
  id: 32323,
  name: 'BasedAI',
  nativeCurrency: { 
    name: 'Based', 
    symbol: 'BASED', 
    decimals: 18 
  },
  rpcUrls: {
    default: { 
      http: ['https://mainnet.basedaibridge.com/rpc/'] 
    },
    public: { 
      http: ['https://mainnet.basedaibridge.com/rpc/'] 
    },
  },
  blockExplorers: {
    default: { 
      name: 'Based Explorer', 
      url: 'https://explorer.bf1337.org' 
    },
  },
  testnet: false,
} as const satisfies Chain;

// PRODUCTION: WalletConnect Project ID
// Get yours from https://cloud.reown.com
const WALLETCONNECT_PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_ID || '25a4673950aaa1276b2fa76417ef9633';

if (!WALLETCONNECT_PROJECT_ID) {
  throw new Error('CRITICAL: WalletConnect Project ID is missing! Get one from https://cloud.reown.com');
}

export const config = getDefaultConfig({
  appName: 'Based Guardians',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [basedL1],
  ssr: false,
});

export { basedL1 };
