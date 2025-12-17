import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface ProtectedFile {
  path: string;
  criticality: string;
  reason: string;
  checksum: string;
  locked?: boolean;
}

const MANIFEST_PATH = './client/src/core/PROTECTION_MANIFEST.json';
const BACKUP_DIR = '.core-backups';
const MAX_BACKUPS = 50;

function getChecksum(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return '';
  }
}

function createBackup(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const checksum = getChecksum(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    const backupPath = path.join(BACKUP_DIR, path.dirname(filePath));
    fs.mkdirSync(backupPath, { recursive: true });
    
    const fileName = path.basename(filePath);
    const backupFile = path.join(backupPath, `${fileName}.${timestamp}.bak`);
    fs.writeFileSync(backupFile, content, 'utf8');
    
    const metaFile = `${backupFile}.meta.json`;
    fs.writeFileSync(metaFile, JSON.stringify({
      originalPath: filePath,
      timestamp,
      checksum,
      size: content.length
    }, null, 2));
    
    console.log(`Backed up: ${filePath} (${checksum.slice(0, 8)}...)`);
    return true;
  } catch (error) {
    console.error(`Backup failed for ${filePath}:`, error);
    return false;
  }
}

function cleanOldBackups(filePath: string) {
  try {
    const backupPath = path.join(BACKUP_DIR, path.dirname(filePath));
    const fileName = path.basename(filePath);
    
    if (!fs.existsSync(backupPath)) return;
    
    const backups = fs.readdirSync(backupPath)
      .filter(f => f.startsWith(fileName) && f.endsWith('.bak'))
      .map(f => ({
        name: f,
        path: path.join(backupPath, f),
        mtime: fs.statSync(path.join(backupPath, f)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    
    if (backups.length > MAX_BACKUPS) {
      const toDelete = backups.slice(MAX_BACKUPS);
      toDelete.forEach(backup => {
        fs.unlinkSync(backup.path);
        const metaPath = `${backup.path}.meta.json`;
        if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
        console.log(`Deleted old backup: ${backup.name}`);
      });
    }
  } catch (error) {
    console.error('Error cleaning old backups:', error);
  }
}

function verifyIntegrity(): boolean {
  console.log('\nVerifying core file integrity...\n');
  
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('Protection manifest not found!');
    return false;
  }
  
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  let allValid = true;
  const changes: Array<{ file: string; status: string; action: string }> = [];
  
  for (const file of manifest.protectedFiles) {
    if (!fs.existsSync(file.path)) {
      console.error(`CRITICAL: ${file.path} is missing!`);
      allValid = false;
      changes.push({ file: file.path, status: 'MISSING', action: 'RESTORE FROM BACKUP' });
      continue;
    }
    
    const currentChecksum = getChecksum(file.path);
    
    if (!file.checksum) {
      file.checksum = currentChecksum;
      changes.push({ file: file.path, status: 'INITIALIZED', action: 'Checksum saved' });
      continue;
    }
    
    if (currentChecksum !== file.checksum) {
      if (file.locked) {
        console.error(`CRITICAL: LOCKED file ${file.path} was modified!`);
        allValid = false;
        changes.push({ file: file.path, status: 'MODIFIED (LOCKED)', action: 'REVIEW IMMEDIATELY' });
      } else {
        console.warn(`${file.path} has changed (${file.criticality})`);
        changes.push({ file: file.path, status: 'MODIFIED', action: 'Backup created' });
        
        createBackup(file.path);
        cleanOldBackups(file.path);
        file.checksum = currentChecksum;
      }
    } else {
      console.log(`${file.path} - OK`);
    }
  }
  
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  
  if (changes.length > 0) {
    console.log('\nCHANGE SUMMARY:\n');
    console.table(changes);
  }
  
  if (!allValid) {
    console.error('\nINTEGRITY CHECK FAILED - REVIEW REQUIRED\n');
    process.exit(1);
  }
  
  console.log('\nAll protected files verified successfully\n');
  return true;
}

function restoreBackup(filePath: string, timestamp?: string) {
  const backupPath = path.join(BACKUP_DIR, path.dirname(filePath));
  const fileName = path.basename(filePath);
  
  if (!fs.existsSync(backupPath)) {
    console.error(`No backups found for ${filePath}`);
    return false;
  }
  
  const backups = fs.readdirSync(backupPath)
    .filter(f => f.startsWith(fileName) && f.endsWith('.bak'))
    .map(f => ({
      name: f,
      path: path.join(backupPath, f),
      timestamp: f.match(/\.(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1] || '',
      mtime: fs.statSync(path.join(backupPath, f)).mtime
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  
  if (backups.length === 0) {
    console.error(`No backups found for ${filePath}`);
    return false;
  }
  
  const backup = timestamp 
    ? backups.find(b => b.timestamp === timestamp)
    : backups[0];
  
  if (!backup) {
    console.error(`Backup not found`);
    return false;
  }
  
  try {
    const content = fs.readFileSync(backup.path, 'utf8');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Restored ${filePath} from backup: ${backup.name}`);
    return true;
  } catch (error) {
    console.error(`Restore failed:`, error);
    return false;
  }
}

const command = process.argv[2];

switch (command) {
  case 'verify':
    verifyIntegrity();
    break;
    
  case 'backup':
    {
      const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      
      console.log('Backing up protected files...\n');
      let success = 0;
      for (const file of manifest.protectedFiles) {
        if (createBackup(file.path)) {
          cleanOldBackups(file.path);
          success++;
        }
      }
      console.log(`\nBacked up ${success}/${manifest.protectedFiles.length} files\n`);
    }
    break;
    
  case 'restore':
    {
      const filePath = process.argv[3];
      const timestamp = process.argv[4];
      
      if (!filePath) {
        console.error('Usage: npm run core:restore <file-path> [timestamp]');
        process.exit(1);
      }
      
      restoreBackup(filePath, timestamp);
    }
    break;
    
  case 'list':
    {
      const filePath = process.argv[3];
      if (!filePath) {
        console.error('Usage: npm run core:list <file-path>');
        process.exit(1);
      }
      
      const backupPath = path.join(BACKUP_DIR, path.dirname(filePath));
      const fileName = path.basename(filePath);
      
      if (!fs.existsSync(backupPath)) {
        console.log(`No backups found for ${filePath}`);
        process.exit(0);
      }
      
      const backups = fs.readdirSync(backupPath)
        .filter(f => f.startsWith(fileName) && f.endsWith('.bak'))
        .map(f => {
          const metaPath = path.join(backupPath, `${f}.meta.json`);
          const meta = fs.existsSync(metaPath) 
            ? JSON.parse(fs.readFileSync(metaPath, 'utf8'))
            : {};
          
          return {
            file: f,
            timestamp: meta.timestamp || 'unknown',
            checksum: (meta.checksum || '').slice(0, 8),
            size: `${Math.round((meta.size || 0) / 1024)}KB`
          };
        });
      
      console.log(`\nBackups for ${filePath}:\n`);
      console.table(backups);
    }
    break;
    
  default:
    console.log(`
Core Protection System

Commands:
  npm run core:verify           Verify integrity of protected files
  npm run core:backup           Create backups of all protected files
  npm run core:restore <path>   Restore file from most recent backup
  npm run core:list <path>      List all backups for a file

Examples:
  npm run core:verify
  npm run core:backup
  npm run core:restore client/src/core/commerce/useMint.ts
  npm run core:list client/src/lib/constants.ts
    `);
    break;
}
