import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { 
  metaMaskWallet, 
  coinbaseWallet, 
  trustWallet,
  walletConnectWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { type Chain } from 'wagmi/chains';
import { http } from 'wagmi';

// Mobile detection utility
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Mobile-compatible wallet list (these have mobile apps with deep linking)
export const MOBILE_COMPATIBLE_WALLETS = ['metaMask', 'rainbow', 'coinbase', 'walletConnect'] as const;

// Extension-only wallets to hide on mobile
export const EXTENSION_ONLY_WALLETS = ['phantom', 'rabby', 'brave'] as const;

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
  transports: {
    [basedL1.id]: http('https://mainnet.basedaibridge.com/rpc/', {
      batch: true,
      retryCount: 2,
      timeout: 10000,
    }),
  },
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        rainbowWallet,
        coinbaseWallet,
        walletConnectWallet,
      ],
    },
    {
      groupName: 'More Options',
      wallets: [
        trustWallet,
      ],
    },
  ],
});

export { basedL1 };
