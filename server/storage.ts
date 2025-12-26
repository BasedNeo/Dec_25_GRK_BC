import { type User, type InsertUser, type InsertFeedback, type Feedback, type InsertStory, type Story, type InsertPushSubscription, type PushSubscription, type InsertEmail, type EmailEntry, type GuardianProfile, type DiamondHandsStats, type InsertDiamondHandsStats, type Proposal, type InsertProposal, type Vote, type InsertVote, type GameScore, type InsertGameScore, type FeatureFlag, type AdminNonce, type TransactionReceipt, type InsertTransactionReceipt, type RiddleLeaderboard, type InsertRiddleLeaderboard, type RiddleDailySet, type InsertRiddleDailySet, type RiddleDailyEntry, type InsertRiddleDailyEntry, type RiddleAttempt, type InsertRiddleAttempt, type CreatureProgress, type InsertCreatureProgress, type DailyChallenge, type InsertDailyChallenge, users, feedback, storySubmissions, pushSubscriptions, emailList, guardianProfiles, diamondHandsStats, proposals, proposalVotes, gameScores, featureFlags, adminNonces, transactionReceipts, riddleLeaderboard, riddleDailySets, riddleDailyEntries, riddleAttempts, creatureProgress, dailyChallenges } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, desc, sql, count, ne, gte, lte } from "drizzle-orm";

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
  getFeatureFlags(): Promise<FeatureFlag[]>;
  updateFeatureFlag(key: string, enabled: boolean, updatedBy: string): Promise<boolean>;
  getFeatureFlag(key: string): Promise<boolean>;
  createAdminNonce(walletAddress: string, nonce: string, expiresAt: Date): Promise<AdminNonce>;
  getAdminNonce(walletAddress: string): Promise<AdminNonce | undefined>;
  deleteAdminNonce(walletAddress: string): Promise<void>;
  cleanupExpiredNonces(): Promise<void>;
  
  // Riddle Quest Leaderboard
  getRiddleLeaderboard(limit?: number): Promise<RiddleLeaderboard[]>;
  getRiddleLeaderboardEntry(walletAddress: string): Promise<RiddleLeaderboard | undefined>;
  upsertRiddleLeaderboardEntry(data: InsertRiddleLeaderboard): Promise<RiddleLeaderboard>;
  updateRiddleLeaderboardStats(walletAddress: string, points: number, solved: boolean, timeMs?: number): Promise<RiddleLeaderboard | undefined>;
  
  // Daily Challenges
  getDailySet(dateKey: string): Promise<RiddleDailySet | undefined>;
  createDailySet(data: InsertRiddleDailySet): Promise<RiddleDailySet>;
  getDailyEntries(setId: number): Promise<RiddleDailyEntry[]>;
  createDailyEntry(data: InsertRiddleDailyEntry): Promise<RiddleDailyEntry>;
  
  // Riddle Attempts
  getRiddleAttempt(walletAddress: string, riddleEntryId: number): Promise<RiddleAttempt | undefined>;
  createRiddleAttempt(data: InsertRiddleAttempt): Promise<RiddleAttempt>;
  updateRiddleAttempt(id: number, solved: boolean, solveTimeMs: number, pointsEarned: number): Promise<RiddleAttempt | undefined>;
  getUserDailyProgress(walletAddress: string, dateKey: string): Promise<RiddleAttempt[]>;
  
  // Creature Command Progress
  getCreatureProgress(walletAddress: string): Promise<CreatureProgress | undefined>;
  upsertCreatureProgress(data: InsertCreatureProgress): Promise<CreatureProgress>;
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

  async createProposal(data: {
    title: string;
    description: string;
    proposer: string;
    endDate: Date;
    category?: string;
    requiredQuorum?: number;
  }): Promise<Proposal> {
    const [proposal] = await db.insert(proposals).values({
      title: data.title,
      description: data.description,
      proposer: data.proposer,
      endDate: data.endDate,
      category: data.category || 'general',
      requiredQuorum: data.requiredQuorum || 10,
      status: 'active',
    }).returning();
    return proposal;
  }

  async getActiveProposals(): Promise<Proposal[]> {
    return db.select().from(proposals)
      .where(eq(proposals.status, 'active'))
      .orderBy(desc(proposals.createdAt));
  }

  async getProposalById(id: string): Promise<Proposal | undefined> {
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id));
    return proposal;
  }

  async getAllProposals(): Promise<Proposal[]> {
    return db.select().from(proposals).orderBy(desc(proposals.createdAt));
  }

  async deleteProposal(id: string): Promise<boolean> {
    try {
      await db.delete(proposalVotes).where(eq(proposalVotes.proposalId, id));
      await db.delete(proposals).where(eq(proposals.id, id));
      return true;
    } catch {
      return false;
    }
  }

  async castVote(proposalId: string, voter: string, voteType: 'for' | 'against', votingPower: number = 1): Promise<boolean> {
    try {
      const existingVote = await db.select().from(proposalVotes)
        .where(and(eq(proposalVotes.proposalId, proposalId), eq(proposalVotes.walletAddress, voter.toLowerCase())));

      if (existingVote.length > 0) {
        await db.delete(proposalVotes)
          .where(and(eq(proposalVotes.proposalId, proposalId), eq(proposalVotes.walletAddress, voter.toLowerCase())));
        
        const proposal = await this.getProposalById(proposalId);
        if (proposal) {
          if (existingVote[0].selectedOption === 'for') {
            await db.update(proposals).set({ votesFor: proposal.votesFor - existingVote[0].votingPower, updatedAt: new Date() }).where(eq(proposals.id, proposalId));
          } else {
            await db.update(proposals).set({ votesAgainst: proposal.votesAgainst - existingVote[0].votingPower, updatedAt: new Date() }).where(eq(proposals.id, proposalId));
          }
        }
      }

      await db.insert(proposalVotes).values({
        proposalId,
        walletAddress: voter.toLowerCase(),
        selectedOption: voteType,
        votingPower,
      });

      const proposal = await this.getProposalById(proposalId);
      if (proposal) {
        if (voteType === 'for') {
          await db.update(proposals).set({ votesFor: proposal.votesFor + votingPower, updatedAt: new Date() }).where(eq(proposals.id, proposalId));
        } else {
          await db.update(proposals).set({ votesAgainst: proposal.votesAgainst + votingPower, updatedAt: new Date() }).where(eq(proposals.id, proposalId));
        }
      }

      return true;
    } catch (error) {
      console.error('[Storage] Error casting vote:', error);
      return false;
    }
  }

  async getUserVote(proposalId: string, voter: string): Promise<string | null> {
    const [vote] = await db.select().from(proposalVotes)
      .where(and(eq(proposalVotes.proposalId, proposalId), eq(proposalVotes.walletAddress, voter.toLowerCase())));
    return vote?.selectedOption || null;
  }

  async getProposalVotes(proposalId: string): Promise<Vote[]> {
    return db.select().from(proposalVotes)
      .where(eq(proposalVotes.proposalId, proposalId))
      .orderBy(desc(proposalVotes.createdAt));
  }

  async submitGameScore(walletAddress: string, score: number, level: number, customName?: string): Promise<GameScore> {
    const addr = walletAddress.toLowerCase();
    const existing = await db.select().from(gameScores).where(eq(gameScores.walletAddress, addr));
    
    const ranks = [
      { threshold: 0, title: 'Cadet' },
      { threshold: 1000, title: 'Pilot' },
      { threshold: 5000, title: 'Void Walker' },
      { threshold: 15000, title: 'Star Commander' },
      { threshold: 50000, title: 'Fleet Admiral' },
      { threshold: 100000, title: 'Based Eternal' },
    ];
    
    const getRank = (totalScore: number): string => {
      for (let i = ranks.length - 1; i >= 0; i--) {
        if (totalScore >= ranks[i].threshold) return ranks[i].title;
      }
      return 'Cadet';
    };
    
    if (existing.length > 0) {
      const current = existing[0];
      const newLifetime = current.lifetimeScore + score;
      const newHighScore = Math.max(current.highScore, score);
      const newRank = getRank(newLifetime);
      
      const [updated] = await db.update(gameScores)
        .set({
          score,
          level,
          lifetimeScore: newLifetime,
          gamesPlayed: current.gamesPlayed + 1,
          highScore: newHighScore,
          rank: newRank,
          customName: customName || current.customName,
          updatedAt: new Date(),
        })
        .where(eq(gameScores.walletAddress, addr))
        .returning();
      return updated;
    }
    
    const newRank = getRank(score);
    const [created] = await db.insert(gameScores).values({
      walletAddress: addr,
      score,
      level,
      lifetimeScore: score,
      gamesPlayed: 1,
      highScore: score,
      rank: newRank,
      customName,
    }).returning();
    return created;
  }

  async getGameLeaderboard(limit: number = 20): Promise<GameScore[]> {
    return db.select().from(gameScores)
      .orderBy(desc(gameScores.lifetimeScore))
      .limit(limit);
  }

  async getPlayerGameStats(walletAddress: string): Promise<GameScore | undefined> {
    const [result] = await db.select().from(gameScores)
      .where(eq(gameScores.walletAddress, walletAddress.toLowerCase()));
    return result;
  }

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    const flags = await db.select().from(featureFlags);
    if (flags.length === 0) {
      const defaultFlags = [
        { key: 'mintingEnabled', enabled: true, description: 'Allow users to mint NFTs' },
        { key: 'marketplaceEnabled', enabled: true, description: 'Allow buying/selling NFTs' },
        { key: 'offersEnabled', enabled: true, description: 'Allow making offers on NFTs' },
        { key: 'gameEnabled', enabled: true, description: 'Allow playing Guardian Defender game' },
        { key: 'customNamesEnabled', enabled: true, description: 'Allow setting custom Guardian names' },
        { key: 'votingEnabled', enabled: true, description: 'Allow voting on proposals' },
        { key: 'poolShowLiveData', enabled: true, description: 'Show live treasury data in Pool Tracker' },
      ];
      await db.insert(featureFlags).values(defaultFlags);
      return db.select().from(featureFlags);
    }
    return flags;
  }

  async updateFeatureFlag(key: string, enabled: boolean, updatedBy: string): Promise<boolean> {
    try {
      await db
        .update(featureFlags)
        .set({ enabled, updatedAt: new Date(), updatedBy })
        .where(eq(featureFlags.key, key));
      return true;
    } catch {
      return false;
    }
  }

  async getFeatureFlag(key: string): Promise<boolean> {
    const [flag] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, key));
    return flag?.enabled ?? true;
  }

  async createAdminNonce(walletAddress: string, nonce: string, expiresAt: Date): Promise<AdminNonce> {
    const normalizedWallet = walletAddress.toLowerCase();
    await db.delete(adminNonces).where(eq(adminNonces.walletAddress, normalizedWallet));
    const [result] = await db.insert(adminNonces).values({
      walletAddress: normalizedWallet,
      nonce,
      expiresAt,
    }).returning();
    return result;
  }

  async getAdminNonce(walletAddress: string): Promise<AdminNonce | undefined> {
    const [nonce] = await db.select().from(adminNonces).where(eq(adminNonces.walletAddress, walletAddress.toLowerCase()));
    return nonce;
  }

  async deleteAdminNonce(walletAddress: string): Promise<void> {
    await db.delete(adminNonces).where(eq(adminNonces.walletAddress, walletAddress.toLowerCase()));
  }

  async cleanupExpiredNonces(): Promise<void> {
    const now = new Date();
    await db.delete(adminNonces).where(sql`${adminNonces.expiresAt} < ${now}`);
  }

  async createTransactionReceipt(data: InsertTransactionReceipt): Promise<TransactionReceipt> {
    const [receipt] = await db.insert(transactionReceipts).values({
      ...data,
      walletAddress: data.walletAddress.toLowerCase()
    }).returning();
    return receipt;
  }

  async updateTransactionStatus(txHash: string, status: 'confirmed' | 'failed', updates: Partial<TransactionReceipt> = {}): Promise<void> {
    await db.update(transactionReceipts)
      .set({ status, ...updates, confirmedAt: new Date() })
      .where(eq(transactionReceipts.transactionHash, txHash));
  }

  async getTransactionReceipt(txHash: string): Promise<TransactionReceipt | undefined> {
    const [receipt] = await db.select()
      .from(transactionReceipts)
      .where(eq(transactionReceipts.transactionHash, txHash));
    return receipt;
  }

  async getUserTransactionHistory(walletAddress: string, limit: number = 50): Promise<TransactionReceipt[]> {
    return db.select()
      .from(transactionReceipts)
      .where(eq(transactionReceipts.walletAddress, walletAddress.toLowerCase()))
      .orderBy(desc(transactionReceipts.createdAt))
      .limit(limit);
  }

  async exportUserTransactionsCSV(walletAddress: string): Promise<string> {
    const transactions = await this.getUserTransactionHistory(walletAddress, 1000);
    
    const headers = [
      'Date',
      'Time',
      'Type',
      'Status',
      'Token ID',
      'Quantity',
      'Amount ($BASED)',
      'Platform Fee',
      'Royalty Fee',
      'Net Amount',
      'Gas Used',
      'Gas Cost ($BASED)',
      'Transaction Hash',
      'Block Number',
      'From Address',
      'To Address',
      'Notes'
    ];
    
    const rows = transactions.map(tx => {
      const createdAt = tx.createdAt ? new Date(tx.createdAt) : new Date();
      let metadata: any = {};
      try {
        metadata = tx.metadata ? JSON.parse(tx.metadata) : {};
      } catch (e) {
        metadata = {};
      }
      
      return [
        createdAt.toLocaleDateString(),
        createdAt.toLocaleTimeString(),
        tx.transactionType,
        tx.status,
        tx.tokenId || '',
        tx.quantity || '1',
        tx.amount || '0',
        tx.platformFee || '0',
        tx.royaltyFee || '0',
        tx.netAmount || tx.amount || '0',
        tx.gasUsed || '',
        tx.gasCostInBase || '',
        tx.transactionHash,
        tx.blockNumber || '',
        tx.fromAddress || '',
        tx.toAddress || '',
        metadata.note || ''
      ].map(val => `"${val}"`).join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
  }

  async exportAllTransactionsCSV(startDate?: Date, endDate?: Date): Promise<string> {
    let transactions: TransactionReceipt[];
    
    if (startDate && endDate) {
      transactions = await db.select()
        .from(transactionReceipts)
        .where(and(
          gte(transactionReceipts.createdAt, startDate),
          lte(transactionReceipts.createdAt, endDate)
        ))
        .orderBy(desc(transactionReceipts.createdAt))
        .limit(10000);
    } else if (startDate) {
      transactions = await db.select()
        .from(transactionReceipts)
        .where(gte(transactionReceipts.createdAt, startDate))
        .orderBy(desc(transactionReceipts.createdAt))
        .limit(10000);
    } else if (endDate) {
      transactions = await db.select()
        .from(transactionReceipts)
        .where(lte(transactionReceipts.createdAt, endDate))
        .orderBy(desc(transactionReceipts.createdAt))
        .limit(10000);
    } else {
      transactions = await db.select()
        .from(transactionReceipts)
        .orderBy(desc(transactionReceipts.createdAt))
        .limit(10000);
    }
    
    const headers = [
      'Date',
      'Time',
      'Wallet',
      'Type',
      'Status',
      'Token ID',
      'Amount',
      'Platform Fee',
      'Royalty Fee',
      'Gas Cost',
      'Transaction Hash',
      'Block',
      'Timezone'
    ];
    
    const rows = transactions.map(tx => {
      const createdAt = tx.createdAt ? new Date(tx.createdAt) : new Date();
      
      return [
        createdAt.toLocaleDateString(),
        createdAt.toLocaleTimeString(),
        tx.walletAddress,
        tx.transactionType,
        tx.status,
        tx.tokenId || '',
        tx.amount || '0',
        tx.platformFee || '0',
        tx.royaltyFee || '0',
        tx.gasCostInBase || '',
        tx.transactionHash,
        tx.blockNumber || '',
        tx.timezone || 'UTC'
      ].map(val => `"${val}"`).join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
  }

  async getTransactionStats(): Promise<{
    transactionType: string;
    count: number;
    totalAmount: string | null;
    totalPlatformFees: string | null;
    totalRoyaltyFees: string | null;
    totalGasCost: string | null;
  }[]> {
    const stats = await db.select({
      transactionType: transactionReceipts.transactionType,
      count: sql<number>`count(*)::int`,
      totalAmount: sql<string>`COALESCE(sum(CAST(NULLIF(${transactionReceipts.amount}, '') AS DECIMAL)), 0)::text`,
      totalPlatformFees: sql<string>`COALESCE(sum(CAST(NULLIF(${transactionReceipts.platformFee}, '') AS DECIMAL)), 0)::text`,
      totalRoyaltyFees: sql<string>`COALESCE(sum(CAST(NULLIF(${transactionReceipts.royaltyFee}, '') AS DECIMAL)), 0)::text`,
      totalGasCost: sql<string>`COALESCE(sum(CAST(NULLIF(${transactionReceipts.gasCostInBase}, '') AS DECIMAL)), 0)::text`
    })
    .from(transactionReceipts)
    .where(eq(transactionReceipts.status, 'confirmed'))
    .groupBy(transactionReceipts.transactionType);
    
    return stats;
  }

  // ============================================
  // RIDDLE QUEST LEADERBOARD METHODS
  // ============================================

  async getRiddleLeaderboard(limit: number = 100): Promise<RiddleLeaderboard[]> {
    return db.select()
      .from(riddleLeaderboard)
      .orderBy(desc(riddleLeaderboard.points))
      .limit(limit);
  }

  async getRiddleLeaderboardEntry(walletAddress: string): Promise<RiddleLeaderboard | undefined> {
    const [entry] = await db.select()
      .from(riddleLeaderboard)
      .where(eq(riddleLeaderboard.walletAddress, walletAddress.toLowerCase()));
    return entry;
  }

  async upsertRiddleLeaderboardEntry(data: InsertRiddleLeaderboard): Promise<RiddleLeaderboard> {
    const normalizedData = { ...data, walletAddress: data.walletAddress.toLowerCase() };
    const existing = await this.getRiddleLeaderboardEntry(normalizedData.walletAddress);
    
    if (existing) {
      const [updated] = await db.update(riddleLeaderboard)
        .set({
          ...normalizedData,
          lastActiveAt: new Date()
        })
        .where(eq(riddleLeaderboard.walletAddress, normalizedData.walletAddress))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(riddleLeaderboard)
      .values(normalizedData)
      .returning();
    return created;
  }

  async updateRiddleLeaderboardStats(
    walletAddress: string, 
    points: number, 
    solved: boolean, 
    timeMs?: number
  ): Promise<RiddleLeaderboard | undefined> {
    const normalized = walletAddress.toLowerCase();
    let entry = await this.getRiddleLeaderboardEntry(normalized);
    
    if (!entry) {
      entry = await this.upsertRiddleLeaderboardEntry({
        walletAddress: normalized,
        totalSolves: 0,
        dailySolves: 0,
        points: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveAt: new Date()
      });
    }
    
    const updates: Partial<RiddleLeaderboard> = {
      points: (entry.points || 0) + points,
      lastActiveAt: new Date()
    };
    
    if (solved) {
      updates.totalSolves = (entry.totalSolves || 0) + 1;
      updates.dailySolves = (entry.dailySolves || 0) + 1;
      
      if (timeMs) {
        updates.totalTimeMs = (entry.totalTimeMs || 0) + timeMs;
        if (!entry.bestTimeMs || timeMs < entry.bestTimeMs) {
          updates.bestTimeMs = timeMs;
        }
      }
    }
    
    const [updated] = await db.update(riddleLeaderboard)
      .set(updates)
      .where(eq(riddleLeaderboard.walletAddress, normalized))
      .returning();
    
    return updated;
  }

  // ============================================
  // DAILY CHALLENGES METHODS
  // ============================================

  async getDailySet(dateKey: string): Promise<RiddleDailySet | undefined> {
    const [set] = await db.select()
      .from(riddleDailySets)
      .where(eq(riddleDailySets.dateKey, dateKey));
    return set;
  }

  async createDailySet(data: InsertRiddleDailySet): Promise<RiddleDailySet> {
    const [set] = await db.insert(riddleDailySets)
      .values(data)
      .returning();
    return set;
  }

  async getDailyEntries(setId: number): Promise<RiddleDailyEntry[]> {
    return db.select()
      .from(riddleDailyEntries)
      .where(eq(riddleDailyEntries.setId, setId))
      .orderBy(riddleDailyEntries.riddleIndex);
  }

  async createDailyEntry(data: InsertRiddleDailyEntry): Promise<RiddleDailyEntry> {
    const [entry] = await db.insert(riddleDailyEntries)
      .values(data)
      .returning();
    return entry;
  }

  // ============================================
  // RIDDLE ATTEMPTS METHODS
  // ============================================

  async getRiddleAttempt(walletAddress: string, riddleEntryId: number): Promise<RiddleAttempt | undefined> {
    const [attempt] = await db.select()
      .from(riddleAttempts)
      .where(and(
        eq(riddleAttempts.walletAddress, walletAddress.toLowerCase()),
        eq(riddleAttempts.riddleEntryId, riddleEntryId)
      ));
    return attempt;
  }

  async createRiddleAttempt(data: InsertRiddleAttempt): Promise<RiddleAttempt> {
    const [attempt] = await db.insert(riddleAttempts)
      .values({
        ...data,
        walletAddress: data.walletAddress.toLowerCase()
      })
      .returning();
    return attempt;
  }

  async updateRiddleAttempt(
    id: number, 
    solved: boolean, 
    solveTimeMs: number, 
    pointsEarned: number
  ): Promise<RiddleAttempt | undefined> {
    const [updated] = await db.update(riddleAttempts)
      .set({
        solved,
        solveTimeMs,
        pointsEarned,
        solvedAt: solved ? new Date() : undefined
      })
      .where(eq(riddleAttempts.id, id))
      .returning();
    return updated;
  }

  async getUserDailyProgress(walletAddress: string, dateKey: string): Promise<RiddleAttempt[]> {
    return db.select()
      .from(riddleAttempts)
      .where(and(
        eq(riddleAttempts.walletAddress, walletAddress.toLowerCase()),
        eq(riddleAttempts.dateKey, dateKey)
      ));
  }

  // ============================================
  // CREATURE COMMAND PROGRESS METHODS
  // ============================================

  async getCreatureProgress(walletAddress: string): Promise<CreatureProgress | undefined> {
    const [progress] = await db.select()
      .from(creatureProgress)
      .where(eq(creatureProgress.walletAddress, walletAddress.toLowerCase()));
    return progress;
  }

  async upsertCreatureProgress(data: InsertCreatureProgress): Promise<CreatureProgress> {
    const normalizedAddress = data.walletAddress.toLowerCase();
    const [result] = await db.insert(creatureProgress)
      .values({
        ...data,
        walletAddress: normalizedAddress
      })
      .onConflictDoUpdate({
        target: creatureProgress.walletAddress,
        set: {
          totalPoints: data.totalPoints,
          piercingLevel: data.piercingLevel,
          shieldLevel: data.shieldLevel,
          rapidFireLevel: data.rapidFireLevel,
          explosiveLevel: data.explosiveLevel,
          slowFieldLevel: data.slowFieldLevel,
          multiBubbleLevel: data.multiBubbleLevel,
          regenBurstLevel: data.regenBurstLevel,
          updatedAt: new Date()
        }
      })
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
