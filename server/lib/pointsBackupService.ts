import * as fs from 'fs';
import * as path from 'path';
import { storage } from '../storage';
import { WebSocketManager } from './websocketManager';

const BACKUP_DIR = '.core-backups/points';
const MAX_BACKUP_FILES = 30;

interface PointsBackupData {
  snapshotDate: string;
  createdAt: string;
  totalWallets: number;
  totalPointsEarned: number;
  totalPointsVested: number;
  totalBrainXLocked: number;
  wallets: Array<{
    walletAddress: string;
    totalEarned: number;
    totalVested: number;
    brainXLocked: number;
    brainXUnlocked: number;
    dailyEarnedTotal: number;
    lastActivity: string;
    vestingEndDate: string | null;
  }>;
}

export class PointsBackupService {
  private static instance: PointsBackupService;
  
  private constructor() {}
  
  static getInstance(): PointsBackupService {
    if (!PointsBackupService.instance) {
      PointsBackupService.instance = new PointsBackupService();
    }
    return PointsBackupService.instance;
  }
  
  private ensureBackupDir(): void {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }
  
  private getBackupFilePath(date: string): string {
    return path.join(BACKUP_DIR, `${date}.json`);
  }
  
  private cleanupOldBackups(): void {
    try {
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse();
      
      if (files.length > MAX_BACKUP_FILES) {
        const toDelete = files.slice(MAX_BACKUP_FILES);
        for (const file of toDelete) {
          fs.unlinkSync(path.join(BACKUP_DIR, file));
          console.log(`[POINTS BACKUP] Deleted old backup: ${file}`);
        }
      }
    } catch (err) {
      console.error('[POINTS BACKUP] Cleanup error:', err);
    }
  }
  
  async createDailySnapshot(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[POINTS BACKUP] Creating snapshot for ${today}...`);
    
    try {
      this.ensureBackupDir();
      
      const existingSnapshot = await storage.getPointsSnapshot(today);
      if (existingSnapshot) {
        console.log(`[POINTS BACKUP] Snapshot already exists for ${today}`);
        return { success: true, filePath: existingSnapshot.fileLocation || undefined };
      }
      
      const summaries = await storage.getAllPointsSummaries();
      
      const backupData: PointsBackupData = {
        snapshotDate: today,
        createdAt: new Date().toISOString(),
        totalWallets: summaries.length,
        totalPointsEarned: summaries.reduce((sum, s) => sum + s.totalEarned, 0),
        totalPointsVested: summaries.reduce((sum, s) => sum + s.totalVested, 0),
        totalBrainXLocked: summaries.reduce((sum, s) => sum + s.brainXLocked, 0),
        wallets: summaries.map(s => ({
          walletAddress: s.walletAddress,
          totalEarned: s.totalEarned,
          totalVested: s.totalVested,
          brainXLocked: s.brainXLocked,
          brainXUnlocked: s.brainXUnlocked,
          dailyEarnedTotal: s.dailyEarnedTotal,
          lastActivity: s.lastActivity.toISOString(),
          vestingEndDate: s.vestingEndDate?.toISOString() || null
        }))
      };
      
      const filePath = this.getBackupFilePath(today);
      const tempPath = `${filePath}.tmp`;
      
      fs.writeFileSync(tempPath, JSON.stringify(backupData, null, 2));
      fs.renameSync(tempPath, filePath);
      
      await storage.createPointsSnapshot({
        snapshotDate: today,
        totalWallets: backupData.totalWallets,
        totalPointsEarned: backupData.totalPointsEarned,
        totalPointsVested: backupData.totalPointsVested,
        totalBrainXLocked: backupData.totalBrainXLocked,
        fileLocation: filePath
      });
      
      this.cleanupOldBackups();
      
      const wsManager = WebSocketManager.getInstance();
      wsManager.broadcastAll({
        type: 'points_snapshot_ready',
        data: {
          snapshotDate: today,
          totalWallets: backupData.totalWallets,
          totalPointsEarned: backupData.totalPointsEarned
        }
      });
      
      console.log(`[POINTS BACKUP] Snapshot created: ${filePath}`);
      return { success: true, filePath };
      
    } catch (err) {
      console.error('[POINTS BACKUP] Snapshot failed:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
  
  async getBackupData(date: string): Promise<PointsBackupData | null> {
    const filePath = this.getBackupFilePath(date);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as PointsBackupData;
    } catch (err) {
      console.error(`[POINTS BACKUP] Failed to read backup ${date}:`, err);
      return null;
    }
  }
  
  listBackups(): string[] {
    this.ensureBackupDir();
    return fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort()
      .reverse();
  }
}

export const pointsBackupService = PointsBackupService.getInstance();
