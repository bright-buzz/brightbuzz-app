import {
  users,
  articles,
  keywords,
  replacementPatterns,
  userPreferences,
  podcasts,
  userArticleLikes,
  userSavedArticles,
  articleFeedback,
  type User,
  type UpsertUser,
  type Article,
  type InsertArticle,
  type Keyword,
  type InsertKeyword,
  type ReplacementPattern,
  type InsertReplacementPattern,
  type UserPreferences,
  type Podcast,
  type InsertPodcast,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, inArray, sql } from "drizzle-orm";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User operations
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

  // URL normalization helper
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const trackingParams = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "ref",
        "fbclid",
        "gclid",
      ];
      trackingParams.forEach((param) => urlObj.searchParams.delete(param));
      urlObj.hostname = urlObj.hostname.toLowerCase();
      urlObj.pathname = urlObj.pathname.replace(/\/$/, "");
      urlObj.searchParams.sort();
      return urlObj.toString();
    } catch {
      return url.toLowerCase().replace(/\/$/, "");
    }
  }

  // Articles
  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const normalizedUrl = this.normalizeUrl(insertArticle.url);

    const [article] = await db
      .insert(articles)
      .values({ ...insertArticle, url: normalizedUrl })
      .onConflictDoNothing({ target: articles.url })
      .returning();

    if (!article) {
      const [existingArticle] = await db
        .select()
        .from(articles)
        .where(eq(articles.url, normalizedUrl))
        .limit(1);
      return existingArticle as any;
    }

    return article as any;
  }

  async getArticles(): Promise<Article[]> {
    return await db.select().from(articles);
  }

  async getCuratedArticles(): Promise<Article[]> {
    return await db.select().from(articles).where(eq(articles.isCurated, true));
  }

  async getTopFiveArticles(): Promise<Article[]> {
    return await db
      .select()
      .from(articles)
      .where(eq(articles.isTopFive, true))
      .orderBy(desc(articles.views))
      .limit(5);
  }

  async updateArticle(id: string, updates: Partial<Article>): Promise<Article | undefined> {
    const [article] = await db.update(articles).set(updates).where(eq(articles.id, id)).returning();
    return article as any;
  }

  async clearAllCurationFlags(): Promise<void> {
    await db
      .update(articles)
      .set({ isCurated: false, isTopFive: false })
      .where(sql`is_curated = true OR is_top_five = true`);
  }

  // ✅ NEW: Bulk curation flags (most reliable long-term)
  async setCurationFlagsBulk(topFiveIds: string[], curatedIds: string[]): Promise<void> {
    const topSet = new Set(topFiveIds);
    const overlap = curatedIds.filter((id) => topSet.has(id));
    if (overlap.length > 0) {
      throw new Error(
        `Curation overlap detected. IDs in both topFive and curated: ${overlap.join(", ")}`
      );
    }

    await db.transaction(async (tx) => {
      // Reset only currently-flagged rows
      await tx
        .update(articles)
        .set({ isCurated: false, isTopFive: false })
        .where(or(eq(articles.isCurated, true), eq(articles.isTopFive, true)));

      // Set Top Five in one query
      if (topFiveIds.length > 0) {
        await tx
          .update(articles)
          .set({ isTopFive: true, isCurated: false })
          .where(inArray(articles.id, topFiveIds));
      }

      // Set Curated in one query
      if (curatedIds.length > 0) {
        await tx
          .update(articles)
          .set({ isCurated: true, isTopFive: false })
          .where(inArray(articles.id, curatedIds));
      }
    });
  }

  // Article Likes
  async likeArticle(
    articleId: string,
    userId: string
  ): Promise<{ success: boolean; likes: number }> {
    const existingLike = await db
      .select()
      .from(userArticleLikes)
      .where(and(eq(userArticleLikes.userId, userId), eq(userArticleLikes.articleId, articleId)))
      .limit(1);

    if (existingLike.length > 0) {
      const article = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
      return { success: false, likes: (article[0] as any)?.likes || 0 };
    }

    await db.insert(userArticleLikes).values({ userId, articleId } as any);

    const count = await db.select().from(userArticleLikes).where(eq(userArticleLikes.articleId, articleId));
    const likes = count.length;
    await db.update(articles).set({ likes } as any).where(eq(articles.id, articleId));

    return { success: true, likes };
  }

  async unlikeArticle(
    articleId: string,
    userId: string
  ): Promise<{ success: boolean; likes: number }> {
    const existingLike = await db
      .select()
      .from(userArticleLikes)
      .where(and(eq(userArticleLikes.userId, userId), eq(userArticleLikes.articleId, articleId)))
      .limit(1);

    if (existingLike.length === 0) {
      const article = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
      return { success: false, likes: (article[0] as any)?.likes || 0 };
    }

    await db
      .delete(userArticleLikes)
      .where(and(eq(userArticleLikes.userId, userId), eq(userArticleLikes.articleId, articleId)));

    const count = await db.select().from(userArticleLikes).where(eq(userArticleLikes.articleId, articleId));
    const likes = count.length;
    await db.update(articles).set({ likes } as any).where(eq(articles.id, articleId));

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

    return likes.map((like) => like.articleId as any);
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

    await db.insert(userSavedArticles).values({ userId, articleId } as any);
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

    await db
      .delete(userSavedArticles)
      .where(and(eq(userSavedArticles.userId, userId), eq(userSavedArticles.articleId, articleId)));

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

    if (savedArticleIds.length === 0) return [];

    const articleIdList = savedArticleIds.map((s) => s.articleId as any);
    const savedArticles: Article[] = [];

    for (const articleId of articleIdList) {
      const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
      if (article) savedArticles.push(article as any);
    }

    return savedArticles;
  }

  // Article Feedback
  async saveFeedback(
    userId: string,
    articleId: string,
    feedback: "thumbs_up" | "thumbs_down"
  ): Promise<{ success: boolean }> {
    try {
      await db
        .insert(articleFeedback)
        .values({ userId, articleId, feedback } as any)
        .onConflictDoUpdate({
          target: [articleFeedback.userId, articleFeedback.articleId] as any,
          set: {
            feedback,
            updatedAt: new Date(),
          } as any,
        });
      return { success: true };
    } catch (error) {
      console.error("Error saving feedback:", error);
      return { success: false };
    }
  }

  async removeFeedback(userId: string, articleId: string): Promise<{ success: boolean }> {
    try {
      await db
        .delete(articleFeedback)
        .where(and(eq(articleFeedback.userId, userId), eq(articleFeedback.articleId, articleId)));
      return { success: true };
    } catch (error) {
      console.error("Error removing feedback:", error);
      return { success: false };
    }
  }

  async getFeedback(
    userId: string,
    articleId: string
  ): Promise<{ feedback: "thumbs_up" | "thumbs_down" } | null> {
    const [result] = await db
      .select({ feedback: articleFeedback.feedback })
      .from(articleFeedback)
      .where(and(eq(articleFeedback.userId, userId), eq(articleFeedback.articleId, articleId)))
      .limit(1);

    return result ? { feedback: result.feedback as any } : null;
  }

  async getUserFeedback(
    userId: string
  ): Promise<Array<{ articleId: string; feedback: "thumbs_up" | "thumbs_down"; createdAt: Date }>> {
    const results = await db
      .select({
        articleId: articleFeedback.articleId,
        feedback: articleFeedback.feedback,
        createdAt: articleFeedback.createdAt,
      })
      .from(articleFeedback)
      .where(eq(articleFeedback.userId, userId))
      .orderBy(desc(articleFeedback.createdAt));

    return results.map((r) => ({
      articleId: r.articleId as any,
      feedback: r.feedback as any,
      createdAt: r.createdAt as any,
    }));
  }

  async getFeedbackSummaryForArticles(
    articleIds: string[]
  ): Promise<Map<string, { thumbsUp: number; thumbsDown: number }>> {
    if (articleIds.length === 0) return new Map();

    const feedbackData = await db
      .select({
        articleId: articleFeedback.articleId,
        feedback: articleFeedback.feedback,
      })
      .from(articleFeedback)
      .where(inArray(articleFeedback.articleId, articleIds as any));

    const summary = new Map<string, { thumbsUp: number; thumbsDown: number }>();
    for (const articleId of articleIds) summary.set(articleId, { thumbsUp: 0, thumbsDown: 0 });

    for (const row of feedbackData) {
      const stats = summary.get(row.articleId as any);
      if (!stats) continue;
      if ((row as any).feedback === "thumbs_up") stats.thumbsUp++;
      if ((row as any).feedback === "thumbs_down") stats.thumbsDown++;
    }

    return summary;
  }

  // Keywords
  async createKeyword(insertKeyword: InsertKeyword): Promise<Keyword> {
    const [keyword] = await db.insert(keywords).values(insertKeyword as any).returning();
    return keyword as any;
  }

  async getKeywords(): Promise<Keyword[]> {
    return await db.select().from(keywords);
  }

  async getKeywordsByType(type: string): Promise<Keyword[]> {
    return await db.select().from(keywords).where(eq(keywords.type, type as any));
  }

  async deleteKeyword(id: string): Promise<boolean> {
    const result = await db.delete(keywords).where(eq(keywords.id, id));
    return (result as any).rowCount > 0;
  }

  // Replacement Patterns
  async createReplacementPattern(insertPattern: InsertReplacementPattern): Promise<ReplacementPattern> {
    const [pattern] = await db.insert(replacementPatterns).values(insertPattern as any).returning();
    return pattern as any;
  }

  async getReplacementPatterns(userId?: string): Promise<ReplacementPattern[]> {
    if (!userId) return [];
    return await db.select().from(replacementPatterns).where(eq(replacementPatterns.userId, userId as any));
  }

  async deleteReplacementPattern(id: string): Promise<boolean> {
    const result = await db.delete(replacementPatterns).where(eq(replacementPatterns.id, id));
    return (result as any).rowCount > 0;
  }

  // User Preferences
  async getUserPreferences(userId?: string): Promise<UserPreferences | undefined> {
    if (userId) {
      const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId as any));
      return prefs as any;
    }

    return {
      id: "default",
      userId: null,
      sentimentThreshold: 0.7,
      realTimeFiltering: true,
    } as any;
  }

  async updateUserPreferences(
    preferences: Partial<UserPreferences>,
    userId?: string
  ): Promise<UserPreferences> {
    if (userId) {
      const [updated] = await db
        .insert(userPreferences)
        .values({ ...preferences, userId } as any)
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: preferences as any,
        })
        .returning();
      return updated as any;
    }

    return {
      id: "default",
      userId: null,
      sentimentThreshold: (preferences as any).sentimentThreshold || 0.7,
      realTimeFiltering:
        (preferences as any).realTimeFiltering !== undefined ? (preferences as any).realTimeFiltering : true,
    } as any;
  }

  // Podcasts
  async createPodcast(insertPodcast: InsertPodcast): Promise<Podcast> {
    const [podcast] = await db.insert(podcasts).values(insertPodcast as any).returning();
    return podcast as any;
  }

  async getPodcasts(): Promise<Podcast[]> {
    return await db.select().from(podcasts).orderBy(desc(podcasts.createdAt)).limit(3);
  }

  async getPodcast(id: string): Promise<Podcast | undefined> {
    const [podcast] = await db.select().from(podcasts).where(eq(podcasts.id, id));
    return podcast as any;
  }

  async getPodcastByDate(date: string): Promise<Podcast | undefined> {
    const [podcast] = await db.select().from(podcasts).where(eq(podcasts.createdAt, date as any));
    return podcast as any;
  }

  async updatePodcast(id: string, updates: Partial<Podcast>): Promise<Podcast | undefined> {
    const [podcast] = await db.update(podcasts).set(updates as any).where(eq(podcasts.id, id)).returning();
    return podcast as any;
  }
}
