export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export const CACHE_KEYS = {
  PRICE_DATA: 'based_price_data',
  NFT_METADATA: 'based_nft_metadata_',
  CONTRACT_STATE: 'based_contract_state',
  CONTRACT_STATS: 'based_contract_stats',
  USER_NFTS: 'based_user_nfts_'
} as const;

export const CACHE_DURATIONS = {
  contractStats: 30000,
  nftMetadata: 300000,
  priceData: 60000,
  userNFTs: 120000
} as const;

const memoryStorage = new Map<string, CacheEntry<unknown>>();

export function getMemoryCached<T>(key: string, maxAge: number): T | null {
  const item = memoryStorage.get(key);
  if (!item) return null;

  if (Date.now() - item.timestamp > maxAge) {
    memoryStorage.delete(key);
    return null;
  }

  return item.data as T;
}

export function setMemoryCache<T>(key: string, data: T): void {
  memoryStorage.set(key, {
    data,
    timestamp: Date.now()
  });
}

export function getCached<T>(key: string, maxAge: number): T | null {
  const memCached = getMemoryCached<T>(key, maxAge);
  if (memCached) return memCached;

  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached) as CacheEntry<T>;
    if (Date.now() - timestamp > maxAge) {
      localStorage.removeItem(key);
      return null;
    }

    setMemoryCache(key, data);
    return data;
  } catch (e) {
    console.warn('Error reading from cache:', e);
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  setMemoryCache(key, data);

  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn('Error writing to cache, clearing old entries:', e);
    clearOldCache();
    try {
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
      // Storage still full, give up on localStorage
    }
  }
}

export function clearOldCache(): void {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('based_') || k.startsWith('cache_'));
  keys.forEach(k => localStorage.removeItem(k));
}

export function clearAllCache(): void {
  memoryStorage.clear();
  clearOldCache();
}

export const CacheService = {
  get: getMemoryCached,
  set: setMemoryCache,
  getPersistent: getCached,
  setPersistent: setCache,
  clearOldCache,
  clearAll: clearAllCache,
  DURATIONS: CACHE_DURATIONS,
  KEYS: CACHE_KEYS
};
