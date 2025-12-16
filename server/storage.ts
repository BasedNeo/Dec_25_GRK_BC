import { type User, type InsertUser, type InsertFeedback, type Feedback, type InsertStory, type Story, type InsertPushSubscription, type PushSubscription, type InsertEmail, type EmailEntry, users, feedback, storySubmissions, pushSubscriptions, emailList } from "@shared/schema";
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
}

export const storage = new DatabaseStorage();
