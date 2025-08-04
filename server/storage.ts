import { type Article, type InsertArticle, type Keyword, type InsertKeyword, type UserPreferences, type InsertUserPreferences, type Podcast, type InsertPodcast } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Articles
  createArticle(article: InsertArticle): Promise<Article>;
  getArticles(): Promise<Article[]>;
  getCuratedArticles(): Promise<Article[]>;
  getTopFiveArticles(): Promise<Article[]>;
  updateArticle(id: string, updates: Partial<Article>): Promise<Article | undefined>;
  
  // Keywords
  createKeyword(keyword: InsertKeyword): Promise<Keyword>;
  getKeywords(): Promise<Keyword[]>;
  getKeywordsByType(type: string): Promise<Keyword[]>;
  deleteKeyword(id: string): Promise<boolean>;
  
  // User Preferences
  getUserPreferences(): Promise<UserPreferences | undefined>;
  updateUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences>;
  
  // Podcasts
  createPodcast(podcast: InsertPodcast): Promise<Podcast>;
  getPodcasts(): Promise<Podcast[]>;
  getPodcast(id: string): Promise<Podcast | undefined>;
  updatePodcast(id: string, updates: Partial<Podcast>): Promise<Podcast | undefined>;
}

export class MemStorage implements IStorage {
  private articles: Map<string, Article>;
  private keywords: Map<string, Keyword>;
  private podcasts: Map<string, Podcast>;
  private userPreferences: UserPreferences | undefined;

  constructor() {
    this.articles = new Map();
    this.keywords = new Map();
    this.podcasts = new Map();
    this.userPreferences = {
      id: randomUUID(),
      sentimentThreshold: 0.7,
      realTimeFiltering: true,
    };
    
    // Initialize with some default keywords
    this.initializeDefaultKeywords();
  }

  private initializeDefaultKeywords() {
    const defaultKeywords = [
      { keyword: "layoffs", type: "blocked" },
      { keyword: "recession", type: "blocked" },
      { keyword: "crisis", type: "blocked" },
      { keyword: "unemployment", type: "blocked" },
      { keyword: "innovation", type: "prioritized" },
      { keyword: "growth", type: "prioritized" },
      { keyword: "career", type: "prioritized" },
      { keyword: "success", type: "prioritized" },
    ];

    defaultKeywords.forEach(kw => {
      const id = randomUUID();
      this.keywords.set(id, { id, ...kw });
    });
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const id = randomUUID();
    const article: Article = { 
      ...insertArticle,
      content: insertArticle.content || null,
      keywords: (insertArticle.keywords as string[]) || [],
      id,
      views: 0,
    };
    this.articles.set(id, article);
    return article;
  }

  async getArticles(): Promise<Article[]> {
    return Array.from(this.articles.values()).sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  async getCuratedArticles(): Promise<Article[]> {
    return Array.from(this.articles.values())
      .filter(article => article.isCurated)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  async getTopFiveArticles(): Promise<Article[]> {
    return Array.from(this.articles.values())
      .filter(article => article.isTopFive)
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);
  }

  async updateArticle(id: string, updates: Partial<Article>): Promise<Article | undefined> {
    const article = this.articles.get(id);
    if (!article) return undefined;
    
    const updatedArticle = { ...article, ...updates };
    this.articles.set(id, updatedArticle);
    return updatedArticle;
  }

  async createKeyword(insertKeyword: InsertKeyword): Promise<Keyword> {
    const id = randomUUID();
    const keyword: Keyword = { ...insertKeyword, id };
    this.keywords.set(id, keyword);
    return keyword;
  }

  async getKeywords(): Promise<Keyword[]> {
    return Array.from(this.keywords.values());
  }

  async getKeywordsByType(type: string): Promise<Keyword[]> {
    return Array.from(this.keywords.values()).filter(kw => kw.type === type);
  }

  async deleteKeyword(id: string): Promise<boolean> {
    return this.keywords.delete(id);
  }

  async getUserPreferences(): Promise<UserPreferences | undefined> {
    return this.userPreferences;
  }

  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    if (this.userPreferences) {
      this.userPreferences = { ...this.userPreferences, ...preferences };
    }
    return this.userPreferences!;
  }

  async createPodcast(insertPodcast: InsertPodcast): Promise<Podcast> {
    const id = randomUUID();
    const podcast: Podcast = { 
      ...insertPodcast,
      audioUrl: insertPodcast.audioUrl || null,
      articleIds: (insertPodcast.articleIds as string[]) || [],
      id,
    };
    this.podcasts.set(id, podcast);
    return podcast;
  }

  async getPodcasts(): Promise<Podcast[]> {
    return Array.from(this.podcasts.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getPodcast(id: string): Promise<Podcast | undefined> {
    return this.podcasts.get(id);
  }

  async updatePodcast(id: string, updates: Partial<Podcast>): Promise<Podcast | undefined> {
    const podcast = this.podcasts.get(id);
    if (!podcast) return undefined;
    
    const updatedPodcast = { ...podcast, ...updates };
    this.podcasts.set(id, updatedPodcast);
    return updatedPodcast;
  }
}

export const storage = new MemStorage();
