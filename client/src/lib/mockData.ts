import guardian1 from '@assets/generated_images/cyberpunk_guardian_neon_armor_purple_cyan.png';
import guardian2 from '@assets/generated_images/cyberpunk_guardian_robotic_holographic_neon_green.png';
import guardian3 from '@assets/generated_images/cyberpunk_guardian_hooded_mysterious_neon_blue.png';
import guardian4 from '@assets/generated_images/cyberpunk_guardian_heavy_armor_red_orange.png';

export interface Guardian {
  id: number;
  name: string;
  image: string;
  traits: { type: string; value: string }[];
  rarity: 'Common' | 'Rare' | 'Legendary';
}

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

export const MOCK_GUARDIANS: Guardian[] = [
  {
    id: 1,
    name: "Guardian #0042",
    image: guardian1,
    traits: [
      { type: "Background", value: "Neon City" },
      { type: "Armor", value: "Mk-IV Stealth" },
      { type: "Weapon", value: "Plasma Blade" }
    ],
    rarity: 'Common'
  },
  {
    id: 2,
    name: "Guardian #0137",
    image: guardian2,
    traits: [
      { type: "Background", value: "Matrix" },
      { type: "Armor", value: "Holo-Mesh" },
      { type: "Eyes", value: "Cyber-Visor" }
    ],
    rarity: 'Rare'
  },
  {
    id: 3,
    name: "Guardian #0888",
    image: guardian3,
    traits: [
      { type: "Background", value: "Void" },
      { type: "Armor", value: "Shadow Weave" },
      { type: "Aura", value: "Blue Flame" }
    ],
    rarity: 'Legendary'
  },
  {
    id: 4,
    name: "Guardian #1024",
    image: guardian4,
    traits: [
      { type: "Background", value: "Industrial" },
      { type: "Armor", value: "Heavy Plating" },
      { type: "Damage", value: "Battle Scars" }
    ],
    rarity: 'Common'
  }
];

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

export const MOCK_POOL_BALANCE = 1250000;
export const MINT_PRICE = 69420;
export const TOTAL_SUPPLY = 3732;
export const MINTED_COUNT = 1420;
