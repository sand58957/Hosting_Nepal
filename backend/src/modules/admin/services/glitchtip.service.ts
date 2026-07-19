import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Shape we expose to the frontend — a trimmed, stable subset of GlitchTip's
// (Sentry-compatible) issue payload.
export interface ErrorIssue {
  id: string;
  shortId: string | null;
  title: string;
  culprit: string | null;
  level: string | null;
  status: string | null;
  count: number;
  userCount: number;
  firstSeen: string | null;
  lastSeen: string | null;
  permalink: string | null;
  project: { id: string; slug: string; name: string } | null;
}

export interface ErrorTrackingOverview {
  configured: boolean;
  glitchtipUrl: string | null;
  orgSlug?: string;
  projectCount?: number;
  projects?: Array<{ id: string; slug: string; name: string }>;
  issues?: ErrorIssue[];
  stats?: { unresolved: number };
  error?: string;
}

/**
 * Server-side proxy to a self-hosted GlitchTip instance (Sentry-API compatible).
 * The admin API token lives only in backend env — it never reaches the browser.
 * Per project convention we use raw `fetch` rather than a vendor SDK.
 *
 * Env: GLITCHTIP_API_URL (e.g. https://errors.hostingnepals.com),
 *      GLITCHTIP_API_TOKEN (auth token from GlitchTip → Profile → Auth Tokens),
 *      GLITCHTIP_ORG_SLUG (organization slug),
 *      GLITCHTIP_URL (optional public UI URL for "Open in GlitchTip" links;
 *                     defaults to GLITCHTIP_API_URL).
 */
@Injectable()
export class GlitchTipService {
  private readonly logger = new Logger(GlitchTipService.name);
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly orgSlug: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = (this.config.get<string>('GLITCHTIP_API_URL') || '').replace(/\/+$/, '');
    this.token = this.config.get<string>('GLITCHTIP_API_TOKEN') || '';
    this.orgSlug = this.config.get<string>('GLITCHTIP_ORG_SLUG') || '';
    this.publicUrl = (this.config.get<string>('GLITCHTIP_URL') || this.apiUrl).replace(/\/+$/, '');
  }

  isConfigured(): boolean {
    return !!(this.apiUrl && this.token && this.orgSlug);
  }

  private async call<T>(path: string): Promise<T> {
    const res = await fetch(`${this.apiUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`GlitchTip ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  private normalizeIssue(raw: Record<string, any>): ErrorIssue {
    const project = raw.project
      ? {
          id: String(raw.project.id ?? ''),
          slug: String(raw.project.slug ?? ''),
          name: String(raw.project.name ?? raw.project.slug ?? ''),
        }
      : null;
    return {
      id: String(raw.id ?? ''),
      shortId: raw.shortId ?? null,
      title: raw.title ?? raw.metadata?.type ?? 'Unknown error',
      culprit: raw.culprit ?? null,
      level: raw.level ?? null,
      status: raw.status ?? null,
      count: Number(raw.count ?? 0),
      userCount: Number(raw.userCount ?? 0),
      firstSeen: raw.firstSeen ?? null,
      lastSeen: raw.lastSeen ?? null,
      permalink: raw.permalink ?? null,
      project,
    };
  }

  async getIssues(query = 'is:unresolved', limit = 25): Promise<ErrorIssue[]> {
    if (!this.isConfigured()) return [];
    const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const qs = new URLSearchParams({ query, limit: String(safeLimit) });
    const raw = await this.call<Record<string, any>[]>(
      `/api/0/organizations/${this.orgSlug}/issues/?${qs.toString()}`,
    );
    return Array.isArray(raw) ? raw.map((i) => this.normalizeIssue(i)) : [];
  }

  async getOverview(): Promise<ErrorTrackingOverview> {
    if (!this.isConfigured()) {
      return { configured: false, glitchtipUrl: this.publicUrl || null };
    }
    try {
      const [projects, issues] = await Promise.all([
        this.call<Record<string, any>[]>(
          `/api/0/organizations/${this.orgSlug}/projects/`,
        ).catch(() => [] as Record<string, any>[]),
        this.getIssues('is:unresolved', 25),
      ]);
      return {
        configured: true,
        glitchtipUrl: this.publicUrl,
        orgSlug: this.orgSlug,
        projectCount: projects.length,
        projects: projects.map((p) => ({
          id: String(p.id ?? ''),
          slug: String(p.slug ?? ''),
          name: String(p.name ?? p.slug ?? ''),
        })),
        issues,
        stats: { unresolved: issues.length },
      };
    } catch (error) {
      this.logger.warn(`GlitchTip overview failed: ${(error as Error).message}`);
      return {
        configured: true,
        glitchtipUrl: this.publicUrl,
        error: 'Could not reach GlitchTip. Check GLITCHTIP_API_URL / token / org slug.',
      };
    }
  }
}
