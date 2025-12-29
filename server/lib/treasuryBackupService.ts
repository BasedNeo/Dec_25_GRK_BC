/**
 * Treasury Backup Service
 * 
 * Creates daily snapshots of treasury data including:
 * - Minted NFT count (from on-chain)
 * - Mint revenue (51% of mint price)
 * - Royalty revenue (2% of secondary sales)
 * - Emissions (10% of 64,500 daily)
 * - Backed value per NFT
 */

import * as fs from 'fs';
import * as path from 'path';
import { ethers } from 'ethers';

// Treasury calculation constants (mirror client/src/lib/constants.ts)
export const TREASURY_CONFIG = {
  MINT_PRICE: 69420,
  MINT_TREASURY_PERCENT: 51,
  ROYALTY_TREASURY_PERCENT: 2,
  TOTAL_ROYALTY_PERCENT: 10,
  EMISSIONS_DAILY: 64500,
  EMISSIONS_TREASURY_PERCENT: 10,
  EMISSIONS_START_DATE: new Date('2025-12-01T00:00:00Z'),
  PLATFORM_FEE_PERCENT: 1,
  RPC_URL: 'https://mainnet.basedaibridge.com/rpc/',
  NFT_CONTRACT: '0xaE51dc5fD1499A129f8654963560f9340773ad59',
  // Future Brain-Staking (treasury staked, APY TBD — mock for now)
  STAKING_APY: 5,
};

const NFT_ABI = ['function totalMinted() view returns (uint256)'];

export interface TreasurySummary {
  mintedCount: number;
  mintRevenue: number;
  royaltyRevenue: number;
  emissionsRevenue: number;
  platformFees: number;
  totalTreasury: number;
  backedValuePerNFT: number;
  stakingApy: number;
  daysElapsed: number;
  timestamp: string;
  source: 'on-chain' | 'cached' | 'fallback';
}

class TreasuryBackupService {
  private backupDir = '.core-backups/treasury';
  private cachedMintCount: number | null = null;
  private lastMintFetch: number = 0;
  private MINT_CACHE_TTL = 300000; // 5 minutes

  constructor() {
    this.ensureBackupDir();
  }

  private ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Fetch minted count from on-chain with caching
   */
  async getMintedCount(): Promise<{ count: number; source: 'on-chain' | 'cached' | 'fallback' }> {
    // Return cached if fresh
    if (this.cachedMintCount !== null && Date.now() - this.lastMintFetch < this.MINT_CACHE_TTL) {
      return { count: this.cachedMintCount, source: 'cached' };
    }

    try {
      const provider = new ethers.JsonRpcProvider(TREASURY_CONFIG.RPC_URL);
      const contract = new ethers.Contract(TREASURY_CONFIG.NFT_CONTRACT, NFT_ABI, provider);
      const minted = await contract.totalMinted();
      this.cachedMintCount = Number(minted);
      this.lastMintFetch = Date.now();
      return { count: this.cachedMintCount, source: 'on-chain' };
    } catch (error) {
      console.error('[Treasury] Failed to fetch minted count:', error);
      // Return cached or fallback
      if (this.cachedMintCount !== null) {
        return { count: this.cachedMintCount, source: 'cached' };
      }
      return { count: 0, source: 'fallback' };
    }
  }

  /**
   * Calculate days elapsed since emissions started
   */
  getDaysElapsed(): number {
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysElapsed = Math.floor((now.getTime() - TREASURY_CONFIG.EMISSIONS_START_DATE.getTime()) / msPerDay);
    return Math.max(0, daysElapsed);
  }

  /**
   * Calculate complete treasury summary
   * @param salesVolume Total secondary sales volume in $BASED (from activity feed)
   */
  async calculateTreasurySummary(salesVolume: number = 0): Promise<TreasurySummary> {
    const { count: mintedCount, source } = await this.getMintedCount();
    const daysElapsed = this.getDaysElapsed();

    // === MINT REVENUE ===
    // Formula: mintedCount × 69,420 × 51%
    const mintRevenue = Math.floor(mintedCount * TREASURY_CONFIG.MINT_PRICE * (TREASURY_CONFIG.MINT_TREASURY_PERCENT / 100));

    // === ROYALTY REVENUE ===
    // Formula: salesVolume × 2% (treasury portion of 10% royalty)
    const royaltyRevenue = Math.floor(salesVolume * (TREASURY_CONFIG.ROYALTY_TREASURY_PERCENT / 100));

    // === EMISSIONS REVENUE ===
    // Formula: daysElapsed × 64,500 × 10%
    const dailyEmissionsToTreasury = TREASURY_CONFIG.EMISSIONS_DAILY * (TREASURY_CONFIG.EMISSIONS_TREASURY_PERCENT / 100);
    const emissionsRevenue = Math.floor(daysElapsed * dailyEmissionsToTreasury);

    // === PLATFORM FEES ===
    // Formula: salesVolume × 1% (platform fee on all transactions)
    const platformFees = Math.floor(salesVolume * (TREASURY_CONFIG.PLATFORM_FEE_PERCENT / 100));

    // === TOTAL TREASURY ===
    const totalTreasury = mintRevenue + royaltyRevenue + emissionsRevenue + platformFees;

    // === BACKED VALUE PER NFT ===
    // Formula: totalTreasury / mintedCount
    const backedValuePerNFT = mintedCount > 0 ? Math.floor(totalTreasury / mintedCount) : 0;

    return {
      mintedCount,
      mintRevenue,
      royaltyRevenue,
      emissionsRevenue,
      platformFees,
      totalTreasury,
      backedValuePerNFT,
      stakingApy: TREASURY_CONFIG.STAKING_APY,
      daysElapsed,
      timestamp: new Date().toISOString(),
      source,
    };
  }

  /**
   * Create daily treasury snapshot backup
   */
  async createDailySnapshot(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      const summary = await this.calculateTreasurySummary();
      const dateStr = new Date().toISOString().split('T')[0];
      const filePath = path.join(this.backupDir, `treasury-${dateStr}.json`);

      const snapshot = {
        date: dateStr,
        ...summary,
        config: {
          mintPrice: TREASURY_CONFIG.MINT_PRICE,
          mintTreasuryPercent: TREASURY_CONFIG.MINT_TREASURY_PERCENT,
          royaltyTreasuryPercent: TREASURY_CONFIG.ROYALTY_TREASURY_PERCENT,
          emissionsDailyTotal: TREASURY_CONFIG.EMISSIONS_DAILY,
          emissionsTreasuryPercent: TREASURY_CONFIG.EMISSIONS_TREASURY_PERCENT,
          platformFeePercent: TREASURY_CONFIG.PLATFORM_FEE_PERCENT,
        },
      };

      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
      console.log(`[Treasury] Snapshot saved to ${filePath}`);

      return { success: true, filePath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Treasury] Snapshot failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get all treasury snapshots
   */
  getSnapshots(): Array<{ date: string; data: TreasurySummary }> {
    this.ensureBackupDir();
    const files = fs.readdirSync(this.backupDir).filter(f => f.startsWith('treasury-') && f.endsWith('.json'));
    
    return files.map(file => {
      const data = JSON.parse(fs.readFileSync(path.join(this.backupDir, file), 'utf-8'));
      return { date: data.date, data };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }
}

export const treasuryBackupService = new TreasuryBackupService();
