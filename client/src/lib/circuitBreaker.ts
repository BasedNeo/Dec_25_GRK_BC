interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringWindow: number;
  halfOpenMaxAttempts: number;
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalCalls: number;
  openedAt: number | null;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalCalls: number = 0;
  private openedAt: number | null = null;
  private halfOpenAttempts: number = 0;
  private lastLoggedState: CircuitState | null = null;
  
  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringWindow: 300000,
      halfOpenMaxAttempts: 3
    }
  ) {}
  
  private logStateChange(newState: CircuitState, message: string): void {
    if (this.lastLoggedState !== newState) {
      console.log(message);
      this.lastLoggedState = newState;
    }
  }
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;
    
    if (this.state === 'OPEN') {
      const timeSinceOpen = Date.now() - (this.openedAt || 0);
      
      if (timeSinceOpen >= this.options.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.logStateChange('HALF_OPEN', `[CIRCUIT:${this.name}] Moving to HALF_OPEN state`);
        this.halfOpenAttempts = 0;
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }
    
    if (this.state === 'HALF_OPEN' && this.halfOpenAttempts >= this.options.halfOpenMaxAttempts) {
      throw new Error(`Circuit breaker ${this.name} max half-open attempts exceeded`);
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      this.halfOpenAttempts++;
      
      if (this.halfOpenAttempts >= 2) {
        this.state = 'CLOSED';
        this.logStateChange('CLOSED', `[CIRCUIT:${this.name}] Moving to CLOSED state (recovered)`);
        this.failures = 0;
        this.openedAt = null;
        this.halfOpenAttempts = 0;
      }
    } else if (this.state === 'CLOSED') {
      this.cleanOldFailures();
    }
  }
  
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.logStateChange('OPEN', `[CIRCUIT:${this.name}] Failed in HALF_OPEN, moving back to OPEN`);
      this.openedAt = Date.now();
      this.halfOpenAttempts = 0;
      return;
    }
    
    if (this.state === 'CLOSED') {
      this.cleanOldFailures();
      
      if (this.failures >= this.options.failureThreshold) {
        this.state = 'OPEN';
        this.logStateChange('OPEN', `[CIRCUIT:${this.name}] Failure threshold exceeded, moving to OPEN`);
        this.openedAt = Date.now();
      }
    }
  }
  
  private cleanOldFailures(): void {
    if (this.lastFailureTime) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.options.monitoringWindow) {
        this.failures = 0;
      }
    }
  }
  
  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalCalls: this.totalCalls,
      openedAt: this.openedAt
    };
  }
  
  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.openedAt = null;
    this.halfOpenAttempts = 0;
    this.lastLoggedState = null;
  }
  
  forceOpen(): void {
    this.state = 'OPEN';
    this.openedAt = Date.now();
  }
  
  forceClose(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.openedAt = null;
  }
}

export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();
  
  getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name)!;
  }
  
  getAllStats(): Record<string, CircuitStats> {
    const stats: Record<string, CircuitStats> = {};
    Array.from(this.breakers.entries()).forEach(([name, breaker]) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }
  
  resetAll(): void {
    Array.from(this.breakers.values()).forEach(breaker => {
      breaker.reset();
    });
  }
}

export const circuitBreakerManager = new CircuitBreakerManager();
