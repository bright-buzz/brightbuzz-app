import { storage } from "../storage";
import { analyzeSentiment, summarizeArticle, extractKeywords } from "./aiService";
import { RSSService } from "./rssService";
import type { InsertArticle } from "@shared/schema";
import { deduplicateArticles } from "./filteringService";

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
      let processedArticles = await this.processRSSArticlesWithFallback(rssArticles);

      // Deduplicate articles before storing to prevent database duplicates
      processedArticles = deduplicateArticles(processedArticles as any[]) as InsertArticle[];

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
        "breaking news",
        "world news",
        "politics",
        "technology",
        "business",
        "sports",
        "entertainment",
        "health",
        "science",
        "travel",
        "environment",
        "food",
      ];

      const allArticles: NewsAPIArticle[] = [];

      for (const query of queries) {
        const response = await fetch(
          `https://newsapi.org/v2/everything?q=${encodeURIComponent(
            query
          )}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${NEWS_API_KEY}`
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

  private async processRSSArticles(
    articles: Omit<
      InsertArticle,
      "id" | "views" | "sentiment" | "keywords" | "isCurated" | "isTopFive"
    >[]
  ): Promise<InsertArticle[]> {
    const processed: InsertArticle[] = [];

    for (const article of articles) {
      if (!article.title || !article.summary || !article.content) continue;

      try {
        // Use fallback values if AI analysis fails
        let sentiment = 0.7; // Default neutral-positive sentiment
        let keywords: string[] = [];
        let summary = article.summary;

        try {
          const sentimentResult = await analyzeSentiment(article.title + " " + article.summary);
          sentiment = sentimentResult.rating;
        } catch {
          console.log(`AI sentiment analysis failed for "${article.title}", using default sentiment`);
          sentiment = 0.7;
        }

        try {
          keywords = await extractKeywords(article.title + " " + article.summary);
        } catch {
          console.log(`AI keyword extraction failed for "${article.title}", using basic keywords`);
          keywords = this.extractBasicKeywords(article.title + " " + article.summary);
        }

        try {
          if (article.summary.length < 100) {
            summary = await summarizeArticle(article.title, article.content);
          }
        } catch {
          console.log(`AI summarization failed for "${article.title}", using original summary`);
        }

        processed.push({
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
        });
      } catch (error) {
        console.error(`Failed to process RSS article: ${article.title}`, error);
      }
    }

    return processed;
  }

  private async processNewsAPIArticles(articles: NewsAPIArticle[]): Promise<InsertArticle[]> {
    const processed: InsertArticle[] = [];

    for (const article of articles) {
      if (!article.title || !article.description || !article.content) continue;

      try {
        let sentiment = 0.7;
        let keywords: string[] = [];
        let summary = article.description;

        try {
          const sentimentResult = await analyzeSentiment(article.title + " " + article.description);
          sentiment = sentimentResult.rating;
        } catch {
          console.log(`AI sentiment analysis failed for "${article.title}", using default sentiment`);
          sentiment = 0.7;
        }

        try {
          summary = await summarizeArticle(article.title, article.content);
        } catch {
          console.log(`AI summarization failed for "${article.title}", using original description`);
          summary = article.description;
        }

        try {
          keywords = await extractKeywords(article.title + " " + article.description);
        } catch {
          console.log(`AI keyword extraction failed for "${article.title}", using basic keywords`);
          keywords = this.extractBasicKeywords(article.title + " " + article.description);
        }

        const wordCount = article.content.split(" ").length;
        const readTime = Math.ceil(wordCount / 200);

        processed.push({
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
        });
      } catch (error) {
        console.error("Failed to process NewsAPI article:", article.title, error);
      }
    }

    return processed;
  }

  private async processRSSArticlesWithFallback(
    articles: Omit<
      InsertArticle,
      "id" | "views" | "sentiment" | "keywords" | "isCurated" | "isTopFive"
    >[]
  ): Promise<InsertArticle[]> {
    const processed: InsertArticle[] = [];

    for (const article of articles) {
      if (!article.title || !article.summary || !article.content) continue;

      try {
        const sentiment = 0.7;
        const keywords = this.extractBasicKeywords(article.title + " " + article.summary);
        const summary = article.summary;

        processed.push({
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
        });

        console.log(`Processed RSS article: "${article.title}" from ${article.source}`);
      } catch (error) {
        console.error(`Failed to process RSS article: ${article.title}`, error);
      }
    }

    console.log(`Successfully processed ${processed.length} RSS articles with fallback method`);
    return processed;
  }

  private extractBasicKeywords(text: string): string[] {
    const commonWords = new Set([
      "the","a","an","and","or","but","in","on","at","to","for","of","with","by",
      "is","are","was","were","be","been","have","has","had","do","does","did",
      "will","would","could","should","may","might","must","can","this","that","these","those",
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !commonWords.has(word))
      .slice(0, 10);
  }

  private categorizeArticle(keywords: string[]): string {
    const categories = {
      Technology: ["tech", "ai", "artificial intelligence", "software", "programming", "digital"],
      Career: ["career", "job", "employment", "professional", "workplace", "skills"],
      Business: ["business", "startup", "company", "industry", "market", "economy"],
      "Remote Work": ["remote", "work from home", "virtual", "distributed"],
      Innovation: ["innovation", "breakthrough", "development", "research"],
    };

    for (const [category, categoryKeywords] of Object.entries(categories)) {
      if (keywords.some((kw) => categoryKeywords.some((ckw) => kw.toLowerCase().includes(ckw)))) {
        return category;
      }
    }

    return "General";
  }

  private async runCurationWithFallback(): Promise<void> {
    try {
      const articles = await storage.getArticles();

      console.log("Using basic curation due to AI quota limits");
      await this.runBasicCuration(articles);
    } catch (error) {
      console.error("Failed to run curation:", error);
    }
  }

  private async runBasicCuration(articles: any[]): Promise<void> {
    try {
      console.log(`Starting basic curation with ${articles.length} articles`);

      // ✅ Step 1: Only curate from last 3 days
      const days = 3;
      const threeDaysAgo = Date.now() - days * 24 * 60 * 60 * 1000;

      const recentArticles = articles.filter((article: any) => {
        const publishedDate = new Date(article.publishedAt).getTime();
        return Number.isFinite(publishedDate) && publishedDate >= threeDaysAgo;
      });

      console.log(`After date filtering (last ${days} days): ${recentArticles.length} of ${articles.length} remain`);

      // Filter out blocked keywords
      const blockedKeywords = await storage.getKeywords();
      const blockedTerms = blockedKeywords
        .filter((k: any) => k.type === "blocked")
        .map((k: any) => (k.keyword || "").toLowerCase())
        .filter(Boolean);

      const keywordFiltered = recentArticles.filter((article: any) => {
        const articleText = `${article.title ?? ""} ${article.summary ?? ""}`.toLowerCase();
        return !blockedTerms.some((term: string) => articleText.includes(term));
      });

      console.log(`After keyword filtering: ${keywordFiltered.length} articles remain`);

      // Deduplicate
      const deduped = deduplicateArticles(keywordFiltered);
      console.log(`After deduplication: ${deduped.length} unique articles (removed ${keywordFiltered.length - deduped.length})`);

      // ✅ Step 2: Cap curation workload at 500 (choose most recent 500)
      const capped = deduped
        .slice()
        .sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 500);

      console.log(`After capping: ${capped.length} articles will be scored/selected`);

      // Score
      const scored = capped.map((article: any) => {
        let score = article.sentiment || 0.7;
        const titleAndSummary = `${article.title ?? ""} ${article.summary ?? ""}`.toLowerCase();

        const positiveTerms = [
          "growth","innovation","success","breakthrough","launch","funding","profit","advance",
          "development","opportunity","market","technology","ai","startup",
        ];
        const positiveMatches = positiveTerms.filter((term) => titleAndSummary.includes(term)).length;
        score += positiveMatches * 0.1;

        if (article.category === "Technology" || article.category === "Business") score += 0.2;

        const hoursOld = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60);
        if (hoursOld < 24) score += 0.1;

        return { ...article, score };
      });

      const sorted = scored.sort((a: any, b: any) => b.score - a.score);

      // Pick Top Five + Curated
      const topFiveIds = sorted.slice(0, 5).map((a: any) => a.id).filter(Boolean);
      const curatedIds = sorted.slice(5, 20).map((a: any) => a.id).filter(Boolean);

      // ✅ BULK DB UPDATE (most important reliability fix)
      console.log("Applying curation flags in bulk (transactional)...");
      await storage.setCurationFlagsBulk(topFiveIds, curatedIds);
      console.log(`Curation flags applied: ${topFiveIds.length} top five, ${curatedIds.length} curated`);

      console.log(`Top article: "${sorted[0]?.title}" (score: ${sorted[0]?.score})`);
    } catch (error) {
      console.error("Failed to run basic curation:", error);
    }
  }

  async filterArticles(articles: any[], blockedKeywords: string[], sentimentThreshold: number) {
    return articles.filter((article) => {
      const hasBlockedKeyword = blockedKeywords.some(
        (blocked) =>
          article.title.toLowerCase().includes(blocked.toLowerCase()) ||
          article.summary.toLowerCase().includes(blocked.toLowerCase()) ||
          article.keywords.some((kw: string) => kw.toLowerCase().includes(blocked.toLowerCase()))
      );

      const meetsSentimentThreshold = article.sentiment >= sentimentThreshold;

      return !hasBlockedKeyword && meetsSentimentThreshold;
    });
  }
}

export const newsService = new NewsService();
