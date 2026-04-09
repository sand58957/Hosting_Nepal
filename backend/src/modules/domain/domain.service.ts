import {
  BadRequestException,
  ConflictException,

  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  ResellerClubService,
  ResellerClubApiError,
} from './services/resellerclub.service';
import {
  NameSiloService,
  NameSiloApiError,
} from './services/namesilo.service';
import { RegisterDomainDto } from './dto/register-domain.dto';
import { AddDnsRecordDto, UpdateDnsRecordDto } from './dto/dns-record.dto';
import { InitiateTransferDto } from './dto/transfer.dto';
import { PortfolioQueryDto, BulkDomainActionDto } from './dto/portfolio.dto';
import { DomainBrokerRequestDto, PreRegisterDomainDto, BlockDomainDto, NegotiationRequestDto } from './dto/services.dto';
import { ListDomainForSaleDto } from './dto/investor.dto';
import { AddDelegateDto, CreateDnsTemplateDto, UpdateDnsTemplateDto, ExportDomainListDto } from './dto/settings.dto';
import {
  DnsRecord,
  DomainAvailabilityResult,
  DomainSuggestion,
  RCDnsRecord,
} from './interfaces/resellerclub.interface';
import { v4 as uuidv4 } from 'uuid';

// TLD to ResellerClub product key mapping
const TLD_PRODUCT_KEY_MAP: Record<string, string> = {
  com: 'domcno', net: 'dotnet', org: 'domorg', info: 'dotinfo',
  biz: 'dombiz', in: 'dotin', co: 'dotco', io: 'dotio',
  xyz: 'dotxyz', me: 'dotme', us: 'domus', es: 'dotes',
  tech: 'dottech', online: 'dotonline', site: 'dotsite', store: 'dotstore',
  app: 'dotapp', dev: 'dotdev', ai: 'dotai', cloud: 'dotcloud',
  blog: 'dotblog', shop: 'dotshop', design: 'dotdesign', live: 'dotlive',
  space: 'dotspace', fun: 'dotfun', pro: 'dotpro',
  // Nepal TLDs (not available via RC — use fixed pricing)
  np: 'np', 'com.np': 'com.np',
};

// Nepal Rupee exchange rate (approx) — 1 USD = 133 NPR
const USD_TO_NPR = 133;
// Margin percentage applied on top of NameSilo cost price
const MARGIN_PERCENT = 50;

@Injectable()
export class DomainService {
  private readonly logger = new Logger(DomainService.name);
  private readonly defaultNameservers: string[];
  private pricingCache: Map<string, { price: number; renewPrice: number; transferPrice: number; restorePrice: number; timestamp: number }> = new Map();
  private readonly PRICE_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

  constructor(
    private readonly resellerClub: ResellerClubService,
    private readonly nameSilo: NameSiloService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.defaultNameservers = (
      this.configService.get<string>(
        'DEFAULT_NAMESERVERS',
        'ns1.hostingnepals.com,ns2.hostingnepals.com',
      )
    ).split(',');
  }

  /**
   * Get domain pricing for a TLD with 50% margin, converted to NPR.
   * Uses NameSilo as the primary pricing source.
   */
  async getDomainPricing(tld: string): Promise<{ registerPrice: number; renewPrice: number; transferPrice: number; restorePrice: number; currency: string }> {
    const cached = this.pricingCache.get(tld);
    if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_TTL) {
      return {
        registerPrice: cached.price,
        renewPrice: cached.renewPrice,
        transferPrice: cached.transferPrice,
        restorePrice: cached.restorePrice,
        currency: 'NPR',
      };
    }

    // Nepal TLDs have fixed pricing (not available via NameSilo or RC)
    if (tld === 'np' || tld === 'com.np') {
      const fixed = { price: 2500, renewPrice: 2500, transferPrice: 2500, restorePrice: 5000, timestamp: Date.now() };
      this.pricingCache.set(tld, fixed);
      return { registerPrice: fixed.price, renewPrice: fixed.renewPrice, transferPrice: fixed.transferPrice, restorePrice: fixed.restorePrice, currency: 'NPR' };
    }

    // Convert USD to NPR with margin
    const applyMargin = (usd: number) => Math.ceil(usd * USD_TO_NPR * (1 + MARGIN_PERCENT / 100));

    try {
      // Primary: NameSilo pricing
      const nsPrices = await this.nameSilo.getPrices();
      const tldPricing = nsPrices[tld];

      if (tldPricing) {
        const pricing = {
          price: applyMargin(tldPricing.registration),
          renewPrice: applyMargin(tldPricing.renewal),
          transferPrice: applyMargin(tldPricing.transfer),
          restorePrice: applyMargin(tldPricing.renewal * 2), // Estimate restore as 2x renewal
          timestamp: Date.now(),
        };

        this.pricingCache.set(tld, pricing);

        return {
          registerPrice: pricing.price,
          renewPrice: pricing.renewPrice,
          transferPrice: pricing.transferPrice,
          restorePrice: pricing.restorePrice,
          currency: 'NPR',
        };
      }

      // TLD not found in NameSilo pricing
      this.logger.warn(`TLD .${tld} not found in NameSilo pricing`);
      return { registerPrice: 0, renewPrice: 0, transferPrice: 0, restorePrice: 0, currency: 'NPR' };
    } catch (error) {
      this.logger.warn(`Failed to fetch NameSilo pricing for TLD ${tld}: ${error}`);

      // Fallback: try ResellerClub pricing
      try {
        const productKey = TLD_PRODUCT_KEY_MAP[tld];
        if (productKey) {
          const rcPricing = await this.resellerClub.getResellerPricing(productKey);
          const productData = rcPricing[productKey] || Object.values(rcPricing).find((v: any) => v?.addnewdomain);
          if (productData) {
            const regUsd = parseFloat(productData.addnewdomain?.['1'] || '0');
            const renewUsd = parseFloat(productData.renewdomain?.['1'] || '0');
            const transferUsd = parseFloat(productData.addtransferdomain?.['1'] || '0');
            const restoreUsd = parseFloat(productData.restoredomain?.['1'] || '0');

            const pricing = {
              price: applyMargin(regUsd),
              renewPrice: applyMargin(renewUsd),
              transferPrice: applyMargin(transferUsd),
              restorePrice: applyMargin(restoreUsd),
              timestamp: Date.now(),
            };

            this.pricingCache.set(tld, pricing);

            return {
              registerPrice: pricing.price,
              renewPrice: pricing.renewPrice,
              transferPrice: pricing.transferPrice,
              restorePrice: pricing.restorePrice,
              currency: 'NPR',
            };
          }
        }
      } catch (rcError) {
        this.logger.warn(`Fallback RC pricing also failed for TLD ${tld}: ${rcError}`);
      }

      return { registerPrice: 0, renewPrice: 0, transferPrice: 0, restorePrice: 0, currency: 'NPR' };
    }
  }

  /**
   * Get pricing for all popular TLDs.
   */
  async getAllTldPricing(): Promise<Array<{ tld: string; registerPrice: number; renewPrice: number; transferPrice: number; currency: string }>> {
    const applyMarginFn = (usd: number) => Math.ceil(usd * USD_TO_NPR * (1 + MARGIN_PERCENT / 100));

    try {
      // Fetch ALL TLDs from NameSilo in one API call
      const nsPrices = await this.nameSilo.getPrices();
      const results: Array<{ tld: string; registerPrice: number; renewPrice: number; transferPrice: number; currency: string }> = [];

      for (const [tld, pricing] of Object.entries(nsPrices)) {
        results.push({
          tld,
          registerPrice: applyMarginFn(pricing.registration),
          renewPrice: applyMarginFn(pricing.renewal),
          transferPrice: applyMarginFn(pricing.transfer),
          currency: 'NPR',
        });
      }

      // Add Nepal TLDs (fixed pricing, not on NameSilo)
      results.push({ tld: 'np', registerPrice: 2500, renewPrice: 2500, transferPrice: 2500, currency: 'NPR' });
      results.push({ tld: 'com.np', registerPrice: 2500, renewPrice: 2500, transferPrice: 2500, currency: 'NPR' });

      // Sort: popular TLDs first, then by price
      const popularOrder = ['com', 'net', 'org', 'np', 'com.np', 'in', 'co', 'io', 'xyz', 'me', 'app', 'dev', 'ai', 'tech', 'online', 'site', 'store', 'cloud', 'blog', 'shop'];
      results.sort((a, b) => {
        const aIdx = popularOrder.indexOf(a.tld);
        const bIdx = popularOrder.indexOf(b.tld);
        if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
        if (aIdx >= 0) return -1;
        if (bIdx >= 0) return 1;
        return a.registerPrice - b.registerPrice;
      });

      this.logger.log(`Fetched pricing for ${results.length} TLDs from NameSilo`);
      return results;
    } catch (error) {
      this.logger.warn(`Failed to fetch all TLD pricing: ${error}`);
      // Fallback to popular TLDs only
      const popularTlds = ['com', 'net', 'org', 'in', 'co', 'io', 'xyz', 'me', 'tech', 'app', 'dev', 'ai', 'cloud', 'np', 'com.np'];
      const results = await Promise.allSettled(
        popularTlds.map(async (tld) => {
          const pricing = await this.getDomainPricing(tld);
          return { tld, ...pricing };
        }),
      );
      return results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value)
        .filter((r) => r.registerPrice > 0);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN SEARCH & SUGGESTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check domain availability across specified TLDs.
   * Uses NameSilo as the primary registrar for availability checks.
   */
  async searchDomains(
    query: string,
    tlds: string[],
  ): Promise<any[]> {
    try {
      // Build fully-qualified domain names for NameSilo
      const fqdns = tlds.map((tld) => `${query}.${tld}`);

      // Fetch availability from NameSilo and pricing in parallel
      const [nsResults, ...pricingResults] = await Promise.all([
        this.nameSilo.checkAvailability(fqdns),
        ...tlds.map((tld) => this.getDomainPricing(tld)),
      ]);

      // Build pricing map
      const pricingMap: Record<string, any> = {};
      tlds.forEach((tld, i) => {
        pricingMap[tld] = pricingResults[i];
      });

      const results: any[] = [];

      for (const nsResult of nsResults) {
        const domainParts = nsResult.domain.split('.');
        const tld = domainParts.slice(1).join('.');
        const pricing = pricingMap[tld] || {};

        results.push({
          domain: nsResult.domain,
          tld,
          available: nsResult.available,
          status: nsResult.available ? 'available' : 'unavailable',
          premium: nsResult.premium,
          price: pricing.registerPrice || 0,
          renewPrice: pricing.renewPrice || 0,
          transferPrice: pricing.transferPrice || 0,
          currency: 'NPR',
        });
      }

      // Add any TLDs that were requested but not returned by NameSilo
      for (const tld of tlds) {
        const fqdn = `${query}.${tld}`;
        if (!results.some((r) => r.domain.toLowerCase() === fqdn.toLowerCase())) {
          const pricing = pricingMap[tld] || {};
          results.push({
            domain: fqdn,
            tld,
            available: false,
            status: 'unknown',
            premium: false,
            price: pricing.registerPrice || 0,
            renewPrice: pricing.renewPrice || 0,
            transferPrice: pricing.transferPrice || 0,
            currency: 'NPR',
          });
        }
      }

      // Sort: available first, then by price
      results.sort((a, b) => {
        if (a.available && !b.available) return -1;
        if (!a.available && b.available) return 1;
        return a.price - b.price;
      });

      return results;
    } catch (error) {
      this.handleError(error, 'searching domains');
    }
  }

  /**
   * Get domain name suggestions based on a keyword.
   */
  async suggestDomains(
    keyword: string,
    tlds: string[],
  ): Promise<DomainSuggestion[]> {
    try {
      const response = await this.resellerClub.suggestNames(keyword, tlds);

      if (!Array.isArray(response)) {
        return [];
      }

      return response.map((item) => ({
        domain: item.domain_name || (item as unknown as Record<string, unknown>)['domain-name'] as string,
        available: item.status === 'available',
      }));
    } catch (error) {
      // Suggestions are best-effort; return empty on failure
      this.logger.warn(`Domain suggestion failed: ${error}`);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN REGISTRATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register a new domain via NameSilo (primary registrar):
   * 1. Ensure domain is available
   * 2. Submit registration via NameSilo
   * 3. Persist in local DB
   *
   * NameSilo uses the account's default contact profile.
   * WHOIS privacy is FREE and enabled by default.
   */
  async registerDomain(
    userId: string,
    dto: RegisterDomainDto,
  ): Promise<Record<string, unknown>> {
    const { domainName, years, nameservers, registrantContact, privacyProtection, autoRenew } = dto;

    // 1. Check the domain isn't already in our DB
    const existing = await this.prisma.domain.findFirst({
      where: { domainName, status: { not: 'EXPIRED' } },
    });
    if (existing) {
      throw new ConflictException(`Domain ${domainName} is already registered in our system`);
    }

    // 2. Verify availability via NameSilo
    const sld = domainName.split('.')[0];
    const tld = domainName.split('.').slice(1).join('.');

    const nsAvailability = await this.nameSilo.checkAvailability([domainName]);
    const domainResult = nsAvailability.find(
      (r) => r.domain.toLowerCase() === domainName.toLowerCase(),
    );
    if (!domainResult || !domainResult.available) {
      throw new BadRequestException(
        `Domain ${domainName} is not available for registration`,
      );
    }

    try {
      // 3. Ensure user exists
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // 4. Register the domain via NameSilo
      const ns = nameservers?.length ? nameservers : this.defaultNameservers;

      const regResponse = await this.nameSilo.registerDomain({
        domain: domainName,
        years: years || 1,
        ns1: ns[0],
        ns2: ns[1],
        ns3: ns[2],
        ns4: ns[3],
        private: privacyProtection !== false, // WHOIS privacy is FREE on NameSilo, enable by default
        autoRenew: autoRenew !== false,
      });

      if (!regResponse.success) {
        throw new BadRequestException(
          `Domain registration failed: ${regResponse.message || 'Unknown error'}`,
        );
      }

      const orderId = regResponse.orderId || `ns-${Date.now()}`;

      // 5. Persist in local DB
      const domain = await this.prisma.domain.create({
        data: {
          id: uuidv4(),
          userId,
          domainName,
          tld,
          rcOrderId: orderId, // Stores NameSilo order ID in the same field
          status: 'ACTIVE',
          expiryDate: new Date(
            Date.now() + (years || 1) * 365 * 24 * 60 * 60 * 1000,
          ),
          autoRenew: autoRenew !== false,
          privacyProtection: privacyProtection !== false, // FREE on NameSilo
          theftProtection: true, // Enabled by default
          nameservers: ns,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 6. Lock domain for theft protection
      try {
        await this.nameSilo.lockDomain(domainName);
      } catch {
        this.logger.warn(
          `Could not enable theft protection for ${domainName} — may need to retry later`,
        );
      }

      this.logger.log(
        `Domain ${domainName} registered via NameSilo (order: ${orderId})`,
      );

      return {
        id: domain.id,
        domainName: domain.domainName,
        orderId,
        status: 'active',
        expiryDate: domain.expiryDate,
        nameservers: ns,
        privacyProtection: domain.privacyProtection,
        registrar: 'namesilo',
      };
    } catch (error) {
      this.handleError(error, `registering domain ${domainName}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN LISTING & DETAILS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List all domains belonging to a user.
   */
  async listDomains(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ domains: unknown[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [domains, total] = await Promise.all([
      this.prisma.domain.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.domain.count({ where: { userId } }),
    ]);

    return { domains, total, page, limit };
  }

  /**
   * Get full domain details — local DB record enriched with live registrar data.
   * Uses NameSilo as primary, falls back to ResellerClub for legacy domains.
   */
  async getDomain(
    domainId: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, userId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    // Fetch live details from NameSilo (primary)
    let liveDetails: Record<string, unknown> = {};
    try {
      const nsInfo = await this.nameSilo.getDomainInfo(domain.domainName);
      liveDetails = {
        registrarStatus: nsInfo.status,
        isLocked: nsInfo.locked,
        isPrivacyProtected: nsInfo.private,
        autoRenew: nsInfo.autoRenew,
        nameservers: nsInfo.nameservers,
        registrarExpiry: nsInfo.expires ? new Date(nsInfo.expires) : null,
        registrarCreated: nsInfo.created ? new Date(nsInfo.created) : null,
      };

      // Sync expiry date if different
      if (liveDetails.registrarExpiry && domain.expiryDate) {
        const registrarExpiry = liveDetails.registrarExpiry as Date;
        if (domain.expiryDate.getTime() !== registrarExpiry.getTime()) {
          await this.prisma.domain.update({
            where: { id: domain.id },
            data: {
              expiryDate: registrarExpiry,
              updatedAt: new Date(),
            },
          });
        }
      }

      this.logger.debug(`Fetched live NameSilo details for ${domain.domainName}`);
    } catch (error) {
      this.logger.warn(
        `Could not fetch live NameSilo details for ${domain.domainName}: ${error}`,
      );

      // Fallback to ResellerClub for legacy domains
      if (domain.rcOrderId) {
        try {
          const details = await this.resellerClub.getDomainDetails(domain.rcOrderId);
          liveDetails = {
            registrarStatus: details.currentstatus,
            rcDomainStatus: details.domainstatus,
            registrarExpiry: details.endtime
              ? new Date(parseInt(details.endtime) * 1000)
              : null,
            isLocked: details.islockedByRegistrar,
            isPrivacyProtected: details.isprivacyprotected === 'true',
            nameservers: this.extractNameservers(details),
          };
        } catch (rcError) {
          this.logger.warn(
            `Fallback RC details also failed for ${domain.domainName}: ${rcError}`,
          );
        }
      }
    }

    return {
      ...domain,
      ...liveDetails,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN RENEWAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Renew a domain for additional years via NameSilo (primary).
   */
  async renewDomain(
    domainId: string,
    userId: string,
    years: number,
  ): Promise<Record<string, unknown>> {
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, userId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    try {
      // Renew via NameSilo using the domain name
      const response = await this.nameSilo.renewDomain(
        domain.domainName,
        years,
      );

      if (!response.success) {
        throw new BadRequestException(
          `Domain renewal failed: ${response.message || 'Unknown error'}`,
        );
      }

      // Calculate new expiry date based on current expiry
      const currentExpiry = domain.expiryDate || new Date();
      const newExpiry = new Date(currentExpiry);
      newExpiry.setFullYear(newExpiry.getFullYear() + years);

      // Update local DB
      await this.prisma.domain.update({
        where: { id: domain.id },
        data: {
          expiryDate: newExpiry,
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Domain ${domain.domainName} renewed via NameSilo for ${years} year(s). New expiry: ${newExpiry.toISOString()}`,
      );

      return {
        id: domain.id,
        domainName: domain.domainName,
        renewed: true,
        years,
        newExpiryDate: newExpiry,
        orderId: response.orderId,
        registrar: 'namesilo',
      };
    } catch (error) {
      this.handleError(error, `renewing domain ${domain.domainName}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DNS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get all DNS records for a domain.
   * Uses NameSilo as primary, falls back to ResellerClub for legacy domains.
   */
  async getDnsRecords(
    domainId: string,
    userId: string,
  ): Promise<DnsRecord[]> {
    const domain = await this.findDomainOrFail(domainId, userId);

    try {
      // Primary: NameSilo
      const nsRecords = await this.nameSilo.listDnsRecords(domain.domainName);

      this.logger.debug(`Fetched ${nsRecords.length} DNS records from NameSilo for ${domain.domainName}`);

      return nsRecords.map((r) => ({
        id: r.recordId,
        type: r.type,
        host: r.host,
        value: r.value,
        ttl: parseInt(r.ttl, 10) || 3600,
        priority: r.priority ? parseInt(r.priority, 10) : undefined,
      }));
    } catch (error) {
      this.logger.warn(`NameSilo DNS fetch failed for ${domain.domainName}: ${error}`);

      // Fallback to ResellerClub for legacy domains
      if (domain.rcOrderId) {
        try {
          const records = await this.resellerClub.searchDnsRecords(
            domain.domainName,
          );
          return records.map((r: RCDnsRecord, index: number) =>
            this.normaliseDnsRecord(r, index),
          );
        } catch (rcError) {
          if (
            rcError instanceof ResellerClubApiError &&
            rcError.message.toLowerCase().includes('not active')
          ) {
            await this.resellerClub.activateDns(domain.rcOrderId);
            return [];
          }
          this.handleError(rcError, `fetching DNS records for ${domain.domainName}`);
        }
      }

      this.handleError(error, `fetching DNS records for ${domain.domainName}`);
    }
  }

  /**
   * Add a DNS record.
   * Uses NameSilo as primary, falls back to ResellerClub for legacy domains.
   */
  async addDnsRecord(
    domainId: string,
    userId: string,
    dto: AddDnsRecordDto,
  ): Promise<{ success: boolean; message: string }> {
    const domain = await this.findDomainOrFail(domainId, userId);

    // NameSilo uses subdomain-only host (e.g. "www" not "www.domain.com")
    const host = dto.host.replace(`.${domain.domainName}`, '').replace(/\.$/, '');

    try {
      const result = await this.nameSilo.addDnsRecord(
        domain.domainName,
        dto.type,
        host,
        dto.value,
        dto.ttl ? String(dto.ttl) : undefined,
        dto.priority ? String(dto.priority) : undefined,
      );

      this.logger.log(`Added ${dto.type} DNS record for ${domain.domainName} via NameSilo (recordId: ${result.recordId})`);

      return {
        success: true,
        message: `${dto.type} record added successfully`,
      };
    } catch (error) {
      this.logger.warn(`NameSilo addDnsRecord failed for ${domain.domainName}: ${error}`);

      // Fallback to ResellerClub for legacy domains
      if (domain.rcOrderId) {
        try {
          await this.resellerClub.addDnsRecordByDomain(
            domain.domainName,
            dto.type,
            dto.host,
            dto.value,
            dto.ttl,
            dto.priority,
          );
          return {
            success: true,
            message: `${dto.type} record added successfully (via fallback)`,
          };
        } catch (rcError) {
          this.handleError(rcError, `adding DNS ${dto.type} record for ${domain.domainName}`);
        }
      }

      this.handleError(error, `adding DNS ${dto.type} record for ${domain.domainName}`);
    }
  }

  /**
   * Update an existing DNS record.
   * For NameSilo: recordId is the NameSilo record_id string.
   * For legacy RC domains: recordId is a composite `{type}:{host}:{value}` (base64 encoded).
   */
  async updateDnsRecord(
    domainId: string,
    userId: string,
    recordId: string,
    dto: UpdateDnsRecordDto,
  ): Promise<{ success: boolean; message: string }> {
    const domain = await this.findDomainOrFail(domainId, userId);

    // NameSilo uses subdomain-only host (e.g. "www" not "www.domain.com")
    const host = dto.host
      ? dto.host.replace(`.${domain.domainName}`, '').replace(/\.$/, '')
      : '';

    try {
      // Primary: NameSilo — recordId is the NameSilo record_id
      await this.nameSilo.updateDnsRecord(
        domain.domainName,
        recordId,
        host,
        dto.value,
        dto.ttl ? String(dto.ttl) : undefined,
        dto.priority ? String(dto.priority) : undefined,
      );

      this.logger.log(`Updated DNS record ${recordId} for ${domain.domainName} via NameSilo`);

      return {
        success: true,
        message: `${dto.type || 'DNS'} record updated successfully`,
      };
    } catch (error) {
      this.logger.warn(`NameSilo updateDnsRecord failed for ${domain.domainName}: ${error}`);

      // Fallback to ResellerClub for legacy domains with base64-encoded composite IDs
      if (domain.rcOrderId) {
        try {
          const { type: oldType, host: oldHost, value: oldValue } =
            this.parseRecordId(recordId);

          await this.resellerClub.updateDnsRecord(
            domain.domainName,
            dto.type || oldType,
            dto.host || oldHost,
            oldValue,
            dto.value,
            dto.ttl,
            dto.priority,
          );

          return {
            success: true,
            message: `${dto.type || oldType} record updated successfully (via fallback)`,
          };
        } catch (rcError) {
          this.handleError(rcError, `updating DNS record for ${domain.domainName}`);
        }
      }

      this.handleError(error, `updating DNS record for ${domain.domainName}`);
    }
  }

  /**
   * Delete a DNS record.
   * For NameSilo: recordId is the NameSilo record_id string.
   * For legacy RC domains: recordId is a composite `{type}:{host}:{value}` (base64 encoded).
   */
  async deleteDnsRecord(
    domainId: string,
    userId: string,
    recordId: string,
  ): Promise<{ success: boolean; message: string }> {
    const domain = await this.findDomainOrFail(domainId, userId);

    try {
      // Primary: NameSilo — recordId is the NameSilo record_id
      await this.nameSilo.deleteDnsRecord(domain.domainName, recordId);

      this.logger.log(`Deleted DNS record ${recordId} for ${domain.domainName} via NameSilo`);

      return { success: true, message: 'DNS record deleted successfully' };
    } catch (error) {
      this.logger.warn(`NameSilo deleteDnsRecord failed for ${domain.domainName}: ${error}`);

      // Fallback to ResellerClub for legacy domains
      if (domain.rcOrderId) {
        try {
          const { type, host, value } = this.parseRecordId(recordId);
          await this.resellerClub.deleteDnsRecord(
            domain.domainName,
            type,
            host,
            value,
          );
          return { success: true, message: `${type} record deleted successfully (via fallback)` };
        } catch (rcError) {
          this.handleError(rcError, `deleting DNS record for ${domain.domainName}`);
        }
      }

      this.handleError(error, `deleting DNS record for ${domain.domainName}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NAMESERVERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Update the nameservers of a domain.
   * Uses NameSilo as primary, falls back to ResellerClub for legacy domains.
   */
  async updateNameservers(
    domainId: string,
    userId: string,
    nameservers: string[],
  ): Promise<{ success: boolean; nameservers: string[] }> {
    if (!nameservers?.length || nameservers.length < 2) {
      throw new BadRequestException('At least 2 nameservers are required');
    }
    if (nameservers.length > 13) {
      throw new BadRequestException('Maximum 13 nameservers allowed');
    }

    const domain = await this.findDomainOrFail(domainId, userId);

    try {
      // Primary: NameSilo (supports up to 4 nameservers via API params)
      await this.nameSilo.changeNameservers(
        domain.domainName,
        nameservers[0],
        nameservers[1],
        nameservers[2],
        nameservers[3],
      );

      await this.prisma.domain.update({
        where: { id: domain.id },
        data: { nameservers, updatedAt: new Date() },
      });

      this.logger.log(`Updated nameservers for ${domain.domainName} via NameSilo`);

      return { success: true, nameservers };
    } catch (error) {
      this.logger.warn(`NameSilo changeNameservers failed for ${domain.domainName}: ${error}`);

      // Fallback to ResellerClub for legacy domains
      if (domain.rcOrderId) {
        try {
          await this.resellerClub.modifyNameservers(domain.rcOrderId, nameservers);
          await this.prisma.domain.update({
            where: { id: domain.id },
            data: { nameservers, updatedAt: new Date() },
          });
          return { success: true, nameservers };
        } catch (rcError) {
          this.handleError(rcError, `updating nameservers for ${domain.domainName}`);
        }
      }

      this.handleError(error, `updating nameservers for ${domain.domainName}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCK / THEFT PROTECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Toggle registrar lock (theft protection) on/off.
   * Uses NameSilo as primary, falls back to ResellerClub for legacy domains.
   */
  async toggleLock(
    domainId: string,
    userId: string,
    enable: boolean,
  ): Promise<{ success: boolean; locked: boolean }> {
    const domain = await this.findDomainOrFail(domainId, userId);

    try {
      // Primary: NameSilo
      if (enable) {
        await this.nameSilo.lockDomain(domain.domainName);
      } else {
        await this.nameSilo.unlockDomain(domain.domainName);
      }

      await this.prisma.domain.update({
        where: { id: domain.id },
        data: { theftProtection: enable, updatedAt: new Date() },
      });

      this.logger.log(`${enable ? 'Locked' : 'Unlocked'} domain ${domain.domainName} via NameSilo`);

      return { success: true, locked: enable };
    } catch (error) {
      this.logger.warn(`NameSilo ${enable ? 'lock' : 'unlock'} failed for ${domain.domainName}: ${error}`);

      // Fallback to ResellerClub for legacy domains
      if (domain.rcOrderId) {
        try {
          if (enable) {
            await this.resellerClub.enableTheftProtection(domain.rcOrderId);
          } else {
            await this.resellerClub.disableTheftProtection(domain.rcOrderId);
          }
          await this.prisma.domain.update({
            where: { id: domain.id },
            data: { theftProtection: enable, updatedAt: new Date() },
          });
          return { success: true, locked: enable };
        } catch (rcError) {
          this.handleError(rcError, `${enable ? 'enabling' : 'disabling'} theft protection for ${domain.domainName}`);
        }
      }

      this.handleError(error, `${enable ? 'enabling' : 'disabling'} theft protection for ${domain.domainName}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVACY PROTECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Toggle WHOIS privacy protection on/off.
   * Uses NameSilo as primary (FREE privacy), falls back to ResellerClub for legacy domains.
   */
  async togglePrivacy(
    domainId: string,
    userId: string,
    enable: boolean,
  ): Promise<{ success: boolean; privacyEnabled: boolean }> {
    const domain = await this.findDomainOrFail(domainId, userId);

    try {
      // Primary: NameSilo (WHOIS privacy is FREE)
      if (enable) {
        await this.nameSilo.addPrivacy(domain.domainName);
      } else {
        await this.nameSilo.removePrivacy(domain.domainName);
      }

      await this.prisma.domain.update({
        where: { id: domain.id },
        data: { privacyProtection: enable, updatedAt: new Date() },
      });

      this.logger.log(`${enable ? 'Enabled' : 'Disabled'} WHOIS privacy for ${domain.domainName} via NameSilo`);

      return { success: true, privacyEnabled: enable };
    } catch (error) {
      this.logger.warn(`NameSilo privacy toggle failed for ${domain.domainName}: ${error}`);

      // Fallback to ResellerClub for legacy domains
      if (domain.rcOrderId) {
        try {
          await this.resellerClub.modifyPrivacyProtection(
            domain.rcOrderId,
            enable,
          );
          await this.prisma.domain.update({
            where: { id: domain.id },
            data: { privacyProtection: enable, updatedAt: new Date() },
          });
          return { success: true, privacyEnabled: enable };
        } catch (rcError) {
          this.handleError(rcError, `${enable ? 'enabling' : 'disabling'} privacy for ${domain.domainName}`);
        }
      }

      this.handleError(error, `${enable ? 'enabling' : 'disabling'} privacy for ${domain.domainName}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD & ANALYTICS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get domain dashboard stats for a user.
   */
  async getDomainDashboard(userId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalDomains,
      activeDomains,
      expiringDomains,
      expiredDomains,
      recentlyRegistered,
      allDomains,
      upcomingRenewals,
    ] = await Promise.all([
      this.prisma.domain.count({ where: { userId } }),
      this.prisma.domain.count({ where: { userId, status: 'ACTIVE' } }),
      this.prisma.domain.count({
        where: {
          userId,
          status: 'ACTIVE',
          expiryDate: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
      this.prisma.domain.count({ where: { userId, status: 'EXPIRED' } }),
      this.prisma.domain.count({
        where: { userId, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.domain.findMany({
        where: { userId },
        select: { tld: true },
      }),
      this.prisma.domain.findMany({
        where: {
          userId,
          status: 'ACTIVE',
          expiryDate: { gte: now, lte: thirtyDaysFromNow },
        },
        orderBy: { expiryDate: 'asc' },
        select: { id: true, domainName: true, expiryDate: true, autoRenew: true },
      }),
    ]);

    // Count domains by TLD
    const domainsByTld: Record<string, number> = {};
    for (const d of allDomains) {
      domainsByTld[d.tld] = (domainsByTld[d.tld] || 0) + 1;
    }

    return {
      totalDomains,
      activeDomains,
      expiringDomains,
      expiredDomains,
      recentlyRegistered,
      domainsByTld,
      upcomingRenewals,
    };
  }

  /**
   * Get domain analytics for a user.
   */
  async getDomainAnalytics(userId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const allDomains = await this.prisma.domain.findMany({
      where: { userId },
      select: {
        tld: true,
        status: true,
        createdAt: true,
        expiryDate: true,
      },
    });

    // Registration trend: monthly counts for last 12 months
    const registrationTrend: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const count = allDomains.filter(
        (d) => d.createdAt >= monthStart && d.createdAt <= monthEnd,
      ).length;
      registrationTrend.push({
        month: monthStart.toISOString().slice(0, 7),
        count,
      });
    }

    // Expiry timeline: domains expiring in next 90 days
    const expiryTimeline = allDomains
      .filter(
        (d) =>
          d.expiryDate &&
          d.expiryDate >= now &&
          d.expiryDate <= ninetyDaysFromNow,
      )
      .sort((a, b) => (a.expiryDate!.getTime() - b.expiryDate!.getTime()));

    // TLD distribution
    const tldDistribution: Record<string, number> = {};
    for (const d of allDomains) {
      tldDistribution[d.tld] = (tldDistribution[d.tld] || 0) + 1;
    }

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    for (const d of allDomains) {
      statusBreakdown[d.status] = (statusBreakdown[d.status] || 0) + 1;
    }

    // Total spent on domains (from payments/orders)
    let totalSpent = 0;
    try {
      const payments = await this.prisma.payment.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { amountNpr: true },
      });
      totalSpent = payments._sum?.amountNpr ?? 0;
    } catch {
      // Payment table may not have domain-specific filtering; return 0
    }

    return {
      registrationTrend,
      expiryTimeline,
      tldDistribution,
      statusBreakdown,
      totalSpent,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN PORTFOLIO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get paginated portfolio of all user domains with full details.
   */
  async getPortfolio(
    userId: string,
    query: PortfolioQueryDto,
  ): Promise<{ domains: unknown[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, status, tld, sortBy = 'created', sortOrder = 'desc', search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (tld) where.tld = tld;
    if (search) {
      where.domainName = { contains: search, mode: 'insensitive' };
    }

    const orderByMap: Record<string, string> = {
      name: 'domainName',
      expiry: 'expiryDate',
      created: 'createdAt',
    };

    const [domains, total] = await Promise.all([
      this.prisma.domain.findMany({
        where: where as any,
        orderBy: { [orderByMap[sortBy] || 'createdAt']: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.domain.count({ where: where as any }),
    ]);

    return { domains, total, page, limit };
  }

  /**
   * Toggle auto-renew for a domain.
   * Syncs the setting with NameSilo in addition to updating the DB.
   */
  async toggleAutoRenew(
    domainId: string,
    userId: string,
    enabled: boolean,
  ): Promise<{ success: boolean; autoRenew: boolean }> {
    const domain = await this.findDomainOrFail(domainId, userId);

    // Sync with NameSilo
    try {
      await this.nameSilo.setAutoRenew(domain.domainName, enabled);
      this.logger.log(`Auto-renew ${enabled ? 'enabled' : 'disabled'} for ${domain.domainName} via NameSilo`);
    } catch (error) {
      this.logger.warn(`NameSilo setAutoRenew failed for ${domain.domainName}: ${error}`);
    }

    await this.prisma.domain.update({
      where: { id: domain.id },
      data: { autoRenew: enabled, updatedAt: new Date() },
    });

    await this.logActivity(userId, 'TOGGLE_AUTO_RENEW', 'Domain', domainId, {
      domainName: domain.domainName,
      enabled,
    });

    return { success: true, autoRenew: enabled };
  }

  /**
   * Execute a bulk action across multiple domains.
   * Uses NameSilo as primary, falls back to ResellerClub for legacy domains.
   */
  async bulkDomainAction(
    userId: string,
    dto: BulkDomainActionDto,
  ): Promise<{ results: { domainId: string; success: boolean; error?: string }[] }> {
    const results: { domainId: string; success: boolean; error?: string }[] = [];

    for (const domainId of dto.domainIds) {
      try {
        const domain = await this.findDomainOrFail(domainId, userId);

        switch (dto.action) {
          case 'renew': {
            try {
              // Primary: NameSilo
              const response = await this.nameSilo.renewDomain(domain.domainName, 1);
              if (response.success) {
                const currentExpiry = (domain as any).expiryDate || new Date();
                const newExpiry = new Date(currentExpiry);
                newExpiry.setFullYear(newExpiry.getFullYear() + 1);
                await this.prisma.domain.update({
                  where: { id: domain.id },
                  data: { expiryDate: newExpiry, status: 'ACTIVE', updatedAt: new Date() },
                });
              }
            } catch (nsError) {
              // Fallback: ResellerClub
              if (domain.rcOrderId) {
                const details = await this.resellerClub.getDomainDetails(domain.rcOrderId);
                await this.resellerClub.renewDomain(domain.rcOrderId, 1, details.endtime);
                const newExpiry = new Date(parseInt(details.endtime) * 1000);
                newExpiry.setFullYear(newExpiry.getFullYear() + 1);
                await this.prisma.domain.update({
                  where: { id: domain.id },
                  data: { expiryDate: newExpiry, status: 'ACTIVE', updatedAt: new Date() },
                });
              } else {
                throw nsError;
              }
            }
            break;
          }
          case 'lock': {
            try {
              await this.nameSilo.lockDomain(domain.domainName);
            } catch {
              if (domain.rcOrderId) {
                await this.resellerClub.enableTheftProtection(domain.rcOrderId);
              }
            }
            await this.prisma.domain.update({
              where: { id: domain.id },
              data: { theftProtection: true, updatedAt: new Date() },
            });
            break;
          }
          case 'unlock': {
            try {
              await this.nameSilo.unlockDomain(domain.domainName);
            } catch {
              if (domain.rcOrderId) {
                await this.resellerClub.disableTheftProtection(domain.rcOrderId);
              }
            }
            await this.prisma.domain.update({
              where: { id: domain.id },
              data: { theftProtection: false, updatedAt: new Date() },
            });
            break;
          }
          case 'delete': {
            // NameSilo doesn't have a delete domain API — mark as deleted in DB
            if (domain.rcOrderId && !domain.rcOrderId.startsWith('ns-')) {
              try {
                await this.resellerClub.deleteDomain(domain.rcOrderId);
              } catch {
                this.logger.warn(`RC deleteDomain failed for ${domain.domainName}`);
              }
            }
            await this.prisma.domain.update({
              where: { id: domain.id },
              data: { status: 'DELETED', updatedAt: new Date() },
            });
            break;
          }
        }

        results.push({ domainId, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ domainId, success: false, error: message });
      }
    }

    await this.logActivity(userId, 'BULK_DOMAIN_ACTION', 'Domain', null, {
      action: dto.action,
      domainIds: dto.domainIds,
      resultsSummary: {
        total: results.length,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    });

    return { results };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN TRANSFERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List domains with PENDING_TRANSFER status.
   */
  async listTransfers(userId: string): Promise<unknown[]> {
    return this.prisma.domain.findMany({
      where: { userId, status: 'PENDING_TRANSFER' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Initiate a domain transfer into the system via NameSilo (primary).
   * Falls back to ResellerClub for users with RC accounts.
   */
  async initiateDomainTransfer(
    userId: string,
    dto: InitiateTransferDto,
  ): Promise<Record<string, unknown>> {
    const { domainName, authCode } = dto;

    // Check if domain already exists in our system
    const existing = await this.prisma.domain.findFirst({
      where: { domainName, status: { not: 'EXPIRED' } },
    });
    if (existing) {
      throw new ConflictException(`Domain ${domainName} already exists in our system`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const tld = domainName.split('.').slice(1).join('.');

    try {
      // Primary: NameSilo transfer
      const response = await this.nameSilo.transferDomain(domainName, authCode);

      if (!response.success) {
        throw new BadRequestException(
          `Domain transfer failed: ${response.message || 'Unknown error'}`,
        );
      }

      const orderId = response.orderId || `ns-transfer-${Date.now()}`;

      const domain = await this.prisma.domain.create({
        data: {
          id: uuidv4(),
          userId,
          domainName,
          tld,
          rcOrderId: orderId,
          status: 'PENDING_TRANSFER',
          autoRenew: true,
          privacyProtection: true, // NameSilo includes free privacy
          theftProtection: false,
          nameservers: this.defaultNameservers,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await this.logActivity(userId, 'DOMAIN_TRANSFER_INITIATED', 'Domain', domain.id, {
        domainName,
        orderId,
        registrar: 'namesilo',
      });

      this.logger.log(`Transfer initiated for ${domainName} via NameSilo (order: ${orderId})`);

      return {
        id: domain.id,
        domainName,
        orderId,
        status: 'PENDING_TRANSFER',
        registrar: 'namesilo',
        message: 'Domain transfer initiated. Please approve the transfer at your current registrar.',
      };
    } catch (error) {
      this.logger.warn(`NameSilo transfer failed for ${domainName}: ${error}`);

      // Fallback to ResellerClub if user has an RC account
      if (user.rcCustomerId) {
        try {
          const existingDomain = await this.prisma.domain.findFirst({
            where: { userId, whoisContactId: { not: null } },
            select: { whoisContactId: true },
          });

          if (!existingDomain?.whoisContactId) {
            throw new BadRequestException(
              'No contact information found. Please register a domain first to set up contact details.',
            );
          }

          const contactId = existingDomain.whoisContactId;

          const rcResponse = await this.resellerClub.transferDomain({
            domainName,
            authCode,
            customerId: user.rcCustomerId,
            contactId,
            ns: this.defaultNameservers,
          });

          const orderId = String(rcResponse.entityid || rcResponse);

          const domain = await this.prisma.domain.create({
            data: {
              id: uuidv4(),
              userId,
              domainName,
              tld,
              rcOrderId: orderId,
              whoisContactId: contactId,
              status: 'PENDING_TRANSFER',
              autoRenew: false,
              privacyProtection: false,
              theftProtection: false,
              nameservers: this.defaultNameservers,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          await this.logActivity(userId, 'DOMAIN_TRANSFER_INITIATED', 'Domain', domain.id, {
            domainName,
            orderId,
            registrar: 'resellerclub',
          });

          return {
            id: domain.id,
            domainName,
            orderId,
            status: 'PENDING_TRANSFER',
            registrar: 'resellerclub',
            message: 'Domain transfer initiated via fallback. Please approve the transfer at your current registrar.',
          };
        } catch (rcError) {
          this.handleError(rcError, `initiating transfer for ${domainName}`);
        }
      }

      this.handleError(error, `initiating transfer for ${domainName}`);
    }
  }

  /**
   * Get the current transfer status.
   * Uses NameSilo as primary, falls back to ResellerClub for legacy domains.
   */
  async getTransferStatus(
    domainId: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const domain = await this.findDomainOrFail(domainId, userId);

    try {
      // Primary: NameSilo — check domain info for transfer status
      const nsInfo = await this.nameSilo.getDomainInfo(domain.domainName);

      // If domain is now active in NameSilo, update DB status
      if (nsInfo.status && domain.status === 'PENDING_TRANSFER') {
        const isActive = nsInfo.status.toLowerCase() === 'active';
        if (isActive) {
          await this.prisma.domain.update({
            where: { id: domain.id },
            data: {
              status: 'ACTIVE',
              expiryDate: nsInfo.expires ? new Date(nsInfo.expires) : undefined,
              updatedAt: new Date(),
            },
          });
        }
      }

      return {
        id: domain.id,
        domainName: domain.domainName,
        status: domain.status,
        registrarStatus: nsInfo.status,
        transferComplete: nsInfo.status?.toLowerCase() === 'active',
        expires: nsInfo.expires,
      };
    } catch (error) {
      this.logger.warn(`NameSilo transfer status check failed for ${domain.domainName}: ${error}`);

      // Fallback to ResellerClub for legacy domains
      if (domain.rcOrderId) {
        try {
          const details = await this.resellerClub.getDomainDetails(domain.rcOrderId);
          return {
            id: domain.id,
            domainName: domain.domainName,
            status: domain.status,
            rcStatus: details.currentstatus,
            rcDomainStatus: details.domainstatus,
            actionCompleted: details.actioncompleted,
          };
        } catch (rcError) {
          this.handleError(rcError, `fetching transfer status for ${domain.domainName}`);
        }
      }

      // If NameSilo can't find the domain yet, return DB-only status (transfer may be pending)
      return {
        id: domain.id,
        domainName: domain.domainName,
        status: domain.status,
        registrarStatus: 'pending',
        transferComplete: false,
        message: 'Transfer is still being processed. Please check back later.',
      };
    }
  }

  /**
   * Cancel an ongoing domain transfer.
   * NameSilo does not have a cancel transfer API, so we mark it as cancelled in DB.
   * For legacy RC domains, attempts to cancel via ResellerClub API.
   */
  async cancelTransfer(
    domainId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const domain = await this.findDomainOrFail(domainId, userId);

    if (domain.status !== 'PENDING_TRANSFER') {
      throw new BadRequestException('Only pending transfers can be cancelled');
    }

    try {
      // Try ResellerClub cancel for legacy domains
      if (domain.rcOrderId && !domain.rcOrderId.startsWith('ns-')) {
        try {
          await this.resellerClub.cancelTransfer(domain.rcOrderId);
        } catch (rcError) {
          this.logger.warn(`RC cancelTransfer failed for ${domain.domainName}: ${rcError}`);
        }
      }

      // NameSilo doesn't have a cancel transfer API — mark as cancelled in DB
      await this.prisma.domain.update({
        where: { id: domain.id },
        data: { status: 'DELETED', updatedAt: new Date() },
      });

      await this.logActivity(userId, 'DOMAIN_TRANSFER_CANCELLED', 'Domain', domainId, {
        domainName: domain.domainName,
      });

      this.logger.log(`Transfer cancelled for ${domain.domainName}`);

      return { success: true, message: 'Domain transfer cancelled successfully' };
    } catch (error) {
      this.handleError(error, `cancelling transfer for ${domain.domainName}`);
    }
  }

  /**
   * Get the EPP/Auth code for outbound transfers.
   * Uses NameSilo as primary, falls back to ResellerClub for legacy domains.
   */
  async getAuthCode(
    domainId: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const domain = await this.findDomainOrFail(domainId, userId);

    try {
      // Primary: NameSilo
      const authCode = await this.nameSilo.getAuthCode(domain.domainName);

      await this.logActivity(userId, 'AUTH_CODE_REQUESTED', 'Domain', domainId, {
        domainName: domain.domainName,
      });

      this.logger.log(`Auth code retrieved for ${domain.domainName} via NameSilo`);

      return {
        domainName: domain.domainName,
        authCode,
      };
    } catch (error) {
      this.logger.warn(`NameSilo getAuthCode failed for ${domain.domainName}: ${error}`);

      // Fallback to ResellerClub for legacy domains
      if (domain.rcOrderId) {
        try {
          const response = await this.resellerClub.getAuthCode(domain.rcOrderId);

          await this.logActivity(userId, 'AUTH_CODE_REQUESTED', 'Domain', domainId, {
            domainName: domain.domainName,
          });

          return {
            domainName: domain.domainName,
            authCode: response,
          };
        } catch (rcError) {
          this.handleError(rcError, `retrieving auth code for ${domain.domainName}`);
        }
      }

      this.handleError(error, `retrieving auth code for ${domain.domainName}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN SERVICES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Enable DNS hosting for a domain.
   * NameSilo includes free DNS hosting by default, so this is a no-op for NameSilo domains.
   * Falls back to ResellerClub activation for legacy domains.
   */
  async enableDnsHosting(
    domainId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const domain = await this.findDomainOrFail(domainId, userId);

    // NameSilo includes free DNS hosting — no activation needed
    // For legacy RC domains, attempt RC activation
    if (domain.rcOrderId && !domain.rcOrderId.startsWith('ns-')) {
      try {
        await this.resellerClub.activateDns(domain.rcOrderId);
      } catch (error) {
        this.logger.warn(`RC DNS activation failed for ${domain.domainName}: ${error}`);
      }
    }

    await this.logActivity(userId, 'DNS_HOSTING_ENABLED', 'Domain', domainId, {
      domainName: domain.domainName,
    });

    this.logger.log(`DNS hosting enabled for ${domain.domainName}`);

    return { success: true, message: 'DNS hosting activated successfully' };
  }

  /**
   * List domains that have DNS hosting enabled (domains using our nameservers).
   */
  async listDnsHostingDomains(userId: string): Promise<unknown[]> {
    // Domains using our default nameservers have DNS hosting enabled
    const domains = await this.prisma.domain.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    // Filter domains using our nameservers
    return domains.filter((d) => {
      const ns = d.nameservers as string[] | null;
      if (!ns || !Array.isArray(ns)) return false;
      return ns.some((n: string) =>
        this.defaultNameservers.some((dns) => n.toLowerCase() === dns.toLowerCase()),
      );
    });
  }

  /**
   * Submit a domain broker request (manual service).
   */
  async requestDomainBroker(
    userId: string,
    dto: DomainBrokerRequestDto,
  ): Promise<Record<string, unknown>> {
    const id = uuidv4();

    await this.logActivity(userId, 'DOMAIN_BROKER_REQUESTED', 'Domain', null, {
      requestId: id,
      domainName: dto.domainName,
      maxBudget: dto.maxBudget,
      contactEmail: dto.contactEmail,
      status: 'PENDING',
    });

    // Store in metadata via domain settings pattern
    await this.saveDomainSetting(userId, 'broker_requests', id, {
      id,
      domainName: dto.domainName,
      maxBudget: dto.maxBudget,
      contactEmail: dto.contactEmail,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });

    return {
      requestId: id,
      domainName: dto.domainName,
      status: 'PENDING',
      message: 'Broker request submitted. Our team will contact you within 24-48 hours.',
    };
  }

  /**
   * Pre-register interest in a domain.
   */
  async preRegisterDomain(
    userId: string,
    dto: PreRegisterDomainDto,
  ): Promise<Record<string, unknown>> {
    const fullDomain = `${dto.domainName}.${dto.tld}`;
    const id = uuidv4();

    await this.saveDomainSetting(userId, 'pre_registrations', id, {
      id,
      domainName: dto.domainName,
      tld: dto.tld,
      fullDomain,
      status: 'WATCHING',
      createdAt: new Date().toISOString(),
    });

    await this.logActivity(userId, 'DOMAIN_PRE_REGISTERED', 'Domain', null, {
      domainName: fullDomain,
    });

    return {
      requestId: id,
      domainName: fullDomain,
      status: 'WATCHING',
      message: 'Pre-registration interest recorded. We will notify you when the domain becomes available.',
    };
  }

  /**
   * Block a domain across multiple TLDs (register it across all specified TLDs).
   * Uses NameSilo as primary registrar for each TLD registration.
   */
  async blockDomain(
    userId: string,
    dto: BlockDomainDto,
  ): Promise<{ results: { tld: string; success: boolean; error?: string }[] }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const results: { tld: string; success: boolean; error?: string }[] = [];

    for (const tld of dto.tlds) {
      const fullDomain = `${dto.domainName}.${tld}`;
      try {
        // Check availability via NameSilo
        const nsAvailability = await this.nameSilo.checkAvailability([fullDomain]);
        const domainResult = nsAvailability.find(
          (r) => r.domain.toLowerCase() === fullDomain.toLowerCase(),
        );

        if (!domainResult || !domainResult.available) {
          results.push({ tld, success: false, error: `${fullDomain} is not available` });
          continue;
        }

        // Register via NameSilo
        const regResponse = await this.nameSilo.registerDomain({
          domain: fullDomain,
          years: 1,
          ns1: this.defaultNameservers[0],
          ns2: this.defaultNameservers[1],
          ns3: this.defaultNameservers[2],
          ns4: this.defaultNameservers[3],
          private: true, // Free WHOIS privacy on NameSilo
          autoRenew: true,
        });

        if (!regResponse.success) {
          results.push({ tld, success: false, error: regResponse.message || 'Registration failed' });
          continue;
        }

        const orderId = regResponse.orderId || `ns-${Date.now()}`;

        await this.prisma.domain.create({
          data: {
            id: uuidv4(),
            userId,
            domainName: fullDomain,
            tld,
            rcOrderId: orderId,
            status: 'ACTIVE',
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            autoRenew: true,
            privacyProtection: true,
            theftProtection: true,
            nameservers: this.defaultNameservers,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Lock domain for theft protection
        try {
          await this.nameSilo.lockDomain(fullDomain);
        } catch {
          this.logger.warn(`Could not lock ${fullDomain} after block registration`);
        }

        results.push({ tld, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ tld, success: false, error: message });
      }
    }

    await this.logActivity(userId, 'DOMAIN_BLOCK', 'Domain', null, {
      domainName: dto.domainName,
      tlds: dto.tlds,
      results,
    });

    return { results };
  }

  /**
   * Submit a domain negotiation request (manual service).
   */
  async requestNegotiation(
    userId: string,
    dto: NegotiationRequestDto,
  ): Promise<Record<string, unknown>> {
    const id = uuidv4();

    await this.saveDomainSetting(userId, 'negotiation_requests', id, {
      id,
      domainName: dto.domainName,
      maxBudget: dto.maxBudget,
      message: dto.message,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });

    await this.logActivity(userId, 'DOMAIN_NEGOTIATION_REQUESTED', 'Domain', null, {
      domainName: dto.domainName,
      maxBudget: dto.maxBudget,
    });

    return {
      requestId: id,
      domainName: dto.domainName,
      status: 'PENDING',
      message: 'Negotiation request submitted. Our team will begin outreach within 48 hours.',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVESTOR CENTRAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get user's domains listed for sale.
   */
  async getMarketplaceListings(userId: string): Promise<unknown[]> {
    const settings = await this.getDomainSettings(userId, 'marketplace_listings');
    return Object.values(settings);
  }

  /**
   * List a domain for sale.
   */
  async listDomainForSale(
    userId: string,
    dto: ListDomainForSaleDto,
  ): Promise<Record<string, unknown>> {
    const domain = await this.findDomainOrFail(dto.domainId, userId);

    const listing = {
      id: dto.domainId,
      domainId: dto.domainId,
      domainName: domain.domainName,
      askingPrice: dto.askingPrice,
      description: dto.description || '',
      status: 'LISTED',
      listedAt: new Date().toISOString(),
    };

    await this.saveDomainSetting(userId, 'marketplace_listings', dto.domainId, listing);

    await this.logActivity(userId, 'DOMAIN_LISTED_FOR_SALE', 'Domain', dto.domainId, {
      domainName: domain.domainName,
      askingPrice: dto.askingPrice,
    });

    return listing;
  }

  /**
   * Remove a domain from sale listing.
   */
  async unlistDomain(
    listingId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const settings = await this.getDomainSettings(userId, 'marketplace_listings');
    if (!settings[listingId]) {
      throw new NotFoundException('Listing not found');
    }

    await this.removeDomainSetting(userId, 'marketplace_listings', listingId);

    await this.logActivity(userId, 'DOMAIN_UNLISTED', 'Domain', listingId, {});

    return { success: true, message: 'Domain removed from marketplace' };
  }

  /**
   * Get domains with parking enabled.
   */
  async getParkingDomains(userId: string): Promise<unknown[]> {
    const settings = await this.getDomainSettings(userId, 'parking_domains');
    const parkedIds = Object.keys(settings);

    if (parkedIds.length === 0) return [];

    return this.prisma.domain.findMany({
      where: { userId, id: { in: parkedIds } },
    });
  }

  /**
   * Toggle domain parking.
   */
  async toggleParking(
    domainId: string,
    userId: string,
    enabled: boolean,
  ): Promise<{ success: boolean; parking: boolean }> {
    const domain = await this.findDomainOrFail(domainId, userId);

    if (enabled) {
      await this.saveDomainSetting(userId, 'parking_domains', domainId, {
        domainId,
        domainName: domain.domainName,
        enabledAt: new Date().toISOString(),
      });
    } else {
      await this.removeDomainSetting(userId, 'parking_domains', domainId);
    }

    await this.logActivity(userId, 'TOGGLE_PARKING', 'Domain', domainId, {
      domainName: domain.domainName,
      enabled,
    });

    return { success: true, parking: enabled };
  }

  /**
   * Get active auctions (from stored data).
   */
  async getAuctions(userId: string): Promise<unknown[]> {
    const settings = await this.getDomainSettings(userId, 'auctions');
    return Object.values(settings);
  }

  /**
   * Get investor stats.
   */
  async getInvestorStats(userId: string): Promise<Record<string, unknown>> {
    const listings = await this.getDomainSettings(userId, 'marketplace_listings');
    const parking = await this.getDomainSettings(userId, 'parking_domains');

    const listingValues = Object.values(listings) as { askingPrice?: number }[];
    const estimatedValue = listingValues.reduce(
      (sum, l) => sum + (l.askingPrice || 0),
      0,
    );

    return {
      totalListings: listingValues.length,
      totalParked: Object.keys(parking).length,
      estimatedValue,
      monthlyParkingRevenue: 0, // Placeholder - would need parking revenue tracking
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN SETTINGS (Delegates, DNS Templates, Exports)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * List delegates with access to user's domains.
   */
  async listDelegates(userId: string): Promise<unknown[]> {
    const settings = await this.getDomainSettings(userId, 'delegates');
    return Object.values(settings);
  }

  /**
   * Add a delegate with specific permissions.
   */
  async addDelegate(
    userId: string,
    dto: AddDelegateDto,
  ): Promise<Record<string, unknown>> {
    const id = uuidv4();
    const delegate = {
      id,
      email: dto.email,
      permissions: dto.permissions,
      addedAt: new Date().toISOString(),
    };

    await this.saveDomainSetting(userId, 'delegates', id, delegate);

    await this.logActivity(userId, 'DELEGATE_ADDED', 'DomainSettings', null, {
      email: dto.email,
      permissions: dto.permissions,
    });

    return delegate;
  }

  /**
   * Remove a delegate.
   */
  async removeDelegate(
    delegateId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const settings = await this.getDomainSettings(userId, 'delegates');
    if (!settings[delegateId]) {
      throw new NotFoundException('Delegate not found');
    }

    await this.removeDomainSetting(userId, 'delegates', delegateId);

    await this.logActivity(userId, 'DELEGATE_REMOVED', 'DomainSettings', null, {
      delegateId,
    });

    return { success: true, message: 'Delegate removed successfully' };
  }

  /**
   * List saved DNS templates.
   */
  async listDnsTemplates(userId: string): Promise<unknown[]> {
    const settings = await this.getDomainSettings(userId, 'dns_templates');
    return Object.values(settings);
  }

  /**
   * Create a DNS record template.
   */
  async createDnsTemplate(
    userId: string,
    dto: CreateDnsTemplateDto,
  ): Promise<Record<string, unknown>> {
    const id = uuidv4();
    const template = {
      id,
      name: dto.name,
      records: dto.records,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.saveDomainSetting(userId, 'dns_templates', id, template);

    return template;
  }

  /**
   * Update a DNS record template.
   */
  async updateDnsTemplate(
    templateId: string,
    userId: string,
    dto: UpdateDnsTemplateDto,
  ): Promise<Record<string, unknown>> {
    const settings = await this.getDomainSettings(userId, 'dns_templates');
    const existing = settings[templateId] as Record<string, unknown> | undefined;
    if (!existing) {
      throw new NotFoundException('DNS template not found');
    }

    const updated = {
      ...existing,
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.records !== undefined && { records: dto.records }),
      updatedAt: new Date().toISOString(),
    };

    await this.saveDomainSetting(userId, 'dns_templates', templateId, updated);

    return updated;
  }

  /**
   * Delete a DNS record template.
   */
  async deleteDnsTemplate(
    templateId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const settings = await this.getDomainSettings(userId, 'dns_templates');
    if (!settings[templateId]) {
      throw new NotFoundException('DNS template not found');
    }

    await this.removeDomainSetting(userId, 'dns_templates', templateId);

    return { success: true, message: 'DNS template deleted successfully' };
  }

  /**
   * Apply a DNS template to a domain.
   */
  async applyDnsTemplate(
    domainId: string,
    userId: string,
    templateId: string,
  ): Promise<{ success: boolean; applied: number; errors: string[] }> {
    const domain = await this.findDomainOrFail(domainId, userId);

    const settings = await this.getDomainSettings(userId, 'dns_templates');
    const template = settings[templateId] as { records: { type: string; host: string; value: string; ttl?: number; priority?: number }[] } | undefined;
    if (!template) {
      throw new NotFoundException('DNS template not found');
    }

    let applied = 0;
    const errors: string[] = [];

    for (const record of template.records) {
      try {
        // NameSilo uses subdomain-only host
        const host = record.host.replace(`.${domain.domainName}`, '').replace(/\.$/, '');

        await this.nameSilo.addDnsRecord(
          domain.domainName,
          record.type,
          host,
          record.value,
          record.ttl ? String(record.ttl) : '3600',
          record.priority ? String(record.priority) : undefined,
        );
        applied++;
      } catch (nsError) {
        // Fallback to ResellerClub for legacy domains
        if (domain.rcOrderId) {
          try {
            await this.resellerClub.addDnsRecordByDomain(
              domain.domainName,
              record.type,
              record.host,
              record.value,
              record.ttl || 14400,
              record.priority,
            );
            applied++;
            continue;
          } catch {
            // fall through to error
          }
        }
        const msg = nsError instanceof Error ? nsError.message : String(nsError);
        errors.push(`Failed to add ${record.type} record for ${record.host}: ${msg}`);
      }
    }

    await this.logActivity(userId, 'DNS_TEMPLATE_APPLIED', 'Domain', domainId, {
      domainName: domain.domainName,
      templateId,
      applied,
      errors,
    });

    return { success: errors.length === 0, applied, errors };
  }

  /**
   * List previous domain list exports.
   */
  async listExports(userId: string): Promise<unknown[]> {
    const settings = await this.getDomainSettings(userId, 'exports');
    return Object.values(settings);
  }

  /**
   * Export domain list as CSV or JSON.
   */
  async exportDomainList(
    userId: string,
    dto: ExportDomainListDto,
  ): Promise<Record<string, unknown>> {
    const where: Record<string, unknown> = { userId };
    if (dto.status) where.status = dto.status;
    if (dto.tld) where.tld = dto.tld;

    const domains = await this.prisma.domain.findMany({
      where: where as any,
      orderBy: { domainName: 'asc' },
    });

    let content: string;
    let mimeType: string;

    if (dto.format === 'csv') {
      const headers = ['Domain Name', 'TLD', 'Status', 'Expiry Date', 'Auto Renew', 'Privacy', 'Lock', 'Nameservers', 'Created At'];
      const rows = domains.map((d) => [
        d.domainName,
        d.tld,
        d.status,
        d.expiryDate?.toISOString() || '',
        d.autoRenew ? 'Yes' : 'No',
        d.privacyProtection ? 'Yes' : 'No',
        d.theftProtection ? 'Yes' : 'No',
        Array.isArray(d.nameservers) ? (d.nameservers as string[]).join('; ') : '',
        d.createdAt.toISOString(),
      ]);
      content = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(domains, null, 2);
      mimeType = 'application/json';
    }

    const exportId = uuidv4();
    const exportRecord = {
      id: exportId,
      format: dto.format,
      domainCount: domains.length,
      filters: { status: dto.status, tld: dto.tld },
      createdAt: new Date().toISOString(),
    };

    await this.saveDomainSetting(userId, 'exports', exportId, exportRecord);

    return {
      ...exportRecord,
      content,
      mimeType,
      fileName: `domains-export-${new Date().toISOString().slice(0, 10)}.${dto.format}`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVITY LOG
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get domain-related activity log.
   */
  async getDomainActivityLog(
    userId: string,
    options: { page?: number; limit?: number; domainId?: string; action?: string },
  ): Promise<{ activities: unknown[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, domainId, action } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      userId,
      resourceType: { in: ['Domain', 'DomainSettings'] },
    };
    if (domainId) where.resourceId = domainId;
    if (action) where.action = { contains: action, mode: 'insensitive' };

    const [activities, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.activityLog.count({ where: where as any }),
    ]);

    return { activities, total, page, limit };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find a domain record by ID and userId, or throw NotFoundException.
   */
  private async findDomainOrFail(
    domainId: string,
    userId: string,
  ): Promise<{ id: string; domainName: string; rcOrderId: string | null; [key: string]: unknown }> {
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, userId },
    });

    if (!domain) {
      throw new NotFoundException('Domain not found');
    }

    return domain as unknown as { id: string; domainName: string; rcOrderId: string | null; [key: string]: unknown };
  }

  /**
   * Parse a phone number into country-code and number parts.
   * Handles formats: +977-9812345678, +9779812345678, 9812345678
   */
  private parsePhone(phone: string): { phoneCC: string; phoneNumber: string } {
    const cleaned = phone.replace(/[\s-]/g, '');

    if (cleaned.startsWith('+')) {
      // Try to extract country code (1-3 digits after +)
      const match = cleaned.match(/^\+(\d{1,3})(\d+)$/);
      if (match) {
        return { phoneCC: match[1], phoneNumber: match[2] };
      }
    }

    // Default to Nepal country code
    return { phoneCC: '977', phoneNumber: cleaned.replace(/^0+/, '') };
  }

  /**
   * Extract nameservers from RC domain details response.
   */
  private extractNameservers(
    details: Record<string, unknown>,
  ): string[] {
    const ns: string[] = [];
    for (let i = 1; i <= 13; i++) {
      const val = details[`ns${i}`];
      if (val && typeof val === 'string') {
        ns.push(val);
      }
    }
    return ns;
  }

  /**
   * Convert an RC DNS record into our normalised format.
   * Since RC doesn't provide unique IDs, we generate a composite ID.
   */
  private normaliseDnsRecord(record: RCDnsRecord, index: number): DnsRecord {
    const compositeId = Buffer.from(
      `${record.type}:${record.host}:${record.value}`,
    ).toString('base64');

    return {
      id: compositeId,
      type: record.type,
      host: record.host,
      value: record.value,
      ttl: parseInt(record.ttl, 10) || 14400,
      priority: record.priority ? parseInt(record.priority, 10) : undefined,
    };
  }

  /**
   * Parse a composite record ID back into its components.
   */
  private parseRecordId(recordId: string): {
    type: string;
    host: string;
    value: string;
  } {
    try {
      const decoded = Buffer.from(recordId, 'base64').toString('utf-8');
      const [type, host, ...valueParts] = decoded.split(':');
      return { type, host, value: valueParts.join(':') };
    } catch {
      throw new BadRequestException('Invalid DNS record ID');
    }
  }

  /**
   * Log a domain-related activity.
   */
  private async logActivity(
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string | null,
    details: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          id: uuidv4(),
          userId,
          action,
          resourceType,
          resourceId,
          details: details as any,
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to log activity: ${error}`);
    }
  }

  /**
   * Get domain settings (JSON-based storage using ActivityLog details).
   * Uses a convention: action = 'DOMAIN_SETTINGS', resourceType = category,
   * and details contains the settings data.
   */
  private async getDomainSettings(
    userId: string,
    category: string,
  ): Promise<Record<string, unknown>> {
    const log = await this.prisma.activityLog.findFirst({
      where: {
        userId,
        action: 'DOMAIN_SETTINGS_STORE',
        resourceType: category,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!log || !log.details) return {};
    return (log.details as Record<string, unknown>) || {};
  }

  /**
   * Save a domain setting entry.
   */
  private async saveDomainSetting(
    userId: string,
    category: string,
    key: string,
    value: unknown,
  ): Promise<void> {
    const existing = await this.getDomainSettings(userId, category);
    existing[key] = value;

    // Delete old settings record for this category
    await this.prisma.activityLog.deleteMany({
      where: {
        userId,
        action: 'DOMAIN_SETTINGS_STORE',
        resourceType: category,
      },
    });

    // Create new settings record
    await this.prisma.activityLog.create({
      data: {
        id: uuidv4(),
        userId,
        action: 'DOMAIN_SETTINGS_STORE',
        resourceType: category,
        details: existing as any,
        createdAt: new Date(),
      },
    });
  }

  /**
   * Remove a domain setting entry.
   */
  private async removeDomainSetting(
    userId: string,
    category: string,
    key: string,
  ): Promise<void> {
    const existing = await this.getDomainSettings(userId, category);
    delete existing[key];

    await this.prisma.activityLog.deleteMany({
      where: {
        userId,
        action: 'DOMAIN_SETTINGS_STORE',
        resourceType: category,
      },
    });

    if (Object.keys(existing).length > 0) {
      await this.prisma.activityLog.create({
        data: {
          id: uuidv4(),
          userId,
          action: 'DOMAIN_SETTINGS_STORE',
          resourceType: category,
          details: existing as any,
          createdAt: new Date(),
        },
      });
    }
  }

  /**
   * Centralised error handler — re-throws as appropriate NestJS exceptions.
   */
  private handleError(error: unknown, context: string): never {
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException ||
      error instanceof ConflictException
    ) {
      throw error;
    }

    if (error instanceof NameSiloApiError) {
      this.logger.error(
        `NameSilo error while ${context}: ${error.message}`,
        error.stack,
      );
      if (error.statusCode === 400) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException(
        `Domain operation failed: ${error.message}`,
      );
    }

    if (error instanceof ResellerClubApiError) {
      this.logger.error(
        `ResellerClub error while ${context}: ${error.message}`,
        error.stack,
      );
      if (error.statusCode === 400) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException(
        `Domain operation failed: ${error.message}`,
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Unexpected error while ${context}: ${message}`);
    throw new InternalServerErrorException(
      `An unexpected error occurred while ${context}`,
    );
  }
}
