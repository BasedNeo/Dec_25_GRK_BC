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

// Deterministic mock data generator for 20 items (or more if needed)
export const generateMockGuardian = (id: number): Guardian => {
  const isRare = id % 10 === 0;
  const isEpic = id % 50 === 0;
  const isLegendary = id % 100 === 0;
  
  let rarity = 'Common';
  if (isLegendary) rarity = 'Legendary';
  else if (isEpic) rarity = 'Epic';
  else if (isRare) rarity = 'Rare';

  return {
    id,
    name: `Guardian #${id}`,
    image: `https://ipfs.io/ipfs/bafybeig5g3p5n7j5q5n7j5q5n7j5q5n7j5q5n7j5q/image/${id}.png`, // Using IPFS pattern
    rarity,
    traits: [
      { type: 'Background', value: isRare ? 'Cyber Void' : 'Industrial' },
      { type: 'Armor', value: isEpic ? 'Quantum Plate' : 'Standard Kevlar' },
      { type: 'Weapon', value: isLegendary ? 'Plasma Railgun' : 'Pulse Rifle' },
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
    title: "Initiative: Neon Streets Expansion",
    description: "Allocate 50,000 $BASED to acquire virtual land in the Neon District for the community hub.",
    type: 'binary',
    options: [
        { id: 'yes', label: 'For', votes: 1500 },
        { id: 'no', label: 'Against', votes: 200 },
        { id: 'abstain', label: 'Abstain', votes: 50 }
    ],
    status: 'Active',
    endTime: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
    totalVotes: 1750
  },
  {
    id: 2,
    title: "Grant: Cyber-Artist Fund",
    description: "Establish a 10,000 $BASED grant program for community artists to create lore-accurate artwork.",
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
    title: "Protocol Upgrade: Staking V2",
    description: "Upgrade the staking contract to allow for variable lock-up periods with boosted APY.",
    type: 'multiple',
    options: [
        { id: 'a', label: 'Option A: 30 Days (10% APY)', votes: 300 },
        { id: 'b', label: 'Option B: 60 Days (15% APY)', votes: 1200 },
        { id: 'c', label: 'Option C: 90 Days (20% APY)', votes: 50 },
        { id: 'd', label: 'Option D: No Change', votes: 20 }
    ],
    status: 'Rejected',
    endTime: "2025-11-15T12:00:00Z",
    totalVotes: 1570
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

export const calculateBackedValue = () => {
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
  
  // Should be approx 35,404 + (Days * 1.34)
  return Math.floor(mintShare + accruedEmissions);
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
