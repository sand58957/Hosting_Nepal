import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

// ─── Custom Error ────────────────────────────────────────────────────────────

export class NameSiloApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly nsResponse?: unknown,
  ) {
    super(message);
    this.name = 'NameSiloApiError';
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class NameSiloService {
  private readonly logger = new Logger(NameSiloService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://www.namesilo.com/api';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('NAMESILO_API_KEY', '');

    if (this.apiKey) {
      this.logger.log('NameSilo service initialised');
    } else {
      this.logger.warn('NameSilo API key not configured');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Build a full URL with auth and additional query params.
   */
  private buildUrl(
    endpoint: string,
    params: Record<string, string> = {},
  ): string {
    const queryParams = new URLSearchParams({
      version: '1',
      type: 'xml',
      key: this.apiKey,
      ...params,
    });
    return `${this.baseUrl}/${endpoint}?${queryParams.toString()}`;
  }

  /**
   * Execute an API request and return the raw XML response.
   */
  private async request(
    endpoint: string,
    params: Record<string, string> = {},
  ): Promise<string> {
    const url = this.buildUrl(endpoint, params);
    try {
      const response = await axios.get(url, {
        timeout: 30_000,
        responseType: 'text',
      });
      return typeof response.data === 'string'
        ? response.data
        : String(response.data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `NameSilo API request failed (${endpoint}): ${message}`,
      );
      throw new NameSiloApiError(
        `NameSilo API request failed: ${message}`,
        500,
      );
    }
  }

  /**
   * Extract the text content of a single XML tag.
   */
  private extractXml(xml: string, tag: string): string | null {
    const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
    return match ? match[1].trim() : null;
  }

  /**
   * Extract all text contents for a repeated XML tag.
   */
  private extractXmlAll(xml: string, tag: string): string[] {
    const matches = xml.matchAll(
      new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'),
    );
    return Array.from(matches).map((m) => m[1].trim());
  }

  /**
   * Check if the NameSilo response indicates success (reply code 300).
   */
  private isSuccess(xml: string): boolean {
    return this.extractXml(xml, 'code') === '300';
  }

  /**
   * Throw a NameSiloApiError if the response is not successful.
   */
  private assertSuccess(xml: string, context: string): void {
    if (!this.isSuccess(xml)) {
      const code = this.extractXml(xml, 'code') || 'unknown';
      const detail = this.extractXml(xml, 'detail') || 'Unknown error';
      throw new NameSiloApiError(
        `NameSilo ${context} failed (code ${code}): ${detail}`,
        400,
        { code, detail },
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCOUNT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the current NameSilo account balance (in USD).
   */
  async getAccountBalance(): Promise<number> {
    const xml = await this.request('getAccountBalance');
    this.assertSuccess(xml, 'getAccountBalance');
    return parseFloat(this.extractXml(xml, 'balance') || '0');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN SEARCH & AVAILABILITY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check registration availability for one or more fully-qualified domain
   * names (e.g. ["example.com", "example.net"]).
   *
   * Returns availability status together with NameSilo cost prices.
   */
  async checkAvailability(
    domains: string[],
  ): Promise<
    Array<{
      domain: string;
      available: boolean;
      price: number;
      renewPrice: number;
      premium: boolean;
    }>
  > {
    const xml = await this.request('checkRegisterAvailability', {
      domains: domains.join(','),
    });

    const results: Array<{
      domain: string;
      available: boolean;
      price: number;
      renewPrice: number;
      premium: boolean;
    }> = [];

    // Parse available domains:
    // <domain price="9.95" renew="10.79" premium="0" duration="1">domain.com</domain>
    const availableMatches = xml.matchAll(
      /<domain\s[^>]*?price="([^"]+)"[^>]*?renew="([^"]+)"[^>]*?premium="([^"]+)"[^>]*?>([^<]+)<\/domain>/g,
    );
    for (const match of availableMatches) {
      results.push({
        domain: match[4].trim(),
        available: true,
        price: parseFloat(match[1]),
        renewPrice: parseFloat(match[2]),
        premium: match[3] !== '0',
      });
    }

    // Parse unavailable domains inside <unavailable> section
    const unavailSection = xml.match(
      /<unavailable>([\s\S]*?)<\/unavailable>/,
    );
    if (unavailSection) {
      const unavailDomains = unavailSection[1].matchAll(
        /<domain>([^<]+)<\/domain>/g,
      );
      for (const match of unavailDomains) {
        // Only add if not already in results (avoid duplicates)
        const domainName = match[1].trim();
        if (!results.some((r) => r.domain === domainName)) {
          results.push({
            domain: domainName,
            available: false,
            price: 0,
            renewPrice: 0,
            premium: false,
          });
        }
      }
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN PRICING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get NameSilo wholesale prices for all TLDs.
   * Returns a map of TLD -> { registration, renewal, transfer } in USD.
   */
  async getPrices(): Promise<
    Record<
      string,
      { registration: number; renewal: number; transfer: number }
    >
  > {
    const xml = await this.request('getPrices');
    const prices: Record<
      string,
      { registration: number; renewal: number; transfer: number }
    > = {};

    // Each TLD block: <com><registration>17.29</registration><renew>17.29</renew><transfer>10.80</transfer></com>
    const tldPattern =
      /<(\w[\w.]*?)>\s*<registration>([\d.]+)<\/registration>\s*<renew>([\d.]+)<\/renew>\s*<transfer>([\d.]+)<\/transfer>/g;
    const matches = xml.matchAll(tldPattern);
    for (const match of matches) {
      prices[match[1]] = {
        registration: parseFloat(match[2]),
        renewal: parseFloat(match[3]),
        transfer: parseFloat(match[4]),
      };
    }

    return prices;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN REGISTRATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register a new domain via NameSilo.
   *
   * NameSilo uses the account's default contact profile for WHOIS.
   * WHOIS privacy is FREE and enabled by default.
   */
  async registerDomain(params: {
    domain: string;
    years?: number;
    ns1?: string;
    ns2?: string;
    ns3?: string;
    ns4?: string;
    private?: boolean;
    autoRenew?: boolean;
  }): Promise<{
    success: boolean;
    domain: string;
    orderId?: string;
    message?: string;
  }> {
    const reqParams: Record<string, string> = {
      domain: params.domain,
      years: String(params.years || 1),
      private: params.private !== false ? '1' : '0',
      auto_renew: params.autoRenew !== false ? '1' : '0',
    };
    if (params.ns1) reqParams.ns1 = params.ns1;
    if (params.ns2) reqParams.ns2 = params.ns2;
    if (params.ns3) reqParams.ns3 = params.ns3;
    if (params.ns4) reqParams.ns4 = params.ns4;

    const xml = await this.request('registerDomain', reqParams);
    const success = this.isSuccess(xml);
    const detail = this.extractXml(xml, 'detail') || '';
    const orderId = this.extractXml(xml, 'order_id') || '';

    if (!success) {
      const code = this.extractXml(xml, 'code') || 'unknown';
      this.logger.error(
        `Domain registration failed for ${params.domain}: code=${code}, detail=${detail}`,
      );
    }

    return {
      success,
      domain: params.domain,
      orderId: orderId || undefined,
      message: detail,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN RENEWAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Renew a domain for additional years.
   */
  async renewDomain(
    domain: string,
    years?: number,
  ): Promise<{ success: boolean; message: string; orderId?: string }> {
    const xml = await this.request('renewDomain', {
      domain,
      years: String(years || 1),
    });
    return {
      success: this.isSuccess(xml),
      message: this.extractXml(xml, 'detail') || '',
      orderId: this.extractXml(xml, 'order_id') || undefined,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN TRANSFER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initiate a domain transfer into NameSilo.
   */
  async transferDomain(
    domain: string,
    authCode: string,
  ): Promise<{
    success: boolean;
    orderId?: string;
    message: string;
  }> {
    const xml = await this.request('transferDomain', {
      domain,
      auth: authCode,
      private: '1',
      auto_renew: '1',
    });
    return {
      success: this.isSuccess(xml),
      orderId: this.extractXml(xml, 'order_id') || undefined,
      message: this.extractXml(xml, 'detail') || '',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN INFO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get detailed info about a specific domain.
   */
  async getDomainInfo(
    domain: string,
  ): Promise<{
    domain: string;
    status: string | null;
    created: string | null;
    expires: string | null;
    locked: boolean;
    private: boolean;
    autoRenew: boolean;
    nameservers: string[];
  }> {
    const xml = await this.request('getDomainInfo', { domain });
    return {
      domain,
      status: this.extractXml(xml, 'status'),
      created: this.extractXml(xml, 'created'),
      expires: this.extractXml(xml, 'expires'),
      locked: this.extractXml(xml, 'locked') === 'Yes',
      private: this.extractXml(xml, 'private') === 'Yes',
      autoRenew: this.extractXml(xml, 'auto_renew') === 'Yes',
      nameservers: this.extractXmlAll(xml, 'nameserver'),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST ALL DOMAINS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List all domains in the NameSilo account.
   */
  async listDomains(): Promise<string[]> {
    const xml = await this.request('listDomains');
    return this.extractXmlAll(xml, 'domain');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NAMESERVER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update the nameservers for a domain.
   */
  async changeNameservers(
    domain: string,
    ns1: string,
    ns2: string,
    ns3?: string,
    ns4?: string,
  ): Promise<{ success: boolean }> {
    const params: Record<string, string> = { domain, ns1, ns2 };
    if (ns3) params.ns3 = ns3;
    if (ns4) params.ns4 = ns4;
    const xml = await this.request('changeNameServers', params);
    return { success: this.isSuccess(xml) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DNS RECORD MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List all DNS resource records for a domain.
   */
  async listDnsRecords(
    domain: string,
  ): Promise<
    Array<{
      recordId: string;
      type: string;
      host: string;
      value: string;
      ttl: string;
      priority?: string;
    }>
  > {
    const xml = await this.request('dnsListRecords', { domain });
    const records: Array<{
      recordId: string;
      type: string;
      host: string;
      value: string;
      ttl: string;
      priority?: string;
    }> = [];

    // Parse resource records
    const recordPattern =
      /<resource_record>[\s\S]*?<record_id>([^<]+)<\/record_id>[\s\S]*?<type>([^<]+)<\/type>[\s\S]*?<host>([^<]+)<\/host>[\s\S]*?<value>([^<]+)<\/value>[\s\S]*?<ttl>([^<]+)<\/ttl>(?:[\s\S]*?<distance>([^<]+)<\/distance>)?[\s\S]*?<\/resource_record>/g;
    const matches = xml.matchAll(recordPattern);
    for (const m of matches) {
      records.push({
        recordId: m[1].trim(),
        type: m[2].trim(),
        host: m[3].trim(),
        value: m[4].trim(),
        ttl: m[5].trim(),
        priority: m[6]?.trim(),
      });
    }
    return records;
  }

  /**
   * Add a DNS record to a domain.
   */
  async addDnsRecord(
    domain: string,
    type: string,
    host: string,
    value: string,
    ttl?: string,
    priority?: string,
  ): Promise<{ success: boolean; recordId?: string }> {
    const params: Record<string, string> = {
      domain,
      rrtype: type,
      rrhost: host,
      rrvalue: value,
      rrttl: ttl || '3600',
    };
    if (priority) params.rrdistance = priority;
    const xml = await this.request('dnsAddRecord', params);
    return {
      success: this.isSuccess(xml),
      recordId: this.extractXml(xml, 'record_id') || undefined,
    };
  }

  /**
   * Update an existing DNS record.
   */
  async updateDnsRecord(
    domain: string,
    recordId: string,
    host: string,
    value: string,
    ttl?: string,
    priority?: string,
  ): Promise<{ success: boolean }> {
    const params: Record<string, string> = {
      domain,
      rrid: recordId,
      rrhost: host,
      rrvalue: value,
      rrttl: ttl || '3600',
    };
    if (priority) params.rrdistance = priority;
    const xml = await this.request('dnsUpdateRecord', params);
    return { success: this.isSuccess(xml) };
  }

  /**
   * Delete a DNS record.
   */
  async deleteDnsRecord(
    domain: string,
    recordId: string,
  ): Promise<{ success: boolean }> {
    const xml = await this.request('dnsDeleteRecord', {
      domain,
      rrid: recordId,
    });
    return { success: this.isSuccess(xml) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WHOIS PRIVACY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add WHOIS privacy protection (FREE on NameSilo).
   */
  async addPrivacy(domain: string): Promise<{ success: boolean }> {
    const xml = await this.request('addPrivacy', { domain });
    return { success: this.isSuccess(xml) };
  }

  /**
   * Remove WHOIS privacy protection.
   */
  async removePrivacy(domain: string): Promise<{ success: boolean }> {
    const xml = await this.request('removePrivacy', { domain });
    return { success: this.isSuccess(xml) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN LOCK
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Enable registrar lock (theft protection).
   */
  async lockDomain(domain: string): Promise<{ success: boolean }> {
    const xml = await this.request('domainLock', { domain });
    return { success: this.isSuccess(xml) };
  }

  /**
   * Disable registrar lock.
   */
  async unlockDomain(domain: string): Promise<{ success: boolean }> {
    const xml = await this.request('domainUnlock', { domain });
    return { success: this.isSuccess(xml) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH CODE (for outbound transfer)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Retrieve the EPP / auth code for a domain (for outbound transfers).
   */
  async getAuthCode(domain: string): Promise<string> {
    const xml = await this.request('retrieveAuthCode', { domain });
    return this.extractXml(xml, 'auth_code') || '';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO RENEW
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Enable or disable auto-renewal for a domain.
   */
  async setAutoRenew(
    domain: string,
    enabled: boolean,
  ): Promise<{ success: boolean }> {
    const endpoint = enabled ? 'addAutoRenewal' : 'removeAutoRenewal';
    const xml = await this.request(endpoint, { domain });
    return { success: this.isSuccess(xml) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTACT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add a contact profile to the NameSilo account.
   */
  async addContact(params: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  }): Promise<{ success: boolean; contactId?: string }> {
    const xml = await this.request('contactAdd', {
      fn: params.firstName,
      ln: params.lastName,
      em: params.email,
      ph: params.phone,
      ad: params.address,
      cy: params.city,
      st: params.state,
      ct: params.country,
      zp: params.zip,
    });
    return {
      success: this.isSuccess(xml),
      contactId: this.extractXml(xml, 'contact_id') || undefined,
    };
  }
}
