import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';

interface ConfigVersion {
  id: string;
  timestamp: Date;
  author: string;
  message: string;
  changes: Array<{
    file: string;
    type: 'added' | 'modified' | 'deleted';
    before?: string;
    after?: string;
  }>;
}

export class ConfigVersionControl {
  private static versionsDir = path.join(process.cwd(), 'config-versions');
  
  static async saveConfigVersion(author: string, message: string, files: string[]): Promise<ConfigVersion> {
    const versionId = `config-v${Date.now()}`;
    const timestamp = new Date();
    
    const changes = [];
    
    for (const file of files) {
      try {
        const content = await readFile(file, 'utf-8');
        
        changes.push({
          file,
          type: 'modified' as const,
          after: content
        });
      } catch (error) {
        console.warn(`[CONFIG_VERSION] Could not read ${file}`);
      }
    }
    
    const version: ConfigVersion = {
      id: versionId,
      timestamp,
      author,
      message,
      changes
    };
    
    await this.saveVersion(version);
    
    console.log(`[CONFIG_VERSION] Saved: ${versionId}`);
    
    return version;
  }
  
  static async listVersions(): Promise<ConfigVersion[]> {
    const metadataFile = path.join(this.versionsDir, 'versions.json');
    
    try {
      const content = await readFile(metadataFile, 'utf-8');
      const versions = JSON.parse(content) as ConfigVersion[];
      
      return versions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      return [];
    }
  }
  
  static async restoreVersion(versionId: string): Promise<void> {
    const versions = await this.listVersions();
    const version = versions.find(v => v.id === versionId);
    
    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }
    
    console.log(`[CONFIG_VERSION] Restoring: ${versionId}`);
    
    for (const change of version.changes) {
      if (change.after) {
        try {
          await writeFile(change.file, change.after);
          console.log(`[CONFIG_VERSION] Restored: ${change.file}`);
        } catch (error) {
          console.error(`[CONFIG_VERSION] Failed to restore ${change.file}`);
        }
      }
    }
  }
  
  private static async saveVersion(version: ConfigVersion): Promise<void> {
    try {
      await mkdir(this.versionsDir, { recursive: true });
    } catch (error) {
    }
    
    const versions = await this.listVersions();
    versions.push(version);
    
    const metadataFile = path.join(this.versionsDir, 'versions.json');
    await writeFile(metadataFile, JSON.stringify(versions, null, 2));
  }
}
