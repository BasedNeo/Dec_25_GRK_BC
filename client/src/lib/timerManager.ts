interface Timer {
  id: number;
  type: 'interval' | 'timeout';
  callback: Function;
  delay: number;
  createdAt: number;
}

class TimerManagerClass {
  private timers: Map<number, Timer> = new Map();
  private nextId = 1;

  setInterval(callback: Function, delay: number): number {
    const id = this.nextId++;
    const timerId = window.setInterval(callback, delay);
    
    this.timers.set(id, {
      id: timerId,
      type: 'interval',
      callback,
      delay,
      createdAt: Date.now()
    });
    
    return id;
  }

  setTimeout(callback: Function, delay: number): number {
    const id = this.nextId++;
    const timerId = window.setTimeout(() => {
      callback();
      this.timers.delete(id);
    }, delay);
    
    this.timers.set(id, {
      id: timerId,
      type: 'timeout',
      callback,
      delay,
      createdAt: Date.now()
    });
    
    return id;
  }

  clear(id: number): void {
    const timer = this.timers.get(id);
    if (!timer) return;
    
    if (timer.type === 'interval') {
      window.clearInterval(timer.id);
    } else {
      window.clearTimeout(timer.id);
    }
    
    this.timers.delete(id);
  }

  clearAll(): void {
    this.timers.forEach((timer) => {
      if (timer.type === 'interval') {
        window.clearInterval(timer.id);
      } else {
        window.clearTimeout(timer.id);
      }
    });
    this.timers.clear();
  }

  getActiveCount(): number {
    return this.timers.size;
  }

  getTimers(): Array<{ type: string; delay: number; age: number }> {
    const now = Date.now();
    return Array.from(this.timers.values()).map(t => ({
      type: t.type,
      delay: t.delay,
      age: Math.floor((now - t.createdAt) / 1000)
    }));
  }
}

export const TimerManager = new TimerManagerClass();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    TimerManager.clearAll();
  });
  
  (window as unknown as Record<string, unknown>).timers = () => {
    console.log(`Active timers: ${TimerManager.getActiveCount()}`);
    console.table(TimerManager.getTimers());
  };
}
