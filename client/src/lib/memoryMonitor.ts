class MemoryMonitor {
  private samples: number[] = [];
  private maxSamples = 60;
  private intervalId: number | null = null;

  start() {
    if (this.intervalId !== null) return;
    
    this.intervalId = window.setInterval(() => {
      if ('memory' in performance) {
        const mem = (performance as unknown as { memory: { usedJSHeapSize: number } }).memory;
        const usedMB = Math.round(mem.usedJSHeapSize / 1048576);
        this.samples.push(usedMB);
        
        if (this.samples.length > this.maxSamples) {
          this.samples.shift();
        }
        
        if (this.samples.length >= 10) {
          const recent = this.samples.slice(-10);
          const growth = recent[9] - recent[0];
          
          if (growth > 100) {
            console.warn(`Memory leak detected: +${growth}MB in 10s`);
            console.log('Run window.timers() to check active timers');
          }
        }
      }
    }, 1000);
    
    console.log('Memory monitor started (dev only)');
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getReport() {
    if (this.samples.length === 0) return 'No samples yet';
    
    const current = this.samples[this.samples.length - 1];
    const avg = Math.round(this.samples.reduce((a, b) => a + b) / this.samples.length);
    const min = Math.min(...this.samples);
    const max = Math.max(...this.samples);
    
    return {
      current: `${current}MB`,
      average: `${avg}MB`,
      min: `${min}MB`,
      max: `${max}MB`,
      samples: this.samples.length
    };
  }
}

export const memoryMonitor = new MemoryMonitor();

if (import.meta.env.DEV) {
  memoryMonitor.start();
  (window as unknown as Record<string, unknown>).memReport = () => {
    console.table(memoryMonitor.getReport());
  };
}
