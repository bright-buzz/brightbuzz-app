import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export async function analyzeSentiment(text: string): Promise<{
  rating: number,
  confidence: number
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a sentiment analysis expert focused on reducing anxiety for young professionals. Analyze the sentiment of news content and provide a rating from 0 to 1 (where 1 is most positive/least anxiety-inducing) and a confidence score between 0 and 1. Consider factors like optimism, opportunity, growth, and positive career implications. Respond with JSON in this format: { 'rating': number, 'confidence': number }",
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"rating": 0.5, "confidence": 0.5}');

    return {
      rating: Math.max(0, Math.min(1, result.rating)),
      confidence: Math.max(0, Math.min(1, result.confidence)),
    };
  } catch (error) {
    console.error("Failed to analyze sentiment:", error);
    return { rating: 0.5, confidence: 0.1 };
  }
}

export async function summarizeArticle(title: string, content: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional news curator for young professionals. Create concise, engaging summaries that highlight career opportunities, professional insights, and positive aspects while being honest about the content. Keep summaries under 150 characters.",
        },
        {
          role: "user",
          content: `Title: ${title}\n\nContent: ${content.substring(0, 1000)}`,
        },
      ],
    });

    return response.choices[0].message.content || "Summary not available.";
  } catch (error) {
    console.error("Failed to summarize article:", error);
    return "Summary not available.";
  }
}

export async function extractKeywords(text: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Extract the most relevant keywords from this news content. Focus on topics, industries, skills, and concepts that would be useful for filtering. Return as a JSON array of strings. Limit to 10 keywords maximum.",
        },
        {
          role: "user",
          content: text,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"keywords": []}');
    return Array.isArray(result.keywords) ? result.keywords : [];
  } catch (error) {
    console.error("Failed to extract keywords:", error);
    return [];
  }
}

export async function curateArticles(articles: any[]): Promise<{
  curated: string[],
  topFive: string[]
}> {
  try {
    const articlesData = articles.map(a => ({
      id: a.id,
      title: a.title,
      summary: a.summary,
      sentiment: a.sentiment,
      keywords: a.keywords,
      views: a.views
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert news curator for young professionals. Select articles for: 1) 'curated' - articles that provide value, insights, opportunities, or positive professional content (select up to 10), 2) 'topFive' - the 5 most engaging, trending articles that professionals would want to read. Prioritize content that reduces anxiety while being informative. Return JSON with arrays of article IDs: { 'curated': ['id1', 'id2'], 'topFive': ['id1', 'id2'] }",
        },
        {
          role: "user",
          content: `Articles to curate: ${JSON.stringify(articlesData)}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"curated": [], "topFive": []}');
    return {
      curated: Array.isArray(result.curated) ? result.curated : [],
      topFive: Array.isArray(result.topFive) ? result.topFive : []
    };
  } catch (error) {
    console.error("Failed to curate articles:", error);
    return { curated: [], topFive: [] };
  }
}
