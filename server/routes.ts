import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFeedbackSchema, insertStorySchema } from "@shared/schema";
import { z } from "zod";
import { containsProfanity } from "./profanityFilter";

const FEEDBACK_EMAIL = "team@BasedGuardians.trade";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BN_placeholder_key_for_development';

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Health check endpoint - must respond immediately for deployment health checks
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: Date.now() });
  });

  // Feedback submission endpoint
  app.post("/api/feedback", async (req, res) => {
    try {
      const parsed = insertFeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid feedback data", details: parsed.error.errors });
      }

      const feedbackEntry = await storage.createFeedback(parsed.data);

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

  // Get all feedback (admin endpoint - could add auth later)
  app.get("/api/feedback", async (req, res) => {
    try {
      const allFeedback = await storage.getAllFeedback();
      return res.json(allFeedback);
    } catch (error) {
      console.error("[Feedback] Error fetching feedback:", error);
      return res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  // Story submission endpoint
  app.post("/api/stories", async (req, res) => {
    try {
      const parsed = insertStorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid story data", details: parsed.error.errors });
      }

      // Validate 500 word limit
      const wordCount = parsed.data.content.trim().split(/\s+/).length;
      if (wordCount > 500) {
        return res.status(400).json({ error: `Story exceeds 500 word limit (${wordCount} words)` });
      }

      const storyEntry = await storage.createStorySubmission(parsed.data);

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

  // Get all story submissions (admin endpoint)
  app.get("/api/stories", async (req, res) => {
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

  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const subscribeSchema = z.object({
        walletAddress: z.string().min(1),
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

  app.delete("/api/push/unsubscribe", async (req, res) => {
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

  app.patch("/api/push/preferences", async (req, res) => {
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

  app.get("/api/emails", async (req, res) => {
    try {
      const emails = await storage.getAllEmails();
      const emailCount = await storage.getEmailCount();
      return res.json({ emails, count: emailCount, maxLimit: 4000 });
    } catch (error) {
      console.error("[Emails] Error fetching emails:", error);
      return res.status(500).json({ error: "Failed to fetch emails" });
    }
  });

  app.get("/api/emails/csv", async (req, res) => {
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
  app.post("/api/profile/login", async (req, res) => {
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

  app.post("/api/profile/name", async (req, res) => {
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
      
      if (containsProfanity(name)) {
        return res.json({ available: false, error: "This name contains inappropriate content" });
      }
      
      const isTaken = await storage.isNameTaken(name, excludeWallet);
      return res.json({ available: !isTaken });
    } catch (error) {
      console.error("[Profile] Error checking name:", error);
      return res.status(500).json({ error: "Failed to check name" });
    }
  });

  app.post("/api/diamond-hands/update", async (req, res) => {
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

  app.post("/api/proposals", async (req, res) => {
    try {
      const schema = z.object({
        title: z.string().min(5).max(100),
        description: z.string().min(10).max(1000),
        category: z.string().min(1).max(50),
        optionA: z.string().min(1).max(200),
        optionB: z.string().min(1).max(200),
        optionC: z.string().max(200).optional().nullable(),
        optionD: z.string().max(200).optional().nullable(),
        expirationDays: z.number().min(1).max(30).default(7),
        createdBy: z.string().min(10),
      });
      
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid proposal data", details: parsed.error.errors });
      }

      if (!isAdminWallet(parsed.data.createdBy)) {
        return res.status(403).json({ error: "Only admins can create proposals" });
      }

      const proposal = await storage.createProposal({
        ...parsed.data,
        status: 'review',
      });

      console.log(`[Proposal] Created proposal: ${proposal.id} by ${parsed.data.createdBy}`);
      return res.status(201).json({ success: true, proposal });
    } catch (error) {
      console.error("[Proposal] Error creating proposal:", error);
      return res.status(500).json({ error: "Failed to create proposal" });
    }
  });

  app.get("/api/proposals", async (req, res) => {
    try {
      const status = req.query.status as string;
      let proposalsList;
      
      if (status === 'active') {
        proposalsList = await storage.getActiveProposals();
      } else if (status === 'review') {
        proposalsList = await storage.getReviewProposals();
      } else if (status) {
        proposalsList = await storage.getProposalsByStatus(status);
      } else {
        proposalsList = await storage.getAllProposals();
      }
      
      return res.json(proposalsList);
    } catch (error) {
      console.error("[Proposal] Error fetching proposals:", error);
      return res.status(500).json({ error: "Failed to fetch proposals" });
    }
  });

  app.get("/api/proposals/:id", async (req, res) => {
    try {
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      
      const votes = await storage.getVoteTallies(req.params.id);
      return res.json({ ...proposal, votes });
    } catch (error) {
      console.error("[Proposal] Error fetching proposal:", error);
      return res.status(500).json({ error: "Failed to fetch proposal" });
    }
  });

  app.patch("/api/proposals/:id/status", async (req, res) => {
    try {
      const schema = z.object({
        status: z.enum(['review', 'active', 'closed']),
        walletAddress: z.string().min(10),
      });
      
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data" });
      }

      if (!isAdminWallet(parsed.data.walletAddress)) {
        return res.status(403).json({ error: "Only admins can update proposal status" });
      }

      const updated = await storage.updateProposalStatus(req.params.id, parsed.data.status);
      if (!updated) {
        return res.status(404).json({ error: "Proposal not found" });
      }

      console.log(`[Proposal] Updated proposal ${req.params.id} status to ${parsed.data.status}`);
      return res.json({ success: true, proposal: updated });
    } catch (error) {
      console.error("[Proposal] Error updating proposal status:", error);
      return res.status(500).json({ error: "Failed to update proposal status" });
    }
  });

  app.delete("/api/proposals/:id", async (req, res) => {
    try {
      const walletAddress = req.query.wallet as string;
      
      if (!isAdminWallet(walletAddress)) {
        return res.status(403).json({ error: "Only admins can delete proposals" });
      }

      await storage.deleteProposal(req.params.id);
      console.log(`[Proposal] Deleted proposal ${req.params.id}`);
      return res.json({ success: true });
    } catch (error) {
      console.error("[Proposal] Error deleting proposal:", error);
      return res.status(500).json({ error: "Failed to delete proposal" });
    }
  });

  app.post("/api/proposals/:id/vote", async (req, res) => {
    try {
      const schema = z.object({
        walletAddress: z.string().min(10),
        selectedOption: z.enum(['A', 'B', 'C', 'D']),
        votingPower: z.number().min(1).default(1),
      });
      
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid vote data" });
      }

      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      if (proposal.status !== 'active') {
        return res.status(400).json({ error: "Voting is not active for this proposal" });
      }

      const vote = await storage.castProposalVote({
        proposalId: req.params.id,
        ...parsed.data,
      });

      return res.json({ success: true, vote });
    } catch (error) {
      console.error("[Proposal] Error casting vote:", error);
      return res.status(500).json({ error: "Failed to cast vote" });
    }
  });

  app.get("/api/proposals/:id/votes", async (req, res) => {
    try {
      const tallies = await storage.getVoteTallies(req.params.id);
      const walletAddress = req.query.wallet as string;
      
      let userVote = null;
      if (walletAddress) {
        userVote = await storage.getUserVote(req.params.id, walletAddress);
      }
      
      return res.json({ tallies, userVote });
    } catch (error) {
      console.error("[Proposal] Error fetching votes:", error);
      return res.status(500).json({ error: "Failed to fetch votes" });
    }
  });

  // Race-to-Base Game Score Endpoints
  app.post("/api/game/score", async (req, res) => {
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

  return httpServer;
}
