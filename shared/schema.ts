import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  message: text("message").notNull(),
  email: text("email"),
  walletAddress: text("wallet_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  emailSent: boolean("email_sent").default(false),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  emailSent: true,
});

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

export const storySubmissions = pgTable("story_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorName: text("author_name"),
  walletAddress: text("wallet_address"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewed: boolean("reviewed").default(false),
});

export const insertStorySchema = createInsertSchema(storySubmissions).omit({
  id: true,
  createdAt: true,
  reviewed: true,
});

export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof storySubmissions.$inferSelect;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  notifyListings: boolean("notify_listings").default(true),
  notifyOffers: boolean("notify_offers").default(true),
  notifySales: boolean("notify_sales").default(true),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

export const emailList = pgTable("email_list", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  source: text("source").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmailSchema = createInsertSchema(emailList).omit({
  id: true,
  createdAt: true,
});

export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type EmailEntry = typeof emailList.$inferSelect;
