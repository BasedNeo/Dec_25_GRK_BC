import { type User, type InsertUser, type InsertFeedback, type Feedback, type InsertStory, type Story, type InsertPushSubscription, type PushSubscription, type InsertEmail, type EmailEntry, type GuardianProfile, type DiamondHandsStats, type InsertDiamondHandsStats, type Proposal, type InsertProposal, type Vote, type InsertVote, type GameScore, type InsertGameScore, type FeatureFlag, type AdminNonce, type TransactionReceipt, type InsertTransactionReceipt, type RiddleLeaderboard, type InsertRiddleLeaderboard, type RiddleDailySet, type InsertRiddleDailySet, type RiddleDailyEntry, type InsertRiddleDailyEntry, type RiddleAttempt, type InsertRiddleAttempt, type CreatureProgress, type InsertCreatureProgress, type DailyChallenge, type InsertDailyChallenge, type BrainXPoints, type InsertBrainXPoints, type GamePoints, type InsertGamePoints, type PointsSummary, type InsertPointsSummary, type PointsVesting, type InsertPointsVesting, type PointsSnapshot, type InsertPointsSnapshot, type PointsLedger, type InsertPointsLedger, type ActivityLog, type InsertActivityLog, type InfinityCraftOwnership, type InsertInfinityCraftOwnership, type InfinityCraftUpgrades, type InsertInfinityCraftUpgrades, type InfinityRaceBet, type InsertInfinityRaceBet, type InfinityRaceProgress, type GovernanceLedger, type InsertGovernanceLedger, type Offer, type InsertOffer, type Listing, users, feedback, storySubmissions, pushSubscriptions, emailList, guardianProfiles, diamondHandsStats, proposals, proposalVotes, gameScores, featureFlags, adminNonces, transactionReceipts, riddleLeaderboard, riddleDailySets, riddleDailyEntries, riddleAttempts, creatureProgress, dailyChallenges, brainXPoints, gamePoints, pointsSummary, pointsVesting, pointsSnapshots, pointsLedger, activityLogs, infinityCraftOwnership, infinityCraftUpgrades, infinityRaceBets, infinityRaceProgress, governanceLedger, offers, listings } from "@shared/schema";
import { ECONOMY, getActionPoints, getGameDailyCap, isValidAction, type GameType } from "@shared/economy";
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
  getRiddleLeaderboard(limit?: number): Promise<(RiddleLeaderboard & { customName?: string | null })[]>;
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
  
  // Daily Challenges
  getDailyChallenge(walletAddress: string, dateKey: string): Promise<DailyChallenge | undefined>;
  upsertDailyChallenge(data: InsertDailyChallenge): Promise<DailyChallenge>;
  
  // BrainX Points
  getBrainXPoints(walletAddress: string): Promise<BrainXPoints | undefined>;
  addBrainXPoints(walletAddress: string, points: number): Promise<BrainXPoints>;
  
  // Points Vesting
  createVestingRecord(data: InsertPointsVesting): Promise<PointsVesting>;
  getVestingHistory(walletAddress: string): Promise<PointsVesting[]>;
  
  // Points Snapshots
  createPointsSnapshot(data: InsertPointsSnapshot): Promise<PointsSnapshot>;
  getPointsSnapshot(snapshotDate: string): Promise<PointsSnapshot | undefined>;
  getAllPointsSummaries(): Promise<PointsSummary[]>;
  
  // Points Leaderboard (with custom names from guardian profiles)
  getPointsLeaderboard(limit?: number): Promise<(PointsSummary & { customName?: string | null })[]>;
  
  // Activity Logs
  insertActivityLog(data: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(limit?: number): Promise<ActivityLog[]>;
  getActivityLogsByWallet(walletAddress: string, limit?: number): Promise<ActivityLog[]>;
  exportActivityLogsForBackup(): Promise<ActivityLog[]>;
  
  // Points Management for Economy
  getOrCreatePointsSummary(walletAddress: string): Promise<PointsSummary>;
  deductPoints(walletAddress: string, amount: number): Promise<PointsSummary>;
  
  // Infinity Race Economy
  getInfinityCraftOwnership(walletAddress: string): Promise<InfinityCraftOwnership[]>;
  purchaseInfinityCraft(walletAddress: string, craftId: string, source?: string): Promise<InfinityCraftOwnership>;
  hasInfinityCraft(walletAddress: string, craftId: string): Promise<boolean>;
  getInfinityCraftUpgrades(walletAddress: string, craftId: string): Promise<InfinityCraftUpgrades | undefined>;
  upgradeInfinityCraft(walletAddress: string, craftId: string, upgradeType: 'engine' | 'thruster' | 'shield'): Promise<InfinityCraftUpgrades>;
  createInfinityRaceBet(data: InsertInfinityRaceBet): Promise<InfinityRaceBet>;
  getActiveInfinityBet(walletAddress: string): Promise<InfinityRaceBet | undefined>;
  settleInfinityRaceBet(betId: string, outcome: 'win' | 'loss', distanceReached: number, brainxAwarded: number): Promise<InfinityRaceBet>;
  getInfinityRacesLast24h(walletAddress: string): Promise<number>;
  getInfinityRaceHistory(walletAddress: string, limit?: number): Promise<InfinityRaceBet[]>;
  
  // Infinity Race Progress (Gamification)
  getInfinityRaceProgress(walletAddress: string): Promise<InfinityRaceProgress | undefined>;
  getOrCreateInfinityRaceProgress(walletAddress: string): Promise<InfinityRaceProgress>;
  incrementInfinityRaceProgress(walletAddress: string, won: boolean): Promise<{ progress: InfinityRaceProgress; newAchievements: string[]; levelUp: boolean; brainxAwarded: number }>;
  updateInfinityRacePalette(walletAddress: string, palette: string): Promise<InfinityRaceProgress>;
  
  // MARKETPLACE OVERHAUL: Off-chain Offers
  createOffer(data: InsertOffer): Promise<Offer>;
  getOfferById(id: number): Promise<Offer | undefined>;
  getOffersByToken(collectionAddress: string, tokenId: number): Promise<Offer[]>;
  getOffersByBuyer(buyerAddress: string): Promise<Offer[]>;
  getOffersBySeller(sellerAddress: string): Promise<Offer[]>;
  updateOfferStatus(id: number, status: string, transactionHash?: string): Promise<Offer | undefined>;
  getActiveOffers(collectionAddress: string): Promise<Offer[]>;
  cleanupExpiredOffers(): Promise<number>;
  
  // MARKETPLACE OVERHAUL: Listings
  getActiveListings(collectionAddress?: string): Promise<Listing[]>;
  getListingByToken(collectionAddress: string, tokenId: number): Promise<Listing | undefined>;
  getMarketplaceSummary(tokenIds: number[], collectionAddress: string): Promise<{ listings: Listing[]; offers: Offer[] }>;
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

  // GOVERNANCE OVERHAUL — Codex Audit Fix: Enhanced createProposal with ledger tracking
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
      proposer: data.proposer.toLowerCase(),
      endDate: data.endDate,
      category: data.category || 'general',
      requiredQuorum: data.requiredQuorum || 10,
      status: 'active',
    }).returning();
    
    // Log to governance ledger
    await db.insert(governanceLedger).values({
      proposalId: proposal.id,
      walletAddress: data.proposer.toLowerCase(),
      eventType: 'proposal_created',
      metadata: JSON.stringify({ title: data.title, category: data.category || 'general' }),
    });
    
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

  // GOVERNANCE OVERHAUL — Codex Audit Fix: Soft-delete with ledger tracking
  async deleteProposal(id: string, cancelledBy?: string): Promise<boolean> {
    try {
      // Soft-delete: set status to 'cancelled' instead of hard delete
      await db.update(proposals)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(proposals.id, id));
      
      // Log to governance ledger
      if (cancelledBy) {
        await db.insert(governanceLedger).values({
          proposalId: id,
          walletAddress: cancelledBy.toLowerCase(),
          eventType: 'proposal_cancelled',
          metadata: JSON.stringify({ cancelledAt: new Date().toISOString() }),
        });
      }
      
      return true;
    } catch (error) {
      console.error('[Storage] Error cancelling proposal:', error);
      return false;
    }
  }

  // GOVERNANCE OVERHAUL — Codex Audit Fix: Per-NFT voting with ledger tracking
  // Note: nftId is required for new votes (1 NFT = 1 vote), null only for legacy
  async castVote(proposalId: string, voter: string, voteType: 'for' | 'against', votingPower: number = 1, nftId?: number): Promise<boolean> {
    try {
      // If nftId provided, check if this NFT already voted on this proposal
      if (nftId !== undefined) {
        const existingNftVote = await db.select().from(proposalVotes)
          .where(and(eq(proposalVotes.proposalId, proposalId), eq(proposalVotes.nftId, nftId)));
        
        if (existingNftVote.length > 0) {
          console.log(`[Storage] NFT #${nftId} already voted on proposal ${proposalId}`);
          return false; // NFT already voted
        }
      }

      // Insert the vote with nftId
      await db.insert(proposalVotes).values({
        proposalId,
        walletAddress: voter.toLowerCase(),
        nftId: nftId ?? null,
        selectedOption: voteType,
        votingPower,
      });

      // Update proposal vote counts
      const proposal = await this.getProposalById(proposalId);
      if (proposal) {
        if (voteType === 'for') {
          await db.update(proposals).set({ votesFor: proposal.votesFor + votingPower, updatedAt: new Date() }).where(eq(proposals.id, proposalId));
        } else {
          await db.update(proposals).set({ votesAgainst: proposal.votesAgainst + votingPower, updatedAt: new Date() }).where(eq(proposals.id, proposalId));
        }
      }

      // Log to governance ledger
      await db.insert(governanceLedger).values({
        proposalId,
        walletAddress: voter.toLowerCase(),
        nftId: nftId ?? null,
        voteType,
        eventType: 'vote_cast',
        metadata: JSON.stringify({ votingPower }),
      });

      return true;
    } catch (error) {
      console.error('[Storage] Error casting vote:', error);
      return false;
    }
  }
  
  // GOVERNANCE OVERHAUL — Codex Audit Fix: Get votes by NFT for a proposal
  async getVotedNfts(proposalId: string): Promise<number[]> {
    const votes = await db.select({ nftId: proposalVotes.nftId })
      .from(proposalVotes)
      .where(and(eq(proposalVotes.proposalId, proposalId), sql`${proposalVotes.nftId} IS NOT NULL`));
    return votes.map(v => v.nftId!).filter(id => id !== null);
  }
  
  // GOVERNANCE OVERHAUL — Codex Audit Fix: Get governance ledger for audit
  async getGovernanceLedger(proposalId?: string, limit: number = 100): Promise<GovernanceLedger[]> {
    if (proposalId) {
      return db.select().from(governanceLedger)
        .where(eq(governanceLedger.proposalId, proposalId))
        .orderBy(desc(governanceLedger.createdAt))
        .limit(limit);
    }
    return db.select().from(governanceLedger)
      .orderBy(desc(governanceLedger.createdAt))
      .limit(limit);
  }
  
  // GOVERNANCE OVERHAUL — Codex Audit Fix: Export governance data for backup
  async exportGovernanceDataForBackup(): Promise<{ proposals: Proposal[]; votes: Vote[]; ledger: GovernanceLedger[] }> {
    const [allProposals, allVotes, allLedger] = await Promise.all([
      db.select().from(proposals),
      db.select().from(proposalVotes),
      db.select().from(governanceLedger),
    ]);
    return { proposals: allProposals, votes: allVotes, ledger: allLedger };
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

  async getRiddleLeaderboard(limit: number = 100): Promise<(RiddleLeaderboard & { customName?: string | null })[]> {
    const results = await db.select({
      id: riddleLeaderboard.id,
      walletAddress: riddleLeaderboard.walletAddress,
      totalSolves: riddleLeaderboard.totalSolves,
      dailySolves: riddleLeaderboard.dailySolves,
      bestTimeMs: riddleLeaderboard.bestTimeMs,
      totalTimeMs: riddleLeaderboard.totalTimeMs,
      currentStreak: riddleLeaderboard.currentStreak,
      longestStreak: riddleLeaderboard.longestStreak,
      level: riddleLeaderboard.level,
      points: riddleLeaderboard.points,
      lastActiveAt: riddleLeaderboard.lastActiveAt,
      createdAt: riddleLeaderboard.createdAt,
      customName: guardianProfiles.customName,
    })
      .from(riddleLeaderboard)
      .leftJoin(
        guardianProfiles, 
        sql`LOWER(${guardianProfiles.walletAddress}) = LOWER(${riddleLeaderboard.walletAddress})`
      )
      .orderBy(desc(riddleLeaderboard.points))
      .limit(limit);
    return results;
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

  // ============================================
  // DAILY CHALLENGES METHODS
  // ============================================

  async getDailyChallenge(walletAddress: string, dateKey: string): Promise<DailyChallenge | undefined> {
    const [challenge] = await db.select()
      .from(dailyChallenges)
      .where(and(
        eq(dailyChallenges.walletAddress, walletAddress.toLowerCase()),
        eq(dailyChallenges.dateKey, dateKey)
      ));
    return challenge;
  }

  async upsertDailyChallenge(data: InsertDailyChallenge): Promise<DailyChallenge> {
    const normalizedAddress = data.walletAddress.toLowerCase();
    const existing = await this.getDailyChallenge(normalizedAddress, data.dateKey);
    
    if (existing) {
      const [updated] = await db.update(dailyChallenges)
        .set({
          survivesCount: Math.max(existing.survivesCount, data.survivesCount ?? 0),
          challengeCompleted: existing.challengeCompleted || data.challengeCompleted,
          pointsAwarded: Math.max(existing.pointsAwarded, data.pointsAwarded ?? 0),
          highestStage: Math.max(existing.highestStage, data.highestStage ?? 1),
          highestWave: Math.max(existing.highestWave, data.highestWave ?? 1),
          gamesPlayed: Math.max(existing.gamesPlayed || 0, data.gamesPlayed ?? 0),
          updatedAt: new Date()
        })
        .where(eq(dailyChallenges.id, existing.id))
        .returning();
      return updated;
    }
    
    const [result] = await db.insert(dailyChallenges)
      .values({
        ...data,
        walletAddress: normalizedAddress
      })
      .returning();
    return result;
  }

  // ============================================
  // BRAINX POINTS METHODS
  // ============================================

  async getBrainXPoints(walletAddress: string): Promise<BrainXPoints | undefined> {
    const [points] = await db.select()
      .from(brainXPoints)
      .where(eq(brainXPoints.walletAddress, walletAddress.toLowerCase()));
    return points;
  }

  async addBrainXPoints(walletAddress: string, points: number): Promise<BrainXPoints> {
    const normalizedAddress = walletAddress.toLowerCase();
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.getBrainXPoints(normalizedAddress);
    
    const DAILY_CAP = 500;
    const LOCK_DURATION_MS = 365 * 24 * 60 * 60 * 1000;
    const newLockExpiry = new Date(Date.now() + LOCK_DURATION_MS);
    
    if (existing) {
      const isNewDay = existing.lastEarnedDate !== today;
      const currentDayPoints = isNewDay ? 0 : existing.pointsEarnedToday;
      const remainingCap = DAILY_CAP - currentDayPoints;
      const actualPoints = Math.min(points, remainingCap);
      
      if (actualPoints <= 0) return existing;
      
      const lockExpiresAt = existing.lockExpiresAt 
        ? new Date(Math.max(existing.lockExpiresAt.getTime(), newLockExpiry.getTime()))
        : newLockExpiry;
      
      const [updated] = await db.update(brainXPoints)
        .set({
          totalPoints: existing.totalPoints + actualPoints,
          lockedPoints: existing.lockedPoints + actualPoints,
          pointsEarnedToday: isNewDay ? actualPoints : currentDayPoints + actualPoints,
          lastEarnedDate: today,
          lockExpiresAt,
          updatedAt: new Date()
        })
        .where(eq(brainXPoints.id, existing.id))
        .returning();
      return updated;
    }
    
    const actualPoints = Math.min(points, DAILY_CAP);
    const [result] = await db.insert(brainXPoints)
      .values({
        walletAddress: normalizedAddress,
        totalPoints: actualPoints,
        lockedPoints: actualPoints,
        unlockedPoints: 0,
        pointsEarnedToday: actualPoints,
        lastEarnedDate: today,
        lockExpiresAt: newLockExpiry,
      })
      .returning();
    return result;
  }

  // ============================================
  // GAME POINTS METHODS (Unified Points System)
  // ============================================

  async getGamePoints(walletAddress: string, game: string): Promise<GamePoints | undefined> {
    const [points] = await db.select()
      .from(gamePoints)
      .where(and(
        eq(gamePoints.walletAddress, walletAddress.toLowerCase()),
        eq(gamePoints.game, game)
      ));
    return points;
  }

  async getAllGamePoints(walletAddress: string): Promise<GamePoints[]> {
    return db.select()
      .from(gamePoints)
      .where(eq(gamePoints.walletAddress, walletAddress.toLowerCase()));
  }

  async earnGamePoints(
    walletAddress: string,
    game: string,
    action: string,
    requestId: string
  ): Promise<{ 
    points: GamePoints; 
    earned: number; 
    capped: boolean; 
    globalCapped: boolean;
    globalDailyTotal: number;
    vestedBrainX: number;
  }> {
    const normalizedAddress = walletAddress.toLowerCase();
    const today = new Date().toISOString().split('T')[0];
    const GLOBAL_DAILY_CAP = ECONOMY.GLOBAL_DAILY_CAP;
    const VESTING_THRESHOLD = ECONOMY.VESTING_THRESHOLD;
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

    const delta = getActionPoints(game as GameType, action) ?? 0;
    const dailyCap = getGameDailyCap(game as GameType);

    if (delta <= 0) {
      const existingPoints = await this.getGamePoints(normalizedAddress, game);
      if (existingPoints) {
        const summary = await this.getPointsSummary(normalizedAddress);
        return { 
          points: existingPoints, 
          earned: 0, 
          capped: false, 
          globalCapped: false,
          globalDailyTotal: summary?.dailyEarnedTotal || 0,
          vestedBrainX: summary?.vestedBrainX || 0
        };
      }
      const [newRecord] = await db.insert(gamePoints)
        .values({
          walletAddress: normalizedAddress,
          game,
          earned: 0,
          vested: 0,
          dailyEarned: 0,
          weeklyEarned: 0,
          dailyCap,
          lastDailyReset: today
        })
        .returning();
      return { 
        points: newRecord, 
        earned: 0, 
        capped: false, 
        globalCapped: false,
        globalDailyTotal: 0,
        vestedBrainX: 0
      };
    }

    const existingLedger = await db.select()
      .from(pointsLedger)
      .where(eq(pointsLedger.requestId, requestId))
      .limit(1);

    if (existingLedger.length > 0) {
      const existingPoints = await this.getGamePoints(normalizedAddress, game);
      const summary = await this.getPointsSummary(normalizedAddress);
      return {
        points: existingPoints!,
        earned: existingLedger[0].delta,
        capped: false,
        globalCapped: false,
        globalDailyTotal: summary?.dailyEarnedTotal || 0,
        vestedBrainX: summary?.vestedBrainX || 0
      };
    }

    const summary = await this.getPointsSummary(normalizedAddress);
    const summaryIsNewDay = summary && (summary.lastDailyReset !== today);
    const currentGlobalDaily = summaryIsNewDay ? 0 : (summary?.dailyEarnedTotal || 0);
    const globalRemaining = Math.max(0, GLOBAL_DAILY_CAP - currentGlobalDaily);

    if (globalRemaining <= 0) {
      const existingPoints = await this.getGamePoints(normalizedAddress, game);
      if (existingPoints) {
        return { 
          points: existingPoints, 
          earned: 0, 
          capped: true, 
          globalCapped: true,
          globalDailyTotal: currentGlobalDaily,
          vestedBrainX: summary?.vestedBrainX || 0
        };
      }
      const [newRecord] = await db.insert(gamePoints)
        .values({
          walletAddress: normalizedAddress,
          game,
          earned: 0,
          vested: 0,
          dailyEarned: 0,
          weeklyEarned: 0,
          dailyCap,
          lastDailyReset: today
        })
        .returning();
      return { 
        points: newRecord, 
        earned: 0, 
        capped: true, 
        globalCapped: true,
        globalDailyTotal: currentGlobalDaily,
        vestedBrainX: summary?.vestedBrainX || 0
      };
    }

    const existing = await this.getGamePoints(normalizedAddress, game);

    if (existing) {
      const isNewDay = existing.lastDailyReset !== today;
      const currentDailyEarned = isNewDay ? 0 : existing.dailyEarned;
      const gameRemaining = dailyCap - currentDailyEarned;
      const actualEarned = Math.min(delta, Math.max(0, gameRemaining), globalRemaining);
      const capped = actualEarned < delta;
      const globalCapped = actualEarned < delta && globalRemaining <= delta;

      if (actualEarned <= 0) {
        return { 
          points: existing, 
          earned: 0, 
          capped: true, 
          globalCapped: globalRemaining <= 0,
          globalDailyTotal: currentGlobalDaily,
          vestedBrainX: summary?.vestedBrainX || 0
        };
      }

      await db.insert(pointsLedger).values({
        walletAddress: normalizedAddress,
        game,
        action,
        delta: actualEarned,
        requestId
      });

      const [updated] = await db.update(gamePoints)
        .set({
          earned: existing.earned + actualEarned,
          dailyEarned: isNewDay ? actualEarned : currentDailyEarned + actualEarned,
          lastDailyReset: today,
          updatedAt: new Date()
        })
        .where(eq(gamePoints.id, existing.id))
        .returning();

      const updatedSummary = await this.updatePointsSummaryWithVesting(
        normalizedAddress, 
        actualEarned, 
        today,
        VESTING_THRESHOLD,
        ONE_YEAR_MS
      );

      return { 
        points: updated, 
        earned: actualEarned, 
        capped, 
        globalCapped,
        globalDailyTotal: updatedSummary.dailyEarnedTotal,
        vestedBrainX: updatedSummary.vestedBrainX
      };
    }

    const actualEarned = Math.min(delta, dailyCap, globalRemaining);
    const capped = actualEarned < delta;
    const globalCapped = globalRemaining <= delta;

    await db.insert(pointsLedger).values({
      walletAddress: normalizedAddress,
      game,
      action,
      delta: actualEarned,
      requestId
    });

    const [result] = await db.insert(gamePoints)
      .values({
        walletAddress: normalizedAddress,
        game,
        earned: actualEarned,
        vested: 0,
        dailyEarned: actualEarned,
        weeklyEarned: actualEarned,
        dailyCap,
        lastDailyReset: today
      })
      .returning();

    const updatedSummary = await this.updatePointsSummaryWithVesting(
      normalizedAddress, 
      actualEarned, 
      today,
      VESTING_THRESHOLD,
      ONE_YEAR_MS
    );

    return { 
      points: result, 
      earned: actualEarned, 
      capped, 
      globalCapped,
      globalDailyTotal: updatedSummary.dailyEarnedTotal,
      vestedBrainX: updatedSummary.vestedBrainX
    };
  }

  async updatePointsSummaryWithVesting(
    walletAddress: string, 
    pointsEarned: number, 
    today: string,
    vestingThreshold: number,
    oneYearMs: number
  ): Promise<PointsSummary> {
    const normalizedAddress = walletAddress.toLowerCase();
    const existing = await this.getPointsSummary(normalizedAddress);
    const GLOBAL_DAILY_CAP = ECONOMY.GLOBAL_DAILY_CAP;

    if (existing) {
      const isNewDay = existing.lastDailyReset !== today;
      const currentDailyTotal = isNewDay ? 0 : existing.dailyEarnedTotal;
      const newTotalEarned = existing.totalEarned + pointsEarned;
      
      const previousVestedBrainX = Math.floor(existing.totalEarned / vestingThreshold);
      const newVestedBrainX = Math.floor(newTotalEarned / vestingThreshold);
      const additionalVested = newVestedBrainX - previousVestedBrainX;

      const updateData: Record<string, unknown> = {
        totalEarned: newTotalEarned,
        dailyEarnedTotal: currentDailyTotal + pointsEarned,
        lastActivity: new Date(),
        lastDailyReset: today,
        updatedAt: new Date()
      };

      if (additionalVested > 0) {
        updateData.vestedBrainX = existing.vestedBrainX + additionalVested;
        updateData.unlockDate = new Date(Date.now() + oneYearMs);
      }

      const [updated] = await db.update(pointsSummary)
        .set(updateData)
        .where(eq(pointsSummary.id, existing.id))
        .returning();
      return updated;
    }

    const vestedBrainX = Math.floor(pointsEarned / vestingThreshold);
    const [result] = await db.insert(pointsSummary)
      .values({
        walletAddress: normalizedAddress,
        totalEarned: pointsEarned,
        totalVested: 0,
        brainXLocked: 0,
        brainXUnlocked: 0,
        vestedBrainX,
        unlockDate: vestedBrainX > 0 ? new Date(Date.now() + oneYearMs) : null,
        dailyEarnedTotal: pointsEarned,
        globalDailyCap: GLOBAL_DAILY_CAP,
        lastActivity: new Date(),
        lastDailyReset: today
      })
      .returning();
    return result;
  }

  async getPointsSummary(walletAddress: string): Promise<PointsSummary | undefined> {
    const [summary] = await db.select()
      .from(pointsSummary)
      .where(eq(pointsSummary.walletAddress, walletAddress.toLowerCase()));
    return summary;
  }

  async updatePointsSummary(walletAddress: string, pointsEarned: number, today: string): Promise<PointsSummary> {
    const normalizedAddress = walletAddress.toLowerCase();
    const existing = await this.getPointsSummary(normalizedAddress);
    const GLOBAL_DAILY_CAP = 500;

    if (existing) {
      const isNewDay = existing.lastActivity.toISOString().split('T')[0] !== today;
      const currentDailyTotal = isNewDay ? 0 : existing.dailyEarnedTotal;

      const [updated] = await db.update(pointsSummary)
        .set({
          totalEarned: existing.totalEarned + pointsEarned,
          dailyEarnedTotal: currentDailyTotal + pointsEarned,
          lastActivity: new Date(),
          updatedAt: new Date()
        })
        .where(eq(pointsSummary.id, existing.id))
        .returning();
      return updated;
    }

    const [result] = await db.insert(pointsSummary)
      .values({
        walletAddress: normalizedAddress,
        totalEarned: pointsEarned,
        totalVested: 0,
        brainXLocked: 0,
        brainXUnlocked: 0,
        dailyEarnedTotal: pointsEarned,
        globalDailyCap: GLOBAL_DAILY_CAP,
        lastActivity: new Date()
      })
      .returning();
    return result;
  }

  async vestPointsToBrainX(walletAddress: string): Promise<{
    success: boolean;
    brainXVested?: number;
    lockEndDate?: Date;
    error?: string;
  }> {
    const normalizedAddress = walletAddress.toLowerCase();
    const summary = await this.getPointsSummary(normalizedAddress);

    if (!summary) {
      return { success: false, error: 'No points found' };
    }

    const availablePoints = summary.totalEarned - summary.totalVested;
    const eligibleBrainX = Math.floor(availablePoints / 1000);

    if (eligibleBrainX < 1) {
      return { success: false, error: 'Need at least 1000 points to vest (you have ' + availablePoints + ')' };
    }

    const pointsUsed = eligibleBrainX * 1000;
    const lockEnd = new Date();
    lockEnd.setFullYear(lockEnd.getFullYear() + 1);

    const [updated] = await db.update(pointsSummary)
      .set({
        totalVested: summary.totalVested + pointsUsed,
        brainXLocked: summary.brainXLocked + eligibleBrainX,
        vestingStartDate: summary.vestingStartDate || new Date(),
        vestingEndDate: lockEnd,
        updatedAt: new Date()
      })
      .where(eq(pointsSummary.id, summary.id))
      .returning();

    // Record vesting history
    await db.insert(pointsVesting).values({
      walletAddress: normalizedAddress,
      pointsEarned: summary.totalEarned,
      pointsVested: pointsUsed,
      brainXConverted: eligibleBrainX,
      vestingType: 'manual',
      lockExpiresAt: lockEnd
    });

    return {
      success: true,
      brainXVested: eligibleBrainX,
      lockEndDate: lockEnd
    };
  }

  async getPointsLeaderboard(limit: number = 20): Promise<(PointsSummary & { customName?: string | null })[]> {
    const results = await db.select({
      id: pointsSummary.id,
      walletAddress: pointsSummary.walletAddress,
      totalEarned: pointsSummary.totalEarned,
      totalVested: pointsSummary.totalVested,
      dailyEarnedTotal: pointsSummary.dailyEarnedTotal,
      globalDailyCap: pointsSummary.globalDailyCap,
      brainXLocked: pointsSummary.brainXLocked,
      brainXUnlocked: pointsSummary.brainXUnlocked,
      vestedBrainX: pointsSummary.vestedBrainX,
      unlockDate: pointsSummary.unlockDate,
      lastActivity: pointsSummary.lastActivity,
      lastDailyReset: pointsSummary.lastDailyReset,
      vestingStartDate: pointsSummary.vestingStartDate,
      vestingEndDate: pointsSummary.vestingEndDate,
      updatedAt: pointsSummary.updatedAt,
      createdAt: pointsSummary.createdAt,
      customName: guardianProfiles.customName,
    })
      .from(pointsSummary)
      .leftJoin(
        guardianProfiles, 
        sql`LOWER(${guardianProfiles.walletAddress}) = LOWER(${pointsSummary.walletAddress})`
      )
      .orderBy(desc(pointsSummary.totalEarned))
      .limit(limit);
    return results;
  }

  // Points Vesting History
  async createVestingRecord(data: InsertPointsVesting): Promise<PointsVesting> {
    const [result] = await db.insert(pointsVesting).values({
      ...data,
      walletAddress: data.walletAddress.toLowerCase()
    }).returning();
    return result;
  }

  async getVestingHistory(walletAddress: string): Promise<PointsVesting[]> {
    return db.select()
      .from(pointsVesting)
      .where(eq(pointsVesting.walletAddress, walletAddress.toLowerCase()))
      .orderBy(desc(pointsVesting.vestedAt));
  }

  // Points Snapshots for backups
  async createPointsSnapshot(data: InsertPointsSnapshot): Promise<PointsSnapshot> {
    const [result] = await db.insert(pointsSnapshots).values(data).returning();
    return result;
  }

  async getPointsSnapshot(snapshotDate: string): Promise<PointsSnapshot | undefined> {
    const [result] = await db.select()
      .from(pointsSnapshots)
      .where(eq(pointsSnapshots.snapshotDate, snapshotDate));
    return result;
  }

  async getAllPointsSummaries(): Promise<PointsSummary[]> {
    return db.select().from(pointsSummary);
  }

  // Activity Logs
  async insertActivityLog(data: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db.insert(activityLogs).values({
      ...data,
      walletAddress: data.walletAddress.toLowerCase()
    }).returning();
    return result;
  }

  async getActivityLogs(limit: number = 100): Promise<ActivityLog[]> {
    return db.select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async getActivityLogsByWallet(walletAddress: string, limit: number = 50): Promise<ActivityLog[]> {
    return db.select()
      .from(activityLogs)
      .where(eq(activityLogs.walletAddress, walletAddress.toLowerCase()))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async exportActivityLogsForBackup(): Promise<ActivityLog[]> {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return db.select()
      .from(activityLogs)
      .where(gte(activityLogs.createdAt, thirtyMinutesAgo))
      .orderBy(desc(activityLogs.createdAt));
  }

  // Points Management for Economy
  async getOrCreatePointsSummary(walletAddress: string): Promise<PointsSummary> {
    const normalizedAddress = walletAddress.toLowerCase();
    const existing = await this.getPointsSummary(normalizedAddress);
    if (existing) return existing;
    
    // Create new summary with 0 points
    const [result] = await db.insert(pointsSummary).values({
      walletAddress: normalizedAddress,
      totalEarned: 0,
      totalVested: 0,
      brainXLocked: 0,
      brainXUnlocked: 0,
      dailyEarnedTotal: 0,
      globalDailyCap: 500
    }).returning();
    return result;
  }

  async deductPoints(walletAddress: string, amount: number): Promise<PointsSummary> {
    const normalizedAddress = walletAddress.toLowerCase();
    const existing = await this.getOrCreatePointsSummary(normalizedAddress);
    
    const newTotal = Math.max(0, existing.totalEarned - amount);
    
    const [updated] = await db.update(pointsSummary)
      .set({
        totalEarned: newTotal,
        updatedAt: new Date()
      })
      .where(eq(pointsSummary.id, existing.id))
      .returning();
    return updated;
  }

  // Infinity Race Economy
  async getInfinityCraftOwnership(walletAddress: string): Promise<InfinityCraftOwnership[]> {
    return db.select()
      .from(infinityCraftOwnership)
      .where(eq(infinityCraftOwnership.walletAddress, walletAddress.toLowerCase()))
      .orderBy(desc(infinityCraftOwnership.purchasedAt));
  }

  async purchaseInfinityCraft(walletAddress: string, craftId: string, source: string = 'purchase'): Promise<InfinityCraftOwnership> {
    const [result] = await db.insert(infinityCraftOwnership).values({
      walletAddress: walletAddress.toLowerCase(),
      craftId,
      source
    }).returning();
    return result;
  }

  async hasInfinityCraft(walletAddress: string, craftId: string): Promise<boolean> {
    const [result] = await db.select()
      .from(infinityCraftOwnership)
      .where(and(
        eq(infinityCraftOwnership.walletAddress, walletAddress.toLowerCase()),
        eq(infinityCraftOwnership.craftId, craftId)
      ));
    return !!result;
  }

  async getInfinityCraftUpgrades(walletAddress: string, craftId: string): Promise<InfinityCraftUpgrades | undefined> {
    const [result] = await db.select()
      .from(infinityCraftUpgrades)
      .where(and(
        eq(infinityCraftUpgrades.walletAddress, walletAddress.toLowerCase()),
        eq(infinityCraftUpgrades.craftId, craftId)
      ));
    return result;
  }

  async upgradeInfinityCraft(walletAddress: string, craftId: string, upgradeType: 'engine' | 'thruster' | 'shield'): Promise<InfinityCraftUpgrades> {
    const normalizedAddress = walletAddress.toLowerCase();
    const existing = await this.getInfinityCraftUpgrades(normalizedAddress, craftId);
    
    if (existing) {
      const updateData: Partial<InfinityCraftUpgrades> = { updatedAt: new Date() };
      
      if (upgradeType === 'engine') {
        updateData.engineLevel = Math.min((existing.engineLevel || 0) + 1, 10);
      } else if (upgradeType === 'thruster') {
        updateData.thrusterLevel = Math.min((existing.thrusterLevel || 0) + 1, 10);
      } else if (upgradeType === 'shield') {
        updateData.shieldLevel = Math.min((existing.shieldLevel || 0) + 1, 10);
      }
      
      const [result] = await db.update(infinityCraftUpgrades)
        .set(updateData)
        .where(and(
          eq(infinityCraftUpgrades.walletAddress, normalizedAddress),
          eq(infinityCraftUpgrades.craftId, craftId)
        ))
        .returning();
      return result;
    } else {
      const insertData: InsertInfinityCraftUpgrades = {
        walletAddress: normalizedAddress,
        craftId,
        engineLevel: upgradeType === 'engine' ? 1 : 0,
        thrusterLevel: upgradeType === 'thruster' ? 1 : 0,
        shieldLevel: upgradeType === 'shield' ? 1 : 0
      };
      const [result] = await db.insert(infinityCraftUpgrades).values(insertData).returning();
      return result;
    }
  }

  async createInfinityRaceBet(data: InsertInfinityRaceBet): Promise<InfinityRaceBet> {
    const [result] = await db.insert(infinityRaceBets).values({
      ...data,
      walletAddress: data.walletAddress.toLowerCase(),
      betStatus: 'active'
    }).returning();
    return result;
  }

  async getActiveInfinityBet(walletAddress: string): Promise<InfinityRaceBet | undefined> {
    const [result] = await db.select()
      .from(infinityRaceBets)
      .where(and(
        eq(infinityRaceBets.walletAddress, walletAddress.toLowerCase()),
        eq(infinityRaceBets.betStatus, 'active')
      ))
      .orderBy(desc(infinityRaceBets.raceStartedAt))
      .limit(1);
    return result;
  }

  async settleInfinityRaceBet(betId: string, outcome: 'win' | 'loss', distanceReached: number, brainxAwarded: number): Promise<InfinityRaceBet> {
    const [result] = await db.update(infinityRaceBets)
      .set({
        betStatus: 'settled',
        outcome,
        distanceReached,
        brainxAwarded,
        completedAt: new Date()
      })
      .where(eq(infinityRaceBets.id, betId))
      .returning();
    return result;
  }

  async getInfinityRacesLast24h(walletAddress: string): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [result] = await db.select({ count: count() })
      .from(infinityRaceBets)
      .where(and(
        eq(infinityRaceBets.walletAddress, walletAddress.toLowerCase()),
        gte(infinityRaceBets.raceStartedAt, twentyFourHoursAgo)
      ));
    return result?.count || 0;
  }

  async getInfinityRaceHistory(walletAddress: string, limit: number = 20): Promise<InfinityRaceBet[]> {
    return db.select()
      .from(infinityRaceBets)
      .where(eq(infinityRaceBets.walletAddress, walletAddress.toLowerCase()))
      .orderBy(desc(infinityRaceBets.raceStartedAt))
      .limit(limit);
  }

  async getInfinityRaceProgress(walletAddress: string): Promise<InfinityRaceProgress | undefined> {
    const [result] = await db.select()
      .from(infinityRaceProgress)
      .where(eq(infinityRaceProgress.walletAddress, walletAddress.toLowerCase()));
    return result;
  }

  async getOrCreateInfinityRaceProgress(walletAddress: string): Promise<InfinityRaceProgress> {
    const normalizedAddress = walletAddress.toLowerCase();
    const existing = await this.getInfinityRaceProgress(normalizedAddress);
    if (existing) return existing;
    
    const [result] = await db.insert(infinityRaceProgress).values({
      walletAddress: normalizedAddress,
      totalRaces: 0,
      totalWins: 0,
      level: 1,
      statBonus: 0,
      achievements: [],
      unlockedPalettes: ['default'],
      selectedPalette: 'default',
    }).returning();
    return result;
  }

  async incrementInfinityRaceProgress(walletAddress: string, won: boolean): Promise<{ progress: InfinityRaceProgress; newAchievements: string[]; levelUp: boolean; brainxAwarded: number }> {
    const normalizedAddress = walletAddress.toLowerCase();
    const progress = await this.getOrCreateInfinityRaceProgress(normalizedAddress);
    
    const newTotalRaces = progress.totalRaces + 1;
    const newTotalWins = won ? progress.totalWins + 1 : progress.totalWins;
    const newAchievements: string[] = [];
    let brainxAwarded = 0;
    
    const currentAchievements = [...(progress.achievements || [])];
    const currentPalettes = [...(progress.unlockedPalettes || ['default'])];
    
    if (won && newTotalWins === 1 && !currentAchievements.includes('first_win')) {
      currentAchievements.push('first_win');
      newAchievements.push('first_win');
      brainxAwarded += 50;
    }
    
    if (newTotalRaces === 10 && !currentAchievements.includes('10_races')) {
      currentAchievements.push('10_races');
      newAchievements.push('10_races');
      if (!currentPalettes.includes('neon_cyan')) {
        currentPalettes.push('neon_cyan', 'neon_pink', 'neon_green', 'neon_orange');
      }
    }
    
    if (newTotalRaces === 25 && !currentAchievements.includes('25_races')) {
      currentAchievements.push('25_races');
      newAchievements.push('25_races');
      brainxAwarded += 100;
    }
    
    if (newTotalWins === 10 && !currentAchievements.includes('10_wins')) {
      currentAchievements.push('10_wins');
      newAchievements.push('10_wins');
      brainxAwarded += 200;
    }
    
    const oldLevel = progress.level;
    let newLevel = 1;
    let newStatBonus = 0;
    
    if (newTotalRaces >= 100) { newLevel = 10; newStatBonus = 9; }
    else if (newTotalRaces >= 75) { newLevel = 9; newStatBonus = 8; }
    else if (newTotalRaces >= 60) { newLevel = 8; newStatBonus = 7; }
    else if (newTotalRaces >= 50) { newLevel = 7; newStatBonus = 6; }
    else if (newTotalRaces >= 40) { newLevel = 6; newStatBonus = 5; }
    else if (newTotalRaces >= 30) { newLevel = 5; newStatBonus = 4; }
    else if (newTotalRaces >= 20) { newLevel = 4; newStatBonus = 3; }
    else if (newTotalRaces >= 15) { newLevel = 3; newStatBonus = 2; }
    else if (newTotalRaces >= 10) { newLevel = 2; newStatBonus = 1; }
    
    const levelUp = newLevel > oldLevel;
    
    const [updated] = await db.update(infinityRaceProgress)
      .set({
        totalRaces: newTotalRaces,
        totalWins: newTotalWins,
        level: newLevel,
        statBonus: newStatBonus,
        achievements: currentAchievements,
        unlockedPalettes: currentPalettes,
        lastRaceAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(infinityRaceProgress.walletAddress, normalizedAddress))
      .returning();
    
    if (brainxAwarded > 0) {
      await this.addBrainXPoints(normalizedAddress, brainxAwarded);
    }
    
    return { progress: updated, newAchievements, levelUp, brainxAwarded };
  }

  async updateInfinityRacePalette(walletAddress: string, palette: string): Promise<InfinityRaceProgress> {
    const normalizedAddress = walletAddress.toLowerCase();
    const progress = await this.getOrCreateInfinityRaceProgress(normalizedAddress);
    
    if (!progress.unlockedPalettes?.includes(palette)) {
      return progress;
    }
    
    const [updated] = await db.update(infinityRaceProgress)
      .set({ selectedPalette: palette, updatedAt: new Date() })
      .where(eq(infinityRaceProgress.walletAddress, normalizedAddress))
      .returning();
    return updated;
  }

  // ============================================
  // MARKETPLACE OVERHAUL: Off-chain Offers
  // ============================================

  async createOffer(data: InsertOffer): Promise<Offer> {
    const [result] = await db.insert(offers).values({
      ...data,
      buyerAddress: data.buyerAddress.toLowerCase(),
      sellerAddress: data.sellerAddress?.toLowerCase(),
      collectionAddress: data.collectionAddress.toLowerCase(),
    }).returning();
    return result;
  }

  async getOfferById(id: number): Promise<Offer | undefined> {
    const [result] = await db.select().from(offers).where(eq(offers.id, id));
    return result;
  }

  async getOffersByToken(collectionAddress: string, tokenId: number): Promise<Offer[]> {
    const now = Math.floor(Date.now() / 1000);
    return db.select().from(offers)
      .where(and(
        eq(offers.collectionAddress, collectionAddress.toLowerCase()),
        eq(offers.tokenId, tokenId),
        eq(offers.status, 'pending'),
        gte(offers.expiration, now)
      ))
      .orderBy(desc(offers.createdAt));
  }

  async getOffersByBuyer(buyerAddress: string): Promise<Offer[]> {
    return db.select().from(offers)
      .where(eq(offers.buyerAddress, buyerAddress.toLowerCase()))
      .orderBy(desc(offers.createdAt));
  }

  async getOffersBySeller(sellerAddress: string): Promise<Offer[]> {
    return db.select().from(offers)
      .where(eq(offers.sellerAddress, sellerAddress.toLowerCase()))
      .orderBy(desc(offers.createdAt));
  }

  async updateOfferStatus(id: number, status: string, transactionHash?: string): Promise<Offer | undefined> {
    const updateData: Partial<Offer> = { status, updatedAt: new Date() };
    if (transactionHash) {
      updateData.transactionHash = transactionHash;
    }
    const [result] = await db.update(offers)
      .set(updateData)
      .where(eq(offers.id, id))
      .returning();
    return result;
  }

  async getActiveOffers(collectionAddress: string): Promise<Offer[]> {
    const now = Math.floor(Date.now() / 1000);
    return db.select().from(offers)
      .where(and(
        eq(offers.collectionAddress, collectionAddress.toLowerCase()),
        eq(offers.status, 'pending'),
        gte(offers.expiration, now)
      ))
      .orderBy(desc(offers.createdAt));
  }

  async cleanupExpiredOffers(): Promise<number> {
    const now = Math.floor(Date.now() / 1000);
    const result = await db.update(offers)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(and(
        eq(offers.status, 'pending'),
        lte(offers.expiration, now)
      ))
      .returning();
    return result.length;
  }

  // ============================================
  // MARKETPLACE OVERHAUL: Listings
  // ============================================

  async getActiveListings(collectionAddress?: string): Promise<Listing[]> {
    if (collectionAddress) {
      return db.select().from(listings)
        .where(and(
          eq(listings.collectionAddress, collectionAddress.toLowerCase()),
          eq(listings.isActive, true)
        ))
        .orderBy(desc(listings.listedAt));
    }
    return db.select().from(listings)
      .where(eq(listings.isActive, true))
      .orderBy(desc(listings.listedAt));
  }

  async getListingByToken(collectionAddress: string, tokenId: number): Promise<Listing | undefined> {
    const [result] = await db.select().from(listings)
      .where(and(
        eq(listings.collectionAddress, collectionAddress.toLowerCase()),
        eq(listings.tokenId, tokenId),
        eq(listings.isActive, true)
      ));
    return result;
  }

  async getMarketplaceSummary(tokenIds: number[], collectionAddress: string): Promise<{ listings: Listing[]; offers: Offer[] }> {
    const normalizedCollection = collectionAddress.toLowerCase();
    const now = Math.floor(Date.now() / 1000);
    
    const [listingsResult, offersResult] = await Promise.all([
      db.select().from(listings)
        .where(and(
          eq(listings.collectionAddress, normalizedCollection),
          eq(listings.isActive, true),
          sql`${listings.tokenId} = ANY(${tokenIds})`
        )),
      db.select().from(offers)
        .where(and(
          eq(offers.collectionAddress, normalizedCollection),
          eq(offers.status, 'pending'),
          gte(offers.expiration, now),
          sql`${offers.tokenId} = ANY(${tokenIds})`
        ))
    ]);
    
    return { listings: listingsResult, offers: offersResult };
  }
}

export const storage = new DatabaseStorage();
