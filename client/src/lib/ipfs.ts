import DOMPurify from 'dompurify';
import { IPFS_ROOT } from './constants';
import { Guardian } from './mockData';

export const BATCH_SIZE = 10; // Concurrent requests
export const PAGE_SIZE = 100; // Items per "Load More"

export async function fetchGuardianMetadata(id: number): Promise<Guardian> {
  try {
    const res = await fetch(`${IPFS_ROOT}${id}.json`);
    if (!res.ok) throw new Error(`Failed to fetch ${id}`);
    const data = await res.json();

    // Sanitize fields
    const cleanName = DOMPurify.sanitize(data.name || `Guardian #${id}`);
    const cleanImage = data.image ? data.image.replace('ipfs://', 'https://ipfs.io/ipfs/') : '';
    
    // Parse traits safely
    const traits = Array.isArray(data.attributes) 
      ? data.attributes.map((attr: any) => ({
          type: DOMPurify.sanitize(attr.trait_type || ''),
          value: DOMPurify.sanitize(String(attr.value || ''))
        }))
      : [];

    const rarity = data.attributes?.find((a: any) => a.trait_type === 'Rarity')?.value || 'Common';

    return {
      id,
      name: cleanName,
      image: cleanImage,
      traits,
      rarity,
      isListed: false, // Default for fetched metadata
      price: undefined,
      currency: 'ETH'
    } as Guardian;

  } catch (err) {
    console.warn(`Error fetching token ${id}`, err);
    // Fallback for failed fetch
    return {
        id,
        name: `Guardian #${id}`,
        image: "", // Empty image trigger fallback UI
        traits: [],
        rarity: "Unknown",
        isError: true,
        isListed: false
    } as Guardian;
  }
}

export async function fetchGuardiansPage(pageParam: number): Promise<Guardian[]> {
    const startId = pageParam;
    const endId = Math.min(startId + PAGE_SIZE - 1, 3732); // Hardcoded total supply
    
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
