import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, getDefaultWallets } from "@rainbow-me/rainbowkit";
import { rabbyWallet, trustWallet, okxWallet, metaMaskWallet, coinbaseWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { type Chain } from 'wagmi/chains';
import { http, fallback } from 'wagmi';

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
  fees: undefined,
} as const satisfies Chain;

const projectId = import.meta.env.VITE_WALLET_CONNECT_ID || '25a4673950aaa1276b2fa76417ef9633';

console.log('[WalletConnect] Config loaded:', {
  projectId: projectId.slice(0, 8) + '...',
  chain: basedL1.name,
  chainId: basedL1.id,
  isMobile: typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
});

export const config = getDefaultConfig({
  appName: 'Based Guardians',
  projectId: projectId,
  chains: [basedL1],
  transports: {
    [basedL1.id]: fallback([
      http('https://mainnet.basedaibridge.com/rpc/', {
        timeout: 15000,
        retryCount: 5,
        retryDelay: 2000,
      }),
    ]),
  },
  ssr: false,
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [metaMaskWallet, coinbaseWallet, walletConnectWallet],
    },
    {
      groupName: 'Popular',
      wallets: [rabbyWallet, trustWallet, okxWallet],
    },
  ],
});

export { basedL1 };
