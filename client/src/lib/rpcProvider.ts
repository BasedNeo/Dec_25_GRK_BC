import { ethers } from 'ethers';
import { RPC_ENDPOINTS } from './constants';

let cachedProvider: ethers.JsonRpcProvider | null = null;
let lastValidatedAt = 0;
const CACHE_TTL = 30000; // 30 seconds

export async function getProvider(): Promise<ethers.JsonRpcProvider> {
  const now = Date.now();
  
  if (cachedProvider && now - lastValidatedAt < CACHE_TTL) {
    return cachedProvider;
  }
  
  for (const rpc of RPC_ENDPOINTS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc, undefined, {
        staticNetwork: true,
        batchMaxCount: 1,
      });
      await provider.getBlockNumber();
      cachedProvider = provider;
      lastValidatedAt = now;
      return provider;
    } catch {
      continue;
    }
  }
  
  throw new Error('All RPC endpoints failed. Please check your network connection.');
}

export function getProviderSync(): ethers.JsonRpcProvider {
  if (cachedProvider) {
    return cachedProvider;
  }
  return new ethers.JsonRpcProvider(RPC_ENDPOINTS[0], undefined, {
    staticNetwork: true,
    batchMaxCount: 1,
  });
}

export function clearProviderCache(): void {
  cachedProvider = null;
  lastValidatedAt = 0;
}
