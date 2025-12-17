import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { 
  metaMaskWallet, 
  rabbyWallet, 
  coinbaseWallet, 
  walletConnectWallet,
  injectedWallet,
  trustWallet, 
  okxWallet,
  braveWallet,
  rainbowWallet,
  phantomWallet,
  zerionWallet,
  safeWallet,
  argentWallet,
  ledgerWallet,
  uniswapWallet,
} from "@rainbow-me/rainbowkit/wallets";
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
} as const satisfies Chain;

const projectId = import.meta.env.VITE_WALLET_CONNECT_ID || '3a8170812b534d0ff9d794f19a901d64';

const wallets = [
  {
    groupName: 'Popular',
    wallets: [
      injectedWallet,
      metaMaskWallet,
      coinbaseWallet,
      uniswapWallet,
      rainbowWallet,
      trustWallet,
    ],
  },
  {
    groupName: 'More Options',
    wallets: [
      walletConnectWallet,
      rabbyWallet,
      phantomWallet,
      zerionWallet,
      okxWallet,
      braveWallet,
    ],
  },
  {
    groupName: 'Advanced',
    wallets: [
      ledgerWallet,
      safeWallet,
      argentWallet,
    ],
  },
];

export const config = getDefaultConfig({
  appName: 'Based Guardians',
  projectId: projectId,
  chains: [basedL1],
  transports: {
    [basedL1.id]: fallback([
      http('https://mainnet.basedaibridge.com/rpc/', {
        timeout: 30000,
        retryCount: 5,
        retryDelay: 1500,
      }),
      http('https://rpc.basedaibridge.com/', {
        timeout: 30000,
        retryCount: 5,
        retryDelay: 1500,
      }),
    ]),
  },
  ssr: false,
  wallets: wallets,
});

export { basedL1 };
