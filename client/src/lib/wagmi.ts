import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
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

const projectId = '25a4673950aaa1276b2fa76417ef9633';

export const config = getDefaultConfig({
  appName: 'Based Guardians',
  projectId: projectId,
  chains: [basedL1],
  transports: {
    [basedL1.id]: fallback([
      http('https://mainnet.basedaibridge.com/rpc/', {
        timeout: 5000,
        retryCount: 1,
        retryDelay: 300,
      }),
      http('https://rpc.basedaibridge.com/', {
        timeout: 5000,
        retryCount: 1,
        retryDelay: 300,
      }),
    ]),
  },
  ssr: false,
});

export { basedL1 };
