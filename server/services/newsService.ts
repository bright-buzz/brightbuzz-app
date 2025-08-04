import { storage } from "../storage";
import { analyzeSentiment, summarizeArticle, extractKeywords, curateArticles } from "./aiService";
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

  async fetchLatestNews(): Promise<void> {
    const now = Date.now();
    if (now - this.lastFetchTime < this.FETCH_INTERVAL) {
      return; // Too soon to fetch again
    }

    try {
      // Fetch from multiple endpoints to get diverse content
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

      // Process and store articles
      const processedArticles = await this.processArticles(allArticles);
      
      // Store articles
      for (const article of processedArticles) {
        await storage.createArticle(article);
      }

      // Run AI curation
      await this.runAICuration();

      this.lastFetchTime = now;
    } catch (error) {
      console.error("Failed to fetch news:", error);
    }
  }

  private async processArticles(articles: NewsAPIArticle[]): Promise<InsertArticle[]> {
    const processed: InsertArticle[] = [];

    for (const article of articles) {
      if (!article.title || !article.description || !article.content) continue;

      try {
        // Analyze sentiment
        const sentiment = await analyzeSentiment(article.title + " " + article.description);
        
        // Generate summary
        const summary = await summarizeArticle(article.title, article.content);
        
        // Extract keywords
        const keywords = await extractKeywords(article.title + " " + article.description);

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
          sentiment: sentiment.rating,
          keywords,
          isCurated: false,
          isTopFive: false,
          publishedAt: article.publishedAt,
        };

        processed.push(processedArticle);
      } catch (error) {
        console.error("Failed to process article:", article.title, error);
      }
    }

    return processed;
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
