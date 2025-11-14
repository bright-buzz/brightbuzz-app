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

  async fetchLatestNews(forceRefresh: boolean = false): Promise<void> {
    const now = Date.now();
    if (!forceRefresh && now - this.lastFetchTime < this.FETCH_INTERVAL) {
      return; // Too soon to fetch again
    }

    try {
      console.log("Fetching latest news from RSS feeds...");
      
      // Fetch from RSS feeds (primary source)
      const rssArticles = await this.rssService.getLatestArticles();
      console.log(`Retrieved ${rssArticles.length} articles from RSS feeds`);

      // Process RSS articles with fallback-only processing (skip AI due to quota)
      const processedArticles = await this.processRSSArticlesWithFallback(rssArticles);
      
      // Store articles
      for (const article of processedArticles) {
        await storage.createArticle(article);
      }

      // Fallback to NewsAPI if RSS didn't provide enough content
      if (processedArticles.length < 10) {
        console.log("RSS feeds provided limited content, supplementing with NewsAPI...");
        await this.fetchFromNewsAPI();
      }

      // Run curation (with fallback if AI fails)
      await this.runCurationWithFallback();

      this.lastFetchTime = now;
    } catch (error) {
      console.error("Failed to fetch news:", error);
    }
  }

  private async fetchFromNewsAPI(): Promise<void> {
    try {
      const queries = [
        'breaking news',
        'world news',
        'politics',
        'technology',
        'business',
        'sports',
        'entertainment',
        'health',
        'science',
        'travel',
        'environment',
        'food'
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
        } catch (aiError) {
          console.log(`AI sentiment analysis failed for "${article.title}", using default sentiment`);
          sentiment = 0.7; // Default positive sentiment
        }

        try {
          // Extract keywords
          keywords = await extractKeywords(article.title + " " + article.summary);
        } catch (aiError) {
          console.log(`AI keyword extraction failed for "${article.title}", using basic keywords`);
          keywords = this.extractBasicKeywords(article.title + " " + article.summary);
        }

        try {
          // Generate better summary if needed
          if (article.summary.length < 100) {
            summary = await summarizeArticle(article.title, article.content);
          }
        } catch (aiError) {
          console.log(`AI summarization failed for "${article.title}", using original summary`);
          // Keep the original summary
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
        } catch (aiError) {
          console.log(`AI sentiment analysis failed for "${article.title}", using default sentiment`);
          sentiment = 0.7;
        }

        try {
          summary = await summarizeArticle(article.title, article.content);
        } catch (aiError) {
          console.log(`AI summarization failed for "${article.title}", using original description`);
          summary = article.description;
        }

        try {
          keywords = await extractKeywords(article.title + " " + article.description);
        } catch (aiError) {
          console.log(`AI keyword extraction failed for "${article.title}", using basic keywords`);
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

  private async processRSSArticlesWithFallback(articles: Omit<InsertArticle, 'id' | 'views' | 'sentiment' | 'keywords' | 'isCurated' | 'isTopFive'>[]): Promise<InsertArticle[]> {
    const processed: InsertArticle[] = [];

    for (const article of articles) {
      if (!article.title || !article.summary || !article.content) continue;

      try {
        // Use only fallback processing - no AI calls
        const sentiment = 0.7; // Default positive sentiment
        const keywords = this.extractBasicKeywords(article.title + " " + article.summary);
        const summary = article.summary;

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
        console.log(`Processed RSS article: "${article.title}" from ${article.source}`);
      } catch (error) {
        console.error(`Failed to process RSS article: ${article.title}`, error);
        continue;
      }
    }

    console.log(`Successfully processed ${processed.length} RSS articles with fallback method`);
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

  private applyReplacementPatterns(text: string, replacementPatterns: any[]): string {
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

  private async runCurationWithFallback(): Promise<void> {
    try {
      const articles = await storage.getArticles();
      
      // Skip AI curation due to quota limits, use basic curation directly
      console.log("Using basic curation due to AI quota limits");
      await this.runBasicCuration(articles);
    } catch (error) {
      console.error("Failed to run curation:", error);
    }
  }

  private async runBasicCuration(articles: any[]): Promise<void> {
    try {
      console.log(`Starting basic curation with ${articles.length} articles`);
      
      // FIRST: Filter by date - only articles from last 30 days are eligible for curation
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const recentArticles = articles.filter((article: any) => {
        const publishedDate = new Date(article.publishedAt).getTime();
        return publishedDate >= thirtyDaysAgo;
      });
      
      console.log(`After date filtering (last 30 days): ${recentArticles.length} of ${articles.length} articles remain`);
      
      // Filter out negative keywords (global process - no user-specific replacements)
      const blockedKeywords = await storage.getKeywords();
      const blockedTerms = blockedKeywords
        .filter((k: any) => k.type === 'blocked')
        .map((k: any) => k.keyword.toLowerCase());
      
      const filteredArticles = recentArticles.filter((article: any) => {
        const articleText = `${article.title} ${article.summary}`.toLowerCase();
        return !blockedTerms.some((term: string) => articleText.includes(term));
      });

      console.log(`After keyword filtering: ${filteredArticles.length} articles remain`);
      
      // Simple scoring based on positive criteria
      const scoredArticles = filteredArticles.map((article: any) => {
        let score = article.sentiment || 0.7; // Base sentiment score
        
        const titleAndSummary = `${article.title} ${article.summary}`.toLowerCase();
        
        // Boost score for positive business/tech terms
        const positiveTerms = ['growth', 'innovation', 'success', 'breakthrough', 'launch', 'funding', 'profit', 'advance', 'development', 'opportunity', 'market', 'technology', 'ai', 'startup'];
        const positiveMatches = positiveTerms.filter(term => titleAndSummary.includes(term)).length;
        score += positiveMatches * 0.1;
        
        // Boost for technology and business categories
        if (article.category === 'Technology' || article.category === 'Business') {
          score += 0.2;
        }
        
        // Boost for recent articles
        const hoursOld = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
        if (hoursOld < 24) score += 0.1;
        
        return { ...article, score };
      });

      // Sort by score (highest first)
      const sortedArticles = scoredArticles.sort((a, b) => b.score - a.score);

      // Mark top 15 as curated
      const curatedCount = Math.min(15, sortedArticles.length);
      for (let i = 0; i < curatedCount; i++) {
        await storage.updateArticle(sortedArticles[i].id, { isCurated: true });
      }

      // Mark top 5 as top five
      const topFiveCount = Math.min(5, sortedArticles.length);
      for (let i = 0; i < topFiveCount; i++) {
        await storage.updateArticle(sortedArticles[i].id, { isTopFive: true });
      }

      console.log(`Basic curation complete: ${curatedCount} curated, ${topFiveCount} top five`);
      console.log(`Top article: "${sortedArticles[0]?.title}" (score: ${sortedArticles[0]?.score})`);
    } catch (error) {
      console.error("Failed to run basic curation:", error);
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
