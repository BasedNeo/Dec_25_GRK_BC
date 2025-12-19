import * as cron from 'node-cron';
import { DatabaseBackupService } from '../../script/backup-database';

export class BackupScheduler {
  private static service: DatabaseBackupService;
  private static jobs: Map<string, cron.ScheduledTask> = new Map();
  private static initialized = false;
  
  static initialize() {
    if (this.initialized) {
      console.log('[BACKUP SCHEDULER] Already initialized, skipping');
      return;
    }
    
    this.stop();
    
    this.service = new DatabaseBackupService();
    
    const dailyBackup = process.env.BACKUP_SCHEDULE || '0 2 * * *';
    
    console.log(`[BACKUP SCHEDULER] Scheduling daily backups: ${dailyBackup}`);
    
    const job = cron.schedule(dailyBackup, async () => {
      console.log('[BACKUP SCHEDULER] Running scheduled backup...');
      try {
        await this.service.backup('full');
        console.log('[BACKUP SCHEDULER] Scheduled backup completed');
      } catch (error) {
        console.error('[BACKUP SCHEDULER] Scheduled backup failed:', error);
      }
    });
    
    this.jobs.set('daily', job);
    this.initialized = true;
    
    console.log('[BACKUP SCHEDULER] Initialized (backups will run on schedule only)');
  }
  
  static stop() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`[BACKUP SCHEDULER] Stopped job: ${name}`);
    });
    this.jobs.clear();
  }
  
  static getService(): DatabaseBackupService {
    if (!this.service) {
      this.service = new DatabaseBackupService();
    }
    return this.service;
  }
}
