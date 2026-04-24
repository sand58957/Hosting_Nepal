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

const BACKOFF_MS = [2000, 8000, 20000];
const FALLBACK_MODEL = 'gemini-2.5-flash-lite';

@Injectable()
export class GeminiClientService {
  private readonly logger = new Logger(GeminiClientService.name);

  constructor(private readonly config: ConfigService) {}

  async generateJson<T>(opts: GeminiCallOptions): Promise<GeminiResult<T>> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');

    if (!apiKey) throw new ServiceUnavailableException('GEMINI_API_KEY is not set');

    const primaryModel = opts.model || this.config.get<string>('BLOG_AUTOGEN_MODEL') || DEFAULT_MODEL;
    const modelChain = primaryModel === FALLBACK_MODEL ? [primaryModel] : [primaryModel, FALLBACK_MODEL];

    let lastErr: Error = new Error('no attempt made');

    for (const model of modelChain) {
      for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
        try {
          return await this.callOnce<T>(apiKey, model, opts);
        } catch (err) {
          lastErr = err as Error;

          const transient = lastErr.message.includes('503') || lastErr.message.includes('429') || lastErr.message.includes('500') || lastErr.message.includes('UNAVAILABLE');

          if (!transient) throw err;

          if (attempt < BACKOFF_MS.length) {
            const delay = BACKOFF_MS[attempt];

            this.logger.warn(`Gemini ${model} attempt ${attempt + 1} failed (${lastErr.message}), retrying in ${delay}ms`);
            await new Promise(r => setTimeout(r, delay));
          } else {
            this.logger.warn(`Gemini ${model} exhausted retries, will try next model in chain`);
            break;
          }
        }
      }
    }

    throw lastErr;
  }

  private async callOnce<T>(apiKey: string, model: string, opts: GeminiCallOptions): Promise<GeminiResult<T>> {
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

      this.logger.warn(`Gemini ${model} ${res.status}: ${text.slice(0, 300)}`);
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
