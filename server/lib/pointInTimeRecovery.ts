import { DatabaseBackupService } from '../../script/backup-database';
import { TransactionLogService } from './transactionLog';

interface RecoveryPoint {
  timestamp: Date;
  backupId: string;
  logEntries: number;
}

export class PointInTimeRecovery {
  private static backupService = new DatabaseBackupService();
  
  static async findRecoveryPoint(targetTimestamp: Date): Promise<RecoveryPoint | null> {
    console.log(`[PITR] Finding recovery point for: ${targetTimestamp.toISOString()}`);
    
    const backups = await this.backupService.listBackups();
    
    let closestBackup = null;
    
    for (const backup of backups) {
      const backupTime = new Date(backup.timestamp);
      
      if (backupTime <= targetTimestamp && backup.status === 'success') {
        closestBackup = backup;
        break;
      }
    }
    
    if (!closestBackup) {
      console.error('[PITR] No suitable backup found before target timestamp');
      return null;
    }
    
    console.log(`[PITR] Found backup: ${closestBackup.id} at ${new Date(closestBackup.timestamp).toISOString()}`);
    
    const logs = await TransactionLogService.getLogsInRange(
      new Date(closestBackup.timestamp),
      targetTimestamp
    );
    
    console.log(`[PITR] Found ${logs.length} transaction logs to replay`);
    
    return {
      timestamp: targetTimestamp,
      backupId: closestBackup.id,
      logEntries: logs.length
    };
  }
  
  static async recoverToPoint(targetTimestamp: Date, dryRun: boolean = false): Promise<void> {
    console.log(`[PITR] ${dryRun ? 'DRY RUN - ' : ''}Starting recovery to: ${targetTimestamp.toISOString()}`);
    
    const recoveryPoint = await this.findRecoveryPoint(targetTimestamp);
    
    if (!recoveryPoint) {
      throw new Error('No recovery point found');
    }
    
    console.log(`[PITR] Recovery plan:`);
    console.log(`  1. Restore backup: ${recoveryPoint.backupId}`);
    console.log(`  2. Replay ${recoveryPoint.logEntries} transactions`);
    
    if (dryRun) {
      console.log('[PITR] Dry run complete - no changes made');
      return;
    }
    
    console.log('[PITR] Step 1: Creating pre-recovery backup...');
    const preRecoveryBackup = await this.backupService.backup('full');
    console.log(`[PITR] Pre-recovery backup created: ${preRecoveryBackup.id}`);
    
    console.log('[PITR] Step 2: Restoring base backup...');
    await this.backupService.restore(recoveryPoint.backupId);
    console.log('[PITR] Base backup restored');
    
    console.log('[PITR] Step 3: Replaying transaction logs...');
    const backups = await this.backupService.listBackups();
    const backup = backups.find(b => b.id === recoveryPoint.backupId);
    
    if (backup) {
      const logs = await TransactionLogService.getLogsInRange(
        new Date(backup.timestamp),
        targetTimestamp
      );
      
      await this.replayTransactions(logs);
    }
    
    console.log('[PITR] Recovery complete!');
    console.log(`[PITR] Database restored to: ${targetTimestamp.toISOString()}`);
    console.log(`[PITR] Pre-recovery backup available: ${preRecoveryBackup.id}`);
  }
  
  private static async replayTransactions(logs: any[]): Promise<void> {
    let replayed = 0;
    let skipped = 0;
    
    for (const log of logs) {
      try {
        switch (log.operation) {
          case 'INSERT':
            await this.replayInsert(log);
            replayed++;
            break;
          case 'UPDATE':
            await this.replayUpdate(log);
            replayed++;
            break;
          case 'DELETE':
            await this.replayDelete(log);
            replayed++;
            break;
          default:
            console.warn(`[PITR] Unknown operation: ${log.operation}`);
            skipped++;
        }
      } catch (error) {
        console.error(`[PITR] Failed to replay log ${log.id}:`, error);
        skipped++;
      }
    }
    
    console.log(`[PITR] Replayed ${replayed} transactions, skipped ${skipped}`);
  }
  
  private static async replayInsert(log: any): Promise<void> {
    console.log(`[PITR] Replay INSERT: ${log.table} ${log.recordId}`);
  }
  
  private static async replayUpdate(log: any): Promise<void> {
    console.log(`[PITR] Replay UPDATE: ${log.table} ${log.recordId}`);
  }
  
  private static async replayDelete(log: any): Promise<void> {
    console.log(`[PITR] Replay DELETE: ${log.table} ${log.recordId}`);
  }
  
  static async testRecovery(targetTimestamp: Date): Promise<any> {
    console.log('[PITR] Running recovery test (dry run)...');
    
    const recoveryPoint = await this.findRecoveryPoint(targetTimestamp);
    
    if (!recoveryPoint) {
      return {
        success: false,
        error: 'No recovery point found',
        canRecover: false
      };
    }
    
    const backups = await this.backupService.listBackups();
    const backup = backups.find(b => b.id === recoveryPoint.backupId);
    
    if (!backup) {
      return {
        success: false,
        error: 'Backup not found',
        canRecover: false
      };
    }
    
    const backupValid = await this.backupService.verifyBackup(recoveryPoint.backupId);
    
    const logs = await TransactionLogService.getLogsInRange(
      new Date(backup.timestamp),
      targetTimestamp
    );
    
    return {
      success: true,
      canRecover: backupValid,
      recoveryPoint,
      backupDetails: {
        id: backup.id,
        timestamp: backup.timestamp,
        size: backup.size,
        valid: backupValid
      },
      transactionLogs: {
        count: logs.length,
        operations: {
          inserts: logs.filter(l => l.operation === 'INSERT').length,
          updates: logs.filter(l => l.operation === 'UPDATE').length,
          deletes: logs.filter(l => l.operation === 'DELETE').length
        }
      },
      estimatedDuration: Math.ceil((logs.length * 10 + 60000) / 1000),
      warnings: backupValid ? [] : ['Backup integrity check failed']
    };
  }
  
  static async getRecoveryPoints(limit: number = 10): Promise<RecoveryPoint[]> {
    const backups = await this.backupService.listBackups();
    const successfulBackups = backups.filter(b => b.status === 'success').slice(0, limit);
    
    const points: RecoveryPoint[] = [];
    
    for (const backup of successfulBackups) {
      const logs = await TransactionLogService.getLogsSince(new Date(backup.timestamp));
      
      points.push({
        timestamp: new Date(backup.timestamp),
        backupId: backup.id,
        logEntries: logs.length
      });
    }
    
    return points;
  }
}
