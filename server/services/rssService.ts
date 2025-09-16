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
    { url: 'https://www.wired.com/feed/rss', name: 'Wired', category: 'Technology' },
    { url: 'https://feeds.engadget.com/engadget/breaking', name: 'Engadget', category: 'Technology' },
    { url: 'https://feeds.mashable.com/Mashable', name: 'Mashable', category: 'Technology' },
    { url: 'https://www.cnet.com/rss/all/', name: 'CNET', category: 'Technology' },
    { url: 'https://feeds.feedburner.com/ziffdavis/pcmag/breaking', name: 'PC Magazine', category: 'Technology' },
    { url: 'https://tech.slashdot.org/slashdot.rss', name: 'Slashdot', category: 'Technology' },
    
    // Business feeds
    { url: 'https://feeds.bloomberg.com/markets/news.rss', name: 'Bloomberg Markets', category: 'Business' },
    { url: 'https://feeds.reuters.com/reuters/businessNews', name: 'Reuters Business', category: 'Business' },
    { url: 'https://feeds.fortune.com/fortune/headlines', name: 'Fortune', category: 'Business' },
    { url: 'https://hbr.org/feed', name: 'Harvard Business Review', category: 'Career' },
    { url: 'https://www.entrepreneur.com/latest.rss', name: 'Entrepreneur', category: 'Business' },
    { url: 'https://feeds.bloomberg.com/politics/news.rss', name: 'Bloomberg Politics', category: 'Business' },
    { url: 'https://feeds.feedburner.com/fastcompany/headlines', name: 'Fast Company', category: 'Business' },
    { url: 'https://feeds.feedburner.com/inc/headlines', name: 'Inc Magazine', category: 'Business' },
    { url: 'https://feeds.feedburner.com/thetechcrunch', name: 'TechCrunch', category: 'Business' },
    
    // General & World News
    { url: 'https://feeds.reuters.com/reuters/topNews', name: 'Reuters Top News', category: 'World News' },
    { url: 'https://feeds.reuters.com/reuters/domesticNews', name: 'Reuters US News', category: 'US News' },
    { url: 'https://rss.cnn.com/rss/edition.rss', name: 'CNN World', category: 'World News' },
    { url: 'https://feeds.npr.org/1001/rss.xml', name: 'NPR News', category: 'News' },
    { url: 'https://feeds.bbci.co.uk/news/rss.xml', name: 'BBC News', category: 'World News' },
    { url: 'https://feeds.abcnews.com/abcnews/topstories', name: 'ABC News', category: 'News' },
    { url: 'https://rss.cnn.com/rss/cnn_topstories.rss', name: 'CNN Top Stories', category: 'News' },
    { url: 'https://www.theguardian.com/world/rss', name: 'The Guardian World', category: 'World News' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera', category: 'World News' },
    { url: 'https://feeds.washingtonpost.com/rss/world', name: 'Washington Post World', category: 'World News' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', name: 'New York Times World', category: 'World News' },
    { url: 'https://feeds.usatoday.com/usatoday-NewsTopStories', name: 'USA Today', category: 'News' },
    { url: 'https://feeds.cbsnews.com/CBSNews/latest/rss.xml', name: 'CBS News', category: 'News' },
    { url: 'https://feeds.feedburner.com/time/topstories', name: 'Time Magazine', category: 'News' },
    { url: 'https://www.newsweek.com/rss', name: 'Newsweek', category: 'News' },
    
    // Politics
    { url: 'https://feeds.reuters.com/reuters/politicsNews', name: 'Reuters Politics', category: 'Politics' },
    { url: 'https://rss.cnn.com/rss/cnn_allpolitics.rss', name: 'CNN Politics', category: 'Politics' },
    { url: 'https://feeds.npr.org/1014/rss.xml', name: 'NPR Politics', category: 'Politics' },
    { url: 'https://feeds.washingtonpost.com/rss/politics', name: 'Washington Post Politics', category: 'Politics' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml', name: 'New York Times Politics', category: 'Politics' },
    { url: 'https://www.politico.com/rss/politicopicks.xml', name: 'Politico', category: 'Politics' },
    
    // Science & Health
    { url: 'https://feeds.sciencedaily.com/sciencedaily/top_news', name: 'Science Daily', category: 'Science' },
    { url: 'https://feeds.reuters.com/reuters/health', name: 'Reuters Health', category: 'Health' },
    { url: 'https://rss.cnn.com/rss/cnn_health.rss', name: 'CNN Health', category: 'Health' },
    { url: 'https://feeds.nationalgeographic.com/ng/News/News_Main', name: 'National Geographic', category: 'Science' },
    { url: 'https://feeds.feedburner.com/NewScientistOnline-News', name: 'New Scientist', category: 'Science' },
    { url: 'https://www.sciencemag.org/rss/news_current.xml', name: 'Science Magazine', category: 'Science' },
    { url: 'https://feeds.nature.com/nature/rss/current', name: 'Nature', category: 'Science' },
    { url: 'https://feeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC', name: 'WebMD', category: 'Health' },
    { url: 'https://feeds.mayoclinic.org/mc/rss/consumer', name: 'Mayo Clinic', category: 'Health' },
    
    // Sports
    { url: 'https://feeds.reuters.com/reuters/sportsNews', name: 'Reuters Sports', category: 'Sports' },
    { url: 'https://rss.cnn.com/rss/cnn_sports.rss', name: 'CNN Sports', category: 'Sports' },
    { url: 'https://www.espn.com/espn/rss/news', name: 'ESPN News', category: 'Sports' },
    { url: 'https://feeds.nfl.com/nfl/news', name: 'NFL News', category: 'Sports' },
    { url: 'https://www.nba.com/rss/nba_rss.xml', name: 'NBA News', category: 'Sports' },
    { url: 'https://sports.yahoo.com/rss/', name: 'Yahoo Sports', category: 'Sports' },
    { url: 'https://feeds.cbssports.com/rss/headlines', name: 'CBS Sports', category: 'Sports' },
    { url: 'https://feeds.si.com/si/topstories', name: 'Sports Illustrated', category: 'Sports' },
    { url: 'https://www.mlb.com/feeds/news/rss.xml', name: 'MLB News', category: 'Sports' },
    
    // Entertainment & Culture
    { url: 'https://feeds.reuters.com/reuters/entertainment', name: 'Reuters Entertainment', category: 'Entertainment' },
    { url: 'https://rss.cnn.com/rss/cnn_showbiz.rss', name: 'CNN Entertainment', category: 'Entertainment' },
    { url: 'https://www.hollywoodreporter.com/feed/', name: 'Hollywood Reporter', category: 'Entertainment' },
    { url: 'https://feeds.ew.com/ew/latest', name: 'Entertainment Weekly', category: 'Entertainment' },
    { url: 'https://variety.com/feed/', name: 'Variety', category: 'Entertainment' },
    { url: 'https://feeds.rollingstone.com/rollingstone/newswire', name: 'Rolling Stone', category: 'Entertainment' },
    { url: 'https://www.billboard.com/feed/', name: 'Billboard', category: 'Entertainment' },
    { url: 'https://feeds.eonline.com/eonline/topstories', name: 'E! Online', category: 'Entertainment' },
    { url: 'https://feeds.people.com/people/headlines', name: 'People Magazine', category: 'Entertainment' },
    { url: 'https://feeds.tmz.com/tmz/breaking', name: 'TMZ', category: 'Entertainment' },
    
    // Lifestyle & Fashion
    { url: 'https://rss.cnn.com/rss/cnn_travel.rss', name: 'CNN Travel', category: 'Travel' },
    { url: 'https://feeds.conde.nast.com/cntraveler/everything', name: 'Conde Nast Traveler', category: 'Travel' },
    { url: 'https://feeds.vogue.com/Vogue', name: 'Vogue', category: 'Fashion' },
    { url: 'https://feeds.elle.com/elle/all', name: 'Elle Magazine', category: 'Fashion' },
    { url: 'https://feeds.marieclaire.com/marieclaire/all', name: 'Marie Claire', category: 'Fashion' },
    { url: 'https://feeds.harpersbazaar.com/harpersbazaar/everything', name: 'Harpers Bazaar', category: 'Fashion' },
    
    // Environment & Climate
    { url: 'https://feeds.reuters.com/reuters/environment', name: 'Reuters Environment', category: 'Environment' },
    { url: 'https://www.treehugger.com/feeds/rss/', name: 'TreeHugger', category: 'Environment' },
    { url: 'https://feeds.nationalgeographic.com/ng/environment', name: 'National Geographic Environment', category: 'Environment' },
    { url: 'https://www.earthday.org/feed/', name: 'Earth Day Network', category: 'Environment' },
    
    // Food & Cooking
    { url: 'https://feeds.foodnetwork.com/fn/recipes/rss', name: 'Food Network', category: 'Food' },
    { url: 'https://feeds.epicurious.com/epicurious/recipes', name: 'Epicurious', category: 'Food' },
    { url: 'https://feeds.bonappetit.com/bonappetit/all', name: 'Bon Appetit', category: 'Food' },
    { url: 'https://feeds.foodandwine.com/foodandwine/all', name: 'Food & Wine', category: 'Food' },
    { url: 'https://feeds.cookingchanneltv.com/cookingchannel/latest', name: 'Cooking Channel', category: 'Food' },
    
    // Finance & Economics
    { url: 'https://feeds.reuters.com/reuters/markets', name: 'Reuters Markets', category: 'Finance' },
    { url: 'https://feeds.marketwatch.com/marketwatch/realtimeheadlines/', name: 'MarketWatch', category: 'Finance' },
    { url: 'https://feeds.barrons.com/barrons/topstories', name: 'Barrons', category: 'Finance' },
    { url: 'https://feeds.investopedia.com/investopedia/headlines', name: 'Investopedia', category: 'Finance' },
    { url: 'https://feeds.fool.com/fool/headlines', name: 'The Motley Fool', category: 'Finance' },
    
    // International News
    { url: 'https://feeds.reuters.com/reuters/UKNewsUKNewsUKNewsUKNewsUKNewsUKNewsUKNews', name: 'Reuters UK', category: 'International' },
    { url: 'https://feeds.skynews.com/feeds/rss/world.xml', name: 'Sky News', category: 'International' },
    { url: 'https://www.france24.com/en/rss', name: 'France 24', category: 'International' },
    { url: 'https://feeds.dw.com/dw/rss/rss_en_all/rss.xml', name: 'Deutsche Welle', category: 'International' },
    { url: 'https://feeds.rt.com/rt/news', name: 'RT News', category: 'International' }
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