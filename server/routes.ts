import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { newsService } from "./services/newsService";
import { podcastService } from "./services/podcastService";
import { insertKeywordSchema, insertReplacementPatternSchema } from "@shared/schema";
import type { FilterPreview } from "@shared/schema";
import { applyFilters } from "./services/filteringService";

// Clerk
import { clerkMiddleware, requireAuth, getAuth } from "@clerk/express";

export async function registerRoutes(app: Express): Promise<Server> {
  // Clerk middleware (adds req.auth)
  app.use(clerkMiddleware());

  // ======================
  // AUTH
  // ======================
  app.get("/api/auth/user", requireAuth(), async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ======================
  // ARTICLES (PUBLIC + OPTIONAL AUTH)
  // ======================
  app.get("/api/articles", async (_req, res) => {
    try {
      const articles = await storage.getArticles();
      res.json(articles);
    } catch {
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/curated", async (req: any, res) => {
    try {
      const { userId } = getAuth(req);
      const articles = await storage.getCuratedArticles();
      const filtered = await applyFilters(articles, userId || undefined);
      res.json(filtered);
    } catch {
      res.status(500).json({ message: "Failed to fetch curated articles" });
    }
  });

  app.get("/api/articles/filtered", async (req: any, res) => {
    try {
      const { userId } = getAuth(req);
      const articles = await storage.getCuratedArticles();
      const filtered = await applyFilters(articles, userId || undefined);
      res.json(filtered);
    } catch {
      res.status(500).json({ message: "Failed to fetch filtered articles" });
    }
  });

  app.get("/api/articles/top-five", async (req: any, res) => {
    try {
      const { userId } = getAuth(req);
      const articles = await storage.getTopFiveArticles();
      const filtered = await applyFilters(articles, userId || undefined);
      res.json(filtered);
    } catch {
      res.status(500).json({ message: "Failed to fetch top five articles" });
    }
  });

  // ======================
  // LIKES / SAVED (PROTECTED)
  // ======================
  app.post("/api/articles/:id/like", requireAuth(), async (req: any, res) => {
    const result = await storage.likeArticle(req.params.id, req.auth.userId);
    res.json(result);
  });

  app.post("/api/articles/:id/unlike", requireAuth(), async (req: any, res) => {
    const result = await storage.unlikeArticle(req.params.id, req.auth.userId);
    res.json(result);
  });

  app.post("/api/articles/:id/save", requireAuth(), async (req: any, res) => {
    const result = await storage.saveArticle(req.params.id, req.auth.userId);
    res.json(result);
  });

  app.post("/api/articles/:id/unsave", requireAuth(), async (req: any, res) => {
    const result = await storage.unsaveArticle(req.params.id, req.auth.userId);
    res.json(result);
  });

  app.get("/api/saved-articles", requireAuth(), async (req: any, res) => {
    const articles = await storage.getSavedArticles(req.auth.userId);
    const filtered = await applyFilters(articles, req.auth.userId);
    res.json(filtered);
  });

  // ======================
  // KEYWORDS (PUBLIC + PROTECTED)
  // ======================
  app.get("/api/keywords", async (_req, res) => {
    res.json(await storage.getKeywords());
  });

  app.get("/api/keywords/:type", async (req, res) => {
    res.json(await storage.getKeywordsByType(req.params.type));
  });

  app.post("/api/keywords", requireAuth(), async (req: any, res) => {
    try {
      const keyword = await storage.createKeyword(
        insertKeywordSchema.parse({
          ...req.body,
          userId: req.auth.userId,
        })
      );
      res.json(keyword);
    } catch (error) {
      console.error("Error creating keyword:", error);
      res.status(500).json({ message: "Failed to create keyword" });
    }
  });

  app.delete("/api/keywords/:id", requireAuth(), async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const keywordId = req.params.id;

      const result = await storage.deleteKeyword(keywordId, userId);
      
      if (!result) {
        return res.status(404).json({ message: "Keyword not found" });
      }

      res.json({ success: true, id: keywordId });
    } catch (error) {
      console.error("Error deleting keyword:", error);
      res.status(500).json({ message: "Failed to delete keyword" });
    }
  });

  // ======================
  // REPLACEMENTS (OPTIONAL AUTH)
  // ======================
  app.get("/api/replacement-patterns", async (req: any, res) => {
    const { userId } = getAuth(req);
    if (!userId) return res.json([]);
    res.json(await storage.getReplacementPatterns(userId));
  });

  app.post("/api/replacement-patterns", requireAuth(), async (req: any, res) => {
    const pattern = await storage.createReplacementPattern(
      insertReplacementPatternSchema.parse({
        ...req.body,
        userId: req.auth.userId,
      })
    );
    res.json(pattern);
  });

  app.delete("/api/replacement-patterns/:id", requireAuth(), async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const patternId = req.params.id;

      const result = await storage.deleteReplacementPattern(patternId, userId);
      
      if (!result) {
        return res.status(404).json({ message: "Replacement pattern not found" });
      }

      res.json({ success: true, id: patternId });
    } catch (error) {
      console.error("Error deleting replacement pattern:", error);
      res.status(500).json({ message: "Failed to delete replacement pattern" });
    }
  });

  // ======================
  // PREFERENCES
  // ======================
  app.get("/api/preferences", async (req: any, res) => {
    const { userId } = getAuth(req);
    res.json(await storage.getUserPreferences(userId || undefined));
  });

  app.put("/api/preferences", async (req: any, res) => {
    const { userId } = getAuth(req);
    res.json(await storage.updateUserPreferences(req.body, userId || undefined));
  });

  // ======================
  // FILTER PREVIEW
  // ======================
  app.get("/api/filter-preview", async (req: any, res) => {
    try {
      const { userId } = getAuth(req);
      const articles = await storage.getCuratedArticles();
      const filtered = await applyFilters(articles, userId || undefined);

      res.json({
        beforeCount: articles.length,
        afterCount: filtered.length,
        before: articles,
        after: filtered,
      });
    } catch (error) {
      console.error("Error generating filter preview:", error);
      res.status(500).json({ message: "Failed to generate filter preview" });
    }
  });

  // ======================
  // PODCASTS (SINGLE SOURCE OF TRUTH)
  // ======================
  app.get("/api/podcasts", async (_req, res) => {
    const podcasts = await podcastService.getAllPodcasts();
    res.json(podcasts);
  });

  app.post("/api/podcasts/generate", async (_req, res) => {
    const podcastId = await podcastService.generateDailyPodcast();
    res.json({ success: true, podcastId });
  });

  const httpServer = createServer(app);
  return httpServer;
}
