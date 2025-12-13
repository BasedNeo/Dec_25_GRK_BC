export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export const CACHE_KEYS = {
  PRICE_DATA: 'based_price_data',
  NFT_METADATA: 'based_nft_metadata_',
  CONTRACT_STATE: 'based_contract_state'
} as const;

export function getCached<T>(key: string, maxAge: number): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached) as CacheEntry<T>;
    if (Date.now() - timestamp > maxAge) {
      localStorage.removeItem(key); // Clean up expired
      return null;
    }
    
    return data;
  } catch (e) {
    console.warn('Error reading from cache:', e);
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn('Error writing to cache:', e);
  }
}
