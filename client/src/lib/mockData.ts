import guardian1 from '@assets/generated_images/cyberpunk_guardian_neon_armor_purple_cyan.png';
import guardian2 from '@assets/generated_images/cyberpunk_guardian_robotic_holographic_neon_green.png';
import guardian3 from '@assets/generated_images/cyberpunk_guardian_hooded_mysterious_neon_blue.png';
import guardian4 from '@assets/generated_images/cyberpunk_guardian_heavy_armor_red_orange.png';

export interface Guardian {
  id: number;
  name: string;
  image: string;
  traits: { type: string; value: string; rarity?: number }[];
  rarity: string; 
  isError?: boolean;
  description?: string;
  price?: number;
  currency?: string;
  isListed?: boolean;
  owner?: string;
}

export const MOCK_GUARDANS_COUNT = 3732;

// Rarity Levels & Multipliers
export const RARITY_CONFIG: Record<string, { weight: number, multiplier: number, color: string }> = {
  'Rarest-Legendary': { weight: 0.034, multiplier: 0.40, color: 'text-cyan-400 border-cyan-400/50 bg-cyan-950/50' },
  'Very Rare': { weight: 0.05, multiplier: 0.35, color: 'text-purple-400 border-purple-400/50 bg-purple-950/50' },
  'More Rare': { weight: 0.08, multiplier: 0.30, color: 'text-amber-400 border-amber-400/50 bg-amber-950/50' }, // Gold
  'Rare': { weight: 0.12, multiplier: 0.25, color: 'text-yellow-400 border-yellow-400/50 bg-yellow-950/50' },
  'Less Rare': { weight: 0.15, multiplier: 0.20, color: 'text-blue-400 border-blue-400/50 bg-blue-950/50' },
  'Less Common': { weight: 0.18, multiplier: 0.10, color: 'text-green-400 border-green-400/50 bg-green-950/50' },
  'Common': { weight: 0.231, multiplier: 0.05, color: 'text-white border-white/50 bg-zinc-900/50' },
  'Most Common': { weight: 0.155, multiplier: 0.00, color: 'text-gray-400 border-gray-400/50 bg-zinc-950/50' }
};

// Deterministic mock data generator for 20 items (or more if needed)
export const generateMockGuardian = (id: number): Guardian => {
  // Deterministic rarity distribution based on ID
  let rarity = 'Most Common';
  const mod = id % 100;
  
  if (mod < 3) rarity = 'Rarest-Legendary';      // ~3%
  else if (mod < 8) rarity = 'Very Rare';        // ~5%
  else if (mod < 16) rarity = 'More Rare';       // ~8%
  else if (mod < 28) rarity = 'Rare';            // ~12%
  else if (mod < 43) rarity = 'Less Rare';       // ~15%
  else if (mod < 61) rarity = 'Less Common';     // ~18%
  else if (mod < 84) rarity = 'Common';          // ~23%
  else rarity = 'Most Common';                   // ~16%

  return {
    id,
    name: `Guardian #${id}`,
    image: `https://ipfs.io/ipfs/bafybeig5g3p5n7j5q5n7j5q5n7j5q5n7j5q5n7j5q/image/${id}.png`, // Using IPFS pattern
    rarity,
    traits: [
      { type: 'Rarity Level', value: rarity },
      { type: 'Background', value: rarity.includes('Rare') ? 'Cyber Void' : 'Industrial' },
      { type: 'Armor', value: rarity.includes('Legendary') ? 'Quantum Plate' : 'Standard Kevlar' },
      { type: 'Weapon', value: rarity.includes('Legendary') ? 'Plasma Railgun' : 'Pulse Rifle' },
      { type: 'Strength', value: String(Math.floor(Math.random() * 10) + 1) },
      { type: 'Speed', value: String(Math.floor(Math.random() * 10) + 1) },
      { type: 'Intelligence', value: String(Math.floor(Math.random() * 10) + 1) },
      { type: 'Character Type', value: id % 3 === 0 ? 'Based Frog' : (id % 3 === 1 ? 'Based Guardian' : 'Based Creature') }
    ],
    description: `A unique Guardian from the 3232nd Battalion.`,
    price: 420 + (id % 100),
    currency: '$BASED',
    isListed: id % 3 === 0, 
    owner: `0x${id.toString(16).padStart(40, '0')}`
  };
};

export interface Proposal {
  id: number;
  title: string;
  description: string;
  type: 'binary' | 'multiple';
  options: { id: string; label: string; votes: number }[];
  status: 'Active' | 'Passed' | 'Rejected' | 'Executed';
  endTime: string;
  totalVotes: number;
}

export const MOCK_GUARDIANS: Guardian[] = Array.from({ length: 20 }, (_, i) => generateMockGuardian(i + 1));

export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 1,
    title: "Proposal: Traditional Website vs. App Development",
    description: "Should we create a traditional website or put those resources into further developing this app?",
    type: 'multiple',
    options: [
        { id: 'for', label: 'For', votes: 1500 },
        { id: 'against', label: 'Against', votes: 200 },
        { id: 'abstain', label: 'Abstain', votes: 50 }
    ],
    status: 'Active',
    endTime: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
    totalVotes: 1750
  },
  {
    id: 2,
    title: "Feature Request: Offers & Listings in Series",
    description: "Add the ability to make offers in the 'Series' section and the ability to set a price to sell NFTs.",
    type: 'binary',
    options: [
        { id: 'yes', label: 'For', votes: 890 },
        { id: 'no', label: 'Against', votes: 450 },
        { id: 'abstain', label: 'Abstain', votes: 100 }
    ],
    status: 'Passed',
    endTime: "2025-11-20T12:00:00Z",
    totalVotes: 1440
  },
  {
    id: 3,
    title: "Timeline Adjustment: Postpone Launch",
    description: "Wait to launch the App until April.",
    type: 'binary',
    options: [
        { id: 'yes', label: 'For', votes: 300 },
        { id: 'no', label: 'Against', votes: 1200 },
        { id: 'abstain', label: 'Abstain', votes: 50 }
    ],
    status: 'Rejected',
    endTime: "2025-11-15T12:00:00Z",
    totalVotes: 1550
  }
];

export const MINT_PRICE = 69420;
export const TOTAL_SUPPLY = 3732;
export const MINTED_COUNT = 6; 

// Backing Value Constants & Logic
export const GENESIS_TIMESTAMP = new Date('2024-12-01T00:00:00Z').getTime(); 
export const HALVING_TIMESTAMP = new Date('2025-12-31T23:59:59Z').getTime();
export const EMISSION_RATE_DAILY = 5000; // 5,000 $BASED per day
export const MINT_REVENUE_PERCENT = 0.51; // 51%

export const calculateEmissions = () => {
  const now = Date.now();
  const msSinceGenesis = Math.max(0, now - GENESIS_TIMESTAMP);
  const daysSinceGenesis = msSinceGenesis / (1000 * 60 * 60 * 24);
  return Math.floor(daysSinceGenesis * EMISSION_RATE_DAILY);
};

export const calculateBackedValue = (rarityLevel: string = 'Most Common') => {
  // 1. Base per-NFT from mints: 51% of 69,420
  const mintShare = 35404.2; // Hardcoded to prevent any constant multiplication issues
  
  // 2. Daily Emissions Accrual
  // 5,000 $BASED / 3,732 NFTs = ~1.3397 per day
  const dailyEmissionPerNft = 1.3397642; 
  
  // Calculate days since Genesis (Accrued)
  const now = Date.now();
  const msSinceGenesis = Math.max(0, now - GENESIS_TIMESTAMP);
  const daysSinceGenesis = msSinceGenesis / (1000 * 60 * 60 * 24);
  
  const accruedEmissions = dailyEmissionPerNft * daysSinceGenesis;
  
  // 3. Apply Rarity Multiplier to Emissions ONLY
  // Default to 0 boost if rarity not found
  const multiplier = RARITY_CONFIG[rarityLevel]?.multiplier || 0;
  const boostedEmissions = accruedEmissions * (1 + multiplier);
  
  // Should be approx 35,404 + (Days * 1.34 * Boost)
  return Math.floor(mintShare + boostedEmissions);
};

// Pool Balance = (Minted * Price * 0.51) + Emissions
// Note: User prompt asked for "6x 69.240" for pool total earlier, but here we are harmonizing.
// The "Pool Total" usually tracks the *actual* treasury.
// But the "Backed By Per NFT" tracks the *theoretical* value per unit.
export const calculatePoolBalance = () => {
    // We stick to the previous requested logic for the POOL TRACKER total (Live Mint Revenue + Emissions)
    // But we update the "Backed By" logic elsewhere.
    const mintRevenue = MINTED_COUNT * MINT_PRICE; // Full revenue or 51%? User said "6x 69.240" earlier.
    // Let's keep the Pool Balance logic consistent with the previous specific request for the *hero/pool display*,
    // but the *per NFT* value uses the new harmonized logic.
    const emissions = calculateEmissions();
    return mintRevenue + emissions;
};

export const MOCK_POOL_BALANCE = calculatePoolBalance(); // Initial static value

export interface Escrow {
  id: number;
  seller: string;
  assetName: string;
  assetImage: string;
  price: number;
  currency: 'ETH' | 'BTC' | 'XRP' | 'XLM' | '$BASED';
  status: 'Open' | 'Pending' | 'Completed' | 'Disputed';
  createdAt: string;
}

export const MOCK_ESCROWS: Escrow[] = [
  {
    id: 101,
    seller: "0x71C...9A21",
    assetName: "Guardian #0042",
    assetImage: guardian1,
    price: 0.5,
    currency: 'ETH',
    status: 'Open',
    createdAt: "2023-10-25T10:00:00Z"
  },
  {
    id: 102,
    seller: "0x3D2...B44F",
    assetName: "Guardian #0888 (Legendary)",
    assetImage: guardian3,
    price: 150000,
    currency: '$BASED',
    status: 'Open',
    createdAt: "2023-10-26T14:30:00Z"
  },
  {
    id: 103,
    seller: "0x9F1...C22D",
    assetName: "Guardian #0137",
    assetImage: guardian2,
    price: 2500,
    currency: 'XRP',
    status: 'Pending',
    createdAt: "2023-10-24T09:15:00Z"
  }
];
