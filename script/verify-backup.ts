import { stat } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync, readdirSync } from 'fs';

const execAsync = promisify(exec);

async function verifyBackup() {
  const backupDir = path.join(process.cwd(), 'backups');
  
  console.log('🔍 Verifying latest backup...');
  
  if (!existsSync(backupDir)) {
    throw new Error('Backups directory does not exist');
  }
  
  try {
    const files = readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.sql.gz'))
      .sort()
      .reverse();
    
    if (files.length === 0) {
      throw new Error('No backups found');
    }
    
    const latestBackup = path.join(backupDir, files[0]);
    console.log(`📦 Latest backup: ${files[0]}`);
    
    const stats = await stat(latestBackup);
    const sizeMB = stats.size / (1024 * 1024);
    
    console.log(`📊 Size: ${sizeMB.toFixed(2)} MB`);
    
    if (stats.size < 100 * 1024) {
      throw new Error('Backup file suspiciously small');
    }
    
    await execAsync(`gzip -t "${latestBackup}"`);
    console.log('✅ Gzip integrity: OK');
    
    const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
    console.log(`⏰ Age: ${ageHours.toFixed(1)} hours`);
    
    if (ageHours > 24) {
      console.warn('⚠️  Backup is older than 24 hours');
    }
    
    console.log('✅ Backup verification passed');
    
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

verifyBackup().catch(console.error);
