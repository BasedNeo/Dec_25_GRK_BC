const MAX_STORAGE_SIZE = 4_500_000;
const STORAGE_PREFIX = 'bg_secure_';

interface StorageItem<T> {
  data: T;
  timestamp: number;
  checksum: string;
}

function generateChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function getCurrentStorageSize(): number {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return total;
}

export class SecureStorage {
  static cleanup() {
    return this.cleanupOldEntries();
  }
  
  private static cleanupOldEntries() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
      
      try {
        const item = JSON.parse(localStorage.getItem(key) || '{}');
        if (now - item.timestamp > 30 * 24 * 60 * 60 * 1000) {
          keysToDelete.push(key);
        }
      } catch {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => localStorage.removeItem(key));
    return keysToDelete.length;
  }

  static set<T>(key: string, value: T): boolean {
    try {
      const fullKey = STORAGE_PREFIX + key;
      const jsonData = JSON.stringify(value);
      
      const existingEntry = localStorage.getItem(fullKey);
      const existingSize = existingEntry ? existingEntry.length + fullKey.length : 0;
      
      const item: StorageItem<T> = {
        data: value,
        timestamp: Date.now(),
        checksum: generateChecksum(jsonData)
      };
      const newItemStr = JSON.stringify(item);
      const newSize = newItemStr.length + fullKey.length;
      
      const netIncrease = newSize - existingSize;
      
      if (getCurrentStorageSize() + netIncrease > MAX_STORAGE_SIZE) {
        console.warn('[SecureStorage] Size limit reached, cleaning up...');
        this.cleanupOldEntries();
        
        if (getCurrentStorageSize() + netIncrease > MAX_STORAGE_SIZE) {
          console.error('[SecureStorage] Still over limit after cleanup');
          return false;
        }
      }
      
      localStorage.setItem(fullKey, newItemStr);
      return true;
    } catch (e) {
      console.error('[SecureStorage] Set failed:', e);
      return false;
    }
  }

  static get<T>(key: string, maxAge?: number): T | null {
    try {
      const fullKey = STORAGE_PREFIX + key;
      const stored = localStorage.getItem(fullKey);
      if (!stored) return null;
      
      const item = JSON.parse(stored) as StorageItem<T>;
      
      if (maxAge && Date.now() - item.timestamp > maxAge) {
        localStorage.removeItem(fullKey);
        return null;
      }
      
      const jsonData = JSON.stringify(item.data);
      if (item.checksum !== generateChecksum(jsonData)) {
        console.warn('[SecureStorage] Checksum mismatch, removing corrupted data');
        localStorage.removeItem(fullKey);
        return null;
      }
      
      return item.data;
    } catch (e) {
      console.error('[SecureStorage] Get failed:', e);
      return null;
    }
  }

  static remove(key: string): void {
    localStorage.removeItem(STORAGE_PREFIX + key);
  }

  static clear(): void {
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => localStorage.removeItem(key));
  }

  static getStorageInfo(): { used: number; available: number; items: number } {
    const used = getCurrentStorageSize();
    let itemCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) itemCount++;
    }
    
    return {
      used,
      available: MAX_STORAGE_SIZE - used,
      items: itemCount
    };
  }
}

if (typeof window !== 'undefined') {
  SecureStorage.cleanup();
}
