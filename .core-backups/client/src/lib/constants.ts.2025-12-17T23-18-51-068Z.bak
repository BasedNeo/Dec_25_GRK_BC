/**
 * constants.ts - Application Constants & Contract Addresses
 * 
 * ⚠️ LOCKED - Do NOT modify without explicit user request
 * See replit.md "LOCKED SYSTEMS - FINANCIAL GRADE" section
 * 
 * Contains critical financial constants:
 * - Contract addresses (NFT, Marketplace, Governance)
 * - Revenue split percentages (MINT_SPLIT, ROYALTY_SPLIT)
 * - CUMULATIVE_SALES_BASELINE (set to 0 - all from on-chain)
 * 
 * This is a financial-grade component. All values are locked.
 */

export const RPC_URL = "https://mainnet.basedaibridge.com/rpc/";
export const CHAIN_ID = 32323;

export const RPC_ENDPOINTS = [
  'https://mainnet.basedaibridge.com/rpc/',
  'https://rpc.basedaibridge.com/',
];
export const BLOCK_EXPLORER = "https://explorer.bf1337.org";
export const NFT_SYMBOL = "BASED";
export const TWITTER_URL = "https://x.com/based_guardians";
export const IPFS_ROOT = "https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/bafybeie3c5ahzsiiparmbr6lgdbpiukorbphvclx73dwr6vrjfalfyu52y/";
export const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_KEY;

// === CONTRACTS ===
export const NFT_CONTRACT = "0xaE51dc5fD1499A129f8654963560f9340773ad59";
// Marketplace V2 - approval-based (NFT stays in wallet when listed, like OpenSea)
export const MARKETPLACE_CONTRACT = "0x2836f07Ed31a6DEc09E0d62Fb15D7c6c6Ddb139c";
// Marketplace V3 - off-chain offers (gasless offers like Aftermint)
export const MARKETPLACE_V3_CONTRACT = "0x2a3f9D8b844c2dB2F42095B49817c0D6991514f3";
export const GOVERNANCE_CONTRACT = "0x2B107A4Ea8fCC4FAa6d55a5bEeb5E2740C849995";

// === ECOSYSTEM WALLETS ===
export const COMMUNITY_TREASURY = "0xae543104fdbe456478e19894f7f0e01f0971c9b4";  // 51% of mint, 2% of royalty
export const ROYALTY_WALLET = "0xb1362caf09189887599ed40f056712b1a138210c";      // 4% of royalty
export const CREATOR_WALLET = "0xef2015bffe3e7db1474d5df99435fd8e936bac7a";      // 49% of mint, 4% of royalty, 1% platform fee
export const ADMIN_WALLET = COMMUNITY_TREASURY; // Alias for backward compatibility

// === SPLITTER CONTRACTS ===
export const MINT_SPLITTER = "0x371c67FE6e839F921279FcdD7dCb1Fd74eeD1d76";
export const ROYALTY_SPLITTER = "0xc87C7A5BA2A58bb7BB16799804582BA6C2E43279";

// === REVENUE SPLIT CONFIGURATION ===
// ⚠️ LOCKED: Revenue splits - Do NOT modify without explicit user request
export const MINT_SPLIT = {
  TREASURY_PERCENT: 51,  // LOCKED: 51% of mint revenue to community treasury
  CREATOR_PERCENT: 49    // LOCKED: 49% of mint revenue to creator
};

// ⚠️ LOCKED: Royalty splits - Do NOT modify without explicit user request
export const ROYALTY_SPLIT = {
  TOTAL_ROYALTY_PERCENT: 10,  // LOCKED: 10% total royalty on sales
  TREASURY_PERCENT: 2,         // LOCKED: 2% to community treasury
  ROYALTY_WALLET_PERCENT: 4,   // LOCKED: 4% to royalty wallet
  CREATOR_PERCENT: 4           // LOCKED: 4% to creator
};

export const PLATFORM_FEE_PERCENT = 1;

// === TOKEN ADDRESSES ===
export const BASED_TOKEN_ETH = "0x44971abf0251958492fee97da3e5c5ada88b9185";

// === ADMIN WALLETS ===
// Admin wallets with full access to admin dashboard and proposal creation
export const ADMIN_WALLETS = [
  "0xae543104fdbe456478e19894f7f0e01f0971c9b4",
  "0xb1362caf09189887599ed40f056712b1a138210c",
  "0xabce9e63a9ae51e215bb10c9648f4c0f400c5847",
  "0xbba49256a93a06fcf3b0681fead2b4e3042b9124",
  "0xc5ca5cb0acf8f7d4c6cd307d0d875ee2e09fb1af"
];

// === PROPOSAL CREATOR WALLETS ===
// Alias for backward compatibility
export const PROPOSAL_CREATOR_WALLETS = ADMIN_WALLETS;

// === SITE CONFIG ===
export const SITE_URL = "https://basedguardians.com";

// === RATE LIMITING ===
export const RATE_LIMITS = {
  RPC_CALLS_PER_MINUTE: 60,
  CACHE_DURATION_MS: 30000,
  RETRY_DELAY_MS: 1000,
  MAX_RETRIES: 3,
};

// === GAS SETTINGS (BasedAI optimized) ===
export const GAS_SETTINGS = {
  MINT: BigInt(8000000),
  LIST: BigInt(300000),
  BUY: BigInt(400000),
  APPROVE: BigInt(200000),
  OFFER: BigInt(300000),
  DELIST: BigInt(150000),
  DEFAULT_GAS_PRICE: BigInt(10000000000), // 10 gwei
};

// === CUMULATIVE SALES BASELINE ===
// ⚠️ LOCKED - Do NOT modify without explicit user request
// Historical baseline for sales that occurred before the activity feed window
// The activity feed adds recent on-chain Sold events to this baseline
export const CUMULATIVE_SALES_BASELINE = {
  volume: 2500000,        // Historical volume in $BASED from marketplace sales
  asOfBlock: 1000000,
  lastUpdated: "2024-12-17"
};
