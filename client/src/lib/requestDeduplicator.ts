/**
 * RequestDeduplicator - Prevents duplicate concurrent requests
 * Ensures only one request per key is in-flight at a time
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicatorClass {
  private pending: Map<string, PendingRequest<unknown>> = new Map();
  private readonly TIMEOUT = 30000;

  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    forceNew = false
  ): Promise<T> {
    this.cleanup();

    if (!forceNew) {
      const existing = this.pending.get(key);
      if (existing) {
        return existing.promise as Promise<T>;
      }
    }

    const promise = fn();
    this.pending.set(key, {
      promise,
      timestamp: Date.now()
    });

    try {
      const result = await promise;
      this.pending.delete(key);
      return result;
    } catch (error) {
      this.pending.delete(key);
      throw error;
    }
  }

  isPending(key: string): boolean {
    return this.pending.has(key);
  }

  cancel(key: string): void {
    this.pending.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    const keys = Array.from(this.pending.keys());
    for (const key of keys) {
      const req = this.pending.get(key);
      if (req && now - req.timestamp > this.TIMEOUT) {
        this.pending.delete(key);
      }
    }
  }

  clear(): void {
    this.pending.clear();
  }
}

export const requestDedup = new RequestDeduplicatorClass();
