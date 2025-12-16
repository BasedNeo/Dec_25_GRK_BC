import { ethers } from 'ethers';

interface BalanceData {
  wei: bigint;
  formatted: string;
  raw: number;
}

class WalletBalanceServiceClass {
  private cachedBalance: BalanceData | null = null;
  private cacheTimestamp: number = 0;
  private cacheAddress: string | null = null;
  private CACHE_DURATION = 15000;

  private rpcUrl = 'https://mainnet.basedaibridge.com/rpc/';

  async getBalance(address: string): Promise<BalanceData | null> {
    if (!address) return null;

    const now = Date.now();
    if (
      this.cachedBalance !== null && 
      this.cacheAddress === address.toLowerCase() &&
      (now - this.cacheTimestamp) < this.CACHE_DURATION
    ) {
      return this.cachedBalance;
    }

    try {
      const provider = new ethers.JsonRpcProvider(this.rpcUrl, {
        chainId: 32323,
        name: 'BasedAI'
      });
      
      const balanceWei = await provider.getBalance(address);
      const balanceFormatted = ethers.formatEther(balanceWei);
      const rawBalance = parseFloat(balanceFormatted);

      this.cachedBalance = {
        wei: balanceWei,
        formatted: rawBalance.toLocaleString(undefined, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1
        }),
        raw: rawBalance
      };
      this.cacheTimestamp = now;
      this.cacheAddress = address.toLowerCase();

      return this.cachedBalance;
    } catch (error) {
      console.error('[WalletBalanceService] Failed to get balance:', error);
      return null;
    }
  }

  clearCache(): void {
    this.cachedBalance = null;
    this.cacheTimestamp = 0;
    this.cacheAddress = null;
  }

  canAfford(priceInBased: number): boolean {
    if (!this.cachedBalance) return false;
    return this.cachedBalance.raw >= priceInBased;
  }

  getCachedBalance(): BalanceData | null {
    return this.cachedBalance;
  }
}

export const WalletBalanceService = new WalletBalanceServiceClass();

if (typeof window !== 'undefined') {
  (window as any).WalletBalanceService = WalletBalanceService;
}
