import DOMPurify from 'dompurify';
import { IPFS_ROOT } from './constants';
import { Guardian } from './mockData';

export const BATCH_SIZE = 20; // Concurrent requests
export const PAGE_SIZE = 100; // Items per "Load More" / Infinite Scroll batch

export async function fetchGuardianMetadata(id: number): Promise<Guardian> {
  try {
    // Retry logic
    let res: Response | null = null;
    for (let i = 0; i < 3; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
            res = await fetch(`${IPFS_ROOT}${id}.json`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) break;
        } catch (e) {
            if (i === 2) throw e;
            await new Promise(r => setTimeout(r, 500 * (i + 1))); // Backoff
        }
    }

    if (!res || !res.ok) throw new Error(`Failed to fetch ${id}`);
    
    // Clone response to read text if JSON fails
    const clone = res.clone();
    let data;
    try {
        data = await res.json();
    } catch (e) {
        const text = await clone.text();
        console.error(`IPFS Response for #${id} is not JSON:`, text.substring(0, 100));
        throw new Error(`Invalid JSON response for #${id}`);
    }

    // Sanitize fields
    const cleanName = DOMPurify.sanitize(data.name || `Guardian #${id}`);
    // Use fast Pinata gateway instead of slow ipfs.io
    let cleanImage = '';
    if (data.image) {
      cleanImage = data.image
        .replace('ipfs://', 'https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/')
        .replace('https://ipfs.io/ipfs/', 'https://moccasin-key-flamingo-487.mypinata.cloud/ipfs/');
    }
    
    // Parse traits safely - Handle various formats (trait_type, TraitType, attributes vs traits)
    const rawAttrs = data.attributes || data.traits || [];
    const traits = Array.isArray(rawAttrs) 
      ? rawAttrs.map((attr: any) => ({
          type: DOMPurify.sanitize(attr.trait_type || attr.TraitType || attr.type || ''),
          value: DOMPurify.sanitize(String(attr.value || attr.Value || ''))
        }))
      : [];

    const rarity = traits.find((a: any) => a.type === 'Rarity Level' || a.type === 'Rarity')?.value || 'Common';

    // Calculate dynamic price based on rarity for display
    const rarityMultiplier = rarity === 'Legendary' ? 100 : rarity === 'Epic' ? 10 : rarity === 'Rare' ? 2 : 1;
    
    return {
      id,
      name: cleanName,
      image: cleanImage,
      traits,
      rarity,
      isListed: false,
      price: 420 * rarityMultiplier,
      currency: '$BASED'
    } as Guardian;

  } catch (err) {
    console.warn(`Error fetching token ${id}`, err);
    // Fallback for failed fetch - return basic structure but marked as error if needed, 
    // or just valid placeholder data so it doesn't break the UI
    return {
        id,
        name: `Guardian #${id}`,
        image: `https://via.placeholder.com/400x400/000000/00ffff?text=Guardian+#${id}`, // Temporary fallback
        traits: [],
        rarity: "Unknown",
        isError: true,
        isListed: false
    } as Guardian;
  }
}

export async function fetchGuardiansPage(pageParam: number): Promise<Guardian[]> {
    const startId = pageParam;
    const endId = Math.min(startId + PAGE_SIZE - 1, 3732); 
    
    if (startId > 3732) return [];

    const idsToFetch = Array.from({ length: endId - startId + 1 }, (_, i) => startId + i);
    const results: Guardian[] = [];

    // Process in chunks of BATCH_SIZE
    for (let i = 0; i < idsToFetch.length; i += BATCH_SIZE) {
        const chunk = idsToFetch.slice(i, i + BATCH_SIZE);
        const chunkResults = await Promise.all(chunk.map(id => fetchGuardianMetadata(id)));
        results.push(...chunkResults);
    }

    return results;
}
