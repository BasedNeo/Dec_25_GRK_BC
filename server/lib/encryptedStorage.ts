import { EncryptionService } from './encryption';
import { db } from '../db';
import { sql } from 'drizzle-orm';

interface EncryptedData {
  id: string;
  key: string;
  encryptedValue: string;
  createdAt: Date;
  expiresAt?: Date;
}

export class EncryptedStorageService {
  private static cache: Map<string, { value: string; expiresAt?: number }> = new Map();
  
  static async store(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const encrypted = EncryptionService.encrypt(JSON.stringify(value));
    const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
    
    await db.execute(sql`
      INSERT INTO encrypted_storage (key, encrypted_value, expires_at)
      VALUES (${key}, ${encrypted}, ${expiresAt})
      ON CONFLICT (key) 
      DO UPDATE SET encrypted_value = ${encrypted}, expires_at = ${expiresAt}, updated_at = NOW()
    `);
    
    if (ttlSeconds) {
      this.cache.set(key, {
        value: encrypted,
        expiresAt: Date.now() + ttlSeconds * 1000
      });
    }
  }
  
  static async retrieve(key: string): Promise<any | null> {
    const cached = this.cache.get(key);
    if (cached) {
      if (cached.expiresAt && Date.now() > cached.expiresAt) {
        this.cache.delete(key);
      } else {
        return JSON.parse(EncryptionService.decrypt(cached.value));
      }
    }
    
    const result = await db.execute(sql`
      SELECT encrypted_value, expires_at 
      FROM encrypted_storage 
      WHERE key = ${key}
    `);
    
    if (!result.rows || result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0] as any;
    
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      await this.delete(key);
      return null;
    }
    
    const decrypted = EncryptionService.decrypt(row.encrypted_value);
    return JSON.parse(decrypted);
  }
  
  static async delete(key: string): Promise<void> {
    this.cache.delete(key);
    await db.execute(sql`DELETE FROM encrypted_storage WHERE key = ${key}`);
  }
  
  static async cleanup(): Promise<number> {
    const result = await db.execute(sql`
      DELETE FROM encrypted_storage 
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
    `);
    
    return result.rowCount || 0;
  }
}

setInterval(() => {
  EncryptedStorageService.cleanup().then(count => {
    if (count > 0) {
      console.log(`[ENCRYPTED_STORAGE] Cleaned up ${count} expired entries`);
    }
  });
}, 5 * 60 * 1000);
