import { Injectable, ServiceUnavailableException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MAX_SEO_CONTENT = 3000;
const MAX_SUMMARY_CONTENT = 4000;

function stripMarkdownCodeBlock(text: string): string {
  return text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
}

@Injectable()
export class BlogAiService {
  private readonly logger = new Logger(BlogAiService.name);
  private apiKey: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENAI_API_KEY');
  }

  private async callOpenAI(messages: Array<{ role: string; content: string }>) {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();

      this.logger.error(`OpenAI API error: ${error}`);
      throw new ServiceUnavailableException('AI generation failed. Please try again.');
    }

    const data = await response.json();

    return data.choices?.[0]?.message?.content || '';
  }

  async generateSeo(content: string, title?: string) {
    const prompt = `You are an SEO expert. Given the following blog post content${title ? ` with title "${title}"` : ''}, generate SEO metadata.

Return ONLY a JSON object with these fields:
- seoTitle (max 60 chars, compelling for search)
- seoDescription (max 160 chars, includes main keyword)
- seoKeywords (comma-separated, 5-8 relevant keywords)

Blog content:
${content.substring(0, MAX_SEO_CONTENT)}`;

    const result = await this.callOpenAI([
      { role: 'system', content: 'You are an SEO expert. Return only valid JSON, no markdown.' },
      { role: 'user', content: prompt },
    ]);

    try {
      const cleaned = stripMarkdownCodeBlock(result);

      return JSON.parse(cleaned);
    } catch {
      return { seoTitle: title || '', seoDescription: '', seoKeywords: '', raw: result };
    }
  }

  async generateSummary(content: string) {
    const result = await this.callOpenAI([
      { role: 'system', content: 'You are a content summarizer. Write a concise TL;DR summary in 2-3 sentences.' },
      { role: 'user', content: `Summarize this blog post:\n\n${content.substring(0, MAX_SUMMARY_CONTENT)}` },
    ]);

    return { summary: result.trim() };
  }

  async generateExcerpt(content: string) {
    const result = await this.callOpenAI([
      { role: 'system', content: 'Write a compelling 1-2 sentence excerpt for this blog post that makes readers want to read more.' },
      { role: 'user', content: content.substring(0, MAX_SEO_CONTENT) },
    ]);

    return { excerpt: result.trim() };
  }
}
