import { Guardian, MOCK_GUARDIANS } from "./mockData";

// Deterministic Pseudo-Random Number Generator for consistent mock data
function sfc32(a: number, b: number, c: number, d: number) {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      var t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}

const seed = sfc32(1337, 8888, 0xDEADBEEF, 0xBEEFDEAD);

const TRAIT_TYPES = {
    Background: ['Neon City', 'Matrix', 'Void', 'Industrial', 'Cyber Slums', 'High Orbit'],
    Armor: ['Mk-IV Stealth', 'Holo-Mesh', 'Shadow Weave', 'Heavy Plating', 'Nanofiber', 'Chrome Dip'],
    Weapon: ['Plasma Blade', 'Neuro-Whip', 'Smart Pistol', 'Gravity Hammer', 'None'],
    Augment: ['Cyber-Eye', 'Neural Link', 'Robotic Arm', 'Synth-Skin', 'None']
};

export interface MarketItem extends Guardian {
    owner: string;
    isListed: boolean;
    price?: number;
    currency?: 'ETH' | '$BASED';
    listingId?: number;
    listingExpiresAt?: string;
    offers?: MarketOffer[];
}

export interface MarketOffer {
    id: number;
    bidder: string;
    amount: number;
    currency: 'ETH' | '$BASED';
    timestamp: string;
}

export function generateMarketplaceData(count: number = 3732): MarketItem[] {
    const items: MarketItem[] = [];
    
    for (let i = 1; i <= count; i++) {
        // Use seeded random for consistency
        const rand = seed();
        const isRare = rand > 0.85;
        const isLegendary = rand > 0.98;
        
        const rarity = isLegendary ? 'Legendary' : (isRare ? 'Rare' : 'Common');
        
        // Generate consistent traits based on ID
        const traits = [
            { type: "Background", value: TRAIT_TYPES.Background[i % TRAIT_TYPES.Background.length] },
            { type: "Armor", value: TRAIT_TYPES.Armor[(i * 2) % TRAIT_TYPES.Armor.length] },
            { type: "Weapon", value: TRAIT_TYPES.Weapon[(i * 3) % TRAIT_TYPES.Weapon.length] },
        ];
        
        if (isRare || isLegendary) {
            traits.push({ type: "Augment", value: TRAIT_TYPES.Augment[(i * 5) % TRAIT_TYPES.Augment.length] });
        }

        // Mock Listing Status (approx 10% listed)
        const isListed = rand > 0.90;
        let price = undefined;
        let currency: 'ETH' | '$BASED' | undefined = undefined;
        let listingExpiresAt = undefined;

        if (isListed) {
            price = isLegendary ? (5 + rand * 10) : (isRare ? (0.5 + rand * 2) : (0.05 + rand * 0.2));
            price = parseFloat(price.toFixed(4));
            currency = rand > 0.5 ? 'ETH' : '$BASED';
            if (currency === '$BASED') price = Math.floor(price * 30000); // Exchange rate mock
            
            // 50% have expiration
            if (rand > 0.95) {
                listingExpiresAt = new Date(Date.now() + 86400000).toISOString(); // 24h
            }
        }

        items.push({
            id: i,
            name: `Guardian #${i.toString().padStart(4, '0')}`,
            image: MOCK_GUARDIANS[i % 4].image, // Cycle through 4 base images for prototype
            traits,
            rarity,
            owner: `0x${Math.floor(rand * 16777215).toString(16).padStart(6, '0')}...${Math.floor(rand * 65535).toString(16).padStart(4, '0')}`,
            isListed,
            price,
            currency,
            listingId: isListed ? 1000 + i : undefined,
            listingExpiresAt,
            offers: []
        });
    }

    return items;
}
