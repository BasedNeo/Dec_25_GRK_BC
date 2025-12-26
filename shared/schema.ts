import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, serial, bigint, uniqueIndex, index } from "drizzle-orm/pg-core";
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
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  proposer: varchar("proposer", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  votesFor: integer("votes_for").notNull().default(0),
  votesAgainst: integer("votes_against").notNull().default(0),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date").notNull(),
  category: varchar("category", { length: 50 }).default("general"),
  requiredQuorum: integer("required_quorum").default(10),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  votesFor: true,
  votesAgainst: true,
  startDate: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;

export const proposalVotes = pgTable("proposal_votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  proposalId: varchar("proposal_id").notNull(),
  walletAddress: text("wallet_address").notNull(),
  selectedOption: varchar("selected_option", { length: 20 }).notNull(),
  votingPower: integer("voting_power").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueVote: uniqueIndex("unique_vote_per_proposal").on(table.proposalId, table.walletAddress),
}));

export const insertVoteSchema = createInsertSchema(proposalVotes).omit({
  id: true,
  createdAt: true,
});

export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof proposalVotes.$inferSelect;

export const gameScores = pgTable("game_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
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

export const featureFlags = pgTable('feature_flags', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 50 }).notNull().unique(),
  enabled: boolean('enabled').notNull().default(true),
  description: varchar('description', { length: 200 }),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: varchar('updated_by', { length: 100 }),
});

export type FeatureFlag = typeof featureFlags.$inferSelect;

export const adminNonces = pgTable('admin_nonces', {
  id: serial('id').primaryKey(),
  walletAddress: text('wallet_address').notNull().unique(),
  nonce: text('nonce').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AdminNonce = typeof adminNonces.$inferSelect;

export const transactionReceipts = pgTable('transaction_receipts', {
  id: serial('id').primaryKey(),
  walletAddress: text('wallet_address').notNull(),
  transactionType: text('transaction_type').notNull(),
  transactionHash: text('transaction_hash').notNull().unique(),
  status: text('status').notNull().default('pending'),
  amount: text('amount'),
  tokenId: integer('token_id'),
  quantity: integer('quantity'),
  pricePerUnit: text('price_per_unit'),
  fromAddress: text('from_address'),
  toAddress: text('to_address'),
  blockNumber: integer('block_number'),
  gasUsed: text('gas_used'),
  gasPrice: text('gas_price'),
  gasCostInBase: text('gas_cost_in_base'),
  gasEstimate: text('gas_estimate'),
  platformFee: text('platform_fee'),
  royaltyFee: text('royalty_fee'),
  netAmount: text('net_amount'),
  metadata: text('metadata'),
  errorMessage: text('error_message'),
  userAgent: text('user_agent'),
  screenResolution: text('screen_resolution'),
  timezone: text('timezone'),
  createdAt: timestamp('created_at').defaultNow(),
  confirmedAt: timestamp('confirmed_at'),
  failedAt: timestamp('failed_at'),
});

export const insertTransactionReceiptSchema = createInsertSchema(transactionReceipts).omit({
  id: true,
  createdAt: true,
  confirmedAt: true,
});

export type InsertTransactionReceipt = z.infer<typeof insertTransactionReceiptSchema>;
export type TransactionReceipt = typeof transactionReceipts.$inferSelect;

export const encryptedStorage = pgTable('encrypted_storage', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  encryptedValue: text('encrypted_value').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
});

export type EncryptedStorageEntry = typeof encryptedStorage.$inferSelect;

export const transactionLogs = pgTable('transaction_logs', {
  id: serial('id').primaryKey(),
  logId: text('log_id').notNull().unique(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  operation: text('operation').notNull(),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  beforeData: text('before_data'),
  afterData: text('after_data'),
  userId: text('user_id'),
  txId: text('tx_id').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export type TransactionLog = typeof transactionLogs.$inferSelect;

export const collections = pgTable('collections', {
  id: serial('id').primaryKey(),
  contractAddress: text('contract_address').notNull().unique(),
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
  description: text('description'),
  bannerImage: text('banner_image'),
  thumbnailImage: text('thumbnail_image'),
  totalSupply: integer('total_supply').default(0),
  floorPrice: text('floor_price').default('0'),
  volumeTraded: text('volume_traded').default('0'),
  isActive: boolean('is_active').default(true),
  isFeatured: boolean('is_featured').default(false),
  royaltyPercent: integer('royalty_percent').default(0),
  royaltyAddress: text('royalty_address'),
  creatorAddress: text('creator_address'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastSyncedAt: timestamp('last_synced_at').defaultNow()
});

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type Collection = typeof collections.$inferSelect;

export const featureGating = pgTable('feature_gating', {
  id: serial('id').primaryKey(),
  featureKey: text('feature_key').notNull().unique(),
  featureName: text('feature_name').notNull(),
  requiresNFT: boolean('requires_nft').default(false),
  requiredCollection: text('required_collection'),
  minimumBalance: integer('minimum_balance').default(1),
  bypassForAdmin: boolean('bypass_for_admin').default(true),
  enabled: boolean('enabled').default(true),
  gateMessage: text('gate_message'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const insertFeatureGatingSchema = createInsertSchema(featureGating).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFeatureGating = z.infer<typeof insertFeatureGatingSchema>;
export type FeatureGating = typeof featureGating.$inferSelect;

// NFT Listings for marketplace search
export const listings = pgTable('listings', {
  id: serial('id').primaryKey(),
  tokenId: integer('token_id').notNull(),
  collectionAddress: text('collection_address').notNull(),
  sellerAddress: text('seller_address').notNull(),
  price: text('price').notNull(),
  isActive: boolean('is_active').default(true),
  listedAt: timestamp('listed_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
  metadata: text('metadata'),
  rarity: varchar('rarity', { length: 20 }),
  traits: text('traits'),
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  listedAt: true,
});

export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listings.$inferSelect;

// Collection Activity for trending and analytics
export const collectionActivity = pgTable('collection_activity', {
  id: serial('id').primaryKey(),
  collectionAddress: text('collection_address').notNull(),
  eventType: varchar('event_type', { length: 20 }).notNull(),
  tokenId: integer('token_id'),
  fromAddress: text('from_address'),
  toAddress: text('to_address'),
  price: text('price'),
  transactionHash: text('transaction_hash'),
  blockNumber: integer('block_number'),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const insertCollectionActivitySchema = createInsertSchema(collectionActivity).omit({
  id: true,
  timestamp: true,
});

export type InsertCollectionActivity = z.infer<typeof insertCollectionActivitySchema>;
export type CollectionActivity = typeof collectionActivity.$inferSelect;

// Search History for personalized suggestions
export const searchHistory = pgTable('search_history', {
  id: serial('id').primaryKey(),
  walletAddress: text('wallet_address'),
  query: text('query').notNull(),
  resultCount: integer('result_count').default(0),
  searchedAt: timestamp('searched_at').defaultNow(),
});

export type SearchHistory = typeof searchHistory.$inferSelect;

// Admin authentication attempts for password protection with lockout
export const adminAuthAttempts = pgTable('admin_auth_attempts', {
  id: serial('id').primaryKey(),
  walletAddress: text('wallet_address').notNull(),
  attemptCount: integer('attempt_count').default(0).notNull(),
  lastAttemptAt: timestamp('last_attempt_at').notNull(),
  lockedUntil: timestamp('locked_until'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AdminAuthAttempt = typeof adminAuthAttempts.$inferSelect;

// ============================================
// RIDDLE QUEST LEADERBOARD & DAILY CHALLENGES
// ============================================

// Riddle Quest Leaderboard - persistent scores per wallet
export const riddleLeaderboard = pgTable('riddle_leaderboard', {
  id: serial('id').primaryKey(),
  walletAddress: text('wallet_address').notNull().unique(),
  totalSolves: integer('total_solves').default(0).notNull(),
  dailySolves: integer('daily_solves').default(0).notNull(),
  bestTimeMs: integer('best_time_ms'),
  totalTimeMs: bigint('total_time_ms', { mode: 'number' }).default(0),
  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  level: integer('level').default(1).notNull(),
  points: integer('points').default(0).notNull(),
  lastActiveAt: timestamp('last_active_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const insertRiddleLeaderboardSchema = createInsertSchema(riddleLeaderboard).omit({
  id: true,
  createdAt: true,
});

export type InsertRiddleLeaderboard = z.infer<typeof insertRiddleLeaderboardSchema>;
export type RiddleLeaderboard = typeof riddleLeaderboard.$inferSelect;

// Daily Riddle Sets - one set generated per UTC day
export const riddleDailySets = pgTable('riddle_daily_sets', {
  id: serial('id').primaryKey(),
  dateKey: varchar('date_key', { length: 10 }).notNull().unique(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  generatedViaOracle: boolean('generated_via_oracle').default(false),
  riddleCount: integer('riddle_count').default(5).notNull(),
});

export const insertRiddleDailySetSchema = createInsertSchema(riddleDailySets).omit({
  id: true,
  generatedAt: true,
});

export type InsertRiddleDailySet = z.infer<typeof insertRiddleDailySetSchema>;
export type RiddleDailySet = typeof riddleDailySets.$inferSelect;

// Daily Riddle Entries - individual riddles within a daily set
export const riddleDailyEntries = pgTable('riddle_daily_entries', {
  id: serial('id').primaryKey(),
  setId: integer('set_id').notNull(),
  riddleIndex: integer('riddle_index').notNull(),
  question: text('question').notNull(),
  answers: text('answers').notNull(),
  hint: text('hint'),
  difficulty: varchar('difficulty', { length: 10 }).default('medium'),
  theme: varchar('theme', { length: 50 }),
  isOracle: boolean('is_oracle').default(false),
});

export const insertRiddleDailyEntrySchema = createInsertSchema(riddleDailyEntries).omit({
  id: true,
});

export type InsertRiddleDailyEntry = z.infer<typeof insertRiddleDailyEntrySchema>;
export type RiddleDailyEntry = typeof riddleDailyEntries.$inferSelect;

// Riddle Attempts - track each user's solve attempts
export const riddleAttempts = pgTable('riddle_attempts', {
  id: serial('id').primaryKey(),
  walletAddress: text('wallet_address').notNull(),
  riddleEntryId: integer('riddle_entry_id').notNull(),
  dateKey: varchar('date_key', { length: 10 }).notNull(),
  attemptCount: integer('attempt_count').default(1).notNull(),
  solved: boolean('solved').default(false),
  solveTimeMs: integer('solve_time_ms'),
  pointsEarned: integer('points_earned').default(0),
  attemptedAt: timestamp('attempted_at').defaultNow().notNull(),
  solvedAt: timestamp('solved_at'),
});

export const insertRiddleAttemptSchema = createInsertSchema(riddleAttempts).omit({
  id: true,
  attemptedAt: true,
});

export type InsertRiddleAttempt = z.infer<typeof insertRiddleAttemptSchema>;
export type RiddleAttempt = typeof riddleAttempts.$inferSelect;

// Creature Command Progress - stores player ability levels and points
export const creatureProgress = pgTable('creature_progress', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text('wallet_address').notNull().unique(),
  totalPoints: integer('total_points').default(0).notNull(),
  piercingLevel: integer('piercing_level').default(0).notNull(),
  shieldLevel: integer('shield_level').default(0).notNull(),
  rapidFireLevel: integer('rapid_fire_level').default(0).notNull(),
  explosiveLevel: integer('explosive_level').default(0).notNull(),
  slowFieldLevel: integer('slow_field_level').default(0).notNull(),
  multiBubbleLevel: integer('multi_bubble_level').default(0).notNull(),
  regenBurstLevel: integer('regen_burst_level').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertCreatureProgressSchema = createInsertSchema(creatureProgress).omit({
  id: true,
  updatedAt: true,
});

export type InsertCreatureProgress = z.infer<typeof insertCreatureProgressSchema>;
export type CreatureProgress = typeof creatureProgress.$inferSelect;

// Daily Challenges - tracks daily survival challenges per wallet
export const dailyChallenges = pgTable('daily_challenges', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text('wallet_address').notNull(),
  dateKey: varchar('date_key', { length: 10 }).notNull(),
  survivesCount: integer('survives_count').default(0).notNull(),
  challengeCompleted: boolean('challenge_completed').default(false),
  pointsAwarded: integer('points_awarded').default(0).notNull(),
  highestStage: integer('highest_stage').default(1).notNull(),
  highestWave: integer('highest_wave').default(1).notNull(),
  gamesPlayed: integer('games_played').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('daily_challenges_wallet_date_idx').on(table.walletAddress, table.dateKey),
]);

export const insertDailyChallengeSchema = createInsertSchema(dailyChallenges).omit({
  id: true,
  updatedAt: true,
});

export type InsertDailyChallenge = z.infer<typeof insertDailyChallengeSchema>;
export type DailyChallenge = typeof dailyChallenges.$inferSelect;

// BrainX Points - tracks locked points with 1-year mock lock, 500/day cap
export const brainXPoints = pgTable('brainx_points', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text('wallet_address').notNull(),
  totalPoints: integer('total_points').default(0).notNull(),
  lockedPoints: integer('locked_points').default(0).notNull(),
  unlockedPoints: integer('unlocked_points').default(0).notNull(),
  pointsEarnedToday: integer('points_earned_today').default(0).notNull(),
  lastEarnedDate: varchar('last_earned_date', { length: 10 }),
  lockExpiresAt: timestamp('lock_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('brainx_points_wallet_idx').on(table.walletAddress),
]);

export const insertBrainXPointsSchema = createInsertSchema(brainXPoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBrainXPoints = z.infer<typeof insertBrainXPointsSchema>;
export type BrainXPoints = typeof brainXPoints.$inferSelect;

// Game Points - per-game tracking with daily caps and brainX vesting
export const gamePoints = pgTable('game_points', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text('wallet_address').notNull(),
  game: varchar('game', { length: 50 }).notNull(),
  earned: integer('earned').default(0).notNull(),
  vested: integer('vested').default(0).notNull(),
  dailyEarned: integer('daily_earned').default(0).notNull(),
  weeklyEarned: integer('weekly_earned').default(0).notNull(),
  dailyCap: integer('daily_cap').default(500).notNull(),
  weeklyCap: integer('weekly_cap').default(3500).notNull(),
  lastDailyReset: varchar('last_daily_reset', { length: 10 }),
  lastWeeklyReset: varchar('last_weekly_reset', { length: 10 }),
  vestingLockEnd: timestamp('vesting_lock_end'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('game_points_wallet_game_idx').on(table.walletAddress, table.game),
]);

export const insertGamePointsSchema = createInsertSchema(gamePoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGamePoints = z.infer<typeof insertGamePointsSchema>;
export type GamePoints = typeof gamePoints.$inferSelect;

// Unified Points Summary - aggregate view for quick lookups
export const pointsSummary = pgTable('points_summary', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text('wallet_address').notNull().unique(),
  totalEarned: integer('total_earned').default(0).notNull(),
  totalVested: integer('total_vested').default(0).notNull(),
  brainXLocked: integer('brainx_locked').default(0).notNull(),
  brainXUnlocked: integer('brainx_unlocked').default(0).notNull(),
  dailyEarnedTotal: integer('daily_earned_total').default(0).notNull(),
  globalDailyCap: integer('global_daily_cap').default(500).notNull(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  vestingStartDate: timestamp('vesting_start_date'),
  vestingEndDate: timestamp('vesting_end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const insertPointsSummarySchema = createInsertSchema(pointsSummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPointsSummary = z.infer<typeof insertPointsSummarySchema>;
export type PointsSummary = typeof pointsSummary.$inferSelect;

// Points Vesting History - append-only ledger of vesting transactions
export const pointsVesting = pgTable('points_vesting', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text('wallet_address').notNull(),
  pointsEarned: integer('points_earned').notNull(),
  pointsVested: integer('points_vested').notNull(),
  brainXConverted: integer('brainx_converted').default(0).notNull(),
  vestingType: varchar('vesting_type', { length: 20 }).default('manual').notNull(), // 'manual' | 'auto' | 'snapshot'
  vestedAt: timestamp('vested_at').defaultNow().notNull(),
  lockExpiresAt: timestamp('lock_expires_at'),
  txHash: varchar('tx_hash', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('points_vesting_wallet_idx').on(table.walletAddress),
  index('points_vesting_date_idx').on(table.vestedAt),
]);

export const insertPointsVestingSchema = createInsertSchema(pointsVesting).omit({
  id: true,
  createdAt: true,
});

export type InsertPointsVesting = z.infer<typeof insertPointsVestingSchema>;
export type PointsVesting = typeof pointsVesting.$inferSelect;

// Points Snapshots - daily backup records for data integrity
export const pointsSnapshots = pgTable('points_snapshots', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  snapshotDate: varchar('snapshot_date', { length: 10 }).notNull().unique(), // YYYY-MM-DD format
  totalWallets: integer('total_wallets').default(0).notNull(),
  totalPointsEarned: integer('total_points_earned').default(0).notNull(),
  totalPointsVested: integer('total_points_vested').default(0).notNull(),
  totalBrainXLocked: integer('total_brainx_locked').default(0).notNull(),
  fileLocation: text('file_location'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const insertPointsSnapshotSchema = createInsertSchema(pointsSnapshots).omit({
  id: true,
  createdAt: true,
});

export type InsertPointsSnapshot = z.infer<typeof insertPointsSnapshotSchema>;
export type PointsSnapshot = typeof pointsSnapshots.$inferSelect;
