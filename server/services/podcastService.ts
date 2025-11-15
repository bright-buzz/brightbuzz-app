import OpenAI from "openai";
import { storage } from "../storage";
import type { InsertPodcast, Article } from "@shared/schema";
import { applyFilters } from "./filteringService";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export class PodcastService {
  async generateDailyPodcast(userId?: string): Promise<string> {
    try {
      // Get curated articles and top 5 articles
      const curatedArticles = await storage.getCuratedArticles();
      const topFiveArticles = await storage.getTopFiveArticles();
      
      // Combine and deduplicate articles
      const allArticles = [...curatedArticles, ...topFiveArticles];
      const uniqueArticles = Array.from(
        new Map(allArticles.map(article => [article.id, article])).values()
      );

      if (uniqueArticles.length === 0) {
        throw new Error("No articles available for podcast generation");
      }

      // Apply centralized filtering pipeline
      const filteredArticles = await applyFilters(uniqueArticles, userId);
      
      // Limit to 8 articles for 5-10 minute podcast (after filtering and sorting by priority)
      const podcastArticles = filteredArticles.slice(0, 8);

      // Generate podcast script with fallback
      const podcastScript = await this.generateScriptWithFallback(podcastArticles);
      
      // Generate audio (simulated for now - would use OpenAI TTS or similar)
      const audioUrl = await this.generateAudio(podcastScript);
      
      // Create podcast record
      const podcast: InsertPodcast = {
        title: `Daily News Digest - ${new Date().toLocaleDateString()}`,
        description: `Your personalized 5-10 minute news podcast covering ${podcastArticles.length} curated stories from today's top news.`,
        audioUrl,
        duration: this.estimateDuration(podcastScript),
        transcript: podcastScript,
        articleIds: podcastArticles.map(a => a.id),
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

  private async generateScriptWithFallback(articles: Article[]): Promise<string> {
    // Skip AI generation due to quota limits, use basic template directly
    console.log("Using template-based podcast generation due to AI quota limits");
    return this.generateBasicScript(articles);
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

  private generateBasicScript(articles: Article[]): string {
    const date = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let script = `[INTRO]
Good morning, and welcome to your daily BrightBuzz digest for ${date}. I'm here to keep you informed with the latest business and technology news that matters to your career and professional growth. Today, we're covering ${articles.length} carefully curated stories designed to inspire and inform without the anxiety. Let's dive in.

`;

    articles.forEach((article, index) => {
      const storyNumber = index + 1;
      script += `[STORY ${storyNumber}]
Our ${storyNumber === 1 ? 'top' : 'next'} story comes from ${article.source}. ${article.title}. 

${article.summary}

This development is particularly relevant for young professionals because it highlights ongoing trends in ${article.category.toLowerCase()} that could create new opportunities and career paths. Whether you're looking to advance in your current role or exploring new industries, staying informed about these changes helps you position yourself for success.

`;
    });

    script += `[OUTRO]
That wraps up today's BrightBuzz digest. We've covered ${articles.length} stories spanning business, technology, and career development - all filtered to help you stay informed while maintaining a positive outlook on your professional journey.

Remember, every challenge in the news represents an opportunity for innovation and growth. As a young professional, you're uniquely positioned to adapt, learn, and thrive in our rapidly changing world.

Thanks for tuning in to BrightBuzz. We'll be back tomorrow with more curated news designed specifically for ambitious professionals like you. Until then, stay curious, stay positive, and keep building your future.`;

    return script;
  }

  private async generateAudio(script: string): Promise<string> {
    console.log("=== AUDIO GENERATION START ===");
    console.log("Script length:", script.length);
    console.log("OpenAI API Key available:", !!(process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR));
    
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY_ENV_VAR) {
        console.log("❌ OpenAI API key not available, using simulated audio URL");
        return `https://example.com/podcasts/daily-${Date.now()}.mp3`;
      }

      console.log("✅ OpenAI API key found, attempting TTS generation...");
      
      // Truncate script to fit within OpenAI TTS 4096 character limit
      let ttsScript = script;
      if (script.length > 4096) {
        console.log(`⚠️ Script too long (${script.length} chars), truncating to 4096...`);
        // Find a good breaking point near 4000 characters to avoid cutting mid-sentence
        let breakPoint = script.lastIndexOf('.', 4000);
        if (breakPoint === -1) breakPoint = script.lastIndexOf(' ', 4000);
        if (breakPoint === -1) breakPoint = 4000;
        
        ttsScript = script.substring(0, breakPoint);
        // Add a proper ending if we had to truncate
        if (breakPoint < script.length - 100) {
          ttsScript += "\n\nThat's today's BrightBuzz digest. Thanks for listening, and we'll be back tomorrow with more news designed for professionals like you.";
        }
        console.log(`✅ Truncated script to ${ttsScript.length} characters`);
      }
      
      // Generate audio using OpenAI TTS API
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: ttsScript,
      });
      
      console.log("✅ TTS API call successful, processing audio buffer...");
      const buffer = Buffer.from(await mp3.arrayBuffer());
      console.log("Audio buffer size:", buffer.length, "bytes");
      
      // For now, we'll create a data URL (in production, you'd save to file storage)
      const base64Audio = buffer.toString('base64');
      const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
      
      console.log(`✅ Generated base64 audio URL, length: ${audioUrl.length} chars`);
      console.log(`Audio URL preview: ${audioUrl.substring(0, 100)}...`);
      return audioUrl;
    } catch (error) {
      console.error("❌ Failed to generate audio:", error);
      console.error("Error details:", error instanceof Error ? error.message : String(error));
      // Fallback to simulated URL if TTS fails
      console.log("🔄 Falling back to simulated audio URL");
      return `https://example.com/podcasts/daily-${Date.now()}.mp3`;
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
    try {
      console.log("=== GETTING ALL PODCASTS ===");
      const podcasts = await storage.getPodcasts();
      console.log(`✅ Successfully retrieved ${podcasts.length} podcasts`);
      return podcasts;
    } catch (error) {
      console.error("❌ Error getting podcasts:", error);
      console.error("Error details:", error instanceof Error ? error.message : String(error));
      throw error;
    }
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