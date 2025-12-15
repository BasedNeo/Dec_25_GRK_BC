export const RPC_URL = "https://mainnet.basedaibridge.com/rpc";
export const CHAIN_ID = 32323;
export const BLOCK_EXPLORER = "https://explorer.bf1337.org";
export const NFT_SYMBOL = "BASED";
export const TWITTER_URL = "https://x.com/based_guardians";
export const IPFS_ROOT = "https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeie3c5ahzsiiparmbr6lgdbpiukorbphvclx73dwr6vrjfalfyu52y/";
export const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_KEY;

// === CONTRACTS ===
export const NFT_CONTRACT = "0xaE51dc5fD1499A129f8654963560f9340773ad59";
// V2 Marketplace (OpenSea-style - NFT stays in wallet until sold!)
export const MARKETPLACE_CONTRACT = "0x2836f07Ed31a6DEc09E0d62Fb15D7c6c6Ddb139c";
// OLD V1 (escrow-based) - DEPRECATED: 0x88161576266dCDedb19342aC2197267282520793
export const GOVERNANCE_CONTRACT = "0x2B107A4Ea8fCC4FAa6d55a5bEeb5E2740C849995";

// === ECOSYSTEM WALLETS ===
export const COMMUNITY_TREASURY = "0xae543104fdbe456478e19894f7f0e01f0971c9b4";  // 51% of mint, 2% of royalty
export const ROYALTY_WALLET = "0xb1362caf09189887599ed40f056712b1a138210c";      // 4% of royalty
export const CREATOR_WALLET = "0xef2015bffe3e7db1474d5df99435fd8e936bac7a";      // 49% of mint, 4% of royalty, 1% platform fee
export const ADMIN_WALLET = COMMUNITY_TREASURY; // Alias for backward compatibility

// === SPLITTER CONTRACTS (add addresses after deployment) ===
export const MINT_SPLITTER = "";      // TODO: Add after deploying
export const ROYALTY_SPLITTER = "";   // TODO: Add after deploying

// === REVENUE SPLIT CONFIGURATION ===
export const MINT_SPLIT = {
  TREASURY_PERCENT: 51,
  CREATOR_PERCENT: 49
};

export const ROYALTY_SPLIT = {
  TOTAL_ROYALTY_PERCENT: 10,
  TREASURY_PERCENT: 2,
  ROYALTY_WALLET_PERCENT: 4,
  CREATOR_PERCENT: 4
};

export const PLATFORM_FEE_PERCENT = 1;

// === TOKEN ADDRESSES ===
export const BASED_TOKEN_ETH = "0x44971abf0251958492fee97da3e5c5ada88b9185";

// === PROPOSAL CREATOR WALLETS ===
// Only these wallets can create new proposals
export const PROPOSAL_CREATOR_WALLETS = [
  "0xae543104fdbe456478e19894f7f0e01f0971c9b4",
  "0xb1362caf09189887599ed40f056712b1a138210c",
  "0xabce9e63a9ae51e215bb10c9648f4c0f400c5847",
  "0xbba49256a93a06fcf3b0681fead2b4e3042b9124",
  "0xc5ca5cb0acf8f7d4c6cd307d0d875ee2e09fb1af"
];
