import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CfAppRecord {
  id: string;
  type: string;
  host: string;
  value: string;
  ttl: number;
  priority?: number;
}

interface CfApiRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  priority?: number;
  proxied?: boolean;
}

/**
 * Cloudflare DNS management for domains whose nameservers point to Cloudflare.
 * Uses the Cloudflare REST API (fetch, per project convention). Requires a token
 * with Zone:Read + Zone.DNS:Edit (the "Edit zone DNS" template). No-ops (not
 * configured) when CLOUDFLARE_API_TOKEN is unset, so callers fall back to NameSilo.
 */
@Injectable()
export class CloudflareDnsService {
  private readonly logger = new Logger(CloudflareDnsService.name);
  private readonly token: string;
  private readonly base = 'https://api.cloudflare.com/client/v4';
  private readonly zoneCache = new Map<string, string>();

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('CLOUDFLARE_API_TOKEN', '');
  }

  isConfigured(): boolean {
    return !!this.token;
  }

  /** A domain is Cloudflare-managed when any of its nameservers is *.cloudflare.com. */
  static isCloudflareNameservers(nameservers: unknown): boolean {
    if (!Array.isArray(nameservers)) return false;

    return nameservers.some(
      (ns) => typeof ns === 'string' && ns.toLowerCase().includes('cloudflare.com'),
    );
  }

  private async cf<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });

    const json: any = await res.json().catch(() => ({}));

    if (!json?.success) {
      const msg =
        (json?.errors || []).map((e: any) => e.message).join(', ') ||
        `Cloudflare API error (HTTP ${res.status})`;
      throw new BadRequestException(`Cloudflare: ${msg}`);
    }

    return json.result as T;
  }

  private async getZoneId(domainName: string): Promise<string | null> {
    const cached = this.zoneCache.get(domainName);
    if (cached) return cached;

    const zones = await this.cf<Array<{ id: string }>>(
      `/zones?name=${encodeURIComponent(domainName)}`,
    );
    const id = zones?.[0]?.id ?? null;
    if (id) this.zoneCache.set(domainName, id);

    return id;
  }

  private toFqdn(host: string, domain: string): string {
    const h = (host || '').trim();
    if (!h || h === '@' || h.toLowerCase() === domain.toLowerCase()) return domain;
    if (h.toLowerCase().endsWith(`.${domain.toLowerCase()}`)) return h;

    return `${h}.${domain}`;
  }

  private toAppRecord(r: CfApiRecord, domain: string): CfAppRecord {
    const host = r.name.toLowerCase() === domain.toLowerCase()
      ? '@'
      : r.name.replace(new RegExp(`\\.${domain}$`, 'i'), '');

    return {
      id: r.id,
      type: r.type,
      host,
      value: r.content,
      ttl: r.ttl === 1 ? 3600 : r.ttl, // CF "1" = Auto
      priority: r.priority,
    };
  }

  async listRecords(domainName: string): Promise<CfAppRecord[]> {
    const zoneId = await this.getZoneId(domainName);
    if (!zoneId) return [];

    const recs = await this.cf<CfApiRecord[]>(`/zones/${zoneId}/dns_records?per_page=200`);

    return recs.map((r) => this.toAppRecord(r, domainName));
  }

  async createRecord(
    domainName: string,
    rec: { type: string; host: string; value: string; ttl?: number; priority?: number },
  ): Promise<CfAppRecord> {
    const zoneId = await this.getZoneId(domainName);
    if (!zoneId) throw new BadRequestException(`No Cloudflare zone found for ${domainName}`);

    const body: Record<string, unknown> = {
      type: rec.type,
      name: this.toFqdn(rec.host, domainName),
      content: rec.value,
      ttl: rec.ttl && rec.ttl > 1 ? rec.ttl : 1,
    };
    if (rec.type === 'MX' && rec.priority !== undefined) body.priority = rec.priority;

    const r = await this.cf<CfApiRecord>(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    this.logger.log(`Created ${rec.type} record for ${domainName} via Cloudflare (${r.id})`);

    return this.toAppRecord(r, domainName);
  }

  async updateRecord(
    domainName: string,
    recordId: string,
    rec: { type: string; host: string; value: string; ttl?: number; priority?: number },
  ): Promise<CfAppRecord> {
    const zoneId = await this.getZoneId(domainName);
    if (!zoneId) throw new BadRequestException(`No Cloudflare zone found for ${domainName}`);

    const body: Record<string, unknown> = {
      type: rec.type,
      name: this.toFqdn(rec.host, domainName),
      content: rec.value,
      ttl: rec.ttl && rec.ttl > 1 ? rec.ttl : 1,
    };
    if (rec.type === 'MX' && rec.priority !== undefined) body.priority = rec.priority;

    const r = await this.cf<CfApiRecord>(`/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return this.toAppRecord(r, domainName);
  }

  async deleteRecord(domainName: string, recordId: string): Promise<void> {
    const zoneId = await this.getZoneId(domainName);
    if (!zoneId) throw new BadRequestException(`No Cloudflare zone found for ${domainName}`);

    await this.cf(`/zones/${zoneId}/dns_records/${recordId}`, { method: 'DELETE' });
    this.logger.log(`Deleted Cloudflare record ${recordId} for ${domainName}`);
  }
}
