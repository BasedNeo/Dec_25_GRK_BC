import { type User, type InsertUser, type InsertFeedback, type Feedback, type InsertStory, type Story, type InsertPushSubscription, type PushSubscription, type InsertEmail, type EmailEntry, type GuardianProfile, type DiamondHandsStats, type InsertDiamondHandsStats, users, feedback, storySubmissions, pushSubscriptions, emailList, guardianProfiles, diamondHandsStats } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, desc, sql, count } from "drizzle-orm";

const MAX_MESSAGES_PER_INBOX = 100;
const MAX_EMAILS = 4000;

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createFeedback(data: InsertFeedback): Promise<Feedback>;
  getAllFeedback(): Promise<Feedback[]>;
  purgeFeedback(): Promise<number>;
  createStorySubmission(data: InsertStory): Promise<Story>;
  getAllStorySubmissions(): Promise<Story[]>;
  purgeStorySubmissions(): Promise<number>;
  createPushSubscription(data: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined>;
  getPushSubscriptionsByWallet(walletAddress: string): Promise<PushSubscription[]>;
  getAllPushSubscriptions(): Promise<PushSubscription[]>;
  deletePushSubscription(endpoint: string): Promise<void>;
  updatePushSubscriptionPreferences(endpoint: string, preferences: { notifyListings?: boolean; notifyOffers?: boolean; notifySales?: boolean }): Promise<PushSubscription | undefined>;
  addEmail(email: string, source: string): Promise<EmailEntry | null>;
  getAllEmails(): Promise<EmailEntry[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createFeedback(data: InsertFeedback): Promise<Feedback> {
    const [result] = await db.insert(feedback).values(data).returning();
    await this.purgeFeedback();
    return result;
  }

  async getAllFeedback(): Promise<Feedback[]> {
    return db.select().from(feedback).orderBy(desc(feedback.createdAt)).limit(MAX_MESSAGES_PER_INBOX);
  }

  async purgeFeedback(): Promise<number> {
    const all = await db.select({ id: feedback.id }).from(feedback).orderBy(desc(feedback.createdAt));
    if (all.length <= MAX_MESSAGES_PER_INBOX) return 0;
    const toDelete = all.slice(MAX_MESSAGES_PER_INBOX).map(f => f.id);
    for (const id of toDelete) {
      await db.delete(feedback).where(eq(feedback.id, id));
    }
    return toDelete.length;
  }

  async createStorySubmission(data: InsertStory): Promise<Story> {
    const [result] = await db.insert(storySubmissions).values(data).returning();
    await this.purgeStorySubmissions();
    return result;
  }

  async getAllStorySubmissions(): Promise<Story[]> {
    return db.select().from(storySubmissions).orderBy(desc(storySubmissions.createdAt)).limit(MAX_MESSAGES_PER_INBOX);
  }

  async purgeStorySubmissions(): Promise<number> {
    const all = await db.select({ id: storySubmissions.id }).from(storySubmissions).orderBy(desc(storySubmissions.createdAt));
    if (all.length <= MAX_MESSAGES_PER_INBOX) return 0;
    const toDelete = all.slice(MAX_MESSAGES_PER_INBOX).map(s => s.id);
    for (const id of toDelete) {
      await db.delete(storySubmissions).where(eq(storySubmissions.id, id));
    }
    return toDelete.length;
  }

  async createPushSubscription(data: InsertPushSubscription): Promise<PushSubscription> {
    const existing = await this.getPushSubscriptionByEndpoint(data.endpoint);
    if (existing) {
      const [updated] = await db
        .update(pushSubscriptions)
        .set({ walletAddress: data.walletAddress, p256dh: data.p256dh, auth: data.auth })
        .where(eq(pushSubscriptions.endpoint, data.endpoint))
        .returning();
      return updated;
    }
    const [result] = await db.insert(pushSubscriptions).values(data).returning();
    return result;
  }

  async getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined> {
    const [sub] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    return sub;
  }

  async getPushSubscriptionsByWallet(walletAddress: string): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.walletAddress, walletAddress.toLowerCase()));
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return db.select().from(pushSubscriptions);
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async updatePushSubscriptionPreferences(endpoint: string, preferences: { notifyListings?: boolean; notifyOffers?: boolean; notifySales?: boolean }): Promise<PushSubscription | undefined> {
    const [updated] = await db
      .update(pushSubscriptions)
      .set(preferences)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .returning();
    return updated;
  }

  async addEmail(email: string, source: string): Promise<EmailEntry | null> {
    const [countResult] = await db.select({ count: count() }).from(emailList);
    if (countResult.count >= MAX_EMAILS) {
      console.log(`[EmailList] Max limit of ${MAX_EMAILS} emails reached. Not adding new email.`);
      return null;
    }
    
    try {
      const [result] = await db.insert(emailList).values({ email: email.toLowerCase().trim(), source }).returning();
      return result;
    } catch (e: any) {
      if (e.code === '23505') {
        console.log(`[EmailList] Email already exists: ${email}`);
        return null;
      }
      throw e;
    }
  }

  async getAllEmails(): Promise<EmailEntry[]> {
    return db.select().from(emailList).orderBy(desc(emailList.createdAt));
  }

  async getEmailCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(emailList);
    return result.count;
  }

  async getGuardianProfile(walletAddress: string): Promise<GuardianProfile | undefined> {
    const [profile] = await db.select().from(guardianProfiles).where(eq(guardianProfiles.walletAddress, walletAddress.toLowerCase()));
    return profile;
  }

  async getOrCreateGuardianProfile(walletAddress: string): Promise<{ profile: GuardianProfile; isNew: boolean; hoursSinceLastLogin: number }> {
    const addr = walletAddress.toLowerCase();
    let profile = await this.getGuardianProfile(addr);
    
    if (!profile) {
      const [newProfile] = await db.insert(guardianProfiles).values({
        walletAddress: addr,
        lastLogin: new Date(),
      }).returning();
      return { profile: newProfile, isNew: true, hoursSinceLastLogin: 0 };
    }
    
    const hoursSinceLastLogin = (Date.now() - new Date(profile.lastLogin).getTime()) / (1000 * 60 * 60);
    
    const [updated] = await db.update(guardianProfiles)
      .set({ lastLogin: new Date() })
      .where(eq(guardianProfiles.walletAddress, addr))
      .returning();
    
    return { profile: updated, isNew: false, hoursSinceLastLogin };
  }

  async setCustomName(walletAddress: string, customName: string | null): Promise<GuardianProfile | null> {
    const addr = walletAddress.toLowerCase();
    
    if (customName) {
      const cleanName = customName.trim().slice(0, 16);
      if (cleanName.length < 2) return null;
      
      const existing = await db.select().from(guardianProfiles)
        .where(eq(guardianProfiles.customName, cleanName));
      if (existing.length > 0 && existing[0].walletAddress !== addr) {
        return null;
      }
    }
    
    const [updated] = await db.update(guardianProfiles)
      .set({ customName: customName ? customName.trim().slice(0, 16) : null })
      .where(eq(guardianProfiles.walletAddress, addr))
      .returning();
    
    return updated || null;
  }

  async isNameTaken(customName: string, excludeWallet?: string): Promise<boolean> {
    const cleanName = customName.trim();
    const results = await db.select().from(guardianProfiles)
      .where(eq(guardianProfiles.customName, cleanName));
    
    if (results.length === 0) return false;
    if (excludeWallet && results[0].walletAddress === excludeWallet.toLowerCase()) return false;
    return true;
  }

  async upsertDiamondHandsStats(data: InsertDiamondHandsStats): Promise<DiamondHandsStats> {
    const addr = data.walletAddress.toLowerCase();
    const existing = await db.select().from(diamondHandsStats)
      .where(eq(diamondHandsStats.walletAddress, addr));
    
    if (existing.length > 0) {
      const [updated] = await db.update(diamondHandsStats)
        .set({
          customName: data.customName,
          daysHolding: data.daysHolding,
          retentionRate: data.retentionRate,
          currentHolding: data.currentHolding,
          totalAcquired: data.totalAcquired,
          totalSold: data.totalSold,
          level: data.level,
          updatedAt: new Date(),
        })
        .where(eq(diamondHandsStats.walletAddress, addr))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(diamondHandsStats).values({
      ...data,
      walletAddress: addr,
    }).returning();
    return created;
  }

  async getDiamondHandsLeaderboard(limit: number = 20): Promise<DiamondHandsStats[]> {
    return db.select().from(diamondHandsStats)
      .where(sql`${diamondHandsStats.currentHolding} > 0`)
      .orderBy(desc(diamondHandsStats.level), desc(diamondHandsStats.daysHolding), desc(diamondHandsStats.retentionRate))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
