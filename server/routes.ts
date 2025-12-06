import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { newsService } from "./services/newsService";
import { podcastService } from "./services/podcastService";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertKeywordSchema, insertReplacementPatternSchema } from "@shared/schema";
import type { FilterPreview } from "@shared/schema";
import { applyFilters, applyReplacementsOnly } from "./services/filteringService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
if (process.env.NODE_ENV === "development") {
  await setupAuth(app);
}
  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  // Articles endpoints
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
      const userId = req.isAuthenticated() ? req.user.claims.sub : undefined;
      const articles = await storage.getCuratedArticles();
      
      // Apply centralized filtering pipeline (date, blocked keywords, prioritized keywords, replacements, sentiment, deduplication)
      const filtered = await applyFilters(articles, userId);
      
      console.log(`Curated endpoint: ${articles.length} curated articles -> ${filtered.length} after filtering (user ${userId || 'anonymous'})`);
      
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch curated articles" });
    }
  });

  app.get("/api/articles/filtered", async (req: any, res) => {
    try {
      const userId = req.isAuthenticated() ? req.user.claims.sub : undefined;
      const curatedArticles = await storage.getCuratedArticles();
      
      // Apply centralized filtering pipeline
      const filtered = await applyFilters(curatedArticles, userId);

      console.log(`Filtered endpoint: ${curatedArticles.length} curated articles -> ${filtered.length} after filtering (user ${userId || 'anonymous'})`);
      
      res.json(filtered);
    } catch (error) {
      console.error("Failed to fetch filtered articles:", error);
      res.status(500).json({ message: "Failed to fetch filtered articles" });
    }
  });

  app.get("/api/articles/top-five", async (req: any, res) => {
    try {
      const userId = req.isAuthenticated() ? req.user.claims.sub : undefined;
      const articles = await storage.getTopFiveArticles();
      
      // Apply centralized filtering pipeline (includes replacements and all filters)
      const filtered = await applyFilters(articles, userId);

      console.log(`Top-five endpoint: ${articles.length} articles -> ${filtered.length} after filtering (user ${userId || 'anonymous'})`);
      
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top five articles" });
    }
  });

  app.post("/api/articles/:id/view", async (req, res) => {
    try {
      const { id } = req.params;
      const article = await storage.updateArticle(id, { 
        views: (await storage.getArticles()).find(a => a.id === id)?.views || 0 + 1 
      });
      res.json(article);
    } catch (error) {
      res.status(500).json({ message: "Failed to update article views" });
    }
  });

  // Article likes endpoints
  app.post("/api/articles/:id/like", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const result = await storage.likeArticle(id, userId);
      res.json(result);
    } catch (error) {
      console.error("Error liking article:", error);
      res.status(500).json({ message: "Failed to like article" });
    }
  });

  app.post("/api/articles/:id/unlike", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const result = await storage.unlikeArticle(id, userId);
      res.json(result);
    } catch (error) {
      console.error("Error unliking article:", error);
      res.status(500).json({ message: "Failed to unlike article" });
    }
  });

  app.get("/api/articles/:id/liked", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const isLiked = await storage.isArticleLikedByUser(id, userId);
      res.json({ isLiked });
    } catch (error) {
      console.error("Error checking like status:", error);
      res.status(500).json({ message: "Failed to check like status" });
    }
  });

  app.get("/api/user/liked-articles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const likedArticleIds = await storage.getUserLikedArticles(userId);
      res.json(likedArticleIds);
    } catch (error) {
      console.error("Error fetching liked articles:", error);
      res.status(500).json({ message: "Failed to fetch liked articles" });
    }
  });

  // Saved articles endpoints
  app.post("/api/articles/:id/save", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const result = await storage.saveArticle(id, userId);
      res.json(result);
    } catch (error) {
      console.error("Error saving article:", error);
      res.status(500).json({ message: "Failed to save article" });
    }
  });

  app.post("/api/articles/:id/unsave", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const result = await storage.unsaveArticle(id, userId);
      res.json(result);
    } catch (error) {
      console.error("Error unsaving article:", error);
      res.status(500).json({ message: "Failed to unsave article" });
    }
  });

  app.get("/api/articles/:id/saved", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const isSaved = await storage.isArticleSavedByUser(id, userId);
      res.json({ isSaved });
    } catch (error) {
      console.error("Error checking saved status:", error);
      res.status(500).json({ message: "Failed to check saved status" });
    }
  });

  app.get("/api/saved-articles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const savedArticles = await storage.getSavedArticles(userId);
      
      // Apply centralized filtering pipeline
      const filtered = await applyFilters(savedArticles, userId);
      
      console.log(`Saved articles endpoint: ${savedArticles.length} articles -> ${filtered.length} after filtering (user ${userId})`);
      
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching saved articles:", error);
      res.status(500).json({ message: "Failed to fetch saved articles" });
    }
  });

  // Article Feedback endpoints
  app.post("/api/articles/:id/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { feedback } = req.body;
      const userId = req.user.claims.sub;
      
      // Validate feedback type
      if (feedback !== 'thumbs_up' && feedback !== 'thumbs_down') {
        return res.status(400).json({ message: "Invalid feedback type. Must be 'thumbs_up' or 'thumbs_down'" });
      }
      
      const result = await storage.saveFeedback(userId, id, feedback);
      res.json(result);
    } catch (error) {
      console.error("Error saving feedback:", error);
      res.status(500).json({ message: "Failed to save feedback" });
    }
  });

  app.delete("/api/articles/:id/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const result = await storage.removeFeedback(userId, id);
      res.json(result);
    } catch (error) {
      console.error("Error removing feedback:", error);
      res.status(500).json({ message: "Failed to remove feedback" });
    }
  });

  app.get("/api/articles/:id/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const feedback = await storage.getFeedback(userId, id);
      res.json(feedback || { feedback: null });
    } catch (error) {
      console.error("Error getting feedback:", error);
      res.status(500).json({ message: "Failed to get feedback" });
    }
  });

  app.get("/api/user/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const feedbackList = await storage.getUserFeedback(userId);
      res.json(feedbackList);
    } catch (error) {
      console.error("Error getting user feedback:", error);
      res.status(500).json({ message: "Failed to get user feedback" });
    }
  });

  // Keywords endpoints
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

  // Replacement patterns endpoints
  app.get("/api/replacement-patterns", async (req: any, res) => {
    try {
      if (!req.isAuthenticated()) {
        res.json([]);
        return;
      }
      const userId = req.user.claims.sub;
      const patterns = await storage.getReplacementPatterns(userId);
      res.json(patterns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch replacement patterns" });
    }
  });

  app.post("/api/replacement-patterns", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const patternData = insertReplacementPatternSchema.parse({
        ...req.body,
        userId
      });
      const pattern = await storage.createReplacementPattern(patternData);
      res.json(pattern);
    } catch (error) {
      res.status(400).json({ message: "Invalid replacement pattern data" });
    }
  });

  app.delete("/api/replacement-patterns/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify ownership before deletion
      const existingPatterns = await storage.getReplacementPatterns(userId);
      const pattern = existingPatterns.find(p => p.id === id);
      
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

  // User preferences endpoints
  app.get("/api/preferences", async (req: any, res) => {
    try {
      const userId = req.isAuthenticated() ? req.user.claims.sub : undefined;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.put("/api/preferences", async (req: any, res) => {
    try {
      const userId = req.isAuthenticated() ? req.user.claims.sub : undefined;
      const preferences = await storage.updateUserPreferences(req.body, userId);
      res.json(preferences);
    } catch (error) {
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Filter preview endpoint  
  app.get("/api/filter-preview", async (req: any, res) => {
    try {
      const userId = req.isAuthenticated() ? req.user.claims.sub : undefined;
      const preferences = await storage.getUserPreferences(userId);
      const articles = await storage.getArticles();
      
      // Apply replacement patterns first - fetch once and reuse
      let replacementPatterns: any[] = [];
      try {
        replacementPatterns = await storage.getReplacementPatterns(userId);
      } catch (error) {
        console.error('Failed to fetch replacement patterns:', error);
      }

      const applyReplacementPatterns = (text: string): string => {
        let transformedText = text;
        
        for (const pattern of replacementPatterns) {
          // Escape user input for literal replacement to prevent ReDoS
          const escapedFind = pattern.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // Respect caseSensitive flag
          const flags = pattern.caseSensitive ? 'g' : 'gi';
          const regex = new RegExp(escapedFind, flags);
          transformedText = transformedText.replace(regex, pattern.replaceText);
        }
        
        return transformedText;
      };

      const transformedArticles = articles.map((article) => ({
        ...article,
        title: applyReplacementPatterns(article.title),
        summary: applyReplacementPatterns(article.summary)
      }));

      const blockedKeywords = await storage.getKeywordsByType('blocked');
      const blocked = blockedKeywords.map(kw => kw.keyword.toLowerCase());
      
      // Simple filtering logic after applying replacement patterns
      const filtered = transformedArticles.filter(article => {
        // Check sentiment threshold
        if (article.sentiment < (preferences?.sentimentThreshold || 0.7)) {
          return false;
        }
        
        // Check blocked keywords
        const articleText = `${article.title} ${article.summary}`.toLowerCase();
        const hasBlockedKeyword = blocked.some(blockedTerm => 
          articleText.includes(blockedTerm) ||
          (article.keywords || []).some((kw: string) => kw.toLowerCase().includes(blockedTerm))
        );
        
        return !hasBlockedKeyword;
      });
      
      const preview: FilterPreview = {
        original: articles.slice(0, 20), // Limit for UI performance
        filtered: filtered.slice(0, 20),
        stats: {
          totalArticles: articles.length,
          filteredCount: articles.length - filtered.length,
          passedCount: filtered.length,
          avgSentiment: filtered.length > 0 ? filtered.reduce((sum, a) => sum + a.sentiment, 0) / filtered.length : 0,
          anxietyReduction: articles.length > 0 ? Math.round(((articles.length - filtered.length) / articles.length) * 100) : 0
        }
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
      const userId = req.isAuthenticated() ? req.user.claims.sub : undefined;
      const articles = await storage.getArticles();
      
      // Apply replacement patterns first - fetch once and reuse
      let replacementPatterns: any[] = [];
      try {
        replacementPatterns = await storage.getReplacementPatterns(userId);
      } catch (error) {
        console.error('Failed to fetch replacement patterns:', error);
      }

      const applyReplacementPatterns = (text: string): string => {
        let transformedText = text;
        
        for (const pattern of replacementPatterns) {
          // Escape user input for literal replacement to prevent ReDoS
          const escapedFind = pattern.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          // Respect caseSensitive flag
          const flags = pattern.caseSensitive ? 'g' : 'gi';
          const regex = new RegExp(escapedFind, flags);
          transformedText = transformedText.replace(regex, pattern.replaceText);
        }
        
        return transformedText;
      };

      const transformedArticles = articles.map((article) => ({
        ...article,
        title: applyReplacementPatterns(article.title),
        summary: applyReplacementPatterns(article.summary)
      }));

      const blockedKeywords = await storage.getKeywordsByType('blocked');
      const blocked = blockedKeywords.map(kw => kw.keyword.toLowerCase());
      
      // Simple filtering logic with custom threshold after applying replacement patterns
      const filtered = transformedArticles.filter(article => {
        // Check sentiment threshold
        if (article.sentiment < (sentimentThreshold || 0.7)) {
          return false;
        }
        
        // Check blocked keywords
        const articleText = `${article.title} ${article.summary}`.toLowerCase();
        const hasBlockedKeyword = blocked.some(blockedTerm => 
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
          anxietyReduction: articles.length > 0 ? Math.round(((articles.length - filtered.length) / articles.length) * 100) : 0
        }
      };
      
      res.json(preview);
    } catch (error) {
      console.error("Filter preview error:", error);
      res.status(500).json({ message: "Failed to generate filter preview" });
    }
  });

  // Trigger news fetch
  app.post("/api/fetch-news", async (req, res) => {
    try {
      const { force } = req.body;
      await newsService.fetchLatestNews(force || false);
      res.json({ success: true, message: "News fetch completed" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  // Podcast endpoints
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
