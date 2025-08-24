import Parser from 'rss-parser';
import { parse } from 'node-html-parser';
import type { InsertArticle } from "@shared/schema";

interface RSSFeed {
  url: string;
  name: string;
  category: string;
}

interface ParsedRSSItem {
  title: string;
  description: string;
  content: string;
  link: string;
  pubDate: string;
  source: string;
  category: string;
}

export class RSSService {
  private parser: Parser;
  private feeds: RSSFeed[] = [
    // Technology feeds
    { url: 'https://feeds.feedburner.com/techcrunch/startups', name: 'TechCrunch Startups', category: 'Technology' },
    { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', category: 'Technology' },
    { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', name: 'Ars Technica', category: 'Technology' },
    { url: 'https://rss.cnn.com/rss/edition_technology.rss', name: 'CNN Tech', category: 'Technology' },
    { url: 'https://feeds.feedburner.com/venturebeat/SZYF', name: 'VentureBeat', category: 'Technology' },
    { url: 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml', name: 'Science Daily AI', category: 'Technology' },
    
    // Business feeds
    { url: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg Markets', category: 'Business' },
    { url: 'https://feeds.reuters.com/reuters/businessNews', name: 'Reuters Business', category: 'Business' },
    { url: 'https://feeds.fortune.com/fortune/headlines', name: 'Fortune', category: 'Business' },
    { url: 'https://hbr.org/feed', name: 'Harvard Business Review', category: 'Career' },
    { url: 'https://www.entrepreneur.com/latest.rss', name: 'Entrepreneur', category: 'Business' },
    
    // General News
    { url: 'https://feeds.reuters.com/reuters/topNews', name: 'Reuters Top News', category: 'World News' },
    { url: 'https://feeds.reuters.com/reuters/domesticNews', name: 'Reuters US News', category: 'US News' },
    { url: 'https://rss.cnn.com/rss/edition.rss', name: 'CNN World', category: 'World News' },
    { url: 'https://feeds.npr.org/1001/rss.xml', name: 'NPR News', category: 'News' },
    { url: 'https://feeds.bbci.co.uk/news/rss.xml', name: 'BBC News', category: 'World News' },
    { url: 'https://feeds.abcnews.com/abcnews/topstories', name: 'ABC News', category: 'News' },
    { url: 'https://rss.cnn.com/rss/cnn_topstories.rss', name: 'CNN Top Stories', category: 'News' },
    
    // Politics
    { url: 'https://feeds.reuters.com/reuters/politicsNews', name: 'Reuters Politics', category: 'Politics' },
    { url: 'https://rss.cnn.com/rss/cnn_allpolitics.rss', name: 'CNN Politics', category: 'Politics' },
    { url: 'https://feeds.npr.org/1014/rss.xml', name: 'NPR Politics', category: 'Politics' },
    
    // Science & Health
    { url: 'https://feeds.sciencedaily.com/sciencedaily/top_news', name: 'Science Daily', category: 'Science' },
    { url: 'https://feeds.reuters.com/reuters/health', name: 'Reuters Health', category: 'Health' },
    { url: 'https://rss.cnn.com/rss/cnn_health.rss', name: 'CNN Health', category: 'Health' },
    { url: 'https://feeds.nationalgeographic.com/ng/News/News_Main', name: 'National Geographic', category: 'Science' },
    
    // Sports
    { url: 'https://feeds.reuters.com/reuters/sportsNews', name: 'Reuters Sports', category: 'Sports' },
    { url: 'https://rss.cnn.com/rss/cnn_sports.rss', name: 'CNN Sports', category: 'Sports' },
    { url: 'https://www.espn.com/espn/rss/news', name: 'ESPN News', category: 'Sports' },
    { url: 'https://feeds.nfl.com/nfl/news', name: 'NFL News', category: 'Sports' },
    
    // Entertainment & Culture
    { url: 'https://feeds.reuters.com/reuters/entertainment', name: 'Reuters Entertainment', category: 'Entertainment' },
    { url: 'https://rss.cnn.com/rss/cnn_showbiz.rss', name: 'CNN Entertainment', category: 'Entertainment' },
    { url: 'https://www.hollywoodreporter.com/feed/', name: 'Hollywood Reporter', category: 'Entertainment' },
    { url: 'https://feeds.ew.com/ew/latest', name: 'Entertainment Weekly', category: 'Entertainment' },
    
    // Lifestyle & Travel
    { url: 'https://rss.cnn.com/rss/cnn_travel.rss', name: 'CNN Travel', category: 'Travel' },
    { url: 'https://feeds.conde.nast.com/cntraveler/everything', name: 'Conde Nast Traveler', category: 'Travel' },
    
    // Environment & Climate
    { url: 'https://feeds.reuters.com/reuters/environment', name: 'Reuters Environment', category: 'Environment' },
    { url: 'https://www.treehugger.com/feeds/rss/', name: 'TreeHugger', category: 'Environment' },
    
    // Food & Cooking
    { url: 'https://feeds.foodnetwork.com/fn/recipes/rss', name: 'Food Network', category: 'Food' },
    { url: 'https://feeds.epicurious.com/epicurious/recipes', name: 'Epicurious', category: 'Food' },
    
    // Finance & Economics
    { url: 'https://feeds.reuters.com/reuters/markets', name: 'Reuters Markets', category: 'Finance' },
    { url: 'https://feeds.marketwatch.com/marketwatch/realtimeheadlines/', name: 'MarketWatch', category: 'Finance' }
  ];

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'NewsFlow RSS Reader 1.0'
      }
    });
  }

  async fetchAllFeeds(): Promise<ParsedRSSItem[]> {
    const allItems: ParsedRSSItem[] = [];
    
    for (const feed of this.feeds) {
      try {
        console.log(`Fetching RSS feed: ${feed.name}`);
        const parsedFeed = await this.parser.parseURL(feed.url);
        
        const items = parsedFeed.items.slice(0, 10).map(item => ({
          title: item.title || '',
          description: this.cleanDescription(item.contentSnippet || item.description || ''),
          content: this.extractContent(item.content || item.description || ''),
          link: item.link || '',
          pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
          source: feed.name,
          category: feed.category
        }));
        
        allItems.push(...items);
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Failed to fetch RSS feed ${feed.name}:`, error);
        continue;
      }
    }
    
    console.log(`Successfully fetched ${allItems.length} articles from RSS feeds`);
    return allItems;
  }

  private cleanDescription(description: string): string {
    // Remove HTML tags and clean up the description
    const root = parse(description);
    let cleaned = root.text || description;
    
    // Remove extra whitespace and truncate
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    if (cleaned.length > 300) {
      cleaned = cleaned.substring(0, 300) + '...';
    }
    
    return cleaned;
  }

  private extractContent(content: string): string {
    // Extract readable content from HTML
    const root = parse(content);
    let extracted = root.text || content;
    
    // Clean up and ensure minimum length
    extracted = extracted.replace(/\s+/g, ' ').trim();
    
    // If content is too short, duplicate the description to meet minimum requirements
    if (extracted.length < 100) {
      const description = this.cleanDescription(content);
      extracted = `${description} ${extracted}`.trim();
    }
    
    return extracted;
  }

  convertToInsertArticle(item: ParsedRSSItem): Omit<InsertArticle, 'id' | 'views' | 'sentiment' | 'keywords' | 'isCurated' | 'isTopFive'> {
    // Estimate read time (average 200 words per minute)
    const wordCount = item.content.split(' ').length;
    const readTime = Math.ceil(wordCount / 200);

    return {
      title: item.title,
      summary: item.description,
      content: item.content,
      source: item.source,
      url: item.link,
      imageUrl: null, // RSS feeds typically don't include reliable image URLs
      category: item.category,
      readTime,
      publishedAt: item.pubDate,
    };
  }

  async getLatestArticles(): Promise<Omit<InsertArticle, 'id' | 'views' | 'sentiment' | 'keywords' | 'isCurated' | 'isTopFive'>[]> {
    const rssItems = await this.fetchAllFeeds();
    
    // Convert to article format and filter out items without essential data
    const articles = rssItems
      .filter(item => item.title && item.description && item.link)
      .map(item => this.convertToInsertArticle(item))
      .filter(article => article.title.length > 10 && article.summary.length > 20);

    // Sort by publication date (newest first) and limit to recent articles
    return articles
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 50); // Limit to 50 most recent articles
  }
}