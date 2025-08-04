import { storage } from "../storage";
import { analyzeSentiment, summarizeArticle, extractKeywords, curateArticles } from "./aiService";
import { RSSService } from "./rssService";
import type { InsertArticle } from "@shared/schema";

const NEWS_API_KEY = process.env.NEWS_API_KEY || process.env.VITE_NEWS_API_KEY || "default_key";

interface NewsAPIArticle {
  title: string;
  description: string;
  content: string;
  source: { name: string };
  url: string;
  urlToImage: string;
  publishedAt: string;
}

export class NewsService {
  private lastFetchTime: number = 0;
  private readonly FETCH_INTERVAL = 15 * 60 * 1000; // 15 minutes
  private rssService: RSSService;

  constructor() {
    this.rssService = new RSSService();
  }

  async fetchLatestNews(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetchTime < this.FETCH_INTERVAL) {
      return; // Too soon to fetch again
    }

    try {
      console.log("Fetching latest news from RSS feeds...");
      
      // Fetch from RSS feeds (primary source)
      const rssArticles = await this.rssService.getLatestArticles();
      console.log(`Retrieved ${rssArticles.length} articles from RSS feeds`);

      // Process RSS articles with AI analysis
      const processedArticles = await this.processRSSArticles(rssArticles);
      
      // Store articles
      for (const article of processedArticles) {
        await storage.createArticle(article);
      }

      // Fallback to NewsAPI if RSS didn't provide enough content
      if (processedArticles.length < 10) {
        console.log("RSS feeds provided limited content, supplementing with NewsAPI...");
        await this.fetchFromNewsAPI();
      }

      // Run AI curation
      await this.runAICuration();

      this.lastFetchTime = now;
    } catch (error) {
      console.error("Failed to fetch news:", error);
    }
  }

  private async fetchFromNewsAPI(): Promise<void> {
    try {
      const queries = [
        'artificial intelligence career',
        'remote work technology',
        'professional development',
        'startup innovation',
        'tech industry growth'
      ];

      const allArticles: NewsAPIArticle[] = [];

      for (const query of queries) {
        const response = await fetch(
          `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWS_API_KEY}`
        );

        if (response.ok) {
          const data = await response.json();
          if (data.articles) {
            allArticles.push(...data.articles);
          }
        }
      }

      // Process and store NewsAPI articles
      const processedArticles = await this.processNewsAPIArticles(allArticles);
      
      for (const article of processedArticles) {
        await storage.createArticle(article);
      }
    } catch (error) {
      console.error("Failed to fetch from NewsAPI:", error);
    }
  }

  private async processRSSArticles(articles: Omit<InsertArticle, 'id' | 'views' | 'sentiment' | 'keywords' | 'isCurated' | 'isTopFive'>[]): Promise<InsertArticle[]> {
    const processed: InsertArticle[] = [];

    for (const article of articles) {
      if (!article.title || !article.summary || !article.content) continue;

      try {
        // Use fallback values if AI analysis fails
        let sentiment = 0.7; // Default neutral-positive sentiment
        let keywords: string[] = [];
        let summary = article.summary;

        try {
          // Analyze sentiment
          const sentimentResult = await analyzeSentiment(article.title + " " + article.summary);
          sentiment = sentimentResult.rating;
          
          // Extract keywords
          keywords = await extractKeywords(article.title + " " + article.summary);
          
          // Generate better summary if needed
          if (article.summary.length < 100) {
            summary = await summarizeArticle(article.title, article.content);
          }
        } catch (aiError) {
          console.log(`AI analysis failed for "${article.title}", using fallback values`);
          // Extract basic keywords from title and content
          keywords = this.extractBasicKeywords(article.title + " " + article.summary);
        }

        const processedArticle: InsertArticle = {
          title: article.title,
          summary,
          content: article.content,
          source: article.source,
          url: article.url,
          imageUrl: article.imageUrl,
          category: article.category,
          readTime: article.readTime,
          sentiment,
          keywords,
          isCurated: false,
          isTopFive: false,
          publishedAt: article.publishedAt,
        };

        processed.push(processedArticle);
      } catch (error) {
        console.error(`Failed to process RSS article: ${article.title}`, error);
        continue;
      }
    }

    return processed;
  }

  private async processNewsAPIArticles(articles: NewsAPIArticle[]): Promise<InsertArticle[]> {
    const processed: InsertArticle[] = [];

    for (const article of articles) {
      if (!article.title || !article.description || !article.content) continue;

      try {
        // Use fallback values if AI analysis fails
        let sentiment = 0.7;
        let keywords: string[] = [];
        let summary = article.description;

        try {
          const sentimentResult = await analyzeSentiment(article.title + " " + article.description);
          sentiment = sentimentResult.rating;
          
          summary = await summarizeArticle(article.title, article.content);
          keywords = await extractKeywords(article.title + " " + article.description);
        } catch (aiError) {
          console.log(`AI analysis failed for "${article.title}", using fallback values`);
          keywords = this.extractBasicKeywords(article.title + " " + article.description);
        }

        // Estimate read time (average 200 words per minute)
        const wordCount = article.content.split(' ').length;
        const readTime = Math.ceil(wordCount / 200);

        const processedArticle: InsertArticle = {
          title: article.title,
          summary,
          content: article.content,
          source: article.source.name,
          url: article.url,
          imageUrl: article.urlToImage,
          category: this.categorizeArticle(keywords),
          readTime,
          sentiment,
          keywords,
          isCurated: false,
          isTopFive: false,
          publishedAt: article.publishedAt,
        };

        processed.push(processedArticle);
      } catch (error) {
        console.error("Failed to process NewsAPI article:", article.title, error);
        continue;
      }
    }

    return processed;
  }

  private extractBasicKeywords(text: string): string[] {
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those']);
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word))
      .slice(0, 10);
  }

  private categorizeArticle(keywords: string[]): string {
    const categories = {
      'Technology': ['tech', 'ai', 'artificial intelligence', 'software', 'programming', 'digital'],
      'Career': ['career', 'job', 'employment', 'professional', 'workplace', 'skills'],
      'Business': ['business', 'startup', 'company', 'industry', 'market', 'economy'],
      'Remote Work': ['remote', 'work from home', 'virtual', 'distributed'],
      'Innovation': ['innovation', 'breakthrough', 'development', 'research']
    };

    for (const [category, categoryKeywords] of Object.entries(categories)) {
      if (keywords.some(kw => categoryKeywords.some(ckw => kw.toLowerCase().includes(ckw)))) {
        return category;
      }
    }

    return 'General';
  }

  private async runAICuration(): Promise<void> {
    try {
      const articles = await storage.getArticles();
      const curation = await curateArticles(articles);

      // Update curated articles
      for (const articleId of curation.curated) {
        await storage.updateArticle(articleId, { isCurated: true });
      }

      // Update top five articles
      for (const articleId of curation.topFive) {
        await storage.updateArticle(articleId, { isTopFive: true });
      }
    } catch (error) {
      console.error("Failed to run AI curation:", error);
    }
  }

  async filterArticles(articles: any[], blockedKeywords: string[], sentimentThreshold: number) {
    return articles.filter(article => {
      // Check blocked keywords
      const hasBlockedKeyword = blockedKeywords.some(blocked => 
        article.title.toLowerCase().includes(blocked.toLowerCase()) ||
        article.summary.toLowerCase().includes(blocked.toLowerCase()) ||
        article.keywords.some((kw: string) => kw.toLowerCase().includes(blocked.toLowerCase()))
      );

      // Check sentiment threshold
      const meetsSentimentThreshold = article.sentiment >= sentimentThreshold;

      return !hasBlockedKeyword && meetsSentimentThreshold;
    });
  }
}

export const newsService = new NewsService();
