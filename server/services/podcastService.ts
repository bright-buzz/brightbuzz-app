import OpenAI from "openai";
import { storage } from "../storage";
import type { InsertPodcast, Article } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export class PodcastService {
  async generateDailyPodcast(): Promise<string> {
    try {
      // Get curated articles and top 5 articles
      const curatedArticles = await storage.getCuratedArticles();
      const topFiveArticles = await storage.getTopFiveArticles();
      
      // Combine and deduplicate articles
      const allArticles = [...curatedArticles, ...topFiveArticles];
      const uniqueArticles = Array.from(
        new Map(allArticles.map(article => [article.id, article])).values()
      ).slice(0, 8); // Limit to 8 articles for 5-10 minute podcast

      if (uniqueArticles.length === 0) {
        throw new Error("No articles available for podcast generation");
      }

      // Filter by user preferences
      const preferences = await storage.getUserPreferences();
      const blockedKeywords = await storage.getKeywordsByType('blocked');
      const blocked = blockedKeywords.map(kw => kw.keyword.toLowerCase());
      
      const filteredArticles = uniqueArticles.filter(article => {
        // Check sentiment threshold
        if (article.sentiment < (preferences?.sentimentThreshold || 0.7)) {
          return false;
        }
        
        // Check blocked keywords
        const hasBlockedKeyword = blocked.some(blocked => 
          article.title.toLowerCase().includes(blocked) ||
          article.summary.toLowerCase().includes(blocked) ||
          (article.keywords || []).some((kw: string) => kw.toLowerCase().includes(blocked))
        );
        
        return !hasBlockedKeyword;
      });

      // Generate podcast script
      const podcastScript = await this.generateScript(filteredArticles);
      
      // Generate audio (simulated for now - would use OpenAI TTS or similar)
      const audioUrl = await this.generateAudio(podcastScript);
      
      // Create podcast record
      const podcast: InsertPodcast = {
        title: `Daily News Digest - ${new Date().toLocaleDateString()}`,
        description: `Your personalized 5-10 minute news podcast covering ${filteredArticles.length} curated stories from today's top news.`,
        audioUrl,
        duration: this.estimateDuration(podcastScript),
        transcript: podcastScript,
        articleIds: filteredArticles.map(a => a.id),
        createdAt: new Date().toISOString(),
        isProcessing: false,
      };

      const savedPodcast = await storage.createPodcast(podcast);
      return savedPodcast.id;
    } catch (error) {
      console.error("Failed to generate podcast:", error);
      throw error;
    }
  }

  private async generateScript(articles: Article[]): Promise<string> {
    const articlesData = articles.map(article => ({
      title: article.title,
      summary: article.summary,
      source: article.source,
      category: article.category,
      sentiment: article.sentiment,
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional podcast host creating a daily news digest for young professionals. Create an engaging 5-10 minute podcast script that:

1. Opens with a warm, professional greeting
2. Introduces the day's top stories briefly
3. Covers each story with:
   - Clear, concise explanation
   - Why it matters to young professionals
   - Career/business implications when relevant
   - Positive framing that reduces anxiety
4. Includes smooth transitions between stories
5. Ends with an uplifting summary and call to action

Keep the tone conversational, informative, and optimistic. Focus on opportunities, growth, and professional development angles. Each story should be 45-90 seconds when spoken.

Format the script with clear sections: [INTRO], [STORY 1], [STORY 2], etc., [OUTRO]`
        },
        {
          role: "user",
          content: `Create a podcast script for these ${articles.length} stories: ${JSON.stringify(articlesData, null, 2)}`
        }
      ],
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "Script generation failed.";
  }

  private async generateAudio(script: string): Promise<string> {
    try {
      // For now, we'll simulate audio generation
      // In a real implementation, you would use OpenAI's TTS API:
      /*
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: script,
      });
      
      const buffer = Buffer.from(await mp3.arrayBuffer());
      // Save to file storage and return URL
      */
      
      // Simulated audio URL
      return `https://example.com/podcasts/daily-${Date.now()}.mp3`;
    } catch (error) {
      console.error("Failed to generate audio:", error);
      return ""; // Return empty string if audio generation fails
    }
  }

  private estimateDuration(script: string): number {
    // Estimate speaking duration: average 150 words per minute
    const wordCount = script.split(/\s+/).length;
    return Math.ceil((wordCount / 150) * 60); // Convert to seconds
  }

  async getPodcastById(id: string) {
    return await storage.getPodcast(id);
  }

  async getAllPodcasts() {
    return await storage.getPodcasts();
  }

  async regeneratePodcast(id: string): Promise<void> {
    const existingPodcast = await storage.getPodcast(id);
    if (!existingPodcast) {
      throw new Error("Podcast not found");
    }

    // Mark as processing
    await storage.updatePodcast(id, { isProcessing: true });

    try {
      // Get articles by IDs
      const allArticles = await storage.getArticles();
      const podcastArticles = allArticles.filter(article => 
        (existingPodcast.articleIds || []).includes(article.id)
      );

      // Regenerate script and audio
      const newScript = await this.generateScript(podcastArticles);
      const newAudioUrl = await this.generateAudio(newScript);

      // Update podcast
      await storage.updatePodcast(id, {
        transcript: newScript,
        audioUrl: newAudioUrl,
        duration: this.estimateDuration(newScript),
        isProcessing: false,
      });
    } catch (error) {
      // Mark as failed
      await storage.updatePodcast(id, { isProcessing: false });
      throw error;
    }
  }
}

export const podcastService = new PodcastService();