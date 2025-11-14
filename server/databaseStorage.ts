import {
  users,
  articles,
  keywords,
  replacementPatterns,
  userPreferences,
  podcasts,
  userArticleLikes,
  type User,
  type UpsertUser,
  type Article,
  type InsertArticle,
  type Keyword,
  type InsertKeyword,
  type ReplacementPattern,
  type InsertReplacementPattern,
  type UserPreferences,
  type InsertUserPreferences,
  type Podcast,
  type InsertPodcast,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Articles
  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const [article] = await db
      .insert(articles)
      .values(insertArticle)
      .returning();
    return article;
  }

  async getArticles(): Promise<Article[]> {
    return await db.select().from(articles);
  }

  async getCuratedArticles(): Promise<Article[]> {
    return await db
      .select()
      .from(articles)
      .where(eq(articles.isCurated, true));
  }

  async getTopFiveArticles(): Promise<Article[]> {
    return await db
      .select()
      .from(articles)
      .where(eq(articles.isTopFive, true));
  }

  async updateArticle(id: string, updates: Partial<Article>): Promise<Article | undefined> {
    const [article] = await db
      .update(articles)
      .set(updates)
      .where(eq(articles.id, id))
      .returning();
    return article;
  }

  // Article Likes
  async likeArticle(articleId: string, userId: string): Promise<{ success: boolean; likes: number }> {
    const existingLike = await db
      .select()
      .from(userArticleLikes)
      .where(and(eq(userArticleLikes.userId, userId), eq(userArticleLikes.articleId, articleId)))
      .limit(1);
    
    if (existingLike.length > 0) {
      const article = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
      return { success: false, likes: article[0]?.likes || 0 };
    }
    
    await db.insert(userArticleLikes).values({ userId, articleId });
    
    const [updatedArticle] = await db
      .update(articles)
      .set({ likes: db.$count(userArticleLikes, eq(userArticleLikes.articleId, articleId)) })
      .where(eq(articles.id, articleId))
      .returning();
    
    const count = await db.select().from(userArticleLikes).where(eq(userArticleLikes.articleId, articleId));
    const likes = count.length;
    await db.update(articles).set({ likes }).where(eq(articles.id, articleId));
    
    return { success: true, likes };
  }

  async unlikeArticle(articleId: string, userId: string): Promise<{ success: boolean; likes: number }> {
    const existingLike = await db
      .select()
      .from(userArticleLikes)
      .where(and(eq(userArticleLikes.userId, userId), eq(userArticleLikes.articleId, articleId)))
      .limit(1);
    
    if (existingLike.length === 0) {
      const article = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
      return { success: false, likes: article[0]?.likes || 0 };
    }
    
    await db.delete(userArticleLikes).where(
      and(eq(userArticleLikes.userId, userId), eq(userArticleLikes.articleId, articleId))
    );
    
    const count = await db.select().from(userArticleLikes).where(eq(userArticleLikes.articleId, articleId));
    const likes = count.length;
    await db.update(articles).set({ likes }).where(eq(articles.id, articleId));
    
    return { success: true, likes };
  }

  async isArticleLikedByUser(articleId: string, userId: string): Promise<boolean> {
    const existingLike = await db
      .select()
      .from(userArticleLikes)
      .where(and(eq(userArticleLikes.userId, userId), eq(userArticleLikes.articleId, articleId)))
      .limit(1);
    
    return existingLike.length > 0;
  }

  async getUserLikedArticles(userId: string): Promise<string[]> {
    const likes = await db
      .select({ articleId: userArticleLikes.articleId })
      .from(userArticleLikes)
      .where(eq(userArticleLikes.userId, userId));
    
    return likes.map(like => like.articleId);
  }

  // Saved Articles
  async saveArticle(articleId: string, userId: string): Promise<{ success: boolean }> {
    const existingSave = await db
      .select()
      .from(userSavedArticles)
      .where(and(eq(userSavedArticles.userId, userId), eq(userSavedArticles.articleId, articleId)))
      .limit(1);
    
    if (existingSave.length > 0) {
      return { success: false };
    }
    
    await db.insert(userSavedArticles).values({ userId, articleId });
    return { success: true };
  }

  async unsaveArticle(articleId: string, userId: string): Promise<{ success: boolean }> {
    const existingSave = await db
      .select()
      .from(userSavedArticles)
      .where(and(eq(userSavedArticles.userId, userId), eq(userSavedArticles.articleId, articleId)))
      .limit(1);
    
    if (existingSave.length === 0) {
      return { success: false };
    }
    
    await db.delete(userSavedArticles).where(
      and(eq(userSavedArticles.userId, userId), eq(userSavedArticles.articleId, articleId))
    );
    
    return { success: true };
  }

  async isArticleSavedByUser(articleId: string, userId: string): Promise<boolean> {
    const existingSave = await db
      .select()
      .from(userSavedArticles)
      .where(and(eq(userSavedArticles.userId, userId), eq(userSavedArticles.articleId, articleId)))
      .limit(1);
    
    return existingSave.length > 0;
  }

  async getSavedArticles(userId: string): Promise<Article[]> {
    const savedArticleIds = await db
      .select({ articleId: userSavedArticles.articleId })
      .from(userSavedArticles)
      .where(eq(userSavedArticles.userId, userId))
      .orderBy(desc(userSavedArticles.savedAt));
    
    if (savedArticleIds.length === 0) {
      return [];
    }
    
    const articleIdList = savedArticleIds.map(s => s.articleId);
    const savedArticles: Article[] = [];
    
    for (const articleId of articleIdList) {
      const [article] = await db
        .select()
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);
      
      if (article) {
        savedArticles.push(article);
      }
    }
    
    return savedArticles;
  }

  // Keywords
  async createKeyword(insertKeyword: InsertKeyword): Promise<Keyword> {
    const [keyword] = await db
      .insert(keywords)
      .values(insertKeyword)
      .returning();
    return keyword;
  }

  async getKeywords(): Promise<Keyword[]> {
    return await db.select().from(keywords);
  }

  async getKeywordsByType(type: string): Promise<Keyword[]> {
    return await db
      .select()
      .from(keywords)
      .where(eq(keywords.type, type));
  }

  async deleteKeyword(id: string): Promise<boolean> {
    const result = await db
      .delete(keywords)
      .where(eq(keywords.id, id));
    return result.rowCount > 0;
  }

  // Replacement Patterns
  async createReplacementPattern(insertPattern: InsertReplacementPattern): Promise<ReplacementPattern> {
    const [pattern] = await db
      .insert(replacementPatterns)
      .values(insertPattern)
      .returning();
    return pattern;
  }

  async getReplacementPatterns(userId?: string): Promise<ReplacementPattern[]> {
    // Return empty array if no userId - replacements are user-specific only
    if (!userId) return [];
    return await db
      .select()
      .from(replacementPatterns)
      .where(eq(replacementPatterns.userId, userId));
  }

  async deleteReplacementPattern(id: string): Promise<boolean> {
    const result = await db
      .delete(replacementPatterns)
      .where(eq(replacementPatterns.id, id));
    return result.rowCount > 0;
  }

  // User Preferences
  async getUserPreferences(userId?: string): Promise<UserPreferences | undefined> {
    if (userId) {
      const [prefs] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId));
      return prefs;
    } else {
      // For non-authenticated users, return default preferences
      return {
        id: "default",
        userId: null,
        sentimentThreshold: 0.7,
        realTimeFiltering: true,
      };
    }
  }

  async updateUserPreferences(preferences: Partial<UserPreferences>, userId?: string): Promise<UserPreferences> {
    if (userId) {
      const [updated] = await db
        .insert(userPreferences)
        .values({ ...preferences, userId })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: preferences,
        })
        .returning();
      return updated;
    } else {
      // For non-authenticated users, return the preferences as-is
      return {
        id: "default",
        userId: null,
        sentimentThreshold: preferences.sentimentThreshold || 0.7,
        realTimeFiltering: preferences.realTimeFiltering !== undefined ? preferences.realTimeFiltering : true,
      };
    }
  }

  // Podcasts
  async createPodcast(insertPodcast: InsertPodcast): Promise<Podcast> {
    const [podcast] = await db
      .insert(podcasts)
      .values(insertPodcast)
      .returning();
    return podcast;
  }

  async getPodcasts(): Promise<Podcast[]> {
    return await db.select().from(podcasts).orderBy(desc(podcasts.createdAt)).limit(3);
  }

  async getPodcast(id: string): Promise<Podcast | undefined> {
    const [podcast] = await db
      .select()
      .from(podcasts)
      .where(eq(podcasts.id, id));
    return podcast;
  }

  async getPodcastByDate(date: string): Promise<Podcast | undefined> {
    const [podcast] = await db
      .select()
      .from(podcasts)
      .where(eq(podcasts.createdAt, date));
    return podcast;
  }

  async updatePodcast(id: string, updates: Partial<Podcast>): Promise<Podcast | undefined> {
    const [podcast] = await db
      .update(podcasts)
      .set(updates)
      .where(eq(podcasts.id, id))
      .returning();
    return podcast;
  }
}