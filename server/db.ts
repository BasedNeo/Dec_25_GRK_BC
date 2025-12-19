import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client:', err);
});

pool.on('connect', () => {
  console.log('[DB] New client connected to database');
});

async function testConnection(retries = 3, delay = 1000): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('[DB] Database connection verified');
      return true;
    } catch (error) {
      console.error(`[DB] Connection attempt ${attempt}/${retries} failed:`, error);
      if (attempt < retries) {
        const backoff = delay * Math.pow(2, attempt - 1);
        console.log(`[DB] Retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }
  }
  console.error('[DB] All connection attempts failed');
  return false;
}

testConnection().catch(console.error);

export const db = drizzle(pool, { schema });
