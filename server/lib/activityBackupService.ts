import * as fs from 'fs';
import * as path from 'path';
import { storage } from '../storage';

const BACKUP_DIR = '.core-backups/activity';
const MAX_BACKUP_FILES = 30;

interface ActivityBackupData {
  snapshotDate: string;
  createdAt: string;
  totalLogs: number;
  logs: Array<{
    id: number;
    walletAddress: string;
    eventType: string;
    details: string | null;
    pointsEarned: number | null;
    gameType: string | null;
    createdAt: string;
  }>;
}

export class ActivityBackupService {
  private static instance: ActivityBackupService;
  
  private constructor() {}
  
  static getInstance(): ActivityBackupService {
    if (!ActivityBackupService.instance) {
      ActivityBackupService.instance = new ActivityBackupService();
    }
    return ActivityBackupService.instance;
  }
  
  private ensureBackupDir(): void {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }
  
  private getBackupFilePath(date: string): string {
    return path.join(BACKUP_DIR, `activity-${date}.json`);
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
          console.log(`[ACTIVITY BACKUP] Deleted old backup: ${file}`);
        }
      }
    } catch (err) {
      console.error('[ACTIVITY BACKUP] Cleanup error:', err);
    }
  }
  
  async createDailySnapshot(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[ACTIVITY BACKUP] Creating snapshot for ${today}...`);
    
    try {
      this.ensureBackupDir();
      
      const filePath = this.getBackupFilePath(today);
      
      if (fs.existsSync(filePath)) {
        console.log(`[ACTIVITY BACKUP] Snapshot already exists for ${today}`);
        return { success: true, filePath };
      }
      
      const logs = await storage.getActivityLogs(1000);
      
      const backupData: ActivityBackupData = {
        snapshotDate: today,
        createdAt: new Date().toISOString(),
        totalLogs: logs.length,
        logs: logs.map((log: typeof logs[0]) => ({
          id: log.id,
          walletAddress: log.walletAddress,
          eventType: log.eventType,
          details: log.details,
          pointsEarned: log.pointsEarned,
          gameType: log.gameType,
          createdAt: log.createdAt.toISOString()
        }))
      };
      
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
      console.log(`[ACTIVITY BACKUP] Snapshot saved: ${filePath}`);
      
      this.cleanupOldBackups();
      
      return { success: true, filePath };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      console.error('[ACTIVITY BACKUP] Snapshot failed:', error);
      return { success: false, error };
    }
  }
}

export const activityBackupService = ActivityBackupService.getInstance();
