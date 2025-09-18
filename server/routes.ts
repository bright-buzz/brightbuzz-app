import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { newsService } from "./services/newsService";
import { podcastService } from "./services/podcastService";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertKeywordSchema, insertReplacementPatternSchema } from "@shared/schema";
import type { FilterPreview } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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
      const articles = await storage.getCuratedArticles();
      
      // Apply replacement patterns if user is authenticated
      if (req.isAuthenticated()) {
        const userId = req.user.claims.sub;
        let replacementPatterns: any[] = [];
        try {
          replacementPatterns = await storage.getReplacementPatterns(userId);
        } catch (error) {
          console.error('Failed to fetch replacement patterns:', error);
        }

        console.log(`Curated endpoint: Found ${replacementPatterns.length} replacement patterns for user ${userId}`);

        const applyReplacementPatterns = (text: string): string => {
          let transformedText = text;
          
          for (const pattern of replacementPatterns) {
            // Escape user input for literal replacement to prevent ReDoS
            const escapedFind = pattern.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Respect caseSensitive flag
            const flags = pattern.caseSensitive ? 'g' : 'gi';
            const regex = new RegExp(escapedFind, flags);
            const beforeText = transformedText;
            transformedText = transformedText.replace(regex, pattern.replaceText);
            if (beforeText !== transformedText) {
              console.log(`Curated: Replacement applied \"${pattern.findText}\" -> \"${pattern.replaceText}\" in: \"${beforeText.substring(0, 100)}...\"`); 
            }
          }
          
          return transformedText;
        };

        const transformedArticles = articles.map((article) => ({
          ...article,
          title: applyReplacementPatterns(article.title),
          summary: applyReplacementPatterns(article.summary)
        }));
        
        res.json(transformedArticles);
      } else {
        res.json(articles);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch curated articles" });
    }
  });

  app.get("/api/articles/top-five", async (req: any, res) => {
    try {
      const articles = await storage.getTopFiveArticles();
      
      // Apply replacement patterns if user is authenticated
      if (req.isAuthenticated()) {
        const userId = req.user.claims.sub;
        let replacementPatterns: any[] = [];
        try {
          replacementPatterns = await storage.getReplacementPatterns(userId);
        } catch (error) {
          console.error('Failed to fetch replacement patterns:', error);
        }

        console.log(`Top-five endpoint: Found ${replacementPatterns.length} replacement patterns for user ${userId}`);

        const applyReplacementPatterns = (text: string): string => {
          let transformedText = text;
          
          for (const pattern of replacementPatterns) {
            // Escape user input for literal replacement to prevent ReDoS
            const escapedFind = pattern.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Respect caseSensitive flag
            const flags = pattern.caseSensitive ? 'g' : 'gi';
            const regex = new RegExp(escapedFind, flags);
            const beforeText = transformedText;
            transformedText = transformedText.replace(regex, pattern.replaceText);
            if (beforeText !== transformedText) {
              console.log(`Top-five: Replacement applied \"${pattern.findText}\" -> \"${pattern.replaceText}\" in: \"${beforeText.substring(0, 100)}...\"`); 
            }
          }
          
          return transformedText;
        };

        const transformedArticles = articles.map((article) => ({
          ...article,
          title: applyReplacementPatterns(article.title),
          summary: applyReplacementPatterns(article.summary)
        }));
        
        res.json(transformedArticles);
      } else {
        res.json(articles);
      }
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
      const podcasts = await podcastService.getAllPodcasts();
      res.json(podcasts);
    } catch (error) {
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
