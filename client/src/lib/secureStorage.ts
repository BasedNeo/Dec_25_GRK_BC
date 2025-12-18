interface StorageItem {
  data: any;
  timestamp: number;
  checksum: string;
  version: string;
}

export class SecureStorage {
  private static readonly PREFIX = 'bg_secure_';
  private static readonly VERSION = '1.0';
  private static readonly MAX_ITEM_SIZE = 500000; // 500KB per item
  private static readonly MAX_TOTAL_SIZE = 4500000; // 4.5MB total
  
  private static generateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private static getStorageSize(): number {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.PREFIX)) {
        const value = localStorage.getItem(key);
        if (value) total += value.length;
      }
    }
    return total;
  }

  private static cleanupOldest(): void {
    const items: Array<{ key: string; timestamp: number }> = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.PREFIX)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed: StorageItem = JSON.parse(value);
            items.push({ key, timestamp: parsed.timestamp });
          }
        } catch {}
      }
    }

    items.sort((a, b) => a.timestamp - b.timestamp);
    
    let removed = 0;
    for (const item of items) {
      if (this.getStorageSize() < this.MAX_TOTAL_SIZE * 0.8) break;
      localStorage.removeItem(item.key);
      removed++;
    }
    
  }

  static set(key: string, value: any): boolean {
    try {
      const serialized = JSON.stringify(value);
      
      if (serialized.length > this.MAX_ITEM_SIZE) {
        console.error(`[SecureStorage] Item too large: ${serialized.length} bytes`);
        return false;
      }

      if (this.getStorageSize() > this.MAX_TOTAL_SIZE) {
        this.cleanupOldest();
      }

      const item: StorageItem = {
        data: value,
        timestamp: Date.now(),
        checksum: this.generateChecksum(serialized),
        version: this.VERSION,
      };

      const fullKey = this.PREFIX + key;
      localStorage.setItem(fullKey, JSON.stringify(item));
      
      return true;
    } catch (error) {
      console.error('[SecureStorage] Failed to set item:', error);
      return false;
    }
  }

  static get<T>(key: string, defaultValue?: T): T | null {
    try {
      const fullKey = this.PREFIX + key;
      const stored = localStorage.getItem(fullKey);
      
      if (!stored) return defaultValue ?? null;

      const item: StorageItem = JSON.parse(stored);
      
      const serialized = JSON.stringify(item.data);
      const expectedChecksum = this.generateChecksum(serialized);
      
      if (item.checksum !== expectedChecksum) {
        console.warn(`[SecureStorage] Checksum mismatch for key: ${key}. Data may be corrupted.`);
        localStorage.removeItem(fullKey);
        return defaultValue ?? null;
      }

      if (item.version !== this.VERSION) {
        console.warn(`[SecureStorage] Version mismatch for key: ${key}. Clearing old data.`);
        localStorage.removeItem(fullKey);
        return defaultValue ?? null;
      }

      return item.data as T;
    } catch (error) {
      console.error('[SecureStorage] Failed to get item:', error);
      return defaultValue ?? null;
    }
  }

  static remove(key: string): void {
    const fullKey = this.PREFIX + key;
    localStorage.removeItem(fullKey);
  }

  static clear(): void {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
  }

  static getStorageInfo() {
    const totalSize = this.getStorageSize();
    const itemCount = Array.from({ length: localStorage.length })
      .map((_, i) => localStorage.key(i))
      .filter(key => key?.startsWith(this.PREFIX)).length;

    return {
      itemCount,
      totalSize,
      percentUsed: (totalSize / this.MAX_TOTAL_SIZE * 100).toFixed(1),
      maxSize: this.MAX_TOTAL_SIZE,
    };
  }

  static validateAllItems(): { valid: number; corrupted: number; removed: number } {
    let valid = 0;
    let corrupted = 0;
    let removed = 0;

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith(this.PREFIX)) continue;

      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;

        const item: StorageItem = JSON.parse(stored);
        const serialized = JSON.stringify(item.data);
        const expectedChecksum = this.generateChecksum(serialized);

        if (item.checksum === expectedChecksum) {
          valid++;
        } else {
          corrupted++;
          localStorage.removeItem(key);
          removed++;
        }
      } catch {
        corrupted++;
        localStorage.removeItem(key);
        removed++;
      }
    }

    return { valid, corrupted, removed };
  }
}
