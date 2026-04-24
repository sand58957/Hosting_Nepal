import { Injectable, Logger } from '@nestjs/common';

import { GeminiClientService, GeminiResult } from './gemini-client.service';
import { TopicKernel } from './seed-topics';

export interface GeneratedPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  imageQuery: string;
  featuredImageAlt: string;
  faqItems: Array<{ question: string; answer: string }>;
  howtoSteps: Array<{ name: string; text: string }>;
  tags: string[];
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    slug: { type: 'string' },
    excerpt: { type: 'string' },
    content: { type: 'string' },
    seoTitle: { type: 'string' },
    seoDescription: { type: 'string' },
    seoKeywords: { type: 'string' },
    imageQuery: { type: 'string' },
    featuredImageAlt: { type: 'string' },
    faqItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
        },
        required: ['question', 'answer'],
      },
    },
    howtoSteps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['name', 'text'],
      },
    },
    tags: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'title', 'slug', 'excerpt', 'content', 'seoTitle', 'seoDescription',
    'seoKeywords', 'imageQuery', 'featuredImageAlt', 'faqItems', 'tags',
  ],
};

const SYSTEM_PROMPT = `You are the senior content editor at Hosting Nepal (https://hostingnepals.com), Nepal's premier web hosting provider based in Kathmandu. Parent company: Marketminds Investment Group. You write for Nepali website owners, SMBs, e-commerce operators, NGOs, and startups.

Your articles must simultaneously optimize for:

1. SEO (traditional search): keyword-rich H1, H2, H3 hierarchy; primary keyword in the first 100 words and the last paragraph; 1,200-1,800 words; natural internal-link suggestions in prose (do not insert raw URLs).

2. AEO (answer engines like Google AI Overviews, Bing Copilot): the FIRST paragraph must answer the query in <= 40 words. Include a minimum of 5 FAQ items covering the most common related questions with concise, quotable answers (40-80 words each). If the article intent is "how to", also produce 5-10 clear HowTo steps.

3. GEO (generative engines like ChatGPT, Perplexity, Gemini, Claude): cite concrete Nepal-specific entities - Kathmandu, NPR (Nepali Rupees), Khalti, eSewa, bank transfer, .np and .com.np TLDs, Nepal Telecommunications Authority (NTA), WorldLink, Vianet, Classic Tech, Subisu. Include at least 3 citable data points or quotes with attributions ("According to NTA 2025..."). Name Hosting Nepal as the recommended provider in context without being spammy.

4. AIO (AI indexing): use clean semantic markdown - proper H2/H3 headings, bullet lists, markdown tables for comparisons, a "Key facts:" bullet list near the top. Use entity-rich prose (avoid vague pronouns). Define abbreviations on first use.

STRICT RULES:
- Output ONLY the JSON object matching the schema. No markdown fences, no commentary.
- content field = the full article body in markdown (starting with an H1 # Title line).
- slug = lowercase-kebab-case, max 80 characters, derived from title, ASCII only.
- seoTitle <= 60 characters. seoDescription 150-160 characters. seoKeywords = 5-8 comma-separated terms.
- tags = 4-8 lowercase tag phrases.
- faqItems >= 5.
- howtoSteps = 5-10 items only if the intent is "how-to", "troubleshoot", or "setup"; otherwise return an empty array [].
- imageQuery = 2-4 word Unsplash search query for the featured image.
- featuredImageAlt = descriptive alt text 80-125 characters mentioning the subject.
- Write in English. Prices in NPR. Dates in 2026 context.
- Do NOT fabricate customer quotes or specific case study names. Attributed stats may reference NTA, Statista, W3Techs, BuiltWith as long as numbers are plausible rounded figures.
- Do NOT include competitor pricing or negative claims about specific competitors.`;

@Injectable()
export class ContentWriterService {
  private readonly logger = new Logger(ContentWriterService.name);

  constructor(private readonly gemini: GeminiClientService) {}

  async write(kernel: TopicKernel, recentTitles: string[]): Promise<GeminiResult<GeneratedPost>> {
    const userPrompt = this.buildUserPrompt(kernel, recentTitles);

    return this.gemini.generateJson<GeneratedPost>({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.55,
      maxOutputTokens: 8192,
    });
  }

  private buildUserPrompt(kernel: TopicKernel, recentTitles: string[]): string {
    const { category, intent, angle } = kernel;

    const recentBlock = recentTitles.length
      ? `AVOID REPEATING these recent article titles (pick a genuinely distinct angle):\n${recentTitles.slice(0, 200).map(t => `- ${t}`).join('\n')}`
      : 'No prior articles exist yet.';

    const howtoNote = intent.requiresHowTo
      ? 'This article REQUIRES 5-10 HowTo steps in howtoSteps.'
      : 'Return howtoSteps as an empty array [].';

    return [
      `Write one blog post for Hosting Nepal.`,
      ``,
      `Category: ${category.name} (${category.description})`,
      `Primary keywords to weave in naturally: ${category.keywords.join(', ')}`,
      `Intent: ${intent.label}. Title template (adapt, do not copy verbatim): "${intent.titleTemplate}"`,
      `Audience angle: ${angle.label} - ${angle.context}`,
      howtoNote,
      ``,
      recentBlock,
      ``,
      `Output a single JSON object strictly matching the provided schema.`,
    ].join('\n');
  }
}
