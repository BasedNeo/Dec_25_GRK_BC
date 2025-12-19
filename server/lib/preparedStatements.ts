import { db } from '../db';
import { sql } from 'drizzle-orm';
import { QueryValidator } from './queryValidator';

export class PreparedStatements {
  static async executeRaw(
    query: string, 
    params: any[] = [], 
    allowedTables: string[] = []
  ): Promise<any> {
    for (const param of params) {
      if (typeof param === 'string' && QueryValidator.detectSqlInjection(param)) {
        throw new Error('SQL injection detected in parameters');
      }
    }
    
    const validTables = ['nfts', 'users', 'proposals', 'transactions', 'audit_logs', 
      'guardian_names', 'proposal_votes', 'admin_nonces', 'game_scores', 'user_feedback'];
    
    for (const table of allowedTables) {
      if (!validTables.includes(table.toLowerCase())) {
        throw new Error(`Table ${table} not allowed`);
      }
    }
    
    return db.execute(sql.raw(query));
  }
  
  static buildSafeWhereClause(filters: Record<string, any>): any {
    const conditions: any[] = [];
    
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null) continue;
      
      if (typeof value === 'string' && QueryValidator.detectSqlInjection(value)) {
        throw new Error(`SQL injection detected in filter: ${key}`);
      }
      
      conditions.push(sql`${sql.raw(key)} = ${value}`);
    }
    
    return conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;
  }
}
