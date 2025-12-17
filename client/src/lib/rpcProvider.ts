import { ethers } from 'ethers';

const RPC_ENDPOINTS = [
  'https://mainnet.basedaibridge.com/rpc/',
  'https://rpc.basedaibridge.com/',
];

interface RPCHealth {
  endpoint: string;
  latency: number;
  failCount: number;
  lastFail: number;
  working: boolean;
}

class MultiRPCProvider {
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private health: Map<string, RPCHealth> = new Map();
  private readonly MAX_FAILS = 3;
  private readonly FAIL_TIMEOUT = 60000;

  constructor() {
    RPC_ENDPOINTS.forEach((endpoint) => {
      this.providers.set(endpoint, new ethers.JsonRpcProvider(endpoint, undefined, {
        staticNetwork: true,
        batchMaxCount: 1,
      }));
      this.health.set(endpoint, {
        endpoint,
        latency: 0,
        failCount: 0,
        lastFail: 0,
        working: true,
      });
    });
    
    if (typeof window !== 'undefined') {
      setInterval(() => this.healthCheck(), 30000);
      this.healthCheck();
    }
  }

  private async healthCheck() {
    const entries = Array.from(this.providers.entries());
    for (const [endpoint, provider] of entries) {
      try {
        const start = Date.now();
        await provider.getBlockNumber();
        const latency = Date.now() - start;
        
        const health = this.health.get(endpoint)!;
        health.latency = latency;
        health.failCount = 0;
        health.working = true;
      } catch {
        const health = this.health.get(endpoint)!;
        health.failCount++;
        health.lastFail = Date.now();
        health.working = health.failCount < this.MAX_FAILS;
      }
    }
  }

  private getHealthyEndpoints(): string[] {
    return Array.from(this.health.values())
      .filter(h => {
        return h.working || (Date.now() - h.lastFail > this.FAIL_TIMEOUT);
      })
      .sort((a, b) => a.latency - b.latency)
      .map(h => h.endpoint);
  }

  async executeWithFailover<T>(
    operation: (provider: ethers.JsonRpcProvider) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    const endpoints = this.getHealthyEndpoints();
    
    if (endpoints.length === 0) {
      throw new Error('All RPC endpoints are down');
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const endpoint = endpoints[attempt % endpoints.length];
      const provider = this.providers.get(endpoint)!;
      
      try {
        const result = await operation(provider);
        
        const health = this.health.get(endpoint)!;
        health.failCount = 0;
        health.working = true;
        
        return result;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const health = this.health.get(endpoint)!;
        health.failCount++;
        health.lastFail = Date.now();
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error('All RPC attempts failed');
  }

  getProvider(): ethers.JsonRpcProvider {
    const endpoints = this.getHealthyEndpoints();
    if (endpoints.length === 0) {
      const firstProvider = Array.from(this.providers.values())[0];
      return firstProvider;
    }
    
    const endpoint = endpoints[0];
    return this.providers.get(endpoint)!;
  }

  getStatus() {
    return Array.from(this.health.values()).map(h => ({
      endpoint: h.endpoint.replace('https://', '').split('/')[0],
      status: h.working ? '✅' : '❌',
      latency: `${h.latency}ms`,
      fails: `${h.failCount}/${this.MAX_FAILS}`
    }));
  }
}

export const rpcProvider = new MultiRPCProvider();

export function getProvider(): ethers.JsonRpcProvider {
  return rpcProvider.getProvider();
}

export function getProviderSync(): ethers.JsonRpcProvider {
  return rpcProvider.getProvider();
}

export function clearProviderCache(): void {
  // No-op for compatibility
}

if (typeof window !== 'undefined') {
  (window as any).rpcStatus = () => {
    console.table(rpcProvider.getStatus());
  };
}
