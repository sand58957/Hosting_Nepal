import { Injectable, Logger, BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DEFAULT_MODEL, GEMINI_ENDPOINT } from './constants';

export interface GeminiResult<T> {
  data: T;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface GeminiCallOptions {
  systemPrompt: string;
  userPrompt: string;
  responseSchema: Record<string, unknown>;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

@Injectable()
export class GeminiClientService {
  private readonly logger = new Logger(GeminiClientService.name);

  constructor(private readonly config: ConfigService) {}

  async generateJson<T>(opts: GeminiCallOptions): Promise<GeminiResult<T>> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');

    if (!apiKey) throw new ServiceUnavailableException('GEMINI_API_KEY is not set');

    const model = opts.model || this.config.get<string>('BLOG_AUTOGEN_MODEL') || DEFAULT_MODEL;
    const url = `${GEMINI_ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const body = {
      systemInstruction: { parts: [{ text: opts.systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: opts.userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: opts.responseSchema,
        temperature: opts.temperature ?? 0.55,
        maxOutputTokens: opts.maxOutputTokens ?? 8192,
        thinkingConfig: { thinkingBudget: 0 },
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();

      this.logger.warn(`Gemini ${res.status}: ${text.slice(0, 500)}`);

      if (res.status === 429) throw new ServiceUnavailableException('Gemini rate limited');
      throw new BadGatewayException(`Gemini error ${res.status}`);
    }

    const json: any = await res.json();

    const candidate = json?.candidates?.[0];

    if (!candidate) throw new BadGatewayException('Gemini returned no candidates');

    if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
      throw new BadGatewayException(`Gemini blocked: ${candidate.finishReason}`);
    }

    const text = candidate?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('') || '';

    if (!text) throw new BadGatewayException('Gemini returned empty text');

    let parsed: T;

    try {
      parsed = JSON.parse(text);
    } catch (err) {
      this.logger.warn(`Gemini JSON parse failed: ${(err as Error).message}. First 300 chars: ${text.slice(0, 300)}`);
      throw new BadGatewayException('Gemini returned invalid JSON');
    }

    const usage = json.usageMetadata || {};

    return {
      data: parsed,
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      model,
    };
  }
}
