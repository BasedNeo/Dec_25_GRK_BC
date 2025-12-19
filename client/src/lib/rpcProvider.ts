import { ethers } from 'ethers';
import { RPC_ENDPOINTS } from './constants';
import { circuitBreakerManager } from './circuitBreaker';

interface RPCEndpoint {
  url: string;
  provider: ethers.JsonRpcProvider;
  healthy: boolean;
  latency: number;
  lastCheck: number;
  failureCount: number;
}

export class RPCProviderManager {
  private endpoints: RPCEndpoint[] = [];
  private currentIndex: number = 0;
  private readonly HEALTH_CHECK_INTERVAL = 120000; // 120 seconds - reduced for performance
  private readonly FAILURE_THRESHOLD = 3;
  private readonly LATENCY_TIMEOUT = 5000;
  private healthCheckTimer?: number;

  constructor() {
    this.initializeEndpoints();
    this.startHealthChecks();
  }

  private initializeEndpoints() {
    this.endpoints = RPC_ENDPOINTS.map(url => ({
      url,
      provider: new ethers.JsonRpcProvider(url),
      healthy: true,
      latency: 0,
      lastCheck: 0,
      failureCount: 0,
    }));

  }

  private async checkEndpointHealth(endpoint: RPCEndpoint): Promise<void> {
    const start = Date.now();
    
    try {
      await Promise.race([
        endpoint.provider.getBlockNumber(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.LATENCY_TIMEOUT)
        ),
      ]);

      endpoint.latency = Date.now() - start;
      endpoint.healthy = true;
      endpoint.failureCount = 0;
      endpoint.lastCheck = Date.now();
      
    } catch (error) {
      endpoint.failureCount++;
      endpoint.lastCheck = Date.now();
      
      if (endpoint.failureCount >= this.FAILURE_THRESHOLD) {
        endpoint.healthy = false;
        console.error(`[RPC] ❌ ${endpoint.url} - marked unhealthy`);
      } else {
        console.warn(`[RPC] ⚠️ ${endpoint.url} - failure ${endpoint.failureCount}/${this.FAILURE_THRESHOLD}`);
      }
    }
  }

  private async healthCheck() {
    await Promise.all(
      this.endpoints.map(endpoint => this.checkEndpointHealth(endpoint))
    );

    this.endpoints.sort((a, b) => {
      if (a.healthy !== b.healthy) return a.healthy ? -1 : 1;
      return a.latency - b.latency;
    });

  }

  private startHealthChecks() {
    this.healthCheck();
    
    this.healthCheckTimer = window.setInterval(() => {
      this.healthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  public stopHealthChecks() {
    if (this.healthCheckTimer) {
      window.clearInterval(this.healthCheckTimer);
    }
  }

  public getProvider(): ethers.JsonRpcProvider {
    const healthyEndpoints = this.endpoints.filter(e => e.healthy);
    
    if (healthyEndpoints.length === 0) {
      console.error('[RPC] No healthy endpoints! Using first available...');
      return this.endpoints[0].provider;
    }

    return healthyEndpoints[0].provider;
  }

  public async executeWithFailover<T>(
    fn: (provider: ethers.JsonRpcProvider) => Promise<T>,
    maxRetries: number = 3,
    timeoutMs: number = 10000
  ): Promise<T> {
    const healthyEndpoints = this.endpoints.filter(e => e.healthy);
    
    if (healthyEndpoints.length === 0) {
      console.warn('[RPC] No healthy endpoints, trying all...');
    }
    
    const endpointsToTry = healthyEndpoints.length > 0 ? healthyEndpoints : this.endpoints;
    let lastError: Error | null = null;

    for (let i = 0; i < Math.min(maxRetries, endpointsToTry.length); i++) {
      const endpoint = endpointsToTry[i];
      const breaker = circuitBreakerManager.getBreaker(`rpc-${endpoint.url.split('/')[2] || 'endpoint'}`);
      const backoffDelay = i > 0 ? Math.min(1000 * Math.pow(2, i - 1), 8000) : 0;
      
      if (backoffDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
      
      try {
        const result = await breaker.execute(async () => {
          return await Promise.race([
            fn(endpoint.provider),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error(`RPC timeout after ${timeoutMs}ms`)), timeoutMs)
            ),
          ]);
        });
        
        endpoint.failureCount = 0;
        endpoint.healthy = true;
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`[RPC] Failed on ${endpoint.url}:`, lastError.message);
        endpoint.failureCount++;
        
        if (endpoint.failureCount >= this.FAILURE_THRESHOLD) {
          endpoint.healthy = false;
        }
      }
    }

    throw lastError || new Error('All RPC endpoints failed');
  }

  public async executeWithRetry<T>(
    fn: (provider: ethers.JsonRpcProvider) => Promise<T>,
    options: { maxRetries?: number; timeoutMs?: number; retryOnlyOnTimeout?: boolean } = {}
  ): Promise<T> {
    const { maxRetries = 3, timeoutMs = 10000, retryOnlyOnTimeout = false } = options;
    const provider = this.getProvider();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const backoffDelay = attempt > 0 ? Math.min(500 * Math.pow(2, attempt - 1), 4000) : 0;
      
      if (backoffDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
      
      try {
        const result = await Promise.race([
          fn(provider),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
          ),
        ]);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        const isTimeout = lastError.message?.includes('Timeout') || lastError.message?.includes('timeout');
        
        if (retryOnlyOnTimeout && !isTimeout) {
          throw error;
        }
        
        console.warn(`[RPC] Attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message);
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  public getStatus() {
    return {
      total: this.endpoints.length,
      healthy: this.endpoints.filter(e => e.healthy).length,
      endpoints: this.endpoints.map(e => ({
        url: e.url,
        healthy: e.healthy,
        latency: e.latency,
        failures: e.failureCount,
      })),
    };
  }
}

export const rpcManager = new RPCProviderManager();
