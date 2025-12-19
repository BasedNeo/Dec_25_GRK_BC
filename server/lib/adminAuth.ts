import { db } from '../db';
import { adminAuthAttempts } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const CORRECT_PASSWORD = '97086';
const MAX_ATTEMPTS = 4;
const LOCKOUT_DAYS = 30;

export class AdminAuthService {
  static async checkIfLocked(walletAddress: string): Promise<{
    isLocked: boolean;
    lockedUntil?: Date;
    remainingAttempts?: number;
  }> {
    const normalizedAddress = walletAddress.toLowerCase();
    
    const records = await db
      .select()
      .from(adminAuthAttempts)
      .where(eq(adminAuthAttempts.walletAddress, normalizedAddress))
      .limit(1);
    
    if (records.length === 0) {
      return { isLocked: false, remainingAttempts: MAX_ATTEMPTS };
    }
    
    const record = records[0];
    
    if (record.lockedUntil && record.lockedUntil > new Date()) {
      return {
        isLocked: true,
        lockedUntil: record.lockedUntil,
      };
    }
    
    if (record.lockedUntil && record.lockedUntil <= new Date()) {
      await db
        .update(adminAuthAttempts)
        .set({
          attemptCount: 0,
          lockedUntil: null,
          lastAttemptAt: new Date(),
        })
        .where(eq(adminAuthAttempts.walletAddress, normalizedAddress));
      
      return { isLocked: false, remainingAttempts: MAX_ATTEMPTS };
    }
    
    const remainingAttempts = MAX_ATTEMPTS - record.attemptCount;
    return { isLocked: false, remainingAttempts: Math.max(0, remainingAttempts) };
  }
  
  static async verifyPassword(
    walletAddress: string,
    password: string
  ): Promise<{
    success: boolean;
    message: string;
    remainingAttempts?: number;
    lockedUntil?: Date;
  }> {
    const normalizedAddress = walletAddress.toLowerCase();
    
    const lockStatus = await this.checkIfLocked(normalizedAddress);
    if (lockStatus.isLocked) {
      return {
        success: false,
        message: `Access locked until ${lockStatus.lockedUntil?.toLocaleString()}`,
        lockedUntil: lockStatus.lockedUntil,
      };
    }
    
    if (password === CORRECT_PASSWORD) {
      await db
        .delete(adminAuthAttempts)
        .where(eq(adminAuthAttempts.walletAddress, normalizedAddress));
      
      return {
        success: true,
        message: 'Access granted',
      };
    }
    
    const records = await db
      .select()
      .from(adminAuthAttempts)
      .where(eq(adminAuthAttempts.walletAddress, normalizedAddress))
      .limit(1);
    
    let newAttemptCount = 1;
    
    if (records.length === 0) {
      await db.insert(adminAuthAttempts).values({
        walletAddress: normalizedAddress,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        lockedUntil: null,
      });
    } else {
      newAttemptCount = records[0].attemptCount + 1;
      
      if (newAttemptCount >= MAX_ATTEMPTS) {
        const lockoutDate = new Date();
        lockoutDate.setDate(lockoutDate.getDate() + LOCKOUT_DAYS);
        
        await db
          .update(adminAuthAttempts)
          .set({
            attemptCount: newAttemptCount,
            lastAttemptAt: new Date(),
            lockedUntil: lockoutDate,
          })
          .where(eq(adminAuthAttempts.walletAddress, normalizedAddress));
        
        return {
          success: false,
          message: `Too many failed attempts. Access locked for ${LOCKOUT_DAYS} days.`,
          remainingAttempts: 0,
          lockedUntil: lockoutDate,
        };
      } else {
        await db
          .update(adminAuthAttempts)
          .set({
            attemptCount: newAttemptCount,
            lastAttemptAt: new Date(),
          })
          .where(eq(adminAuthAttempts.walletAddress, normalizedAddress));
      }
    }
    
    const remaining = MAX_ATTEMPTS - newAttemptCount;
    return {
      success: false,
      message: `Incorrect password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      remainingAttempts: remaining,
    };
  }
  
  static async getAllLockedWallets() {
    const now = new Date();
    const locked = await db
      .select()
      .from(adminAuthAttempts)
      .where(eq(adminAuthAttempts.attemptCount, MAX_ATTEMPTS));
    
    return locked.filter(record => 
      record.lockedUntil && record.lockedUntil > now
    );
  }
}
