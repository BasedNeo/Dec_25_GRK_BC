const DB_NAME = 'basedGuardiansActivity';
const DB_VERSION = 1;
const STORE_NAME = 'activityLogs';

export interface CachedActivityLog {
  id: number;
  walletAddress: string;
  eventType: string;
  details: string | null;
  pointsEarned: number | null;
  gameType: string | null;
  createdAt: string;
}

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'walletAddress' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

export async function cacheActivityLogs(walletAddress: string, logs: CachedActivityLog[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    store.put({
      walletAddress: walletAddress.toLowerCase(),
      logs,
      lastUpdated: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('[ActivityCache] Failed to cache logs:', error);
  }
}

export async function getCachedActivityLogs(walletAddress: string): Promise<{ logs: CachedActivityLog[]; lastUpdated: string | null }> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(walletAddress.toLowerCase());
      request.onsuccess = () => {
        if (request.result) {
          resolve({
            logs: request.result.logs,
            lastUpdated: request.result.lastUpdated
          });
        } else {
          resolve({ logs: [], lastUpdated: null });
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('[ActivityCache] Failed to get cached logs:', error);
    return { logs: [], lastUpdated: null };
  }
}

export async function clearActivityCache(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
  } catch (error) {
    console.warn('[ActivityCache] Failed to clear cache:', error);
  }
}
