import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, getDefaultWallets } from "@rainbow-me/rainbowkit";
import { rabbyWallet, trustWallet, okxWallet } from "@rainbow-me/rainbowkit/wallets";
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
  fees: undefined, // Disable EIP-1559 - force legacy gas pricing
} as const satisfies Chain;

const projectId = import.meta.env.VITE_WALLET_CONNECT_ID || '3a8170812b534d0ff9d794f19a901d64';

export const config = getDefaultConfig({
  appName: 'Based Guardians',
  projectId: projectId,
  chains: [basedL1],
  transports: {
    [basedL1.id]: fallback([
      http('https://mainnet.basedaibridge.com/rpc/', {
        timeout: 15000,
        retryCount: 3,
        retryDelay: 1000,
      }),
      http('https://rpc.basedaibridge.com/', {
        timeout: 15000,
        retryCount: 3,
        retryDelay: 1000,
      }),
    ]),
  },
  ssr: false,
  wallets: [
    ...getDefaultWallets().wallets,
    {
      groupName: 'Popular',
      wallets: [rabbyWallet, trustWallet, okxWallet],
    },
  ],
});

export { basedL1 };
