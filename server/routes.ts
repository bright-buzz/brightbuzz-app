import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { podcastService } from "./services/podcastService";
import { insertKeywordSchema, insertReplacementPatternSchema } from "@shared/schema";
import { applyFilters } from "./services/filteringService";

// Clerk
import { clerkMiddleware, requireAuth, getAuth } from "@clerk/express";

export async function registerRoutes(app: Express): Promise<Server> {
  // Clerk middleware (adds req.auth)
  app.use(clerkMiddleware());

  /**
   * Register routes twice:
   *  - once under /api (expected)
   *  - once without prefix (handles frontend calling /keywords, /replacement-patterns, etc.)
   */
  const bases = ["/api", ""] as const;

  for (const base of bases) {
    const p = (path: string) => `${base}${path}`;

    // ======================
    // AUTH
    // ======================
    app.get(p("/auth/user"), requireAuth(), async (req: any, res) => {
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
    app.get(p("/articles"), async (_req, res) => {
      try {
        const articles = await storage.getArticles();
        res.json(articles);
      } catch {
        res.status(500).json({ message: "Failed to fetch articles" });
      }
    });

    app.get(p("/articles/curated"), async (req: any, res) => {
      try {
        const { userId } = getAuth(req);
        const articles = await storage.getCuratedArticles();
        const filtered = await applyFilters(articles, userId || undefined);
        res.json(filtered);
      } catch {
        res.status(500).json({ message: "Failed to fetch curated articles" });
      }
    });

    app.get(p("/articles/filtered"), async (req: any, res) => {
      try {
        const { userId } = getAuth(req);
        const articles = await storage.getCuratedArticles();
        const filtered = await applyFilters(articles, userId || undefined);
        res.json(filtered);
      } catch {
        res.status(500).json({ message: "Failed to fetch filtered articles" });
      }
    });

    app.get(p("/articles/top-five"), async (req: any, res) => {
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
    app.post(p("/articles/:id/like"), requireAuth(), async (req: any, res) => {
      const result = await storage.likeArticle(req.params.id, req.auth.userId);
      res.json(result);
    });

    app.post(p("/articles/:id/unlike"), requireAuth(), async (req: any, res) => {
      const result = await storage.unlikeArticle(req.params.id, req.auth.userId);
      res.json(result);
    });

    app.post(p("/articles/:id/save"), requireAuth(), async (req: any, res) => {
      const result = await storage.saveArticle(req.params.id, req.auth.userId);
      res.json(result);
    });

    app.post(p("/articles/:id/unsave"), requireAuth(), async (req: any, res) => {
      const result = await storage.unsaveArticle(req.params.id, req.auth.userId);
      res.json(result);
    });

    app.get(p("/saved-articles"), requireAuth(), async (req: any, res) => {
      const articles = await storage.getSavedArticles(req.auth.userId);
      const filtered = await applyFilters(articles, req.auth.userId);
      res.json(filtered);
    });

    // ======================
    // KEYWORDS (PUBLIC + PROTECTED)
    // ======================
    app.get(p("/keywords"), async (_req, res) => {
      res.json(await storage.getKeywords());
    });

    app.get(p("/keywords/:type"), async (req, res) => {
      res.json(await storage.getKeywordsByType(req.params.type));
    });

    app.post(p("/keywords"), requireAuth(), async (req: any, res) => {
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

    // Helper: delete keyword by type + value (in case frontend deletes by name)
    async function deleteKeywordByTypeAndValue(type: string, keywordRaw: string) {
      const keyword = decodeURIComponent(keywordRaw).trim().toLowerCase();

      const byType = await storage.getKeywordsByType(type);
      const match =
        byType.find((k: any) => (k.keyword || "").trim().toLowerCase() === keyword) ||
        (await storage.getKeywords()).find(
          (k: any) =>
            (k.type || "").toLowerCase() === type.toLowerCase() &&
            (k.keyword || "").trim().toLowerCase() === keyword
        );

      if (!match?.id) return false;
      return storage.deleteKeyword(match.id);
    }

    // DELETE by type + keyword (supports /keywords/blocked/:keyword etc.)
    app.delete(p("/keywords/blocked/:keyword"), requireAuth(), async (req: any, res) => {
      try {
        const ok = await deleteKeywordByTypeAndValue("blocked", req.params.keyword);
        if (!ok) return res.status(404).json({ message: "Keyword not found" });
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting blocked keyword:", error);
        res.status(500).json({ message: "Failed to delete keyword" });
      }
    });

    app.delete(p("/keywords/prioritized/:keyword"), requireAuth(), async (req: any, res) => {
      try {
        const ok = await deleteKeywordByTypeAndValue("prioritized", req.params.keyword);
        if (!ok) return res.status(404).json({ message: "Keyword not found" });
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting prioritized keyword:", error);
        res.status(500).json({ message: "Failed to delete keyword" });
      }
    });

    // Generic fallback: /keywords/:type/:keyword
    app.delete(p("/keywords/:type/:keyword"), requireAuth(), async (req: any, res) => {
      try {
        const ok = await deleteKeywordByTypeAndValue(req.params.type, req.params.keyword);
        if (!ok) return res.status(404).json({ message: "Keyword not found" });
        res.json({ success: true });
      } catch (error) {
        console.error("Error deleting keyword (type+keyword):", error);
        res.status(500).json({ message: "Failed to delete keyword" });
      }
    });

    // ✅ DELETE by id (fixed signature — ONE arg only)
    app.delete(p("/keywords/:id"), requireAuth(), async (req: any, res) => {
      try {
        const keywordId = req.params.id;
        const result = await storage.deleteKeyword(keywordId);

        if (!result) {
          return res.status(404).json({ message: "Keyword not found" });
        }

        res.json({ success: true, id: keywordId });
      } catch (error) {
        console.error("Error deleting keyword (id):", error);
        res.status(500).json({ message: "Failed to delete keyword" });
      }
    });

    // ======================
    // REPLACEMENTS (OPTIONAL AUTH)
    // ======================
    app.get(p("/replacement-patterns"), async (req: any, res) => {
      const { userId } = getAuth(req);
      if (!userId) return res.json([]);
      res.json(await storage.getReplacementPatterns(userId));
    });

    app.post(p("/replacement-patterns"), requireAuth(), async (req: any, res) => {
      const pattern = await storage.createReplacementPattern(
        insertReplacementPatternSchema.parse({
          ...req.body,
          userId: req.auth.userId,
        })
      );
      res.json(pattern);
    });

    // ✅ DELETE by id (fixed signature — ONE arg only)
    app.delete(p("/replacement-patterns/:id"), requireAuth(), async (req: any, res) => {
      try {
        const patternId = req.params.id;
        const result = await storage.deleteReplacementPattern(patternId);

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
    app.get(p("/preferences"), async (req: any, res) => {
      const { userId } = getAuth(req);
      res.json(await storage.getUserPreferences(userId || undefined));
    });

    app.put(p("/preferences"), async (req: any, res) => {
      const { userId } = getAuth(req);
      res.json(await storage.updateUserPreferences(req.body, userId || undefined));
    });

    // ======================
    // FILTER PREVIEW
    // ======================
    app.get(p("/filter-preview"), async (req: any, res) => {
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
    app.get(p("/podcasts"), async (_req, res) => {
      const podcasts = await podcastService.getAllPodcasts();
      res.json(podcasts);
    });

    app.post(p("/podcasts/generate"), async (_req, res) => {
      const podcastId = await podcastService.generateDailyPodcast();
      res.json({ success: true, podcastId });
    });
  }

  // Helpful 404 JSON for debugging (keeps Render logs clear)
  app.use((req, res) => {
    res.status(404).json({
      message: "Not Found",
      method: req.method,
      path: req.path,
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
