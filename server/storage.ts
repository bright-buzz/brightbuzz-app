import { type Article, type InsertArticle, type Keyword, type InsertKeyword, type ReplacementPattern, type InsertReplacementPattern, type UserPreferences, type InsertUserPreferences, type Podcast, type InsertPodcast, type User, type UpsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Articles
  createArticle(article: InsertArticle): Promise<Article>;
  getArticles(): Promise<Article[]>;
  getCuratedArticles(): Promise<Article[]>;
  getTopFiveArticles(): Promise<Article[]>;
  updateArticle(id: string, updates: Partial<Article>): Promise<Article | undefined>;
  
  // Article Likes
  likeArticle(articleId: string, userId: string): Promise<{ success: boolean; likes: number }>;
  unlikeArticle(articleId: string, userId: string): Promise<{ success: boolean; likes: number }>;
  isArticleLikedByUser(articleId: string, userId: string): Promise<boolean>;
  getUserLikedArticles(userId: string): Promise<string[]>;
  
  // Saved Articles
  saveArticle(articleId: string, userId: string): Promise<{ success: boolean }>;
  unsaveArticle(articleId: string, userId: string): Promise<{ success: boolean }>;
  isArticleSavedByUser(articleId: string, userId: string): Promise<boolean>;
  getSavedArticles(userId: string): Promise<Article[]>;
  
  // Keywords
  createKeyword(keyword: InsertKeyword): Promise<Keyword>;
  getKeywords(): Promise<Keyword[]>;
  getKeywordsByType(type: string): Promise<Keyword[]>;
  deleteKeyword(id: string): Promise<boolean>;
  
  // Replacement Patterns
  createReplacementPattern(pattern: InsertReplacementPattern): Promise<ReplacementPattern>;
  getReplacementPatterns(userId?: string): Promise<ReplacementPattern[]>;
  deleteReplacementPattern(id: string): Promise<boolean>;
  
  // User Preferences
  getUserPreferences(userId?: string): Promise<UserPreferences | undefined>;
  updateUserPreferences(preferences: Partial<UserPreferences>, userId?: string): Promise<UserPreferences>;
  
  // Podcasts
  createPodcast(podcast: InsertPodcast): Promise<Podcast>;
  getPodcasts(): Promise<Podcast[]>;
  getPodcast(id: string): Promise<Podcast | undefined>;
  getPodcastByDate(date: string): Promise<Podcast | undefined>;
  updatePodcast(id: string, updates: Partial<Podcast>): Promise<Podcast | undefined>;
}

export class MemStorage implements IStorage {
  private articles: Map<string, Article>;
  private keywords: Map<string, Keyword>;
  private replacementPatterns: Map<string, ReplacementPattern>;
  private podcasts: Map<string, Podcast>;
  private users: Map<string, User>;
  private userPreferences: UserPreferences | undefined;
  private userLikes: Map<string, Set<string>>; // Map of userId -> Set of articleIds
  private userSavedArticles: Map<string, Set<string>>; // Map of userId -> Set of articleIds

  constructor() {
    this.articles = new Map();
    this.keywords = new Map();
    this.replacementPatterns = new Map();
    this.podcasts = new Map();
    this.users = new Map();
    this.userLikes = new Map();
    this.userSavedArticles = new Map();
    this.userPreferences = {
      id: randomUUID(),
      userId: null,
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
      likes: 0,
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
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 30); // Limit to 30 curated articles maximum
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

  async likeArticle(articleId: string, userId: string): Promise<{ success: boolean; likes: number }> {
    const article = this.articles.get(articleId);
    if (!article) return { success: false, likes: 0 };
    
    let userLikeSet = this.userLikes.get(userId);
    if (!userLikeSet) {
      userLikeSet = new Set<string>();
      this.userLikes.set(userId, userLikeSet);
    }
    
    if (userLikeSet.has(articleId)) {
      return { success: false, likes: article.likes || 0 };
    }
    
    userLikeSet.add(articleId);
    const newLikes = (article.likes || 0) + 1;
    await this.updateArticle(articleId, { likes: newLikes });
    return { success: true, likes: newLikes };
  }

  async unlikeArticle(articleId: string, userId: string): Promise<{ success: boolean; likes: number }> {
    const article = this.articles.get(articleId);
    if (!article) return { success: false, likes: 0 };
    
    const userLikeSet = this.userLikes.get(userId);
    if (!userLikeSet || !userLikeSet.has(articleId)) {
      return { success: false, likes: article.likes || 0 };
    }
    
    userLikeSet.delete(articleId);
    const newLikes = Math.max(0, (article.likes || 0) - 1);
    await this.updateArticle(articleId, { likes: newLikes });
    return { success: true, likes: newLikes };
  }

  async isArticleLikedByUser(articleId: string, userId: string): Promise<boolean> {
    const userLikeSet = this.userLikes.get(userId);
    return userLikeSet ? userLikeSet.has(articleId) : false;
  }

  async getUserLikedArticles(userId: string): Promise<string[]> {
    const userLikeSet = this.userLikes.get(userId);
    return userLikeSet ? Array.from(userLikeSet) : [];
  }

  async saveArticle(articleId: string, userId: string): Promise<{ success: boolean }> {
    const article = this.articles.get(articleId);
    if (!article) return { success: false };
    
    let userSavedSet = this.userSavedArticles.get(userId);
    if (!userSavedSet) {
      userSavedSet = new Set<string>();
      this.userSavedArticles.set(userId, userSavedSet);
    }
    
    if (userSavedSet.has(articleId)) {
      return { success: false };
    }
    
    userSavedSet.add(articleId);
    return { success: true };
  }

  async unsaveArticle(articleId: string, userId: string): Promise<{ success: boolean }> {
    const userSavedSet = this.userSavedArticles.get(userId);
    if (!userSavedSet || !userSavedSet.has(articleId)) {
      return { success: false };
    }
    
    userSavedSet.delete(articleId);
    return { success: true };
  }

  async isArticleSavedByUser(articleId: string, userId: string): Promise<boolean> {
    const userSavedSet = this.userSavedArticles.get(userId);
    return userSavedSet ? userSavedSet.has(articleId) : false;
  }

  async getSavedArticles(userId: string): Promise<Article[]> {
    const userSavedSet = this.userSavedArticles.get(userId);
    if (!userSavedSet) return [];
    
    const savedArticles: Article[] = [];
    for (const articleId of userSavedSet) {
      const article = this.articles.get(articleId);
      if (article) {
        savedArticles.push(article);
      }
    }
    
    return savedArticles.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
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

  async createReplacementPattern(insertPattern: InsertReplacementPattern): Promise<ReplacementPattern> {
    const id = randomUUID();
    const pattern: ReplacementPattern = { ...insertPattern, id };
    this.replacementPatterns.set(id, pattern);
    return pattern;
  }

  async getReplacementPatterns(userId?: string): Promise<ReplacementPattern[]> {
    // Return empty array if no userId - replacements are user-specific only
    if (!userId) return [];
    return Array.from(this.replacementPatterns.values())
      .filter(pattern => pattern.userId === userId);
  }

  async deleteReplacementPattern(id: string): Promise<boolean> {
    return this.replacementPatterns.delete(id);
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
    ).slice(0, 3); // Limit to 3 most recent podcasts
  }

  async getPodcast(id: string): Promise<Podcast | undefined> {
    return this.podcasts.get(id);
  }

  async getPodcastByDate(date: string): Promise<Podcast | undefined> {
    return Array.from(this.podcasts.values()).find(podcast => 
      podcast.createdAt.startsWith(date)
    );
  }

  async updatePodcast(id: string, updates: Partial<Podcast>): Promise<Podcast | undefined> {
    const podcast = this.podcasts.get(id);
    if (!podcast) return undefined;
    
    const updatedPodcast = { ...podcast, ...updates };
    this.podcasts.set(id, updatedPodcast);
    return updatedPodcast;
  }

  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id);
    
    if (existingUser) {
      const updatedUser = {
        ...existingUser,
        ...userData,
        updatedAt: new Date(),
      };
      this.users.set(userData.id, updatedUser);
      return updatedUser;
    } else {
      const newUser: User = {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(userData.id, newUser);
      return newUser;
    }
  }
}

import { DatabaseStorage } from "./databaseStorage";

export const storage = new DatabaseStorage();
