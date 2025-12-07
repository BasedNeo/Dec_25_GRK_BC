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
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  status: 'Active' | 'Passed' | 'Rejected' | 'Executed';
  endTime: string;
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
    votesFor: 1500,
    votesAgainst: 200,
    votesAbstain: 50,
    status: 'Active',
    endTime: "2025-12-10T12:00:00Z"
  },
  {
    id: 2,
    title: "Grant: Cyber-Artist Fund",
    description: "Establish a 10,000 $BASED grant program for community artists to create lore-accurate artwork.",
    votesFor: 890,
    votesAgainst: 450,
    votesAbstain: 100,
    status: 'Passed',
    endTime: "2025-11-20T12:00:00Z"
  },
  {
    id: 3,
    title: "Protocol Upgrade: Staking V2",
    description: "Upgrade the staking contract to allow for variable lock-up periods with boosted APY.",
    votesFor: 300,
    votesAgainst: 1200,
    votesAbstain: 50,
    status: 'Rejected',
    endTime: "2025-11-15T12:00:00Z"
  }
];

export const MOCK_POOL_BALANCE = 1250000;
export const MINT_PRICE = 69420;
export const TOTAL_SUPPLY = 3732;
export const MINTED_COUNT = 1420;
