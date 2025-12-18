import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, serial, bigint } from "drizzle-orm/pg-core";
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

export const guardianProfiles = pgTable("guardian_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  customName: varchar("custom_name", { length: 20 }),
  lastLogin: timestamp("last_login").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGuardianProfileSchema = createInsertSchema(guardianProfiles).omit({
  id: true,
  createdAt: true,
});

export type InsertGuardianProfile = z.infer<typeof insertGuardianProfileSchema>;
export type GuardianProfile = typeof guardianProfiles.$inferSelect;

export const diamondHandsStats = pgTable("diamond_hands_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  customName: varchar("custom_name", { length: 20 }),
  daysHolding: integer("days_holding").default(0).notNull(),
  retentionRate: integer("retention_rate").default(0).notNull(),
  currentHolding: integer("current_holding").default(0).notNull(),
  totalAcquired: integer("total_acquired").default(0).notNull(),
  totalSold: integer("total_sold").default(0).notNull(),
  level: integer("level").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDiamondHandsStatsSchema = createInsertSchema(diamondHandsStats).omit({
  id: true,
  updatedAt: true,
});

export type InsertDiamondHandsStats = z.infer<typeof insertDiamondHandsStatsSchema>;
export type DiamondHandsStats = typeof diamondHandsStats.$inferSelect;

export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull().default("Community"),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c"),
  optionD: text("option_d"),
  status: varchar("status", { length: 20 }).notNull().default("review"),
  createdBy: text("created_by").notNull(),
  expirationDays: integer("expiration_days").default(7).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
  publishedAt: true,
});

export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;

export const proposalVotes = pgTable("proposal_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proposalId: varchar("proposal_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  selectedOption: varchar("selected_option", { length: 1 }).notNull(),
  votingPower: integer("voting_power").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProposalVoteSchema = createInsertSchema(proposalVotes).omit({
  id: true,
  createdAt: true,
});

export type InsertProposalVote = z.infer<typeof insertProposalVoteSchema>;
export type ProposalVote = typeof proposalVotes.$inferSelect;

export const gameScores = pgTable("game_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  customName: varchar("custom_name", { length: 20 }),
  score: integer("score").notNull().default(0),
  level: integer("level").notNull().default(1),
  lifetimeScore: integer("lifetime_score").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  highScore: integer("high_score").notNull().default(0),
  rank: varchar("rank", { length: 20 }).notNull().default("Cadet"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGameScoreSchema = createInsertSchema(gameScores).omit({
  id: true,
  updatedAt: true,
});

export type InsertGameScore = z.infer<typeof insertGameScoreSchema>;
export type GameScore = typeof gameScores.$inferSelect;

// Analytics Events Table
export const analyticsEvents = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  event: varchar('event', { length: 100 }).notNull(),
  properties: text('properties'),
  sessionId: varchar('session_id', { length: 100 }).notNull(),
  userId: varchar('user_id', { length: 100 }),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

// Analytics Aggregates Table
export const analyticsAggregates = pgTable('analytics_aggregates', {
  id: serial('id').primaryKey(),
  event: varchar('event', { length: 100 }).notNull(),
  date: varchar('date', { length: 10 }).notNull(),
  count: integer('count').notNull().default(0),
  totalValue: integer('total_value').default(0),
  uniqueUsers: integer('unique_users').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AnalyticsAggregate = typeof analyticsAggregates.$inferSelect;
