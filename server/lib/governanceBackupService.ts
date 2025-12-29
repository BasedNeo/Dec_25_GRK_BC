import * as fs from 'fs';
import * as path from 'path';
import { storage } from '../storage';

const BACKUP_DIR = '.core-backups/governance';
const MAX_BACKUP_FILES = 30;

interface GovernanceBackupData {
  snapshotDate: string;
  createdAt: string;
  totalProposals: number;
  totalVotes: number;
  totalLedgerEntries: number;
  proposals: Array<{
    id: string;
    title: string;
    description: string;
    proposer: string;
    status: string;
    votesFor: number;
    votesAgainst: number;
    startDate: string;
    endDate: string;
    category: string | null;
    requiredQuorum: number | null;
    createdAt: string;
    updatedAt: string;
  }>;
  votes: Array<{
    id: string;
    proposalId: string;
    walletAddress: string;
    nftId: number | null;
    selectedOption: string;
    votingPower: number;
    createdAt: string;
  }>;
  ledger: Array<{
    id: number;
    proposalId: string;
    walletAddress: string;
    nftId: number | null;
    voteType: string | null;
    eventType: string;
    metadata: string | null;
    createdAt: string;
  }>;
}

export class GovernanceBackupService {
  private static instance: GovernanceBackupService;
  
  private constructor() {}
  
  static getInstance(): GovernanceBackupService {
    if (!GovernanceBackupService.instance) {
      GovernanceBackupService.instance = new GovernanceBackupService();
    }
    return GovernanceBackupService.instance;
  }
  
  private ensureBackupDir(): void {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
  }
  
  private getBackupFilePath(date: string): string {
    return path.join(BACKUP_DIR, `governance-${date}.json`);
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
          console.log(`[GOVERNANCE BACKUP] Deleted old backup: ${file}`);
        }
      }
    } catch (err) {
      console.error('[GOVERNANCE BACKUP] Cleanup error:', err);
    }
  }
  
  async createDailySnapshot(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[GOVERNANCE BACKUP] Creating snapshot for ${today}...`);
    
    try {
      this.ensureBackupDir();
      
      const filePath = this.getBackupFilePath(today);
      
      if (fs.existsSync(filePath)) {
        console.log(`[GOVERNANCE BACKUP] Snapshot already exists for ${today}`);
        return { success: true, filePath };
      }
      
      const { proposals, votes, ledger } = await storage.exportGovernanceDataForBackup();
      
      const backupData: GovernanceBackupData = {
        snapshotDate: today,
        createdAt: new Date().toISOString(),
        totalProposals: proposals.length,
        totalVotes: votes.length,
        totalLedgerEntries: ledger.length,
        proposals: proposals.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          proposer: p.proposer,
          status: p.status,
          votesFor: p.votesFor,
          votesAgainst: p.votesAgainst,
          startDate: p.startDate.toISOString(),
          endDate: p.endDate.toISOString(),
          category: p.category,
          requiredQuorum: p.requiredQuorum,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString()
        })),
        votes: votes.map((v) => ({
          id: v.id,
          proposalId: v.proposalId,
          walletAddress: v.walletAddress,
          nftId: v.nftId,
          selectedOption: v.selectedOption,
          votingPower: v.votingPower,
          createdAt: v.createdAt.toISOString()
        })),
        ledger: ledger.map((l) => ({
          id: l.id,
          proposalId: l.proposalId,
          walletAddress: l.walletAddress,
          nftId: l.nftId,
          voteType: l.voteType,
          eventType: l.eventType,
          metadata: l.metadata,
          createdAt: l.createdAt.toISOString()
        }))
      };
      
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
      console.log(`[GOVERNANCE BACKUP] Snapshot saved: ${filePath} (${proposals.length} proposals, ${votes.length} votes, ${ledger.length} ledger entries)`);
      
      this.cleanupOldBackups();
      
      return { success: true, filePath };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      console.error('[GOVERNANCE BACKUP] Snapshot failed:', error);
      return { success: false, error };
    }
  }
  
  getLatestSnapshot(): GovernanceBackupData | null {
    try {
      this.ensureBackupDir();
      
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse();
      
      if (files.length === 0) {
        return null;
      }
      
      const latestFile = path.join(BACKUP_DIR, files[0]);
      const content = fs.readFileSync(latestFile, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error('[GOVERNANCE BACKUP] Failed to read latest snapshot:', err);
      return null;
    }
  }
  
  listSnapshots(): string[] {
    try {
      this.ensureBackupDir();
      return fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse();
    } catch (err) {
      console.error('[GOVERNANCE BACKUP] Failed to list snapshots:', err);
      return [];
    }
  }
}

export const governanceBackupService = GovernanceBackupService.getInstance();
