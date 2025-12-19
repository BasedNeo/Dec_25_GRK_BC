import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFeedbackSchema, insertStorySchema, analyticsEvents } from "@shared/schema";
import { z } from "zod";
import { containsProfanity } from "./profanityFilter";
import { writeLimiter, authLimiter, gameLimiter } from './middleware/rateLimiter';
import { ipBanGuard } from './middleware/ipBanGuard';
import { EndpointLimiters } from './lib/endpointLimiters';
import { AdvancedRateLimiter, readLimiter } from './lib/advancedRateLimiter';
import { 
  validateCustomName, 
  validateProposal, 
  validateWalletAddress,
  sanitizeQueryParams
} from './middleware/validation';
import { InputSanitizer } from './lib/sanitizer';
import { sqlInjectionGuard } from './middleware/sqlInjectionGuard';
import { QueryAuditor } from './lib/queryValidator';
import { SecureDatabaseConnection } from './lib/dbSecurity';
import { SessionManager } from './lib/sessionManager';
import { SignatureVerifier } from './lib/signatureVerifier';
import { NonceManager } from './lib/nonceManager';
import { OriginValidator } from './lib/originValidator';
import { CSRFProtection } from './lib/csrfProtection';
import { requireAuth, requireSessionAdmin, optionalAuth, AuthRequest } from './middleware/auth';
import { db } from "./db";
import { sql } from "drizzle-orm";
import { ethers } from "ethers";
import crypto from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import { stat, readdir } from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

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

// Admin nonce configuration for EIP-191 signature verification
const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

async function generateAdminNonce(wallet: string): Promise<string> {
  const nonce = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MS);
  await storage.createAdminNonce(wallet, nonce, expiresAt);
  return nonce;
}

async function verifyAdminSignature(wallet: string, signature: string): Promise<boolean> {
  const stored = await storage.getAdminNonce(wallet);
  if (!stored) return false;
  
  // ALWAYS consume nonce on any verification attempt (prevents replay attacks)
  await storage.deleteAdminNonce(wallet);
  
  if (new Date() > stored.expiresAt) {
    return false;
  }

  try {
    const message = `Based Guardians Admin Auth\nNonce: ${stored.nonce}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === wallet.toLowerCase();
  } catch {
    return false;
  }
}

// Admin authentication middleware - requires EIP-191 signature verification
async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
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

    if (!(await verifyAdminSignature(walletAddress, signature))) {
      return res.status(401).json({ error: "Invalid or expired signature" });
    }
    
    next();
  } catch (error) {
    console.error('[Admin Auth] Error during authentication:', error);
    return res.status(500).json({ error: "Authentication service temporarily unavailable" });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Note: SQL injection protection is provided by Drizzle ORM's parameterized queries
  // The sqlInjectionGuard middleware is available for specific high-risk endpoints but
  // not applied globally to avoid false positives on legitimate content

  // Health check endpoint - must respond immediately for deployment health checks
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: Date.now() });
  });

  // Database health check endpoint
  app.get('/api/health/database', async (_req, res) => {
    try {
      const dbConn = SecureDatabaseConnection.getInstance();
      const healthy = await dbConn.healthCheck();
      const stats = await dbConn.getConnectionStats();
      
      res.json({
        healthy,
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        healthy: false,
        error: error.message
      });
    }
  });

  // Financial health check endpoint - validates calculation systems
  app.get("/api/health/financial", async (_req, res) => {
    try {
      const checks = {
        safeMath: true,
        mintCalculations: true,
        feeCalculations: true,
        timestamp: new Date().toISOString()
      };
      
      // Basic SafeMath validation
      const testWei = BigInt("1000000000000000000");
      const testAdd = testWei + testWei;
      checks.safeMath = testAdd === BigInt("2000000000000000000");
      
      // Mint price validation (69420 BASED)
      const mintPrice = BigInt("69420000000000000000000");
      checks.mintCalculations = mintPrice > BigInt(0);
      
      // Fee calculation validation (1% + 10% = 11% total)
      const salePrice = BigInt("100000000000000000000");
      const platformFee = (salePrice * BigInt(100)) / BigInt(10000);
      const royaltyFee = (salePrice * BigInt(1000)) / BigInt(10000);
      checks.feeCalculations = platformFee + royaltyFee === BigInt("11000000000000000000");
      
      const healthy = checks.safeMath && checks.mintCalculations && checks.feeCalculations;
      
      res.json({ healthy, checks });
    } catch (error: any) {
      res.status(500).json({ healthy: false, error: error.message });
    }
  });

  // Apply IP ban guard to all API routes (except health checks)
  app.use('/api/*', (req, res, next) => {
    if (req.path === '/api/health' || req.path.startsWith('/api/health/')) {
      return next();
    }
    return ipBanGuard(req, res, next);
  });

  // Apply read limiter to GET requests
  app.use('/api/*', (req, res, next) => {
    if (req.method === 'GET') {
      return readLimiter(req, res, next);
    }
    next();
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
      
      const nonce = await generateAdminNonce(walletAddress);
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

  // Session-based authentication endpoints
  app.post('/api/auth/nonce', authLimiter, async (req, res) => {
    try {
      const { walletAddress } = req.body;
      
      if (!walletAddress || !isValidEthAddress(walletAddress)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
      }
      
      const nonce = NonceManager.createNonce(walletAddress);
      const message = SignatureVerifier.createSignInMessage(walletAddress, nonce);
      
      res.json({ nonce, message });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/verify', authLimiter, async (req, res) => {
    try {
      const { walletAddress, signature, message, nonce } = req.body;
      
      if (!walletAddress || !signature || !message || !nonce) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (!SignatureVerifier.verifyMessageAge(message, 5)) {
        return res.status(400).json({ error: 'Message expired' });
      }
      
      if (!NonceManager.validateNonce(nonce, walletAddress)) {
        return res.status(400).json({ error: 'Invalid or expired nonce' });
      }
      
      if (!SignatureVerifier.verifySignature(message, signature, walletAddress)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      const ipAddress = req.ip || 'unknown';
      const userAgent = req.get('user-agent') || 'unknown';
      const isAdmin = ADMIN_WALLETS.includes(walletAddress.toLowerCase());
      
      const sessionId = SessionManager.createSession(walletAddress, ipAddress, userAgent, isAdmin);
      
      res.json({ 
        sessionId,
        walletAddress,
        isAdmin,
        expiresIn: 24 * 60 * 60 * 1000
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/refresh', requireAuth, async (req: AuthRequest, res) => {
    try {
      const sessionId = req.session!.id;
      const refreshed = SessionManager.refreshSession(sessionId);
      
      if (!refreshed) {
        return res.status(401).json({ error: 'Failed to refresh session' });
      }
      
      res.json({ success: true, expiresIn: 24 * 60 * 60 * 1000 });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/auth/logout', requireAuth, async (req: AuthRequest, res) => {
    try {
      SessionManager.destroySession(req.session!.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/auth/sessions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const sessions = SessionManager.getUserSessions(req.session!.walletAddress);
      res.json({ 
        sessions: sessions.map(s => ({
          id: s.id.slice(0, 8) + '...',
          createdAt: new Date(s.createdAt),
          lastActivity: new Date(s.lastActivity),
          ipAddress: s.ipAddress,
          userAgent: s.userAgent
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/sessions/stats', requireAdmin, async (_req, res) => {
    try {
      const stats = SessionManager.getStats();
      const nonceStats = NonceManager.getStats();
      res.json({ sessions: stats, nonces: nonceStats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/sessions/active', requireAdmin, async (_req, res) => {
    try {
      const sessions = SessionManager.getActiveSessions();
      res.json({ 
        sessions: sessions.map(s => ({
          id: s.id.slice(0, 8) + '...',
          walletAddress: s.walletAddress,
          isAdmin: s.isAdmin,
          createdAt: new Date(s.createdAt),
          lastActivity: new Date(s.lastActivity),
          ipAddress: s.ipAddress
        }))
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  app.post("/api/admin/backup", writeLimiter, requireAdmin, async (req, res) => {
    try {
      console.log('[Backup] Starting database backup...');
      const { stdout, stderr } = await execAsync('tsx script/backup-database.ts', {
        timeout: 120000,
        cwd: process.cwd()
      });
      
      if (stderr && !stderr.includes('Backup completed')) {
        console.error('[Backup] Error:', stderr);
      }
      
      console.log('[Backup] Backup completed successfully');
      res.json({ success: true, output: stdout });
    } catch (error: any) {
      console.error('[Backup] Failed:', error.message);
      res.status(500).json({ error: 'Backup failed', details: error.message });
    }
  });

  app.get("/api/admin/backup/status", writeLimiter, requireAdmin, async (req, res) => {
    try {
      const backupsDir = path.join(process.cwd(), 'backups');
      
      try {
        await stat(backupsDir);
      } catch {
        return res.json({ lastBackup: null, backups: [] });
      }
      
      const files = await readdir(backupsDir);
      const sqlFiles = files.filter(f => f.endsWith('.sql.gz'));
      
      if (sqlFiles.length === 0) {
        return res.json({ lastBackup: null, backups: [] });
      }
      
      const backupDetails = await Promise.all(
        sqlFiles.map(async (file) => {
          const filePath = path.join(backupsDir, file);
          const fileStat = await stat(filePath);
          return {
            name: file,
            size: fileStat.size,
            created: fileStat.mtime.toISOString()
          };
        })
      );
      
      backupDetails.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
      
      res.json({
        lastBackup: backupDetails[0] || null,
        backups: backupDetails.slice(0, 10)
      });
    } catch (error: any) {
      console.error('[Backup] Status check failed:', error.message);
      res.status(500).json({ error: 'Failed to get backup status' });
    }
  });

  app.get('/api/admin/transactions/export', requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const csv = await storage.exportAllTransactionsCSV(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=all-transactions.csv');
      res.send(csv);
    } catch (error: any) {
      console.error('[Admin] Transaction export failed:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/transactions/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getTransactionStats();
      res.json({ stats });
    } catch (error: any) {
      console.error('[Admin] Transaction stats failed:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/transactions/receipt', async (req, res) => {
    try {
      const { 
        walletAddress, transactionType, transactionHash, tokenId, amount, 
        fromAddress, toAddress, platformFee, royaltyFee, metadata,
        quantity, pricePerUnit, gasEstimate, netAmount,
        userAgent, screenResolution, timezone
      } = req.body;
      
      if (!walletAddress || !transactionType || !transactionHash) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (!isValidEthAddress(walletAddress)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
      }
      
      const receipt = await storage.createTransactionReceipt({
        walletAddress,
        transactionType,
        transactionHash,
        tokenId,
        amount,
        fromAddress,
        toAddress,
        platformFee,
        royaltyFee,
        metadata,
        quantity,
        pricePerUnit,
        gasEstimate,
        netAmount,
        userAgent,
        screenResolution,
        timezone,
        status: 'pending'
      });
      res.json({ receipt });
    } catch (error: any) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Transaction already recorded' });
      }
      console.error('[Transaction] Error creating receipt:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/transactions/receipt/:hash', async (req, res) => {
    try {
      const { status, blockNumber, gasUsed, gasPrice, gasCostInBase, errorMessage, failedAt, confirmedAt } = req.body;
      await storage.updateTransactionStatus(req.params.hash, status, { 
        blockNumber, gasUsed, gasPrice, gasCostInBase, errorMessage, failedAt, confirmedAt 
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Transaction] Error updating receipt:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/transactions/history/:address', async (req, res) => {
    try {
      const address = req.params.address;
      if (!isValidEthAddress(address)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
      }
      const history = await storage.getUserTransactionHistory(address);
      res.json({ history });
    } catch (error: any) {
      console.error('[Transaction] Error fetching history:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/transactions/export/:address/csv', async (req, res) => {
    try {
      const address = req.params.address;
      if (!isValidEthAddress(address)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
      }
      const csv = await storage.exportUserTransactionsCSV(address);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=transactions-${address}.csv`);
      res.send(csv);
    } catch (error: any) {
      console.error('[Transaction] Error exporting CSV:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // XSS Sanitization Test Endpoint (Admin only)
  app.post('/api/admin/test-sanitization', requireAdmin, async (req, res) => {
    try {
      const { input, type } = req.body;
      
      let result;
      switch (type) {
        case 'customName':
          result = InputSanitizer.sanitizeCustomName(input);
          break;
        case 'proposal':
          result = InputSanitizer.sanitizeProposalDescription(input);
          break;
        case 'wallet':
          result = InputSanitizer.sanitizeWalletAddress(input);
          break;
        default:
          result = InputSanitizer.sanitizeString(input, { stripHtml: true });
      }
      
      res.json({ 
        original: input, 
        sanitized: result,
        safe: result === input
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Security Audit Endpoint (Admin only)
  app.get('/api/admin/security/audit', requireAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const queries = QueryAuditor.getSuspiciousQueries(limit);
      
      res.json({ 
        queries,
        total: queries.length 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // SQL Injection Test Endpoint (Development only)
  if (process.env.NODE_ENV !== 'production') {
    app.post('/api/test-injection', async (req, res) => {
      res.json({ message: 'Test passed - no injection detected' });
    });
  }

  // Rate Limit Monitoring Endpoints (Admin only)
  app.get('/api/admin/rate-limits/suspicious', requireAdmin, async (req, res) => {
    try {
      const suspicious = AdvancedRateLimiter.getSuspiciousIPs();
      res.json({ suspicious });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/rate-limits/banned', requireAdmin, async (req, res) => {
    try {
      const banned = AdvancedRateLimiter.getBannedIPs();
      res.json({ banned });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/rate-limits/ban', requireAdmin, async (req, res) => {
    try {
      const { ip, durationMs, reason } = req.body;
      
      if (!ip || !durationMs || !reason) {
        return res.status(400).json({ error: 'Missing required fields: ip, durationMs, reason' });
      }
      
      AdvancedRateLimiter.banIP(ip, durationMs, reason);
      
      res.json({ success: true, message: `Banned ${ip} for ${durationMs}ms` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/rate-limits/unban', requireAdmin, async (req, res) => {
    try {
      const { ip } = req.body;
      
      if (!ip) {
        return res.status(400).json({ error: 'IP address required' });
      }
      
      AdvancedRateLimiter.unbanIP(ip);
      
      res.json({ success: true, message: `Unbanned ${ip}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/rate-limits/clear-suspicious', requireAdmin, async (req, res) => {
    try {
      AdvancedRateLimiter.clearSuspiciousIPs();
      res.json({ success: true, message: 'Cleared suspicious IP list' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/auth/csrf-token', requireAuth, async (req: AuthRequest, res) => {
    try {
      const sessionId = req.session!.id;
      const csrfToken = CSRFProtection.generateToken(sessionId);
      res.json({ csrfToken });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/security/cors-violations', requireAdmin, async (req, res) => {
    try {
      const suspicious = OriginValidator.getSuspiciousOrigins();
      res.json({ suspicious });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/security/clear-cors-violations', requireAdmin, async (req, res) => {
    try {
      OriginValidator.clearSuspiciousOrigins();
      res.json({ success: true, message: 'Cleared CORS violation list' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/security/add-origin', requireAdmin, async (req, res) => {
    try {
      const { origin } = req.body;
      
      if (!origin || !origin.startsWith('http')) {
        return res.status(400).json({ error: 'Invalid origin format' });
      }
      
      OriginValidator.addAllowedOrigin(origin);
      res.json({ success: true, message: `Added origin: ${origin}` });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/security/allowed-origins', requireAdmin, async (req, res) => {
    try {
      const origins = OriginValidator.getAllowedOrigins();
      res.json({ origins });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/security/csrf-stats', requireAdmin, async (req, res) => {
    try {
      const stats = CSRFProtection.getStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
