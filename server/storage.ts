import { type User, type InsertUser, type InsertFeedback, type Feedback, type InsertPushSubscription, type PushSubscription, users, feedback, pushSubscriptions } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createFeedback(data: InsertFeedback): Promise<Feedback>;
  getAllFeedback(): Promise<Feedback[]>;
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
    return result;
  }

  async getAllFeedback(): Promise<Feedback[]> {
    return db.select().from(feedback).orderBy(feedback.createdAt);
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
}

export const storage = new DatabaseStorage();
