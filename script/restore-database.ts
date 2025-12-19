import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

async function restoreDatabase(backupFile: string) {
  console.log('🔄 Starting database restore...');
  
  if (!existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL not found');
  }
  
  try {
    let sqlFile = backupFile;
    if (backupFile.endsWith('.gz')) {
      console.log('📦 Decompressing backup...');
      await execAsync(`gunzip -k "${backupFile}"`);
      sqlFile = backupFile.replace('.gz', '');
      console.log('✅ Decompressed');
    }
    
    console.log('📥 Restoring database...');
    await execAsync(`psql "${dbUrl}" < "${sqlFile}"`);
    console.log('✅ Database restored successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  }
}

const backupFile = process.argv[2];
if (!backupFile) {
  console.error('Usage: npm run restore:db <backup-file>');
  process.exit(1);
}

restoreDatabase(backupFile).catch(console.error);
