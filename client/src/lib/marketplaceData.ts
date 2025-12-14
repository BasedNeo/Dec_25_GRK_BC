import { IPFS_ROOT } from "@/lib/constants";
import { MOCK_GUARDIANS } from "./mockData";

export interface Guardian {
    id: number;
    name: string;
    image: string;
    traits: { type: string; value: string }[];
    rarity: string;
}

// ... existing code ...

export interface MarketItem extends Guardian {
    owner: string;
    isListed: boolean;
    price?: number;
    currency?: 'ETH' | '$BASED';
    listingId?: number;
    listingExpiresAt?: string;
    offers?: MarketOffer[];
    estimatedValue?: number;
    isMinted?: boolean;
    mintPrice?: number;
}

export interface MarketOffer {
    id: number;
    bidder: string;
    amount: number;
    currency: 'ETH' | '$BASED';
    timestamp: string;
}

// Helper to fetch real metadata
export async function fetchRealMetadata(id: number): Promise<Guardian | null> {
    try {
        const response = await fetch(`${IPFS_ROOT}${id}.json`);
        if (!response.ok) throw new Error("Metadata fetch failed");
        
        const data = await response.json();
        
        // Sanitize and map
        const traits = data.attributes?.map((attr: any) => ({
            type: attr.trait_type,
            value: attr.value
        })) || [];
        
        // Determine rarity based on traits (Mock logic for now as actual rarity might be complex)
        // Or check if it's explicitly in traits
        const rarityTrait = traits.find((t: any) => t.type === "Rarity");
        const rarity = rarityTrait ? rarityTrait.value : "Common";

        return {
            id,
            name: data.name || `Guardian #${id}`,
            image: data.image?.replace("ipfs://", "https://ipfs.io/ipfs/") || MOCK_GUARDIANS[0].image,
            traits,
            rarity
        };
    } catch (e) {
        console.error(`Failed to fetch metadata for ${id}`, e);
        return null; 
    }
}

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

export async function generateMarketplaceData(count: number = 20): Promise<MarketItem[]> {
    const items: MarketItem[] = [];
    const poolTotal = 1000000; // Mock pool total
    
    for (let i = 1; i <= count; i++) {
        // Use seeded random for consistency
        const rand = seed();
        
        // Try to fetch real metadata for first few, else mock
        let guardian: Guardian;
        if (i <= 50) { // Fetch real for first 50 to demonstrate
             const real = await fetchRealMetadata(i);
             if (real) {
                 guardian = real;
             } else {
                 // Fallback to mock
                 guardian = {
                     id: i,
                     name: `Guardian #${i}`,
                     image: MOCK_GUARDIANS[i % 4].image,
                     traits: [],
                     rarity: 'Common'
                 }
             }
        } else {
             // Pure mock for performance for rest
             const isRare = rand > 0.85;
             const isLegendary = rand > 0.98;
             const rarity = isLegendary ? 'Legendary' : (isRare ? 'Rare' : 'Common');
             guardian = {
                id: i,
                name: `Guardian #${i}`,
                image: MOCK_GUARDIANS[i % 4].image,
                traits: [
                    { type: "Background", value: "Cyber City" },
                    { type: "Armor", value: "Mk-IV" }
                ],
                rarity
             };
        }

        const isRare = guardian.rarity === 'Rare';
        const isLegendary = guardian.rarity === 'Legendary';
        const isEpic = guardian.rarity === 'Epic';

        // Value Calc
        let baseValue = (poolTotal / 3731);
        if (isEpic || isRare || isLegendary) {
            baseValue *= 1.3; // +30% boost
        }
        const estimatedValue = parseFloat(baseValue.toFixed(2));

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

        // Mock Offers (randomly)
        const hasOffers = rand > 0.92;
        const offers: MarketOffer[] = [];
        if (hasOffers) {
            offers.push({
                id: 5000 + i,
                bidder: `0x${Math.floor(rand * 999999).toString(16)}...`,
                amount: isListed && price ? price * 0.9 : (isLegendary ? 5 : 0.4),
                currency: currency || 'ETH',
                timestamp: new Date(Date.now() - Math.floor(rand * 86400000)).toISOString()
            });
        }

        items.push({
            ...guardian,
            owner: `0x${Math.floor(rand * 16777215).toString(16).padStart(6, '0')}...${Math.floor(rand * 65535).toString(16).padStart(4, '0')}`,
            isListed,
            price,
            currency,
            listingId: isListed ? 1000 + i : undefined,
            listingExpiresAt,
            offers,
            estimatedValue
        });
    }

    return items;
}
