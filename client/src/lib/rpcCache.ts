interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class RPCCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 10000; // 10 seconds

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }

    const data = await fetcher();
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }

  getSize(): number {
    return this.cache.size;
  }
}

export const rpcCache = new RPCCache();
