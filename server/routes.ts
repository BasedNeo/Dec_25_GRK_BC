import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFeedbackSchema } from "@shared/schema";

const FEEDBACK_EMAIL = "team@BasedGuardians.trade";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Feedback submission endpoint
  app.post("/api/feedback", async (req, res) => {
    try {
      const parsed = insertFeedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid feedback data", details: parsed.error.errors });
      }

      const feedbackEntry = await storage.createFeedback(parsed.data);

      // TODO: Send email notification when email service is configured
      // Email should be sent to: team@BasedGuardians.trade
      console.log(`[Feedback] New submission saved. ID: ${feedbackEntry.id}`);
      console.log(`[Feedback] Email notification pending setup for: ${FEEDBACK_EMAIL}`);

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

  return httpServer;
}
