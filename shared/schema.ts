import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const articles = pgTable("articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  content: text("content"),
  source: text("source").notNull(),
  url: text("url").notNull(),
  imageUrl: text("image_url"),
  category: text("category").notNull(),
  readTime: integer("read_time").notNull(), // in minutes
  views: integer("views").default(0),
  sentiment: real("sentiment").notNull(), // 0-1 score
  keywords: jsonb("keywords").$type<string[]>().default([]),
  isCurated: boolean("is_curated").default(false),
  isTopFive: boolean("is_top_five").default(false),
  publishedAt: text("published_at").notNull(),
});

export const keywords = pgTable("keywords", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keyword: text("keyword").notNull().unique(),
  type: text("type").notNull(), // 'blocked', 'prioritized'
});

export const replacementPatterns = pgTable("replacement_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  findText: text("find_text").notNull(),
  replaceText: text("replace_text").notNull(),
  caseSensitive: boolean("case_sensitive").default(false),
  userId: varchar("user_id").references(() => users.id),
});

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sentimentThreshold: real("sentiment_threshold").default(0.7),
  realTimeFiltering: boolean("real_time_filtering").default(true),
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  views: true,
});

export const insertKeywordSchema = createInsertSchema(keywords).omit({
  id: true,
});

export const insertReplacementPatternSchema = createInsertSchema(replacementPatterns).omit({
  id: true,
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
});

export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Keyword = typeof keywords.$inferSelect;
export type InsertKeyword = z.infer<typeof insertKeywordSchema>;
export type ReplacementPattern = typeof replacementPatterns.$inferSelect;
export type InsertReplacementPattern = z.infer<typeof insertReplacementPatternSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

export interface FilterPreview {
  original: Article[];
  filtered: Article[];
  stats: {
    totalArticles: number;
    filteredCount: number;
    passedCount: number;
    avgSentiment: number;
    anxietyReduction: number;
  };
}

export const podcasts = pgTable("podcasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  audioUrl: text("audio_url"),
  duration: integer("duration").notNull(), // in seconds
  transcript: text("transcript").notNull(),
  articleIds: jsonb("article_ids").$type<string[]>().default([]),
  createdAt: text("created_at").notNull(),
  isProcessing: boolean("is_processing").default(false),
});

export const insertPodcastSchema = createInsertSchema(podcasts).omit({
  id: true,
});

export type Podcast = typeof podcasts.$inferSelect;
export type InsertPodcast = z.infer<typeof insertPodcastSchema>;

// User types for Replit Auth
export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
