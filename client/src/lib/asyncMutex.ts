/**
 * AsyncMutex - Mutual exclusion for critical sections
 * Ensures operations complete sequentially
 */

class AsyncMutex {
  private locks: Map<string, Promise<void>> = new Map();

  async runExclusive<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    let releaseLock!: () => void;
    const lockPromise = new Promise<void>(resolve => {
      releaseLock = resolve;
    });
    this.locks.set(key, lockPromise);

    try {
      const result = await fn();
      return result;
    } finally {
      this.locks.delete(key);
      releaseLock();
    }
  }

  isLocked(key: string): boolean {
    return this.locks.has(key);
  }
}

export const asyncMutex = new AsyncMutex();
