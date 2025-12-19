import { db } from '../db';
import { sql } from 'drizzle-orm';
import { appendFile, mkdir } from 'fs/promises';
import path from 'path';

interface TransactionLogEntry {
  id: string;
  timestamp: Date;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  recordId: string;
  beforeData: any;
  afterData: any;
  userId?: string;
  txId: string;
}

export class TransactionLogService {
  private static logFile = path.join(process.cwd(), 'logs', 'transactions.log');
  private static currentTxId: string | null = null;
  private static initialized = false;
  
  private static async ensureLogDir(): Promise<void> {
    if (this.initialized) return;
    try {
      await mkdir(path.dirname(this.logFile), { recursive: true });
      this.initialized = true;
    } catch (error) {
      console.error('[TX_LOG] Failed to create logs directory:', error);
    }
  }
  
  static async log(entry: Omit<TransactionLogEntry, 'id' | 'timestamp' | 'txId'>): Promise<void> {
    await this.ensureLogDir();
    
    const logEntry: TransactionLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date(),
      txId: this.currentTxId || 'standalone',
      ...entry
    };
    
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await appendFile(this.logFile, logLine);
      
      await db.execute(sql`
        INSERT INTO transaction_logs (
          log_id, timestamp, operation, table_name, record_id, 
          before_data, after_data, user_id, tx_id
        ) VALUES (
          ${logEntry.id}, ${logEntry.timestamp}, ${logEntry.operation}, 
          ${logEntry.table}, ${logEntry.recordId}, 
          ${JSON.stringify(logEntry.beforeData)}, 
          ${JSON.stringify(logEntry.afterData)},
          ${logEntry.userId}, ${logEntry.txId}
        )
      `);
    } catch (error) {
      console.error('[TX_LOG] Failed to log transaction:', error);
    }
  }
  
  static beginTransaction(): string {
    this.currentTxId = `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    console.log(`[TX_LOG] Begin transaction: ${this.currentTxId}`);
    return this.currentTxId;
  }
  
  static commitTransaction(): void {
    console.log(`[TX_LOG] Commit transaction: ${this.currentTxId}`);
    this.currentTxId = null;
  }
  
  static rollbackTransaction(): void {
    console.log(`[TX_LOG] Rollback transaction: ${this.currentTxId}`);
    this.currentTxId = null;
  }
  
  static async getLogsSince(timestamp: Date): Promise<TransactionLogEntry[]> {
    const result = await db.execute(sql`
      SELECT * FROM transaction_logs 
      WHERE timestamp >= ${timestamp}
      ORDER BY timestamp ASC
    `);
    
    return result.rows.map(row => ({
      id: row.log_id as string,
      timestamp: new Date(row.timestamp as string),
      operation: row.operation as 'INSERT' | 'UPDATE' | 'DELETE',
      table: row.table_name as string,
      recordId: row.record_id as string,
      beforeData: row.before_data ? JSON.parse(row.before_data as string) : null,
      afterData: row.after_data ? JSON.parse(row.after_data as string) : null,
      userId: row.user_id as string | undefined,
      txId: row.tx_id as string
    }));
  }
  
  static async getLogsInRange(start: Date, end: Date): Promise<TransactionLogEntry[]> {
    const result = await db.execute(sql`
      SELECT * FROM transaction_logs 
      WHERE timestamp >= ${start} AND timestamp <= ${end}
      ORDER BY timestamp ASC
    `);
    
    return result.rows.map(row => ({
      id: row.log_id as string,
      timestamp: new Date(row.timestamp as string),
      operation: row.operation as 'INSERT' | 'UPDATE' | 'DELETE',
      table: row.table_name as string,
      recordId: row.record_id as string,
      beforeData: row.before_data ? JSON.parse(row.before_data as string) : null,
      afterData: row.after_data ? JSON.parse(row.after_data as string) : null,
      userId: row.user_id as string | undefined,
      txId: row.tx_id as string
    }));
  }
  
  static async getStats(): Promise<any> {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT tx_id) as unique_transactions,
        MIN(timestamp) as oldest,
        MAX(timestamp) as newest,
        COUNT(CASE WHEN operation = 'INSERT' THEN 1 END) as inserts,
        COUNT(CASE WHEN operation = 'UPDATE' THEN 1 END) as updates,
        COUNT(CASE WHEN operation = 'DELETE' THEN 1 END) as deletes
      FROM transaction_logs
    `);
    
    return result.rows[0];
  }
}
