import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
  const gzipFile = `${backupFile}.gz`;
  
  console.log('🔄 Starting database backup...');
  
  if (!existsSync(backupDir)) {
    await mkdir(backupDir, { recursive: true });
    console.log('✅ Created backups directory');
  }
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not found in environment variables');
  }
  
  try {
    console.log('📦 Dumping database...');
    await execAsync(`pg_dump "${dbUrl}" > "${backupFile}"`);
    console.log('✅ Database dumped successfully');
    
    console.log('🗜️  Compressing backup...');
    await execAsync(`gzip "${backupFile}"`);
    console.log('✅ Backup compressed');
    
    const logMessage = `[${new Date().toISOString()}] Backup created: ${gzipFile}\n`;
    await writeFile(path.join(backupDir, 'backup.log'), logMessage, { flag: 'a' });
    
    console.log(`✅ Backup complete: ${gzipFile}`);
    
    await cleanupOldBackups(backupDir);
    
    return gzipFile;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    const logMessage = `[${new Date().toISOString()}] Backup FAILED: ${error}\n`;
    await writeFile(path.join(backupDir, 'backup.log'), logMessage, { flag: 'a' });
    throw error;
  }
}

async function cleanupOldBackups(backupDir: string) {
  try {
    await execAsync(`find "${backupDir}" -name "backup-*.sql.gz" -mtime +30 -delete`);
    console.log('🧹 Cleaned up backups older than 30 days');
  } catch (error) {
    console.warn('⚠️  Cleanup warning:', error);
  }
}

backupDatabase().catch(console.error);
