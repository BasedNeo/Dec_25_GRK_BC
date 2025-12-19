import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, readdir, stat, unlink, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const execAsync = promisify(exec);

interface BackupMetadata {
  id: string;
  timestamp: string;
  type: 'full' | 'incremental';
  size: number;
  checksum: string;
  compressed: boolean;
  status: 'success' | 'failed';
  duration: number;
  recordCount?: number;
  error?: string;
}

class DatabaseBackupService {
  private backupDir: string;
  private maxBackups: number = 30;
  private retentionDays: number = 30;
  
  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
  }
  
  async backup(type: 'full' | 'incremental' = 'full'): Promise<BackupMetadata> {
    const startTime = Date.now();
    const backupId = `${type}-${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    console.log(`🔄 Starting ${type} backup: ${backupId}`);
    
    try {
      if (!existsSync(this.backupDir)) {
        await mkdir(this.backupDir, { recursive: true });
        console.log('✅ Created backups directory');
      }
      
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not found in environment variables');
      }
      
      const backupFile = path.join(this.backupDir, `${backupId}.sql`);
      const gzipFile = `${backupFile}.gz`;
      
      console.log('📦 Dumping database...');
      await execAsync(`pg_dump "${dbUrl}" > "${backupFile}"`);
      console.log('✅ Database dumped successfully');
      
      const stats = await stat(backupFile);
      console.log(`📊 Backup size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      console.log('🗜️  Compressing backup...');
      await execAsync(`gzip "${backupFile}"`);
      console.log('✅ Backup compressed');
      
      const compressedStats = await stat(gzipFile);
      const compressionRatio = ((1 - compressedStats.size / stats.size) * 100).toFixed(1);
      console.log(`📊 Compressed size: ${(compressedStats.size / 1024 / 1024).toFixed(2)} MB (${compressionRatio}% reduction)`);
      
      const checksum = await this.calculateChecksum(gzipFile);
      console.log(`🔐 Checksum: ${checksum.substring(0, 16)}...`);
      
      const recordCount = await this.getRecordCount(dbUrl);
      
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        type,
        size: compressedStats.size,
        checksum,
        compressed: true,
        status: 'success',
        duration: Date.now() - startTime,
        recordCount
      };
      
      await this.saveMetadata(metadata);
      
      await this.logBackup(metadata);
      
      await this.cleanupOldBackups();
      
      console.log(`✅ Backup complete: ${backupId} (${metadata.duration}ms)`);
      
      return metadata;
    } catch (error: any) {
      console.error('❌ Backup failed:', error);
      
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        type,
        size: 0,
        checksum: '',
        compressed: false,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message
      };
      
      await this.saveMetadata(metadata);
      await this.logBackup(metadata);
      
      throw error;
    }
  }
  
  async restore(backupId: string, targetDb?: string): Promise<void> {
    console.log(`🔄 Starting restore from backup: ${backupId}`);
    
    const metadata = await this.getMetadata(backupId);
    
    if (!metadata) {
      throw new Error(`Backup not found: ${backupId}`);
    }
    
    if (metadata.status !== 'success') {
      throw new Error(`Cannot restore from failed backup: ${backupId}`);
    }
    
    const gzipFile = path.join(this.backupDir, `${backupId}.sql.gz`);
    
    if (!existsSync(gzipFile)) {
      throw new Error(`Backup file not found: ${gzipFile}`);
    }
    
    console.log('🔐 Verifying backup integrity...');
    const currentChecksum = await this.calculateChecksum(gzipFile);
    if (currentChecksum !== metadata.checksum) {
      throw new Error('Backup integrity check failed - checksum mismatch');
    }
    console.log('✅ Backup integrity verified');
    
    const dbUrl = targetDb || process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('Database URL not provided');
    }
    
    const sqlFile = gzipFile.replace('.gz', '');
    
    console.log('📦 Decompressing backup...');
    await execAsync(`gunzip -c "${gzipFile}" > "${sqlFile}"`);
    console.log('✅ Decompressed');
    
    console.log('📥 Restoring database...');
    console.log('⚠️  This will overwrite the current database!');
    
    try {
      await execAsync(`psql "${dbUrl}" < "${sqlFile}"`);
      console.log('✅ Database restored successfully');
      console.log(`📊 Records restored: ${metadata.recordCount || 'unknown'}`);
    } finally {
      if (existsSync(sqlFile)) {
        await unlink(sqlFile);
      }
    }
  }
  
  async listBackups(): Promise<BackupMetadata[]> {
    const metadataFile = path.join(this.backupDir, 'metadata.json');
    
    if (!existsSync(metadataFile)) {
      return [];
    }
    
    const content = await readFile(metadataFile, 'utf-8');
    const allMetadata = JSON.parse(content) as BackupMetadata[];
    
    return allMetadata.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  async verifyBackup(backupId: string): Promise<boolean> {
    console.log(`🔍 Verifying backup: ${backupId}`);
    
    const metadata = await this.getMetadata(backupId);
    
    if (!metadata) {
      console.error('❌ Metadata not found');
      return false;
    }
    
    const gzipFile = path.join(this.backupDir, `${backupId}.sql.gz`);
    
    if (!existsSync(gzipFile)) {
      console.error('❌ Backup file not found');
      return false;
    }
    
    const currentChecksum = await this.calculateChecksum(gzipFile);
    
    if (currentChecksum !== metadata.checksum) {
      console.error('❌ Checksum mismatch');
      return false;
    }
    
    try {
      await execAsync(`gzip -t "${gzipFile}"`);
      console.log('✅ Gzip integrity: OK');
    } catch {
      console.error('❌ Gzip integrity check failed');
      return false;
    }
    
    const stats = await stat(gzipFile);
    if (stats.size !== metadata.size) {
      console.error('❌ File size mismatch');
      return false;
    }
    
    console.log('✅ Backup verification passed');
    return true;
  }
  
  async getBackupStats(): Promise<any> {
    const backups = await this.listBackups();
    
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    const successfulBackups = backups.filter(b => b.status === 'success');
    const failedBackups = backups.filter(b => b.status === 'failed');
    const avgDuration = successfulBackups.length > 0 
      ? successfulBackups.reduce((sum, b) => sum + b.duration, 0) / successfulBackups.length
      : 0;
    
    return {
      total: backups.length,
      successful: successfulBackups.length,
      failed: failedBackups.length,
      totalSize: (totalSize / 1024 / 1024).toFixed(2) + ' MB',
      avgDuration: Math.round(avgDuration) + 'ms',
      oldest: backups[backups.length - 1]?.timestamp,
      newest: backups[0]?.timestamp
    };
  }
  
  private async calculateChecksum(file: string): Promise<string> {
    const content = await readFile(file);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  private async getRecordCount(dbUrl: string): Promise<number> {
    try {
      const result = await execAsync(`psql "${dbUrl}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"`);
      return parseInt(result.stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }
  
  private async saveMetadata(metadata: BackupMetadata): Promise<void> {
    const metadataFile = path.join(this.backupDir, 'metadata.json');
    
    let allMetadata: BackupMetadata[] = [];
    
    if (existsSync(metadataFile)) {
      const content = await readFile(metadataFile, 'utf-8');
      allMetadata = JSON.parse(content);
    }
    
    allMetadata.push(metadata);
    
    await writeFile(metadataFile, JSON.stringify(allMetadata, null, 2));
  }
  
  private async getMetadata(backupId: string): Promise<BackupMetadata | null> {
    const backups = await this.listBackups();
    return backups.find(b => b.id === backupId) || null;
  }
  
  private async logBackup(metadata: BackupMetadata): Promise<void> {
    const logFile = path.join(this.backupDir, 'backup.log');
    const logEntry = `[${metadata.timestamp}] ${metadata.status.toUpperCase()} - ${metadata.id} (${metadata.duration}ms, ${(metadata.size / 1024 / 1024).toFixed(2)} MB)\n`;
    
    await writeFile(logFile, logEntry, { flag: 'a' });
  }
  
  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
    
    let cleaned = 0;
    
    for (const backup of backups) {
      if (new Date(backup.timestamp) < cutoffDate) {
        const gzipFile = path.join(this.backupDir, `${backup.id}.sql.gz`);
        
        if (existsSync(gzipFile)) {
          await unlink(gzipFile);
          cleaned++;
        }
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old backups`);
    }
    
    if (backups.length > this.maxBackups) {
      const toDelete = backups.slice(this.maxBackups);
      
      for (const backup of toDelete) {
        const gzipFile = path.join(this.backupDir, `${backup.id}.sql.gz`);
        
        if (existsSync(gzipFile)) {
          await unlink(gzipFile);
          cleaned++;
        }
      }
      
      if (toDelete.length > 0) {
        console.log(`🧹 Removed ${toDelete.length} excess backups`);
      }
    }
  }
}

export { DatabaseBackupService };

const isMainModule = process.argv[1]?.includes('backup-database');

if (isMainModule) {
  const service = new DatabaseBackupService();
  const command = process.argv[2];

  switch (command) {
    case 'backup':
      service.backup('full').catch(console.error);
      break;
    case 'restore':
      const backupId = process.argv[3];
      if (!backupId) {
        console.error('Usage: npm run db:restore <backup-id>');
        process.exit(1);
      }
      service.restore(backupId).catch(console.error);
      break;
    case 'list':
      service.listBackups().then(backups => {
        console.log('📋 Available backups:\n');
        backups.forEach(b => {
          console.log(`${b.status === 'success' ? '✅' : '❌'} ${b.id}`);
          console.log(`   Time: ${new Date(b.timestamp).toLocaleString()}`);
          console.log(`   Size: ${(b.size / 1024 / 1024).toFixed(2)} MB`);
          console.log(`   Duration: ${b.duration}ms`);
          console.log('');
        });
      });
      break;
    case 'verify':
      const verifyId = process.argv[3];
      if (!verifyId) {
        console.error('Usage: npm run db:verify <backup-id>');
        process.exit(1);
      }
      service.verifyBackup(verifyId).catch(console.error);
      break;
    case 'stats':
      service.getBackupStats().then(stats => {
        console.log('📊 Backup Statistics:\n');
        console.log(JSON.stringify(stats, null, 2));
      });
      break;
    default:
      console.log('Usage: tsx script/backup-database.ts <command>');
      console.log('Commands: backup, restore <id>, list, verify <id>, stats');
  }
}
