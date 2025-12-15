import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { newsService } from "./services/newsService";
import { podcastService } from "./services/podcastService";
import { insertKeywordSchema, insertReplacementPatternSchema } from "@shared/schema";
import type { FilterPreview } from "@shared/schema";
import { applyFilters } from "./services/filteringService";

// ✅ Clerk
import { clerkMiddleware, requireAuth, getAuth } from "@clerk/express";

export async function registerRoutes(app: Express): Promise<Server> {
  // ✅ Clerk auth middleware (adds req.auth, verifies Clerk tokens when present)
  app.use(clerkMiddleware());

  // ✅ Auth routes
  app.get("/api/auth/user", requireAuth(), async (req: any, res) => {
    try {
      const userId = req.auth.userId; // ✅ Clerk userId
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ✅ Articles endpoints (public)
  app.get("/api/articles", async (req, res) => {
    try {
      const articles = await storage.getArticles();
      res.json(articles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/curated", async (req: any, res) => {
    try {
      // ✅ Optional auth: userId may be null if not signed in
      const { userId } = getAuth(req);
      const articles = await storage.getCuratedArticles();

      const filtered = await applyFilters(articles, userId || undefined);

      console.log(
        `Curated endpoint: ${articles.length} curated articles -> ${filtered.length} after filtering (user ${
          userId || "anonymous"
        })`
      );

      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch curated articles" });
    }
  });

  app.get("/api/articles/filtered", async (req: any, res) => {
    try {
      const { userId } = getAuth(req);
      const curatedArticles = await storage.getCuratedArticles();

      const filtered = await applyFilters(curatedArticles, userId || undefined);

      console.log(
        `Filtered endpoint: ${curatedArticles.length} curated articles -> ${filtered.length} after filtering (user ${
          userId || "anonymous"
        })`
      );

      res.json(filtered);
    } catch (error) {
      console.error("Failed to fetch filtered articles:", error);
      res.status(500).json({ message: "Failed to fetch filtered articles" });
    }
  });

  app.get("/api/articles/top-five", async (req: any, res) => {
    try {
      const { userId } = getAuth(req);
      const articles = await storage.getTopFiveArticles();

      const filtered = await applyFilters(articles, userId || undefined);

      console.log(
        `Top-five endpoint: ${articles.length} articles -> ${filtered.length} after filtering (user ${
          userId || "anonymous"
        })`
      );

      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top five articles" });
    }
  });

  app.post("/api/articles/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.updateArticle(id, {
        views: (await storage.getArticles()).find((a) => a.id === id)?.views || 0 + 1,
      });
      res.json(article);
    } catch (error) {
      res.status(500).json({ message: "Failed to update article views" });
    }
  });

  // ✅ Article likes endpoints (protected)
  app.post("/api/articles/:id/like", requireAuth(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;
      const result = await storage.likeArticle(id, userId);
      res.json(result);
    } catch (error) {
      console.error("Error liking article:", error);
      res.status(500).json({ message: "Failed to like article" });
    }
  });

  app.post("/api/articles/:id/unlike", requireAuth(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;
      const result = await storage.unlikeArticle(id, userId);
      res.json(result);
    } catch (error) {
      console.error("Error unliking article:", error);
      res.status(500).json({ message: "Failed to unlike article" });
    }
  });

  app.get("/api/articles/:id/liked", requireAuth(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;
      const isLiked = await storage.isArticleLikedByUser(id, userId);
      res.json({ isLiked });
    } catch (error) {
      console.error("Error checking like status:", error);
      res.status(500).json({ message: "Failed to check like status" });
    }
  });

  app.get("/api/user/liked-articles", requireAuth(), async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const likedArticleIds = await storage.getUserLikedArticles(userId);
      res.json(likedArticleIds);
    } catch (error) {
      console.error("Error fetching liked articles:", error);
      res.status(500).json({ message: "Failed to fetch liked articles" });
    }
  });

  // ✅ Saved articles endpoints (protected)
  app.post("/api/articles/:id/save", requireAuth(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;
      const result = await storage.saveArticle(id, userId);
      res.json(result);
    } catch (error) {
      console.error("Error saving article:", error);
      res.status(500).json({ message: "Failed to save article" });
    }
  });

  app.post("/api/articles/:id/unsave", requireAuth(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;
      const result = await storage.unsaveArticle(id, userId);
      res.json(result);
    } catch (error) {
      console.error("Error unsaving article:", error);
      res.status(500).json({ message: "Failed to unsave article" });
    }
  });

  app.get("/api/articles/:id/saved", requireAuth(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;
      const isSaved = await storage.isArticleSavedByUser(id, userId);
      res.json({ isSaved });
    } catch (error) {
      console.error("Error checking saved status:", error);
      res.status(500).json({ message: "Failed to check saved status" });
    }
  });

  app.get("/api/saved-articles", requireAuth(), async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const savedArticles = await storage.getSavedArticles(userId);

      const filtered = await applyFilters(savedArticles, userId);

      console.log(
        `Saved articles endpoint: ${savedArticles.length} articles -> ${filtered.length} after filtering (user ${userId})`
      );

      res.json(filtered);
    } catch (error) {
      console.error("Error fetching saved articles:", error);
      res.status(500).json({ message: "Failed to fetch saved articles" });
    }
  });

  // ✅ Article Feedback endpoints (protected)
  app.post("/api/articles/:id/feedback", requireAuth(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { feedback } = req.body;
      const userId = req.auth.userId;

      if (feedback !== "thumbs_up" && feedback !== "thumbs_down") {
        return res
          .status(400)
          .json({ message: "Invalid feedback type. Must be 'thumbs_up' or 'thumbs_down'" });
      }

      const result = await storage.saveFeedback(userId, id, feedback);
      res.json(result);
    } catch (error) {
      console.error("Error saving feedback:", error);
      res.status(500).json({ message: "Failed to save feedback" });
    }
  });

  app.delete("/api/articles/:id/feedback", requireAuth(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;
      const result = await storage.removeFeedback(userId, id);
      res.json(result);
    } catch (error) {
      console.error("Error removing feedback:", error);
      res.status(500).json({ message: "Failed to remove feedback" });
    }
  });

  app.get("/api/articles/:id/feedback", requireAuth(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;
      const feedback = await storage.getFeedback(userId, id);
      res.json(feedback || { feedback: null });
    } catch (error) {
      console.error("Error getting feedback:", error);
      res.status(500).json({ message: "Failed to get feedback" });
    }
  });

  app.get("/api/user/feedback", requireAuth(), async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const feedbackList = await storage.getUserFeedback(userId);
      res.json(feedbackList);
    } catch (error) {
      console.error("Error getting user feedback:", error);
      res.status(500).json({ message: "Failed to get user feedback" });
    }
  });

  // ✅ Keywords endpoints (public)
  app.get("/api/keywords", async (req, res) => {
    try {
      const keywords = await storage.getKeywords();
      res.json(keywords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch keywords" });
    }
  });

  app.get("/api/keywords/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const keywords = await storage.getKeywordsByType(type);
      res.json(keywords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch keywords by type" });
    }
  });

  app.post("/api/keywords", async (req, res) => {
    try {
      const keywordData = insertKeywordSchema.parse(req.body);
      const keyword = await storage.createKeyword(keywordData);
      res.json(keyword);
    } catch (error) {
      res.status(400).json({ message: "Invalid keyword data" });
    }
  });

  app.delete("/api/keywords/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteKeyword(id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Keyword not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete keyword" });
    }
  });

  // ✅ Replacement patterns endpoints (mixed: list can be empty if not signed in)
  app.get("/api/replacement-patterns", async (req: any, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        res.json([]);
        return;
      }
      const patterns = await storage.getReplacementPatterns(userId);
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch replacement patterns" });
    }
  });

  app.post("/api/replacement-patterns", requireAuth(), async (req: any, res) => {
    try {
      const userId = req.auth.userId;
      const patternData = insertReplacementPatternSchema.parse({
        ...req.body,
        userId,
      });
      const pattern = await storage.createReplacementPattern(patternData);
      res.json(pattern);
    } catch (error) {
      res.status(400).json({ message: "Invalid replacement pattern data" });
    }
  });

  app.delete("/api/replacement-patterns/:id", requireAuth(), async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.auth.userId;

      const existingPatterns = await storage.getReplacementPatterns(userId);
      const pattern = existingPatterns.find((p) => p.id === id);

      if (!pattern) {
        res.status(404).json({ message: "Replacement pattern not found" });
        return;
      }

      const deleted = await storage.deleteReplacementPattern(id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Replacement pattern not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete replacement pattern" });
    }
  });

  // ✅ User preferences endpoints (public / optional user)
  app.get("/api/preferences", async (req: any, res) => {
    try {
      const { userId } = getAuth(req);
      const preferences = await storage.getUserPreferences(userId || undefined);
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.put("/api/preferences", async (req: any, res) => {
    try {
      const { userId } = getAuth(req);
      const preferences = await storage.updateUserPreferences(req.body, userId || undefined);
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // ✅ Filter preview endpoint (public / optional user)
  app.get("/api/filter-preview", async (req: any, res) => {
    try {
      const { userId } = getAuth(req);
      const preferences = await storage.getUserPreferences(userId || undefined);
      const articles = await storage.getArticles();

      let replacementPatterns: any[] = [];
      try {
        replacementPatterns = await storage.getReplacementPatterns(userId || undefined);
      } catch (error) {
        console.error("Failed to fetch replacement patterns:", error);
      }

      const applyReplacementPatterns = (text: string): string => {
        let transformedText = text;

        for (const pattern of replacementPatterns) {
          const escapedFind = pattern.findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const flags = pattern.caseSensitive ? "g" : "gi";
          const regex = new RegExp(escapedFind, flags);
          transformedText = transformedText.replace(regex, pattern.replaceText);
        }

        return transformedText;
      };

      const transformedArticles = articles.map((article) => ({
        ...article,
        title: applyReplacementPatterns(article.title),
        summary: applyReplacementPatterns(article.summary),
      }));

      const blockedKeywords = await storage.getKeywordsByType("blocked");
      const blocked = blockedKeywords.map((kw) => kw.keyword.toLowerCase());

      const filtered = transformedArticles.filter((article) => {
        if (article.sentiment < (preferences?.sentimentThreshold || 0.7)) return false;

        const articleText = `${article.title} ${article.summary}`.toLowerCase();
        const hasBlockedKeyword = blocked.some(
          (blockedTerm) =>
            articleText.includes(blockedTerm) ||
            (article.keywords || []).some((kw: string) => kw.toLowerCase().includes(blockedTerm))
        );

        return !hasBlockedKeyword;
      });

      const preview: FilterPreview = {
        original: articles.slice(0, 20),
        filtered: filtered.slice(0, 20),
        stats: {
          totalArticles: articles.length,
          filteredCount: articles.length - filtered.length,
          passedCount: filtered.length,
          avgSentiment: filtered.length > 0 ? filtered.reduce((sum, a) => sum + a.sentiment, 0) / filtered.length : 0,
          anxietyReduction:
            articles.length > 0 ? Math.round(((articles.length - filtered.length) / articles.length) * 100) : 0,
        },
      };

      res.json(preview);
    } catch (error) {
      console.error("Filter preview error:", error);
      res.status(500).json({ message: "Failed to generate filter preview" });
    }
  });

  app.post("/api/filter-preview", async (req: any, res) => {
    try {
      const { sentimentThreshold } = req.body;
      const { userId } = getAuth(req);
      const articles = await storage.getArticles();

      let replacementPatterns: any[] = [];
      try {
        replacementPatterns = await storage.getReplacementPatterns(userId || undefined);
      } catch (error) {
        console.error("Failed to fetch replacement patterns:", error);
      }

      const applyReplacementPatterns = (text: string): string => {
        let transformedText = text;

        for (const pattern of replacementPatterns) {
          const escapedFind = pattern.findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const flags = pattern.caseSensitive ? "g" : "gi";
          const regex = new RegExp(escapedFind, flags);
          transformedText = transformedText.replace(regex, pattern.replaceText);
        }

        return transformedText;
      };

      const transformedArticles = articles.map((article) => ({
        ...article,
        title: applyReplacementPatterns(article.title),
        summary: applyReplacementPatterns(article.summary),
      }));

      const blockedKeywords = await storage.getKeywordsByType("blocked");
      const blocked = blockedKeywords.map((kw) => kw.keyword.toLowerCase());

      const filtered = transformedArticles.filter((article) => {
        if (article.sentiment < (sentimentThreshold || 0.7)) return false;

        const articleText = `${article.title} ${article.summary}`.toLowerCase();
        const hasBlockedKeyword = blocked.some(
          (blockedTerm) =>
            articleText.includes(blockedTerm) ||
            (article.keywords || []).some((kw: string) => kw.toLowerCase().includes(blockedTerm))
        );

        return !hasBlockedKeyword;
      });

      const preview: FilterPreview = {
        original: articles.slice(0, 20),
        filtered: filtered.slice(0, 20),
        stats: {
          totalArticles: articles.length,
          filteredCount: articles.length - filtered.length,
          passedCount: filtered.length,
          avgSentiment: filtered.length > 0 ? filtered.reduce((sum, a) => sum + a.sentiment, 0) / filtered.length : 0,
          anxietyReduction:
            articles.length > 0 ? Math.round(((articles.length - filtered.length) / articles.length) * 100) : 0,
        },
      };

      res.json(preview);
    } catch (error) {
      console.error("Filter preview error:", error);
      res.status(500).json({ message: "Failed to generate filter preview" });
    }
  });

  // ✅ Trigger news fetch (public)
  app.post("/api/fetch-news", async (req, res) => {
    try {
      const { force } = req.body;
      await newsService.fetchLatestNews(force || false);
      res.json({ success: true, message: "News fetch completed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  // ✅ Podcast endpoints (public)
  app.get("/api/podcasts", async (req, res) => {
    try {
      console.log("=== PODCAST ROUTE CALLED ===");
      const podcasts = await podcastService.getAllPodcasts();
      console.log("✅ Podcasts retrieved successfully in route");
      res.json(podcasts);
    } catch (error) {
      console.error("❌ Error in podcast route:", error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      res.status(500).json({ message: "Failed to fetch podcasts" });
    }
  });

  app.get("/api/podcasts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const podcast = await podcastService.getPodcastById(id);
      if (podcast) {
        res.json(podcast);
      } else {
        res.status(404).json({ message: "Podcast not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch podcast" });
    }
  });

  app.post("/api/podcasts/generate", async (req, res) => {
    try {
      const podcastId = await podcastService.generateDailyPodcast();
      res.json({ success: true, podcastId, message: "Podcast generated successfully" });
    } catch (error) {
      console.error("Podcast generation error:", error);
      res.status(500).json({ message: "Failed to generate podcast" });
    }
  });

  app.post("/api/podcasts/:id/regenerate", async (req, res) => {
    try {
      const { id } = req.params;
      await podcastService.regeneratePodcast(id);
      res.json({ success: true, message: "Podcast regenerated successfully" });
    } catch (error) {
      console.error("Podcast regeneration error:", error);
      res.status(500).json({ message: "Failed to regenerate podcast" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
