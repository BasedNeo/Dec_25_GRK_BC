import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFeedbackSchema, insertStorySchema, analyticsEvents } from "@shared/schema";
import { z } from "zod";
import { containsProfanity } from "./profanityFilter";
import { writeLimiter, authLimiter, gameLimiter } from './middleware/rateLimiter';
import { db } from "./db";
import { sql } from "drizzle-orm";
import { ethers } from "ethers";
import crypto from "crypto";

const FEEDBACK_EMAIL = "team@BasedGuardians.trade";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BN_placeholder_key_for_development';

// Ethereum address validation regex (checksummed or lowercase)
const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function isValidEthAddress(address: string): boolean {
  return ETH_ADDRESS_REGEX.test(address);
}

// Sanitize text input - strip HTML tags and dangerous characters
function sanitizeInput(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .trim();
}

const ADMIN_WALLETS = [
  "0xae543104fdbe456478e19894f7f0e01f0971c9b4",
  "0xb1362caf09189887599ed40f056712b1a138210c",
  "0xabce9e63a9ae51e215bb10c9648f4c0f400c5847",
  "0xbba49256a93a06fcf3b0681fead2b4e3042b9124",
  "0xc5ca5cb0acf8f7d4c6cd307d0d875ee2e09fb1af"
];

// Admin nonce store for EIP-191 signature verification
// Map: wallet address -> { nonce, expiry }
const adminNonces = new Map<string, { nonce: string; expiry: number }>();
const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function generateAdminNonce(wallet: string): string {
  const nonce = crypto.randomBytes(32).toString('hex');
  adminNonces.set(wallet.toLowerCase(), {
    nonce,
    expiry: Date.now() + NONCE_EXPIRY_MS
  });
  return nonce;
}

function verifyAdminSignature(wallet: string, signature: string): boolean {
  const stored = adminNonces.get(wallet.toLowerCase());
  if (!stored) return false;
  if (Date.now() > stored.expiry) {
    adminNonces.delete(wallet.toLowerCase());
    return false;
  }

  try {
    const message = `Based Guardians Admin Auth\nNonce: ${stored.nonce}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);
    const isValid = recoveredAddress.toLowerCase() === wallet.toLowerCase();
    
    if (isValid) {
      // Invalidate nonce after successful use (one-time use)
      adminNonces.delete(wallet.toLowerCase());
    }
    return isValid;
  } catch {
    return false;
  }
}

// Admin authentication middleware - requires EIP-191 signature verification
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const walletAddress = req.headers['x-wallet-address'] as string;
  const signature = req.headers['x-admin-signature'] as string;
  
  if (!walletAddress) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (!isValidEthAddress(walletAddress)) {
    return res.status(400).json({ error: "Invalid wallet address format" });
  }
  
  if (!ADMIN_WALLETS.includes(walletAddress.toLowerCase())) {
    return res.status(403).json({ error: "Admin access required" });
  }

  // Verify EIP-191 signature
  if (!signature) {
    return res.status(401).json({ error: "Signature required for admin access" });
  }

  if (!verifyAdminSignature(walletAddress, signature)) {
    return res.status(401).json({ error: "Invalid or expired signature" });
  }
  
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check endpoint - must respond immediately for deployment health checks
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: Date.now() });
  });

  // Admin auth nonce endpoint - get a nonce for signing
  app.post("/api/admin/nonce", authLimiter, async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress || !isValidEthAddress(walletAddress)) {
        return res.status(400).json({ error: "Valid wallet address required" });
      }
      
      if (!ADMIN_WALLETS.includes(walletAddress.toLowerCase())) {
        return res.status(403).json({ error: "Not an admin wallet" });
      }
      
      const nonce = generateAdminNonce(walletAddress);
      const message = `Based Guardians Admin Auth\nNonce: ${nonce}`;
      
      return res.json({ 
        nonce, 
        message,
        expiresIn: NONCE_EXPIRY_MS / 1000 
      });
    } catch (error) {
      console.error("[Admin] Error generating nonce:", error);
      return res.status(500).json({ error: "Failed to generate nonce" });
    }
  });

  // Feedback submission endpoint
  app.post("/api/feedback", writeLimiter, async (req, res) => {
    try {
      const parsed = insertFeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid feedback data", details: parsed.error.errors });
      }

      // Sanitize inputs and check for profanity
      const sanitizedMessage = sanitizeInput(parsed.data.message);
      if (containsProfanity(sanitizedMessage)) {
        return res.status(400).json({ error: "Message contains inappropriate content" });
      }

      const feedbackEntry = await storage.createFeedback({
        ...parsed.data,
        message: sanitizedMessage,
      });

      if (parsed.data.email) {
        await storage.addEmail(parsed.data.email, 'feedback');
      }

      console.log(`[Feedback] New submission saved. ID: ${feedbackEntry.id}`);

      return res.status(201).json({ 
        success: true, 
        message: "Feedback received successfully",
        id: feedbackEntry.id 
      });
    } catch (error) {
      console.error("[Feedback] Error saving feedback:", error);
      return res.status(500).json({ error: "Failed to save feedback" });
    }
  });

  // Get all feedback (admin endpoint - requires admin authentication)
  app.get("/api/feedback", requireAdmin, async (req, res) => {
    try {
      const allFeedback = await storage.getAllFeedback();
      return res.json(allFeedback);
    } catch (error) {
      console.error("[Feedback] Error fetching feedback:", error);
      return res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  // Story submission endpoint
  app.post("/api/stories", writeLimiter, async (req, res) => {
    try {
      const parsed = insertStorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid story data", details: parsed.error.errors });
      }

      // Sanitize inputs
      const sanitizedTitle = sanitizeInput(parsed.data.title);
      const sanitizedContent = sanitizeInput(parsed.data.content);

      // Check for profanity in title and content
      if (containsProfanity(sanitizedTitle) || containsProfanity(sanitizedContent)) {
        return res.status(400).json({ error: "Story contains inappropriate content" });
      }

      // Validate 500 word limit (after sanitization)
      const wordCount = sanitizedContent.trim().split(/\s+/).length;
      if (wordCount > 500) {
        return res.status(400).json({ error: `Story exceeds 500 word limit (${wordCount} words)` });
      }

      const storyEntry = await storage.createStorySubmission({
        ...parsed.data,
        title: sanitizedTitle,
        content: sanitizedContent,
      });

      if (parsed.data.email) {
        await storage.addEmail(parsed.data.email, 'story');
      }

      console.log(`[Story] New submission saved. ID: ${storyEntry.id}`);

      return res.status(201).json({ 
        success: true, 
        message: "Story submitted successfully",
        id: storyEntry.id 
      });
    } catch (error) {
      console.error("[Story] Error saving story:", error);
      return res.status(500).json({ error: "Failed to save story" });
    }
  });

  // Get all story submissions (admin endpoint - requires admin authentication)
  app.get("/api/stories", requireAdmin, async (req, res) => {
    try {
      const allStories = await storage.getAllStorySubmissions();
      return res.json(allStories);
    } catch (error) {
      console.error("[Story] Error fetching stories:", error);
      return res.status(500).json({ error: "Failed to fetch stories" });
    }
  });

  // Push Notification Endpoints
  app.get("/api/push/vapid-public-key", (req, res) => {
    return res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  app.post("/api/push/subscribe", writeLimiter, async (req, res) => {
    try {
      const subscribeSchema = z.object({
        walletAddress: z.string().min(1).refine(isValidEthAddress, {
          message: "Invalid Ethereum wallet address format"
        }),
        endpoint: z.string().url(),
        p256dh: z.string().min(1),
        auth: z.string().min(1),
        notifyListings: z.boolean().optional().default(true),
        notifyOffers: z.boolean().optional().default(true),
        notifySales: z.boolean().optional().default(true),
      });

      const parsed = subscribeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid subscription data", details: parsed.error.errors });
      }

      const subscription = await storage.createPushSubscription({
        ...parsed.data,
        walletAddress: parsed.data.walletAddress.toLowerCase(),
      });

      console.log(`[Push] New subscription for wallet: ${parsed.data.walletAddress}`);
      return res.status(201).json({ success: true, id: subscription.id });
    } catch (error) {
      console.error("[Push] Error creating subscription:", error);
      return res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  app.delete("/api/push/unsubscribe", writeLimiter, async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint required" });
      }

      await storage.deletePushSubscription(endpoint);
      console.log(`[Push] Subscription removed`);
      return res.json({ success: true });
    } catch (error) {
      console.error("[Push] Error removing subscription:", error);
      return res.status(500).json({ error: "Failed to remove subscription" });
    }
  });

  app.get("/api/push/status/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const subscriptions = await storage.getPushSubscriptionsByWallet(walletAddress.toLowerCase());
      return res.json({ 
        subscribed: subscriptions.length > 0,
        count: subscriptions.length,
        preferences: subscriptions[0] ? {
          notifyListings: subscriptions[0].notifyListings,
          notifyOffers: subscriptions[0].notifyOffers,
          notifySales: subscriptions[0].notifySales,
        } : null
      });
    } catch (error) {
      console.error("[Push] Error checking status:", error);
      return res.status(500).json({ error: "Failed to check status" });
    }
  });

  app.patch("/api/push/preferences", writeLimiter, async (req, res) => {
    try {
      const { endpoint, notifyListings, notifyOffers, notifySales } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint required" });
      }

      const updated = await storage.updatePushSubscriptionPreferences(endpoint, {
        notifyListings,
        notifyOffers,
        notifySales,
      });

      if (!updated) {
        return res.status(404).json({ error: "Subscription not found" });
      }

      return res.json({ success: true, preferences: updated });
    } catch (error) {
      console.error("[Push] Error updating preferences:", error);
      return res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // Email list (admin endpoint - requires admin authentication)
  app.get("/api/emails", requireAdmin, async (req, res) => {
    try {
      const emails = await storage.getAllEmails();
      const emailCount = await storage.getEmailCount();
      return res.json({ emails, count: emailCount, maxLimit: 4000 });
    } catch (error) {
      console.error("[Emails] Error fetching emails:", error);
      return res.status(500).json({ error: "Failed to fetch emails" });
    }
  });

  // Email CSV export (admin endpoint - requires admin authentication)
  app.get("/api/emails/csv", requireAdmin, async (req, res) => {
    try {
      const emails = await storage.getAllEmails();
      const csvHeader = "email,source,created_at\n";
      const csvRows = emails.map(e => 
        `"${e.email}","${e.source}","${e.createdAt.toISOString()}"`
      ).join("\n");
      const csv = csvHeader + csvRows;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=email_list.csv');
      return res.send(csv);
    } catch (error) {
      console.error("[Emails] Error exporting CSV:", error);
      return res.status(500).json({ error: "Failed to export emails" });
    }
  });

  // Guardian Profile endpoints
  app.post("/api/profile/login", authLimiter, async (req, res) => {
    try {
      const schema = z.object({
        walletAddress: z.string().min(10),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid wallet address" });
      }

      const result = await storage.getOrCreateGuardianProfile(parsed.data.walletAddress);
      
      return res.json({
        profile: result.profile,
        isNew: result.isNew,
        showWelcomeBack: !result.isNew && result.hoursSinceLastLogin >= 24,
        hoursSinceLastLogin: Math.floor(result.hoursSinceLastLogin),
      });
    } catch (error) {
      console.error("[Profile] Error on login:", error);
      return res.status(500).json({ error: "Failed to process login" });
    }
  });

  app.get("/api/profile/:walletAddress", async (req, res) => {
    try {
      const profile = await storage.getGuardianProfile(req.params.walletAddress);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      return res.json(profile);
    } catch (error) {
      console.error("[Profile] Error fetching profile:", error);
      return res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/profile/name", authLimiter, writeLimiter, async (req, res) => {
    try {
      const schema = z.object({
        walletAddress: z.string().min(10),
        customName: z.string().min(2).max(16).nullable(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Name must be 2-16 characters" });
      }

      if (parsed.data.customName) {
        if (containsProfanity(parsed.data.customName)) {
          return res.status(400).json({ error: "This name contains inappropriate content" });
        }
        const isTaken = await storage.isNameTaken(parsed.data.customName, parsed.data.walletAddress);
        if (isTaken) {
          return res.status(409).json({ error: "This name is already taken" });
        }
      }

      const updated = await storage.setCustomName(parsed.data.walletAddress, parsed.data.customName);
      if (!updated) {
        return res.status(400).json({ error: "Failed to update name. Name may be invalid or taken." });
      }

      return res.json({ success: true, profile: updated });
    } catch (error) {
      console.error("[Profile] Error setting name:", error);
      return res.status(500).json({ error: "Failed to set name" });
    }
  });

  app.get("/api/profile/check-name/:name", async (req, res) => {
    try {
      const name = req.params.name;
      const excludeWallet = req.query.exclude as string | undefined;
      
      console.log(`[Profile] Checking name availability: "${name}"`);
      
      if (!name || name.length < 2) {
        return res.json({ available: false, error: "Name must be at least 2 characters" });
      }
      
      if (name.length > 16) {
        return res.json({ available: false, error: "Name must be 16 characters or less" });
      }
      
      if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
        return res.json({ available: false, error: "Name can only contain letters, numbers, underscore, and hyphen" });
      }
      
      if (containsProfanity(name)) {
        return res.json({ available: false, error: "This name contains inappropriate content" });
      }
      
      const isTaken = await storage.isNameTaken(name, excludeWallet);
      console.log(`[Profile] Name "${name}" available: ${!isTaken}`);
      return res.json({ available: !isTaken });
    } catch (error) {
      console.error("[Profile] Error checking name:", error);
      return res.json({ available: false, error: "Database temporarily unavailable" });
    }
  });

  app.post("/api/diamond-hands/update", writeLimiter, async (req, res) => {
    try {
      const schema = z.object({
        walletAddress: z.string().min(10),
        customName: z.string().max(20).nullable().optional(),
        daysHolding: z.number().min(0),
        retentionRate: z.number().min(0).max(100),
        currentHolding: z.number().min(0),
        totalAcquired: z.number().min(0),
        totalSold: z.number().min(0),
        level: z.number().min(0).max(5),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data" });
      }

      const result = await storage.upsertDiamondHandsStats(parsed.data);
      return res.json({ success: true, stats: result });
    } catch (error) {
      console.error("[DiamondHands] Error updating stats:", error);
      return res.status(500).json({ error: "Failed to update stats" });
    }
  });

  app.get("/api/diamond-hands/leaderboard", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const leaderboard = await storage.getDiamondHandsLeaderboard(limit);
      return res.json(leaderboard);
    } catch (error) {
      console.error("[DiamondHands] Error fetching leaderboard:", error);
      return res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Proposal Endpoints (Off-chain governance)
  const ADMIN_WALLETS = [
    '0xAe543104fDBe456478E19894f7F0e01f0971c9B4',
    '0x50F20d5f17706e4F3f11E87dc8B1ae2DE8a9F66F'
  ].map(w => w.toLowerCase());

  const isAdminWallet = (wallet: string | undefined): boolean => {
    if (!wallet) return false;
    return ADMIN_WALLETS.includes(wallet.toLowerCase());
  };

  app.get("/api/proposals", async (req, res) => {
    try {
      const proposals = await storage.getActiveProposals();
      return res.json(proposals);
    } catch (error) {
      console.error("[Proposals] Error fetching:", error);
      return res.status(500).json({ error: "Failed to fetch proposals" });
    }
  });

  app.get("/api/proposals/:id", async (req, res) => {
    try {
      const proposal = await storage.getProposalById(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      return res.json(proposal);
    } catch (error) {
      console.error("[Proposals] Error fetching proposal:", error);
      return res.status(500).json({ error: "Failed to fetch proposal" });
    }
  });

  app.post("/api/proposals", writeLimiter, async (req, res) => {
    try {
      const { title, description, proposer, durationDays, category, requiredQuorum } = req.body;
      
      if (!ADMIN_WALLETS.includes(proposer?.toLowerCase())) {
        return res.status(403).json({ error: "Only admins can create proposals" });
      }

      if (!title || title.length < 10) {
        return res.status(400).json({ error: "Title must be at least 10 characters" });
      }

      if (!description || description.length < 50) {
        return res.status(400).json({ error: "Description must be at least 50 characters" });
      }

      if (!durationDays || durationDays < 1 || durationDays > 30) {
        return res.status(400).json({ error: "Duration must be between 1 and 30 days" });
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      const proposal = await storage.createProposal({
        title,
        description,
        proposer,
        endDate,
        category: category || 'general',
        requiredQuorum: requiredQuorum || 10,
      });

      console.log(`[Proposals] Created new proposal #${proposal.id} by ${proposer}`);
      return res.json({ success: true, proposal });
    } catch (error) {
      console.error("[Proposals] Error creating:", error);
      return res.status(500).json({ error: "Failed to create proposal" });
    }
  });

  app.delete("/api/proposals/:id", writeLimiter, async (req, res) => {
    try {
      const { walletAddress, confirmations } = req.body;

      if (!ADMIN_WALLETS.includes(walletAddress?.toLowerCase())) {
        return res.status(403).json({ error: "Only admins can delete proposals" });
      }

      if (confirmations !== 3) {
        return res.status(400).json({ error: "Must confirm deletion 3 times" });
      }

      const success = await storage.deleteProposal(req.params.id);
      if (!success) {
        return res.status(500).json({ error: "Failed to delete proposal" });
      }

      console.log(`[Proposals] Deleted proposal #${req.params.id} by ${walletAddress}`);
      return res.json({ success: true });
    } catch (error) {
      console.error("[Proposals] Error deleting:", error);
      return res.status(500).json({ error: "Failed to delete proposal" });
    }
  });

  app.post("/api/proposals/:id/vote", writeLimiter, async (req, res) => {
    try {
      const proposalId = req.params.id;
      const { voter, vote, votingPower } = req.body;

      if (!voter || !vote) {
        return res.status(400).json({ error: "Missing voter or vote" });
      }

      if (vote !== 'for' && vote !== 'against') {
        return res.status(400).json({ error: "Vote must be 'for' or 'against'" });
      }

      const proposal = await storage.getProposalById(proposalId);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      if (proposal.status !== 'active') {
        return res.status(400).json({ error: "Proposal is not active" });
      }

      if (new Date() > new Date(proposal.endDate)) {
        return res.status(400).json({ error: "Voting period has ended" });
      }

      const nftBalance = votingPower || 1;
      
      const success = await storage.castVote(proposalId, voter, vote, nftBalance);
      if (!success) {
        return res.status(500).json({ error: "Failed to cast vote" });
      }

      console.log(`[Proposals] ${voter} voted ${vote} on proposal #${proposalId}`);
      return res.json({ success: true });
    } catch (error) {
      console.error("[Proposals] Error voting:", error);
      return res.status(500).json({ error: "Failed to cast vote" });
    }
  });

  app.get("/api/proposals/:id/vote/:voter", async (req, res) => {
    try {
      const proposalId = req.params.id;
      const voter = req.params.voter;

      const vote = await storage.getUserVote(proposalId, voter);
      return res.json({ vote });
    } catch (error) {
      console.error("[Proposals] Error fetching user vote:", error);
      return res.status(500).json({ error: "Failed to fetch vote" });
    }
  });

  // Race-to-Base Game Score Endpoints
  app.post("/api/game/score", gameLimiter, writeLimiter, async (req, res) => {
    try {
      const schema = z.object({
        walletAddress: z.string().min(10),
        score: z.number().min(0),
        level: z.number().min(1).max(5),
        customName: z.string().max(20).optional(),
      });
      
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid score data", details: parsed.error.errors });
      }

      const result = await storage.submitGameScore(
        parsed.data.walletAddress,
        parsed.data.score,
        parsed.data.level,
        parsed.data.customName
      );

      console.log(`[Game] Score submitted: ${parsed.data.walletAddress.slice(0, 8)}... - ${parsed.data.score} points`);
      return res.json({ success: true, stats: result });
    } catch (error) {
      console.error("[Game] Error submitting score:", error);
      return res.status(500).json({ error: "Failed to submit score" });
    }
  });

  app.get("/api/game/leaderboard", async (req, res) => {
    try {
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const leaderboard = await storage.getGameLeaderboard(limit);
      return res.json(leaderboard);
    } catch (error) {
      console.error("[Game] Error fetching leaderboard:", error);
      return res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/game/stats/:wallet", async (req, res) => {
    try {
      const stats = await storage.getPlayerGameStats(req.params.wallet);
      if (!stats) {
        return res.json({ exists: false, stats: null });
      }
      return res.json({ exists: true, stats });
    } catch (error) {
      console.error("[Game] Error fetching player stats:", error);
      return res.status(500).json({ error: "Failed to fetch player stats" });
    }
  });

  // Feature Flags Endpoints
  app.get("/api/feature-flags", async (req, res) => {
    try {
      const flags = await storage.getFeatureFlags();
      return res.json(flags);
    } catch (error) {
      console.error("[FeatureFlags] Error fetching flags:", error);
      return res.status(500).json({ error: "Failed to fetch feature flags" });
    }
  });

  app.post("/api/feature-flags/:key", writeLimiter, async (req, res) => {
    try {
      const { key } = req.params;
      const { enabled, walletAddress } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "enabled must be a boolean" });
      }

      if (!walletAddress || typeof walletAddress !== 'string') {
        return res.status(400).json({ error: "walletAddress required" });
      }

      const isAdmin = ADMIN_WALLETS.some(
        admin => admin.toLowerCase() === walletAddress.toLowerCase()
      );
      if (!isAdmin) {
        console.log(`[FeatureFlags] Unauthorized update attempt by ${walletAddress.slice(0, 8)}...`);
        return res.status(403).json({ error: "Unauthorized: Admin wallet required" });
      }

      const success = await storage.updateFeatureFlag(key, enabled, walletAddress);
      if (!success) {
        return res.status(500).json({ error: "Failed to update feature flag" });
      }

      console.log(`[FeatureFlags] ${key} set to ${enabled} by ${walletAddress.slice(0, 8)}...`);
      return res.json({ success: true, key, enabled });
    } catch (error) {
      console.error("[FeatureFlags] Error updating flag:", error);
      return res.status(500).json({ error: "Failed to update feature flag" });
    }
  });

  // Analytics Endpoints
  app.post("/api/analytics", async (req, res) => {
    try {
      const { events } = req.body;
      
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: 'Invalid events array' });
      }

      const eventRecords = events.map((e: any) => ({
        event: e.event,
        properties: JSON.stringify(e.properties || {}),
        sessionId: e.sessionId,
        userId: e.userId || null,
        timestamp: e.timestamp,
      }));

      await db.insert(analyticsEvents).values(eventRecords);
      
      console.log(`[Analytics] Stored ${events.length} events`);
      res.json({ success: true, count: events.length });
    } catch (error: any) {
      console.error('[Analytics] Error storing events:', error);
      res.status(500).json({ error: 'Failed to store analytics' });
    }
  });

  app.get("/api/analytics/summary", async (req, res) => {
    try {
      const events = await db
        .select({
          event: analyticsEvents.event,
          count: sql<number>`count(*)`,
          uniqueUsers: sql<number>`count(distinct ${analyticsEvents.userId})`,
        })
        .from(analyticsEvents)
        .where(sql`${analyticsEvents.createdAt} >= NOW() - INTERVAL '7 days'`)
        .groupBy(analyticsEvents.event);

      res.json({ events });
    } catch (error) {
      console.error('[Analytics] Error fetching summary:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  app.get("/api/analytics/conversions", async (req, res) => {
    try {
      const [
        mintStarted,
        mintCompleted,
        buyStarted,
        buyCompleted,
        offerStarted,
        offerCompleted,
      ] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(analyticsEvents).where(sql`event = 'mint_started' AND created_at >= NOW() - INTERVAL '7 days'`),
        db.select({ count: sql<number>`count(*)` }).from(analyticsEvents).where(sql`event = 'mint_completed' AND created_at >= NOW() - INTERVAL '7 days'`),
        db.select({ count: sql<number>`count(*)` }).from(analyticsEvents).where(sql`event = 'buy_started' AND created_at >= NOW() - INTERVAL '7 days'`),
        db.select({ count: sql<number>`count(*)` }).from(analyticsEvents).where(sql`event = 'buy_completed' AND created_at >= NOW() - INTERVAL '7 days'`),
        db.select({ count: sql<number>`count(*)` }).from(analyticsEvents).where(sql`event = 'offer_started' AND created_at >= NOW() - INTERVAL '7 days'`),
        db.select({ count: sql<number>`count(*)` }).from(analyticsEvents).where(sql`event = 'offer_completed' AND created_at >= NOW() - INTERVAL '7 days'`),
      ]);

      res.json({
        mint: {
          started: mintStarted[0]?.count || 0,
          completed: mintCompleted[0]?.count || 0,
          conversionRate: mintStarted[0]?.count ? ((mintCompleted[0]?.count || 0) / mintStarted[0].count * 100).toFixed(1) : 0,
        },
        buy: {
          started: buyStarted[0]?.count || 0,
          completed: buyCompleted[0]?.count || 0,
          conversionRate: buyStarted[0]?.count ? ((buyCompleted[0]?.count || 0) / buyStarted[0].count * 100).toFixed(1) : 0,
        },
        offer: {
          started: offerStarted[0]?.count || 0,
          completed: offerCompleted[0]?.count || 0,
          conversionRate: offerStarted[0]?.count ? ((offerCompleted[0]?.count || 0) / offerStarted[0].count * 100).toFixed(1) : 0,
        },
      });
    } catch (error) {
      console.error('[Analytics] Error fetching conversions:', error);
      res.status(500).json({ error: 'Failed to fetch conversions' });
    }
  });

  return httpServer;
}
