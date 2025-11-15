import { storage } from "../storage";
import type { Article, UserPreferences, Keyword, ReplacementPattern } from "@shared/schema";

/**
 * Centralized filtering service for applying all user filters consistently
 * across the entire platform (Top Articles, Curated Feed, Daily Podcast)
 */

export interface FilterConfig {
  userId?: string;
  blockedKeywords: string[];
  prioritizedKeywords: string[];
  replacementPatterns: ReplacementPattern[];
  sentimentThreshold: number;
  dateCutoffDays: number; // Number of days to look back for fresh articles
}

export interface FilteredArticle extends Article {
  priorityScore?: number; // Boost score from prioritized keywords
}

/**
 * Fetch all filter configuration for a user in one operation
 * Memoize this per request to avoid redundant storage calls
 */
export async function fetchUserFilterConfig(userId?: string): Promise<FilterConfig> {
  const [
    blockedKeywordsList,
    prioritizedKeywordsList,
    replacementPatternsList,
    preferences
  ] = await Promise.all([
    storage.getKeywordsByType('blocked'),
    storage.getKeywordsByType('prioritized'),
    userId ? storage.getReplacementPatterns(userId) : Promise.resolve([]),
    storage.getUserPreferences(userId)
  ]);

  return {
    userId,
    blockedKeywords: blockedKeywordsList.map(kw => kw.keyword.toLowerCase()),
    prioritizedKeywords: prioritizedKeywordsList.map(kw => kw.keyword.toLowerCase()),
    replacementPatterns: replacementPatternsList,
    sentimentThreshold: preferences?.sentimentThreshold || 0.7,
    dateCutoffDays: 30 // Default 30-day freshness window
  };
}

/**
 * Apply replacement patterns to text
 * Transforms text by finding and replacing patterns (case-sensitive or insensitive)
 */
export function applyReplacementPatterns(text: string, patterns: ReplacementPattern[]): string {
  let transformedText = text;
  
  for (const pattern of patterns) {
    // Escape user input for literal replacement to prevent ReDoS
    const escapedFind = pattern.findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Respect caseSensitive flag
    const flags = pattern.caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(escapedFind, flags);
    transformedText = transformedText.replace(regex, pattern.replaceText);
  }
  
  return transformedText;
}

/**
 * Calculate similarity between two strings (0 to 1)
 * Uses simple word overlap heuristic for content similarity detection
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const arr1 = Array.from(set1);
  const arr2 = Array.from(set2);
  
  const intersection = new Set(arr1.filter(w => set2.has(w)));
  const union = new Set([...arr1, ...arr2]);
  
  return intersection.size / union.size;
}

/**
 * Quality score for selecting the best article among duplicates
 * Higher score = better quality article to keep
 */
function calculateArticleQuality(article: Article): number {
  let quality = 0;
  
  // Sentiment score (0-1)
  quality += article.sentiment * 100;
  
  // Summary length (longer = more detailed, max 50 points)
  quality += Math.min(50, (article.summary?.length || 0) / 20);
  
  // Recency (newer articles get boost, max 30 points)
  const ageInDays = (Date.now() - new Date(article.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  quality += Math.max(0, 30 - ageInDays);
  
  return quality;
}

/**
 * Remove duplicate articles based on URL, title, or content similarity
 * Keeps the highest quality version of each unique article
 * 
 * Deduplication criteria:
 * 1. Exact URL match (most reliable)
 * 2. Exact title match (case-insensitive)
 * 3. High content similarity (>80% word overlap in summary)
 */
export function deduplicateArticles(articles: Article[]): Article[] {
  const uniqueArticles: Article[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Map<string, Article>(); // normalized title -> best article
  
  for (const article of articles) {
    const normalizedTitle = article.title.toLowerCase().trim();
    const articleUrl = article.url.toLowerCase().trim();
    
    // Skip if exact URL duplicate
    if (seenUrls.has(articleUrl)) {
      continue;
    }
    
    // Check for title duplicates
    const existingByTitle = seenTitles.get(normalizedTitle);
    if (existingByTitle) {
      // Keep the higher quality version
      if (calculateArticleQuality(article) > calculateArticleQuality(existingByTitle)) {
        // Replace with better version
        const index = uniqueArticles.indexOf(existingByTitle);
        if (index !== -1) {
          uniqueArticles[index] = article;
        }
        seenTitles.set(normalizedTitle, article);
        seenUrls.delete(existingByTitle.url.toLowerCase().trim());
        seenUrls.add(articleUrl);
      }
      continue;
    }
    
    // Check for content similarity duplicates
    let isDuplicate = false;
    for (const existing of uniqueArticles) {
      const similarity = calculateTextSimilarity(article.summary, existing.summary);
      if (similarity > 0.8) {
        // High similarity - treat as duplicate
        if (calculateArticleQuality(article) > calculateArticleQuality(existing)) {
          // Replace with better version
          const index = uniqueArticles.indexOf(existing);
          if (index !== -1) {
            uniqueArticles[index] = article;
            seenUrls.delete(existing.url.toLowerCase().trim());
            seenUrls.add(articleUrl);
            // Update title map
            const existingNormalizedTitle = existing.title.toLowerCase().trim();
            seenTitles.delete(existingNormalizedTitle);
            seenTitles.set(normalizedTitle, article);
          }
        }
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      uniqueArticles.push(article);
      seenUrls.add(articleUrl);
      seenTitles.set(normalizedTitle, article);
    }
  }
  
  console.log(`Deduplication: ${articles.length} articles -> ${uniqueArticles.length} unique articles (removed ${articles.length - uniqueArticles.length} duplicates)`);
  
  return uniqueArticles;
}

/**
 * Compute priority score boost for an article based on prioritized keywords
 * Each matching prioritized keyword adds +1 to the score
 */
export function computePriorityScore(article: Article, prioritizedKeywords: string[]): number {
  if (prioritizedKeywords.length === 0) return 0;
  
  const articleText = `${article.title} ${article.summary}`.toLowerCase();
  const keywordMatches = article.keywords || [];
  
  let score = 0;
  
  // Check title/summary text
  for (const keyword of prioritizedKeywords) {
    if (articleText.includes(keyword)) {
      score += 1;
    }
  }
  
  // Check article keywords
  for (const keyword of prioritizedKeywords) {
    if (keywordMatches.some((kw: string) => kw.toLowerCase().includes(keyword))) {
      score += 1;
    }
  }
  
  return score;
}

/**
 * Main filtering pipeline - applies all filters in the correct order:
 * 0. Deduplication (remove duplicate articles)
 * 1. Date Freshness Filter (exclude old articles)
 * 2. Blocked Keywords Filter (exclude)
 * 3. Prioritized Keywords Scoring (rank/boost)
 * 4. Word Replacements (transform text)
 * 5. Sentiment Filter (exclude low sentiment)
 * 
 * @param articles - Array of articles to filter
 * @param userId - Optional user ID for personalized filtering
 * @returns Filtered and transformed articles with priority scores
 */
export async function applyFilters(
  articles: Article[],
  userId?: string
): Promise<FilteredArticle[]> {
  // Fetch all filter config in one operation
  const config = await fetchUserFilterConfig(userId);
  
  // STEP 0: Deduplication - remove duplicate articles by URL, title, or content
  let filtered = deduplicateArticles(articles);
  
  // STEP 1: Date Freshness Filter - only articles within cutoff window
  const dateCutoff = Date.now() - (config.dateCutoffDays * 24 * 60 * 60 * 1000);
  filtered = filtered.filter(article => {
    const publishedDate = new Date(article.publishedAt).getTime();
    return publishedDate >= dateCutoff;
  });
  
  // STEP 2: Blocked Keywords Filter - exclude articles with blocked terms
  filtered = filtered.filter(article => {
    const articleText = `${article.title} ${article.summary}`.toLowerCase();
    const hasBlockedKeyword = config.blockedKeywords.some(blockedTerm => 
      articleText.includes(blockedTerm) ||
      (article.keywords || []).some((kw: string) => kw.toLowerCase().includes(blockedTerm))
    );
    return !hasBlockedKeyword;
  });
  
  // STEP 3: Prioritized Keywords Scoring - boost articles with prioritized terms
  // Add priority scores to each article
  const scoredArticles: FilteredArticle[] = filtered.map(article => ({
    ...article,
    priorityScore: computePriorityScore(article, config.prioritizedKeywords)
  }));
  
  // STEP 4: Word Replacements - transform text after filtering (avoid wasted work)
  const transformedArticles = scoredArticles.map(article => ({
    ...article,
    title: applyReplacementPatterns(article.title, config.replacementPatterns),
    summary: applyReplacementPatterns(article.summary, config.replacementPatterns)
  }));
  
  // STEP 5: Sentiment Filter - exclude articles below sentiment threshold
  const finalFiltered = transformedArticles.filter(article => 
    article.sentiment >= config.sentimentThreshold
  );
  
  // Sort by priority score (highest first) and then by sentiment
  const sorted = finalFiltered.sort((a, b) => {
    // First sort by priority score
    const scoreDiff = (b.priorityScore || 0) - (a.priorityScore || 0);
    if (scoreDiff !== 0) return scoreDiff;
    
    // Then by sentiment
    return b.sentiment - a.sentiment;
  });
  
  return sorted;
}

/**
 * Simplified version for when you only need replacements applied
 * Used for display-only contexts where filtering isn't needed
 */
export async function applyReplacementsOnly(
  articles: Article[],
  userId?: string
): Promise<Article[]> {
  if (!userId) return articles;
  
  const replacementPatterns = await storage.getReplacementPatterns(userId);
  
  return articles.map(article => ({
    ...article,
    title: applyReplacementPatterns(article.title, replacementPatterns),
    summary: applyReplacementPatterns(article.summary, replacementPatterns)
  }));
}
