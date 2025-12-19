import { db } from '../db';
import { sql } from 'drizzle-orm';
import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface StateSnapshot {
  id: string;
  timestamp: Date;
  description: string;
  capturedBy: string;
  version: string;
  database: {
    tables: Record<string, number>;
    totalRecords: number;
    checksum: string;
  };
  configuration: {
    env: Record<string, string>;
    contracts: Record<string, string>;
    constants: any;
  };
  features: Record<string, boolean>;
  size: number;
  status: 'captured' | 'failed';
  error?: string;
}

export class StateSnapshotService {
  private static snapshotsDir = path.join(process.cwd(), 'snapshots');
  
  static async captureSnapshot(description: string, capturedBy: string): Promise<StateSnapshot> {
    console.log('[SNAPSHOT] Capturing application state...');
    
    const snapshotId = `snapshot-${Date.now()}`;
    const timestamp = new Date();
    
    try {
      const database = await this.captureDatabaseState();
      const configuration = await this.captureConfiguration();
      const features = await this.captureFeatureFlags();
      
      const snapshotData = {
        database,
        configuration,
        features
      };
      
      const size = JSON.stringify(snapshotData).length;
      
      const snapshot: StateSnapshot = {
        id: snapshotId,
        timestamp,
        description,
        capturedBy,
        version: process.env.APP_VERSION || '1.0.0',
        database,
        configuration,
        features,
        size,
        status: 'captured'
      };
      
      await this.saveSnapshot(snapshot, snapshotData);
      
      console.log(`[SNAPSHOT] Captured: ${snapshotId} (${(size / 1024).toFixed(2)} KB)`);
      
      return snapshot;
    } catch (error: any) {
      console.error('[SNAPSHOT] Capture failed:', error);
      
      const failedSnapshot: StateSnapshot = {
        id: snapshotId,
        timestamp,
        description,
        capturedBy,
        version: process.env.APP_VERSION || '1.0.0',
        database: { tables: {}, totalRecords: 0, checksum: '' },
        configuration: { env: {}, contracts: {}, constants: {} },
        features: {},
        size: 0,
        status: 'failed',
        error: error.message
      };
      
      return failedSnapshot;
    }
  }
  
  private static async captureDatabaseState(): Promise<StateSnapshot['database']> {
    const tables = [
      'nfts',
      'users', 
      'proposals',
      'votes',
      'transaction_receipts',
      'audit_logs',
      'feature_flags',
      'game_scores',
      'guardian_profiles'
    ];
    
    const tableCounts: Record<string, number> = {};
    let totalRecords = 0;
    
    for (const table of tables) {
      try {
        const result = await db.execute(sql.raw(`SELECT COUNT(*) FROM ${table}`));
        const count = parseInt(result.rows[0]?.count as string || '0');
        tableCounts[table] = count;
        totalRecords += count;
      } catch (error) {
        tableCounts[table] = 0;
      }
    }
    
    const checksumData = JSON.stringify(tableCounts);
    const checksum = this.calculateChecksum(checksumData);
    
    return {
      tables: tableCounts,
      totalRecords,
      checksum
    };
  }
  
  private static async captureConfiguration(): Promise<StateSnapshot['configuration']> {
    const sensitiveKeys = ['DATABASE_URL', 'ENCRYPTION_KEY', 'SESSION_SECRET', 'PRIVATE_KEY', 'API_KEY'];
    
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (!sensitiveKeys.some(sk => key.includes(sk))) {
        env[key] = value ? '[SET]' : '[NOT SET]';
      }
    }
    
    const contracts = {
      NFT_CONTRACT: process.env.NFT_CONTRACT || '',
      MARKETPLACE_CONTRACT: process.env.MARKETPLACE_CONTRACT || '',
      GOVERNANCE_CONTRACT: process.env.GOVERNANCE_CONTRACT || '',
      TOKEN_CONTRACT: process.env.TOKEN_CONTRACT || ''
    };
    
    const constantsPath = path.join(process.cwd(), 'client', 'src', 'lib', 'constants.ts');
    let constantsContent = '';
    try {
      constantsContent = await readFile(constantsPath, 'utf-8');
    } catch (error) {
      console.warn('[SNAPSHOT] Could not read constants');
    }
    
    return {
      env,
      contracts,
      constants: { content: constantsContent.substring(0, 1000) }
    };
  }
  
  private static async captureFeatureFlags(): Promise<Record<string, boolean>> {
    try {
      const result = await db.execute(sql`SELECT flag_name, enabled FROM feature_flags`);
      
      const flags: Record<string, boolean> = {};
      for (const row of result.rows) {
        flags[row.flag_name as string] = row.enabled as boolean;
      }
      
      return flags;
    } catch (error) {
      return {};
    }
  }
  
  static async restoreSnapshot(snapshotId: string): Promise<void> {
    console.log(`[SNAPSHOT] Restoring from: ${snapshotId}`);
    
    const snapshot = await this.loadSnapshot(snapshotId);
    
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }
    
    if (snapshot.status !== 'captured') {
      throw new Error(`Cannot restore from failed snapshot: ${snapshotId}`);
    }
    
    console.log('[SNAPSHOT] Creating pre-restore snapshot...');
    await this.captureSnapshot('Pre-restore backup', 'system');
    
    console.log('[SNAPSHOT] Restoring feature flags...');
    await this.restoreFeatureFlags(snapshot.features);
    
    console.log('[SNAPSHOT] Verifying restoration...');
    const currentState = await this.captureDatabaseState();
    
    console.log('[SNAPSHOT] Restoration complete');
    console.log(`  Expected records: ${snapshot.database.totalRecords}`);
    console.log(`  Current records: ${currentState.totalRecords}`);
  }
  
  private static async restoreFeatureFlags(flags: Record<string, boolean>): Promise<void> {
    for (const [flagName, enabled] of Object.entries(flags)) {
      try {
        await db.execute(sql`
          UPDATE feature_flags 
          SET enabled = ${enabled}
          WHERE flag_name = ${flagName}
        `);
      } catch (error) {
        console.warn(`[SNAPSHOT] Could not restore flag ${flagName}`);
      }
    }
  }
  
  static async compareSnapshots(snapshot1Id: string, snapshot2Id: string): Promise<any> {
    const snap1 = await this.loadSnapshot(snapshot1Id);
    const snap2 = await this.loadSnapshot(snapshot2Id);
    
    if (!snap1 || !snap2) {
      throw new Error('One or both snapshots not found');
    }
    
    const differences = {
      timestamp: {
        snapshot1: snap1.timestamp,
        snapshot2: snap2.timestamp,
        timeDiff: new Date(snap2.timestamp).getTime() - new Date(snap1.timestamp).getTime()
      },
      database: {
        recordsDiff: snap2.database.totalRecords - snap1.database.totalRecords,
        tableChanges: this.compareObjects(snap1.database.tables, snap2.database.tables)
      },
      features: {
        changed: this.compareObjects(snap1.features, snap2.features)
      },
      size: {
        snapshot1: snap1.size,
        snapshot2: snap2.size,
        diff: snap2.size - snap1.size
      }
    };
    
    return differences;
  }
  
  private static compareObjects(obj1: any, obj2: any): Record<string, any> {
    const changes: Record<string, any> = {};
    
    const allKeys = Array.from(new Set([...Object.keys(obj1), ...Object.keys(obj2)]));
    
    for (const key of allKeys) {
      if (obj1[key] !== obj2[key]) {
        changes[key] = {
          before: obj1[key],
          after: obj2[key]
        };
      }
    }
    
    return changes;
  }
  
  static async listSnapshots(): Promise<StateSnapshot[]> {
    const metadataFile = path.join(this.snapshotsDir, 'metadata.json');
    
    try {
      const content = await readFile(metadataFile, 'utf-8');
      const snapshots = JSON.parse(content) as StateSnapshot[];
      
      return snapshots.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      return [];
    }
  }
  
  static async deleteSnapshot(snapshotId: string): Promise<void> {
    const snapshots = await this.listSnapshots();
    const filtered = snapshots.filter(s => s.id !== snapshotId);
    
    const metadataFile = path.join(this.snapshotsDir, 'metadata.json');
    await writeFile(metadataFile, JSON.stringify(filtered, null, 2));
    
    console.log(`[SNAPSHOT] Deleted: ${snapshotId}`);
  }
  
  private static async saveSnapshot(snapshot: StateSnapshot, data: any): Promise<void> {
    try {
      await mkdir(this.snapshotsDir, { recursive: true });
    } catch (error) {
    }
    
    const dataFile = path.join(this.snapshotsDir, `${snapshot.id}.json`);
    await writeFile(dataFile, JSON.stringify(data, null, 2));
    
    const snapshots = await this.listSnapshots();
    snapshots.push(snapshot);
    
    const metadataFile = path.join(this.snapshotsDir, 'metadata.json');
    await writeFile(metadataFile, JSON.stringify(snapshots, null, 2));
  }
  
  private static async loadSnapshot(snapshotId: string): Promise<StateSnapshot | null> {
    const snapshots = await this.listSnapshots();
    return snapshots.find(s => s.id === snapshotId) || null;
  }
  
  private static calculateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  static async getStats(): Promise<any> {
    const snapshots = await this.listSnapshots();
    
    const totalSize = snapshots.reduce((sum, s) => sum + s.size, 0);
    const successful = snapshots.filter(s => s.status === 'captured');
    
    return {
      total: snapshots.length,
      successful: successful.length,
      failed: snapshots.length - successful.length,
      totalSize: (totalSize / 1024).toFixed(2) + ' KB',
      oldest: snapshots[snapshots.length - 1]?.timestamp,
      newest: snapshots[0]?.timestamp
    };
  }
}
