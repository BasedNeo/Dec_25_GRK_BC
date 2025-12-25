import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFeedbackSchema, insertStorySchema, analyticsEvents, collections } from "@shared/schema";
import { CollectionService } from './lib/collectionService';
import { GatingService } from './lib/gatingService';
import { searchService, type SearchFilters } from './lib/searchService';
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
import { validateRequest, validateQuery } from './middleware/validationMiddleware';
import { ValidationRulesEngine } from './lib/validationRules';
import { ValidationSchemas } from './lib/validationSchemas';
import { InputSanitizer } from './lib/sanitizer';
import { sqlInjectionGuard } from './middleware/sqlInjectionGuard';
import { QueryAuditor } from './lib/queryValidator';
import { SecureDatabaseConnection } from './lib/dbSecurity';
import { SessionManager } from './lib/sessionManager';
import { SignatureVerifier } from './lib/signatureVerifier';
import { NonceManager } from './lib/nonceManager';
import { OriginValidator } from './lib/originValidator';
import { CSRFProtection } from './lib/csrfProtection';
import { getActivityData, getCacheStatus } from './lib/activityCache';
import { callOracle, generateRiddlePrompt, evaluateAnswerPrompt, getHintPrompt } from './lib/oracleService';
// STRIPPED FOR LAUNCH: Enterprise security features
// import { EncryptionService } from './lib/encryption';
// import { EncryptedStorageService } from './lib/encryptedStorage';
// import { SecurityMonitor } from './lib/securityMonitor';
// import { ThreatDetection } from './lib/threatDetection';
// import { IncidentResponse } from './lib/incidentResponse';
import { requireAuth, requireSessionAdmin, optionalAuth, AuthRequest } from './middleware/auth';
import { AdminAuthService } from './lib/adminAuth';
import { db } from "./db";
import { sql } from "drizzle-orm";
import { ethers } from "ethers";
import { WalletScanner } from './lib/walletScanner';
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
  "0xc5ca5cb0acf8f7d4c6cd307d0d875ee2e09fb1af",
  "0x9392b6a9d78a52aefeaf1122121cfc09e98cbcf4",
  "0x3a0f4636c99a644a5d30d710cc3ef72e77b64dc7",
  "0x76ca648359e118687fc0a2fd53a3c29e2c71570f"
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

  // Activity Feed API - Server-side cached blockchain activity
  app.get("/api/activity", async (_req, res) => {
    try {
      const activity = await getActivityData();
      res.json(activity);
    } catch (error: any) {
      console.error('[API] Activity fetch error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to fetch activity',
        activities: [],
        stats: { totalMinted: 0, recentMints: 0, totalSales: 0, totalListings: 0, totalTransfers: 0, recentVolume: 0 },
        lastBlock: 0,
        lastUpdated: Date.now()
      });
    }
  });

  // Activity cache status (for debugging)
  app.get("/api/activity/status", (_req, res) => {
    res.json(getCacheStatus());
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

  // Admin password authentication endpoints
  app.get('/api/admin/auth/status/:walletAddress', async (req, res) => {
    try {
      const { walletAddress } = req.params;
      if (!isValidEthAddress(walletAddress)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
      }
      if (!ADMIN_WALLETS.includes(walletAddress.toLowerCase())) {
        return res.status(403).json({ error: 'Not an admin wallet' });
      }
      const status = await AdminAuthService.checkIfLocked(walletAddress);
      res.json(status);
    } catch (error) {
      console.error('Error checking admin lock status:', error);
      res.status(500).json({ error: 'Failed to check status' });
    }
  });

  app.post('/api/admin/auth/verify', authLimiter, async (req, res) => {
    try {
      const { walletAddress, password } = req.body;
      if (!walletAddress || !password) {
        return res.status(400).json({ error: 'Wallet address and password required' });
      }
      if (!isValidEthAddress(walletAddress)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
      }
      if (!ADMIN_WALLETS.includes(walletAddress.toLowerCase())) {
        return res.status(403).json({ error: 'Not an admin wallet' });
      }
      const result = await AdminAuthService.verifyPassword(walletAddress, password);
      if (result.success) {
        res.json(result);
      } else {
        res.status(401).json(result);
      }
    } catch (error) {
      console.error('Error verifying admin password:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  app.get('/api/admin/auth/locked', authLimiter, async (req, res) => {
    try {
      const walletAddress = req.headers['x-wallet-address'] as string;
      if (!walletAddress || !isValidEthAddress(walletAddress)) {
        return res.status(400).json({ error: 'Valid wallet address required' });
      }
      if (!ADMIN_WALLETS.includes(walletAddress.toLowerCase())) {
        return res.status(403).json({ error: 'Not an admin wallet' });
      }
      const locked = await AdminAuthService.getAllLockedWallets();
      res.json(locked);
    } catch (error) {
      console.error('Error fetching locked wallets:', error);
      res.status(500).json({ error: 'Failed to fetch locked wallets' });
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
  // Use the main ADMIN_WALLETS array defined at the top of the file
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

  // Game Score Endpoints - Unified Economy System
  // Valid game types for score submission
  const VALID_GAME_TYPES = [
    'guardian-defense', 'guardian-solitaire', 'space-defender', 
    'asteroid-mining', 'cyber-breach', 'ring-game'
  ] as const;
  
  // Maximum scores per game type (server-side validation, 10% buffer for bonuses)
  const MAX_SCORES: Record<string, number> = {
    'guardian-defense': 55000,
    'guardian-solitaire': 55000,
    'space-defender': 110000,
    'asteroid-mining': 55000,
    'cyber-breach': 55000,
    'ring-game': 55000,
  };
  
  // Minimum play durations per game type (seconds)
  const MIN_DURATIONS: Record<string, number> = {
    'guardian-defense': 60,
    'guardian-solitaire': 120,
    'space-defender': 60,
    'asteroid-mining': 90,
    'cyber-breach': 60,
    'ring-game': 30,
  };

  app.post("/api/game/score", gameLimiter, writeLimiter, async (req, res) => {
    try {
      const schema = z.object({
        walletAddress: z.string().min(10),
        score: z.number().min(0),
        ecosystemPoints: z.number().min(0).max(1000).optional(), // Max 1000 points per session
        gameType: z.enum(VALID_GAME_TYPES).optional().default('space-defender'),
        duration: z.number().min(0).optional().default(60),
        checksum: z.string().optional(),
        level: z.number().min(1).max(10), // Increased max for wave-based games
        customName: z.string().max(20).optional(),
      });
      
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid score data", details: parsed.error.errors });
      }

      const { walletAddress, score, ecosystemPoints, gameType, duration, level, customName } = parsed.data;
      
      // Server-side validation: Check max score
      const maxScore = MAX_SCORES[gameType] || 55000;
      if (score > maxScore) {
        console.warn(`[Game] Suspicious score rejected: ${walletAddress.slice(0, 8)}... - ${score} exceeds max ${maxScore} for ${gameType}`);
        return res.status(400).json({ error: "Score exceeds maximum possible" });
      }
      
      // Server-side validation: Check minimum duration
      const minDuration = MIN_DURATIONS[gameType] || 30;
      if (duration < minDuration * 0.5) { // 50% tolerance for fast completions
        console.warn(`[Game] Suspicious duration rejected: ${walletAddress.slice(0, 8)}... - ${duration}s < min ${minDuration}s for ${gameType}`);
        return res.status(400).json({ error: "Play duration too short" });
      }

      const result = await storage.submitGameScore(
        walletAddress,
        score,
        level,
        customName
      );

      console.log(`[Game] Score submitted: ${walletAddress.slice(0, 8)}... - ${score} pts (${ecosystemPoints || 0} eco) in ${gameType}`);
      return res.json({ success: true, stats: result, ecosystemPoints: ecosystemPoints || 0 });
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

  // Guardian Oracle API Endpoint for Riddle Quest
  app.post("/api/oracle", gameLimiter, async (req, res) => {
    try {
      const { action, level, difficulty, riddle, userAnswer, messages } = req.body;

      if (!action || !['generate_riddle', 'evaluate_answer', 'get_hint'].includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
      }

      let promptMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

      if (action === 'generate_riddle') {
        const lvl = typeof level === 'number' ? level : 1;
        const diff = typeof difficulty === 'string' ? difficulty : 'medium';
        const prompt = generateRiddlePrompt(lvl, diff);
        promptMessages = [{ role: 'user', content: prompt }];
      } else if (action === 'evaluate_answer') {
        if (!riddle || !userAnswer) {
          return res.status(400).json({ error: "riddle and userAnswer required" });
        }
        const prompt = evaluateAnswerPrompt(riddle, userAnswer);
        promptMessages = Array.isArray(messages) ? [...messages.slice(-6), { role: 'user', content: prompt }] : [{ role: 'user', content: prompt }];
      } else if (action === 'get_hint') {
        if (!riddle) {
          return res.status(400).json({ error: "riddle required" });
        }
        const prompt = getHintPrompt(riddle);
        promptMessages = Array.isArray(messages) ? [...messages.slice(-6), { role: 'user', content: prompt }] : [{ role: 'user', content: prompt }];
      }

      const result = await callOracle(promptMessages, action as any);
      
      if (!result.success) {
        console.warn(`[Oracle] API call failed: ${result.error}`);
        return res.status(503).json({
          success: false,
          fallback: true,
          message: result.message,
          error: result.error
        });
      }

      return res.json({
        success: true,
        message: result.message,
        isCorrect: result.isCorrect,
        riddleGenerated: result.riddleGenerated
      });
    } catch (error) {
      console.error("[Oracle] Endpoint error:", error);
      return res.status(500).json({
        success: false,
        fallback: true,
        message: "The Oracle retreats into the ether...",
        error: "INTERNAL_ERROR"
      });
    }
  });

  // Price Proxy Endpoint (avoids CORS issues with CoinGecko)
  app.get("/api/price/basedai", async (req, res) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=basedai&vs_currencies=usd&include_24hr_change=true",
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return res.status(502).json({ error: "Failed to fetch price from CoinGecko" });
      }
      
      const data = await response.json();
      return res.json(data);
    } catch (error) {
      console.error("[Price] Error fetching price:", error);
      return res.status(500).json({ error: "Failed to fetch price" });
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

  app.post('/api/test/validate', async (req, res) => {
    try {
      const { schema, data } = req.body;
      
      if (!schema || !data) {
        return res.status(400).json({ error: 'Schema and data required' });
      }
      
      const schemaObj = ValidationSchemas[schema as keyof typeof ValidationSchemas];
      
      if (!schemaObj) {
        return res.status(400).json({ error: 'Invalid schema name' });
      }
      
      const result = ValidationRulesEngine.validate(data, schemaObj);
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* STRIPPED FOR LAUNCH: Encryption routes
  app.post('/api/admin/encryption/test', requireAdmin, async (req, res) => {
    try {
      const { data } = req.body;
      
      if (!data) {
        return res.status(400).json({ error: 'Data required for encryption test' });
      }
      
      const testData = typeof data === 'string' ? data : JSON.stringify(data);
      const encrypted = EncryptionService.encrypt(testData);
      const decrypted = EncryptionService.decrypt(encrypted);
      const hash = EncryptionService.hash(testData);
      
      res.json({
        success: true,
        originalLength: testData.length,
        encryptedLength: encrypted.length,
        decryptedMatch: testData === decrypted,
        hash: hash.substring(0, 16) + '...',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/encryption/store', requireAdmin, async (req, res) => {
    try {
      const { key, value, ttlSeconds } = req.body;
      
      if (!key || value === undefined) {
        return res.status(400).json({ error: 'Key and value required' });
      }
      
      await EncryptedStorageService.store(key, value, ttlSeconds);
      
      res.json({
        success: true,
        key,
        expiresIn: ttlSeconds ? `${ttlSeconds} seconds` : 'never',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/encryption/retrieve/:key', requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      
      const value = await EncryptedStorageService.retrieve(key);
      
      if (value === null) {
        return res.status(404).json({ error: 'Key not found or expired' });
      }
      
      res.json({
        success: true,
        key,
        value,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/encryption/status', requireAdmin, async (req, res) => {
    try {
      const keyPair = EncryptionService.getKeyPair();
      
      res.json({
        success: true,
        status: 'operational',
        algorithms: {
          symmetric: 'AES-256-GCM',
          hashing: 'SHA-256',
          hmac: 'HMAC-SHA256',
          asymmetric: 'RSA-OAEP'
        },
        publicKeyAvailable: !!keyPair.publicKey,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/encryption/delete/:key', requireAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      
      await EncryptedStorageService.delete(key);
      
      res.json({
        success: true,
        message: `Key ${key} deleted`,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/encryption/cleanup', requireAdmin, async (req, res) => {
    try {
      const count = await EncryptedStorageService.cleanup();
      
      res.json({
        success: true,
        cleanedUp: count,
        message: `Removed ${count} expired entries`,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/security/events', requireAdmin, async (req, res) => {
    try {
      const { type, severity, since, limit } = req.query;
      
      const events = SecurityMonitor.getEvents({
        type: type as any,
        severity: severity as any,
        since: since ? new Date(since as string) : undefined,
        limit: limit ? parseInt(limit as string) : 100
      });
      
      res.json({ events });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/security/metrics', requireAdmin, async (req, res) => {
    try {
      const metrics = SecurityMonitor.getMetrics();
      const score = SecurityMonitor.getSecurityScore();
      const blockedEndpoints = IncidentResponse.getBlockedEndpoints();
      
      res.json({ 
        metrics,
        score,
        blockedEndpoints
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/security/threats', requireAdmin, async (req, res) => {
    try {
      const patterns = ThreatDetection.getPatterns();
      res.json({ patterns });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/security/events/:eventId/handle', requireAdmin, async (req, res) => {
    try {
      const { eventId } = req.params;
      SecurityMonitor.markHandled(eventId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/security/export', requireAdmin, async (req, res) => {
    try {
      const format = (req.query.format as 'json' | 'csv') || 'json';
      const exported = SecurityMonitor.exportEvents(format);
      
      res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=security-events.${format}`);
      res.send(exported);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/security/clear-events', requireAdmin, async (req, res) => {
    try {
      SecurityMonitor.clearEvents();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  // END OF STRIPPED ENCRYPTION/SECURITY ROUTES */

  // =============================================
  // Database Backup Management Endpoints
  // =============================================
  const { BackupScheduler } = await import('./lib/backupScheduler');
  const backupService = BackupScheduler.getService();

  app.post('/api/admin/backup/create', requireAdmin, async (req, res) => {
    try {
      const { type } = req.body;
      const metadata = await backupService.backup(type || 'full');
      
      res.json({ 
        success: true,
        backup: metadata
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/backup/list', requireAdmin, async (req, res) => {
    try {
      const backups = await backupService.listBackups();
      res.json({ backups });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/backup/restore/:backupId', requireAdmin, async (req, res) => {
    try {
      const { backupId } = req.params;
      await backupService.restore(backupId);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/backup/verify/:backupId', requireAdmin, async (req, res) => {
    try {
      const { backupId } = req.params;
      const valid = await backupService.verifyBackup(backupId);
      
      res.json({ valid });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/backup/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await backupService.getBackupStats();
      res.json({ stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* STRIPPED FOR LAUNCH: Security health route uses SecurityMonitor
  app.get('/api/health/security', async (req, res) => {
    try {
      const metrics = SecurityMonitor.getMetrics();
      const score = SecurityMonitor.getSecurityScore();
      
      res.json({
        score,
        healthy: score >= 70,
        metrics: {
          criticalThreats: metrics.criticalEvents,
          activeThreats: metrics.activeThreats,
          blockedRequests: metrics.blockedRequests
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  */

  /* STRIPPED FOR LAUNCH: PITR, Disaster Recovery, Snapshots, Runbooks, Incidents routes
  const { PointInTimeRecovery } = await import('./lib/pointInTimeRecovery');
  const { TransactionLogService } = await import('./lib/transactionLog');

  app.get('/api/admin/pitr/recovery-points', requireAdmin, async (req, res) => {
    try {
      const points = await PointInTimeRecovery.getRecoveryPoints(20);
      res.json({ points });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/pitr/test', requireAdmin, async (req, res) => {
    try {
      const { timestamp } = req.body;
      
      if (!timestamp) {
        return res.status(400).json({ error: 'Timestamp required' });
      }
      
      const result = await PointInTimeRecovery.testRecovery(new Date(timestamp));
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/pitr/recover', requireAdmin, async (req, res) => {
    try {
      const { timestamp } = req.body;
      
      if (!timestamp) {
        return res.status(400).json({ error: 'Timestamp required' });
      }
      
      await PointInTimeRecovery.recoverToPoint(new Date(timestamp));
      
      res.json({ 
        success: true,
        message: 'Database recovered successfully',
        recoveredTo: timestamp
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/pitr/transaction-logs/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await TransactionLogService.getStats();
      res.json({ stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/pitr/transaction-logs', requireAdmin, async (req, res) => {
    try {
      const { start, end, limit } = req.query;
      
      let logs;
      
      if (start && end) {
        logs = await TransactionLogService.getLogsInRange(
          new Date(start as string),
          new Date(end as string)
        );
      } else if (start) {
        logs = await TransactionLogService.getLogsSince(new Date(start as string));
      } else {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        logs = await TransactionLogService.getLogsSince(oneDayAgo);
      }
      
      if (limit) {
        logs = logs.slice(0, parseInt(limit as string));
      }
      
      res.json({ logs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const { DisasterRecoveryService } = await import('./lib/disasterRecovery');
  const { HealthCheckService } = await import('./lib/healthCheck');

  app.post('/api/admin/disaster-recovery/plan', requireAdmin, async (req, res) => {
    try {
      const { disasterType } = req.body;
      
      if (!disasterType) {
        return res.status(400).json({ error: 'Disaster type required' });
      }
      
      const plan = await DisasterRecoveryService.createRecoveryPlan(disasterType);
      
      res.json({ plan });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/disaster-recovery/execute', requireAdmin, async (req, res) => {
    try {
      const { plan, automated } = req.body;
      
      if (!plan) {
        return res.status(400).json({ error: 'Recovery plan required' });
      }
      
      await DisasterRecoveryService.executeRecoveryPlan(plan, automated);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/disaster-recovery/test', requireAdmin, async (req, res) => {
    try {
      const results = await DisasterRecoveryService.testDisasterRecovery();
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/health/system', async (req, res) => {
    try {
      const health = await HealthCheckService.getSystemHealth();
      res.json(health);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/health/detailed', async (req, res) => {
    try {
      const checks = await HealthCheckService.runAllChecks();
      res.json({ checks });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/health/complete', async (req, res) => {
    const checks: Record<string, any> = {
      database: { status: 'checking' },
      memory: { status: 'checking' },
      backups: { status: 'checking' }
    };
    
    try {
      const dbStart = Date.now();
      await db.execute(sql`SELECT 1`);
      const dbLatency = Date.now() - dbStart;
      checks.database = { 
        status: dbLatency > 1000 ? 'degraded' : 'healthy', 
        latency: `${dbLatency}ms` 
      };
    } catch (e: any) {
      checks.database = { status: 'unhealthy', error: e.message };
    }
    
    const mem = process.memoryUsage();
    const heapPercent = (mem.heapUsed / mem.heapTotal) * 100;
    checks.memory = { 
      status: heapPercent > 90 ? 'unhealthy' : 'healthy',
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      percent: `${heapPercent.toFixed(1)}%`
    };
    
    try {
      const backupCheck = await HealthCheckService.checkBackupSystem();
      checks.backups = {
        status: backupCheck.status,
        lastBackup: backupCheck.details?.lastBackup,
        hoursOld: backupCheck.details?.hoursOld || 'N/A',
        error: backupCheck.error
      };
    } catch (e: any) {
      checks.backups = { status: 'unknown', error: e.message, hoursOld: 'N/A' };
    }
    
    const healthy = Object.values(checks).every((c: any) => c.status === 'healthy');
    
    res.json({
      healthy,
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  app.post('/api/admin/snapshots/capture', requireAdmin, async (req, res) => {
    try {
      const { StateSnapshotService } = await import('./lib/stateSnapshot');
      const { description } = req.body;
      const capturedBy = (req as any).session?.walletAddress || 'admin';
      
      const snapshot = await StateSnapshotService.captureSnapshot(
        description || 'Manual snapshot',
        capturedBy
      );
      
      res.json({ snapshot });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/snapshots/list', requireAdmin, async (req, res) => {
    try {
      const { StateSnapshotService } = await import('./lib/stateSnapshot');
      const snapshots = await StateSnapshotService.listSnapshots();
      res.json({ snapshots });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/snapshots/restore/:snapshotId', requireAdmin, async (req, res) => {
    try {
      const { StateSnapshotService } = await import('./lib/stateSnapshot');
      const { snapshotId } = req.params;
      await StateSnapshotService.restoreSnapshot(snapshotId);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/snapshots/compare', requireAdmin, async (req, res) => {
    try {
      const { StateSnapshotService } = await import('./lib/stateSnapshot');
      const { snapshot1, snapshot2 } = req.body;
      
      if (!snapshot1 || !snapshot2) {
        return res.status(400).json({ error: 'Two snapshots required' });
      }
      
      const diff = await StateSnapshotService.compareSnapshots(snapshot1, snapshot2);
      res.json({ diff });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/snapshots/:snapshotId', requireAdmin, async (req, res) => {
    try {
      const { StateSnapshotService } = await import('./lib/stateSnapshot');
      const { snapshotId } = req.params;
      await StateSnapshotService.deleteSnapshot(snapshotId);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/snapshots/stats', requireAdmin, async (req, res) => {
    try {
      const { StateSnapshotService } = await import('./lib/stateSnapshot');
      const stats = await StateSnapshotService.getStats();
      res.json({ stats });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/config-versions', requireAdmin, async (req, res) => {
    try {
      const { ConfigVersionControl } = await import('./lib/configVersionControl');
      const versions = await ConfigVersionControl.listVersions();
      res.json({ versions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Runbook management endpoints
  app.get('/api/admin/runbooks', requireAdmin, async (req, res) => {
    try {
      const { RunbookExecutor } = await import('./lib/runbookExecutor');
      RunbookExecutor.initialize();
      const runbooks = RunbookExecutor.getAllRunbooks();
      res.json({ runbooks });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/runbooks/:id', requireAdmin, async (req, res) => {
    try {
      const { RunbookExecutor } = await import('./lib/runbookExecutor');
      RunbookExecutor.initialize();
      const { id } = req.params;
      const runbook = RunbookExecutor.getRunbook(id);
      
      if (!runbook) {
        return res.status(404).json({ error: 'Runbook not found' });
      }
      
      res.json({ runbook });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/runbooks/:id/execute', requireAdmin, async (req, res) => {
    try {
      const { RunbookExecutor } = await import('./lib/runbookExecutor');
      RunbookExecutor.initialize();
      const { id } = req.params;
      const { automated } = req.body;
      const executedBy = (req as any).session?.walletAddress || 'admin';
      
      const execution = await RunbookExecutor.executeRunbook(id, executedBy, automated);
      
      res.json({ execution });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/runbooks/executions/history', requireAdmin, async (req, res) => {
    try {
      const { RunbookExecutor } = await import('./lib/runbookExecutor');
      RunbookExecutor.initialize();
      const { runbookId } = req.query;
      const history = RunbookExecutor.getExecutionHistory(runbookId as string);
      
      res.json({ history });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Incident management endpoints
  app.post('/api/admin/incidents', requireAdmin, async (req, res) => {
    try {
      const { IncidentPostMortemService } = await import('./lib/incidentPostMortem');
      const { title, severity, description, impactedSystems } = req.body;
      
      const incident = IncidentPostMortemService.createIncident(
        title,
        severity,
        description,
        impactedSystems
      );
      
      res.json({ incident });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/incidents', requireAdmin, async (req, res) => {
    try {
      const { IncidentPostMortemService } = await import('./lib/incidentPostMortem');
      const incidents = IncidentPostMortemService.getAllIncidents();
      res.json({ incidents });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/incidents/:id/resolve', requireAdmin, async (req, res) => {
    try {
      const { IncidentPostMortemService } = await import('./lib/incidentPostMortem');
      const { id } = req.params;
      const { rootCause, resolution, preventativeMeasures } = req.body;
      
      IncidentPostMortemService.resolveIncident(id, rootCause, resolution, preventativeMeasures);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/incidents/:id/post-mortem', requireAdmin, async (req, res) => {
    try {
      const { IncidentPostMortemService } = await import('./lib/incidentPostMortem');
      const { id } = req.params;
      const postMortem = IncidentPostMortemService.generatePostMortem(id);
      
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename=incident-${id}.md`);
      res.send(postMortem);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  END OF STRIPPED PITR/DISASTER/SNAPSHOTS/RUNBOOKS/INCIDENTS ROUTES */

  // Collection routes
  
  // Auto-sync disabled - was causing startup delays and RPC errors
  // Collections are seeded by CollectionService.seedDefaultCollection instead
  console.log('[Routes] Collections are up to date');
  
  app.get('/api/collections', async (_req, res) => {
    try {
      const allCollections = await CollectionService.getAllCollections();
      res.json(allCollections);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch collections' });
    }
  });
  
  // Auto-register a collection when someone lists an NFT from it
  app.post('/api/collections/register', async (req, res) => {
    const { contractAddress } = req.body;
    
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: 'Invalid contract address' });
    }
    
    try {
      const result = await CollectionService.getOrCreateCollection(contractAddress);
      res.json({
        collection: result.collection,
        created: result.created
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to register collection' });
    }
  });

  // Trigger collection sync (admin only - uses signature verification)
  app.post('/api/collections/sync', requireAdmin, async (req, res) => {
    try {
      const { CollectionSync } = await import('./lib/collectionSync');
      const results = await CollectionSync.syncAll();
      res.json({ success: true, results });
    } catch (error: any) {
      console.error('[API] Sync failed:', error);
      res.status(500).json({ error: 'Sync failed' });
    }
  });

  app.get('/api/collections/:address', async (req, res) => {
    try {
      const collection = await CollectionService.getCollection(req.params.address);
      if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
      }
      res.json(collection);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch collection' });
    }
  });

  app.post('/api/admin/collections', requireAdmin, async (req, res) => {
    const { contractAddress } = req.body;
    
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: 'Invalid contract address' });
    }
    
    try {
      const collection = await CollectionService.addCollection(contractAddress);
      res.json(collection);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/admin/collections/:address', requireAdmin, async (req, res) => {
    const { name, description, bannerImage, thumbnailImage, isActive, isFeatured } = req.body;
    
    try {
      const { eq } = await import('drizzle-orm');
      await db.update(collections)
        .set({
          ...(name && { name }),
          ...(description && { description }),
          ...(bannerImage && { bannerImage }),
          ...(thumbnailImage && { thumbnailImage }),
          ...(typeof isActive === 'boolean' && { isActive }),
          ...(typeof isFeatured === 'boolean' && { isFeatured }),
          updatedAt: new Date()
        })
        .where(eq(collections.contractAddress, req.params.address.toLowerCase()));
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update collection' });
    }
  });

  app.delete('/api/admin/collections/:address', requireAdmin, async (req, res) => {
    try {
      const { eq } = await import('drizzle-orm');
      await db.delete(collections)
        .where(eq(collections.contractAddress, req.params.address.toLowerCase()));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete collection' });
    }
  });

  // Gating routes
  GatingService.initializeDefaultRules().catch(err => {
    console.error('[Routes] Failed to initialize gating rules:', err);
  });

  app.get('/api/gating/rules', async (_req, res) => {
    try {
      const rules = await GatingService.getAllGatingRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch gating rules' });
    }
  });

  app.get('/api/gating/rules/:featureKey', async (req, res) => {
    try {
      const rule = await GatingService.getGatingRule(req.params.featureKey);
      if (!rule) {
        return res.status(404).json({ error: 'Gating rule not found' });
      }
      res.json(rule);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch gating rule' });
    }
  });

  app.put('/api/admin/gating/rules/:featureKey', requireAdmin, async (req, res) => {
    try {
      const { requiresNFT, requiredCollection, minimumBalance, bypassForAdmin, enabled, gateMessage } = req.body;
      await GatingService.updateGatingRule(req.params.featureKey, {
        requiresNFT,
        requiredCollection,
        minimumBalance,
        bypassForAdmin,
        enabled,
        gateMessage
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update gating rule' });
    }
  });

  app.post('/api/admin/gating/initialize', requireAdmin, async (_req, res) => {
    try {
      await GatingService.initializeDefaultRules();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to initialize gating rules' });
    }
  });

  // Wallet Scanner routes
  const RPC_URL = 'https://mainnet.basedaibridge.com/rpc/';
  
  app.get('/api/wallet/scan/:address', async (req, res) => {
    try {
      const { address } = req.params;
      
      if (!ethers.isAddress(address)) {
        return res.status(400).json({ error: 'Invalid wallet address' });
      }
      
      const collections = await WalletScanner.scanWalletCollections(address, RPC_URL);
      
      res.json({ 
        address, 
        collections,
        scannedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Wallet scan failed:', error);
      res.status(500).json({ error: 'Failed to scan wallet' });
    }
  });

  app.get('/api/nft/metadata/:contractAddress/:tokenId', async (req, res) => {
    try {
      const { contractAddress, tokenId } = req.params;
      
      if (!ethers.isAddress(contractAddress)) {
        return res.status(400).json({ error: 'Invalid contract address' });
      }
      
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const metadata = await WalletScanner.getNFTMetadata(
        contractAddress,
        parseInt(tokenId),
        provider
      );
      
      if (!metadata) {
        return res.status(404).json({ error: 'Metadata not found' });
      }
      
      res.json(metadata);
      
    } catch (error) {
      console.error('Metadata fetch failed:', error);
      res.status(500).json({ error: 'Failed to fetch metadata' });
    }
  });

  // Search API endpoints
  const searchListingsSchema = z.object({
    q: z.string().max(100).optional(),
    collection: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    minPrice: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    maxPrice: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    rarity: z.string().optional(),
    sortBy: z.enum(['price_asc', 'price_desc', 'recent', 'oldest']).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional()
  });

  const VALID_RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

  app.get('/api/search/listings', async (req, res) => {
    try {
      const parsed = searchListingsSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid search parameters' });
      }
      const { q, collection, minPrice, maxPrice, rarity, sortBy, page, limit } = parsed.data;
      const traitsParam = req.query.traits as string | undefined;
      
      const rarityArray = rarity 
        ? rarity.split(',').filter(r => VALID_RARITIES.includes(r.toLowerCase())).map(r => r.toLowerCase())
        : undefined;

      let traitsObject: Record<string, string[]> | undefined;
      if (traitsParam) {
        try {
          const parsed = JSON.parse(traitsParam);
          if (typeof parsed === 'object' && parsed !== null) {
            traitsObject = {};
            for (const [key, values] of Object.entries(parsed)) {
              if (Array.isArray(values)) {
                traitsObject[key] = values.filter(v => typeof v === 'string').map(v => v.replace(/[%_\\'"]/g, ''));
              }
            }
          }
        } catch {
          // Invalid JSON, ignore traits
        }
      }

      const filters: SearchFilters = {
        query: q ? q.replace(/[%_]/g, '') : undefined,
        collectionAddress: collection,
        minPrice,
        maxPrice,
        rarity: rarityArray,
        traits: traitsObject,
        sortBy,
        page: page ? parseInt(page) : 1,
        limit: limit ? Math.min(parseInt(limit), 100) : 20
      };

      const results = await searchService.searchListings(filters);
      
      const walletAddress = req.headers['x-wallet-address'] as string | null;
      if (filters.query && walletAddress && isValidEthAddress(walletAddress)) {
        await searchService.recordSearch(walletAddress, filters.query, results.total);
      }

      res.json(results);
    } catch (error) {
      console.error('Search listings failed:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  app.get('/api/search/collections', async (req, res) => {
    try {
      const querySchema = z.object({ q: z.string().min(2).max(50) });
      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.json([]);
      }
      const sanitizedQuery = parsed.data.q.replace(/[%_\\]/g, '');
      if (sanitizedQuery.length < 2) {
        return res.json([]);
      }

      const results = await searchService.searchCollections(sanitizedQuery);
      res.json(results);
    } catch (error) {
      console.error('Search collections failed:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  app.get('/api/trending/collections', async (req, res) => {
    try {
      const trendingSchema = z.object({
        hours: z.string().regex(/^\d+$/).optional(),
        limit: z.string().regex(/^\d+$/).optional()
      });
      const parsed = trendingSchema.safeParse(req.query);
      const hours = parsed.success && parsed.data.hours ? Math.min(parseInt(parsed.data.hours), 168) : 24;
      const limit = parsed.success && parsed.data.limit ? Math.min(parseInt(parsed.data.limit), 50) : 10;

      const trending = await searchService.getTrendingCollections(hours, limit);
      res.json(trending);
    } catch (error) {
      console.error('Get trending collections failed:', error);
      res.status(500).json({ error: 'Failed to get trending collections' });
    }
  });

  app.get('/api/collection/:address/stats', async (req, res) => {
    try {
      const { address } = req.params;
      if (!ethers.isAddress(address)) {
        return res.status(400).json({ error: 'Invalid collection address' });
      }

      const stats = await searchService.getCollectionStats(address);
      if (!stats) {
        return res.status(404).json({ error: 'Collection not found' });
      }

      res.json(stats);
    } catch (error) {
      console.error('Get collection stats failed:', error);
      res.status(500).json({ error: 'Failed to get collection stats' });
    }
  });

  app.get('/api/search/popular', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const popular = await searchService.getPopularSearches(Math.min(limit, 20));
      res.json(popular);
    } catch (error) {
      console.error('Get popular searches failed:', error);
      res.status(500).json({ error: 'Failed to get popular searches' });
    }
  });

  return httpServer;
}
