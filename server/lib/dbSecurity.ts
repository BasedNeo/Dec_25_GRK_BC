import { Pool, PoolConfig } from 'pg';

interface SecurePoolConfig extends PoolConfig {
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  statement_timeout?: number;
  query_timeout?: number;
}

export class SecureDatabaseConnection {
  private static instance: SecureDatabaseConnection;
  private pool: Pool;
  
  private constructor() {
    const config: SecurePoolConfig = {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      statement_timeout: 30000,
      query_timeout: 30000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined,
    };
    
    this.pool = new Pool(config);
    
    this.pool.on('error', (err) => {
      console.error('[DB] Unexpected database error:', err);
    });
    
    this.pool.on('connect', (client) => {
      client.query(`SET statement_timeout = 30000`);
      client.query(`SET idle_in_transaction_session_timeout = 60000`);
    });
  }
  
  static getInstance(): SecureDatabaseConnection {
    if (!SecureDatabaseConnection.instance) {
      SecureDatabaseConnection.instance = new SecureDatabaseConnection();
    }
    return SecureDatabaseConnection.instance;
  }
  
  getPool(): Pool {
    return this.pool;
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT 1 as health');
      return result.rows[0].health === 1;
    } catch (error) {
      console.error('[DB] Health check failed:', error);
      return false;
    }
  }
  
  async getConnectionStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }
}
