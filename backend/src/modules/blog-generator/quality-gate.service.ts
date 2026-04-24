import { Injectable } from '@nestjs/common';

import { GeneratedPost } from './content-writer.service';
import { TopicKernel } from './seed-topics';

export interface QualityResult {
  pass: boolean;
  issues: string[];
  wordCount: number;
}

const NEPAL_TOKENS = [
  'nepal', 'kathmandu', 'npr', 'khalti', 'esewa', 'e-sewa',
  '.np', '.com.np', 'worldlink', 'vianet', 'subisu', 'pokhara', 'nepali',
];

@Injectable()
export class QualityGateService {
  evaluate(post: GeneratedPost, kernel: TopicKernel): QualityResult {
    const issues: string[] = [];
    const content = post.content || '';
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const lower = content.toLowerCase();

    if (wordCount < 900) issues.push(`content too short: ${wordCount} words (< 900)`);
    if (!/^#\s+/m.test(content)) issues.push('missing H1 heading');

    const h2Count = (content.match(/^##\s+/gm) || []).length;

    if (h2Count < 3) issues.push(`only ${h2Count} H2 headings (< 3)`);

    const h3Count = (content.match(/^###\s+/gm) || []).length;

    if (h3Count < 1) issues.push('no H3 headings');

    if (!post.faqItems || post.faqItems.length < 5) {
      issues.push(`faqItems must have >= 5 entries (got ${post.faqItems?.length || 0})`);
    }

    if (kernel.intent.requiresHowTo && (!post.howtoSteps || post.howtoSteps.length < 5)) {
      issues.push(`intent '${kernel.intent.slug}' requires >= 5 howtoSteps (got ${post.howtoSteps?.length || 0})`);
    }

    const hasNepal = NEPAL_TOKENS.some(tok => lower.includes(tok));

    if (!hasNepal) issues.push('no Nepal entity mentioned (GEO check failed)');

    if (!post.seoTitle || post.seoTitle.length > 70) issues.push(`seoTitle length invalid: ${post.seoTitle?.length}`);
    if (!post.seoDescription || post.seoDescription.length < 120 || post.seoDescription.length > 180) {
      issues.push(`seoDescription length out of range: ${post.seoDescription?.length}`);
    }

    if (!post.slug || !/^[a-z0-9-]+$/.test(post.slug)) issues.push('invalid slug format');

    if (!post.tags || post.tags.length < 3) issues.push(`tags must have >= 3 entries`);

    return { pass: issues.length === 0, issues, wordCount };
  }
}
