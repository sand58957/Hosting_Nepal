import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  RCAvailabilityResponse,
  RCContactParams,
  RCContactResponse,
  RCCreateCustomerParams,
  RCCustomerDetails,
  RCDnsRecord,
  RCDnsSearchResponse,
  RCDomainDetails,
  RCLockResponse,
  RCNameserverResponse,
  RCPricingResponse,
  RCPrivacyResponse,
  RCRegisterDomainParams,
  RCRegisterDomainResponse,
  RCRenewResponse,
  RCSearchOrdersResponse,
  RCSuggestNamesResponse,
} from '../interfaces/resellerclub.interface';

// ─── Custom Error ────────────────────────────────────────────────────────────

export class ResellerClubApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly rcResponse?: unknown,
  ) {
    super(message);
    this.name = 'ResellerClubApiError';
  }
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ResellerClubService {
  private readonly logger = new Logger(ResellerClubService.name);
  private readonly httpClient: AxiosInstance;
  private readonly domainCheckClient: AxiosInstance;
  private readonly authUserId: string;
  private readonly apiKey: string;
  private readonly isSandbox: boolean;

  /** Maximum retries for transient failures. */
  private readonly MAX_RETRIES = 3;
  /** Base delay between retries in ms (exponential back-off). */
  private readonly RETRY_BASE_DELAY = 1000;

  constructor(private readonly configService: ConfigService) {
    this.isSandbox =
      (this.configService.get<string>('RESELLERCLUB_USE_SANDBOX') ??
       this.configService.get<string>('RESELLERCLUB_SANDBOX', 'true')) === 'true';

    const baseURL = this.isSandbox
      ? 'https://test.httpapi.com/api'
      : 'https://httpapi.com/api';

    const domainCheckBaseURL = this.isSandbox
      ? 'https://test.httpapi.com/api'
      : 'https://domaincheck.httpapi.com/api';

    this.authUserId = this.configService.get<string>('RESELLERCLUB_AUTH_USERID', '');
    this.apiKey = this.configService.getOrThrow<string>('RESELLERCLUB_API_KEY');

    const commonConfig: AxiosRequestConfig = {
      timeout: 30_000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    };

    this.httpClient = axios.create({ ...commonConfig, baseURL });
    this.domainCheckClient = axios.create({ ...commonConfig, baseURL: domainCheckBaseURL });

    this.logger.log(
      `ResellerClub service initialised (sandbox=${this.isSandbox})`,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Build a full URL path with `.json` suffix and append auth query params.
   * Additional params are merged in.
   */
  private buildUrl(
    endpoint: string,
    params: Record<string, unknown> = {},
  ): { url: string; params: Record<string, unknown> } {
    const url = endpoint.endsWith('.json') ? endpoint : `${endpoint}.json`;
    return {
      url,
      params: {
        'auth-userid': this.authUserId,
        'api-key': this.apiKey,
        ...params,
      },
    };
  }

  /**
   * Perform a GET request with retry logic.
   * Uses the domainCheck client when `useDomainCheck` is true.
   */
  private async get<T = unknown>(
    endpoint: string,
    params: Record<string, unknown> = {},
    useDomainCheck = false,
  ): Promise<T> {
    const { url, params: allParams } = this.buildUrl(endpoint, params);
    const client = useDomainCheck ? this.domainCheckClient : this.httpClient;

    return this.executeWithRetry<T>(async () => {
      const response: AxiosResponse = await client.get(url, {
        params: allParams,
      });
      this.assertNoError(response.data, endpoint);
      return response.data as T;
    }, endpoint);
  }

  /**
   * Perform a POST request with retry logic.
   * ResellerClub expects POST data as URL-encoded form params (query string).
   */
  private async post<T = unknown>(
    endpoint: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const { url, params: allParams } = this.buildUrl(endpoint, {});

    // Build URL-encoded body
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...allParams, ...params })) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => body.append(key, String(v)));
      } else {
        body.append(key, String(value));
      }
    }

    return this.executeWithRetry<T>(async () => {
      const response: AxiosResponse = await this.httpClient.post(url, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      this.assertNoError(response.data, endpoint);
      return response.data as T;
    }, endpoint);
  }

  /**
   * ResellerClub returns HTTP 200 even on errors. Inspect the body for error signals.
   */
  private assertNoError(data: unknown, endpoint: string): void {
    if (data === null || data === undefined) {
      throw new ResellerClubApiError(
        `Empty response from ResellerClub for ${endpoint}`,
        502,
      );
    }

    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;

      // RC returns { status: 'ERROR', message: '...' }
      if (
        obj.status === 'ERROR' ||
        obj.status === 'error' ||
        obj.status === 'Failed'
      ) {
        const message =
          (obj.message as string) ||
          (obj.error as string) ||
          'Unknown ResellerClub API error';
        this.logger.error(
          `ResellerClub API error on ${endpoint}: ${message}`,
          JSON.stringify(data),
        );
        throw new ResellerClubApiError(message, 400, data);
      }

      // Some endpoints return { actionstatus: 'Failed', ... }
      if (obj.actionstatus === 'Failed') {
        const message =
          (obj.actionstatusdesc as string) ||
          (obj.message as string) ||
          'Action failed';
        throw new ResellerClubApiError(message, 400, data);
      }
    }
  }

  /**
   * Execute an async operation with exponential back-off retry.
   * Only retries on network / 5xx errors, not on business-logic errors.
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client-side / business errors
        if (error instanceof ResellerClubApiError && error.statusCode < 500) {
          throw error;
        }

        // Axios network / 5xx errors are retryable
        const isRetryable =
          axios.isAxiosError(error) &&
          (!error.response || error.response.status >= 500);

        if (!isRetryable && !(error instanceof ResellerClubApiError)) {
          throw error;
        }

        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
          this.logger.warn(
            `Retrying ${context} (attempt ${attempt + 1}/${this.MAX_RETRIES}) after ${delay}ms`,
          );
          await this.sleep(delay);
        }
      }
    }

    this.logger.error(
      `All ${this.MAX_RETRIES} retries exhausted for ${context}`,
    );
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN AVAILABILITY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check availability of a domain across one or more TLDs.
   * Uses the dedicated domain-check endpoint for faster results.
   */
  async checkAvailability(
    domainName: string,
    tlds: string[],
  ): Promise<RCAvailabilityResponse> {
    this.logger.debug(
      `Checking availability: ${domainName} for TLDs: ${tlds.join(', ')}`,
    );

    // Build URL manually because RC expects repeated tlds params: tlds=com&tlds=net
    const tldParams = tlds.map(tld => `tlds=${encodeURIComponent(tld)}`).join('&');
    const authParams = `auth-userid=${this.authUserId}&api-key=${encodeURIComponent(this.apiKey)}`;
    const fullUrl = `/domains/available.json?${authParams}&domain-name=${encodeURIComponent(domainName)}&${tldParams}`;

    const client = this.domainCheckClient;

    return this.executeWithRetry<RCAvailabilityResponse>(async () => {
      const response: AxiosResponse = await client.get(fullUrl);
      this.assertNoError(response.data, '/domains/available');
      return response.data as RCAvailabilityResponse;
    }, '/domains/available');
  }

  /**
   * Get domain name suggestions based on a keyword.
   */
  async suggestNames(
    keyword: string,
    tlds: string[],
  ): Promise<RCSuggestNamesResponse> {
    this.logger.debug(`Getting suggestions for: ${keyword}`);

    // Build URL manually because RC expects repeated tlds params
    const tldParams = tlds.map(tld => `tlds=${encodeURIComponent(tld)}`).join('&');
    const authParams = `auth-userid=${this.authUserId}&api-key=${encodeURIComponent(this.apiKey)}`;
    const fullUrl = `/domains/v5/suggest-names.json?${authParams}&keyword=${encodeURIComponent(keyword)}&no-of-results=10&hyphen-allowed=false&add-related=true&${tldParams}`;

    const client = this.domainCheckClient;

    return this.executeWithRetry<RCSuggestNamesResponse>(async () => {
      const response: AxiosResponse = await client.get(fullUrl);
      // Suggestions may return different formats
      return response.data as RCSuggestNamesResponse;
    }, '/domains/v5/suggest-names');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN REGISTRATION & MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register a new domain name.
   */
  async registerDomain(
    params: RCRegisterDomainParams,
  ): Promise<RCRegisterDomainResponse> {
    this.logger.log(`Registering domain: ${params['domain-name']}`);

    const flatParams: Record<string, unknown> = { ...params };

    // Nameservers need to be sent as ns[0], ns[1], etc.
    if (Array.isArray(params.ns)) {
      delete flatParams.ns;
      params.ns.forEach((ns, i) => {
        flatParams[`ns[${i}]`] = ns;
      });
    }

    return this.post<RCRegisterDomainResponse>('/domains/register', flatParams);
  }

  /**
   * Renew an existing domain.
   */
  async renewDomain(
    orderId: string,
    years: number,
    expiryDate: string,
  ): Promise<RCRenewResponse> {
    this.logger.log(`Renewing domain order ${orderId} for ${years} year(s)`);

    return this.post<RCRenewResponse>('/domains/renew', {
      'order-id': orderId,
      years,
      'exp-date': expiryDate,
      'invoice-option': 'NoInvoice',
    });
  }

  /**
   * Get full details of a domain order.
   */
  async getDomainDetails(orderId: string): Promise<RCDomainDetails> {
    return this.get<RCDomainDetails>('/domains/details-by-id', {
      'order-id': orderId,
      options: 'All',
    });
  }

  /**
   * Get domain details by domain name instead of order ID.
   */
  async getDomainDetailsByName(domainName: string): Promise<RCDomainDetails> {
    return this.get<RCDomainDetails>('/domains/details', {
      'domain-name': domainName,
      options: 'All',
    });
  }

  /**
   * Modify the nameservers of a domain.
   */
  async modifyNameservers(
    orderId: string,
    nameservers: string[],
  ): Promise<RCNameserverResponse> {
    this.logger.log(
      `Modifying nameservers for order ${orderId}: ${nameservers.join(', ')}`,
    );

    const params: Record<string, unknown> = {
      'order-id': orderId,
    };
    nameservers.forEach((ns, i) => {
      params[`ns[${i}]`] = ns;
    });

    return this.post<RCNameserverResponse>('/domains/modify-ns', params);
  }

  /**
   * Get the order ID for a given domain name.
   */
  async getOrderId(domainName: string): Promise<string> {
    const response = await this.get<string>('/domains/orderid', {
      'domain-name': domainName,
    });
    return String(response);
  }

  /**
   * Search domain orders with filters.
   */
  async searchDomainOrders(
    params: Record<string, unknown>,
  ): Promise<RCSearchOrdersResponse> {
    return this.get<RCSearchOrdersResponse>('/domains/search', {
      'no-of-records': 25,
      'page-no': 1,
      ...params,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTACTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new contact for domain registration.
   */
  async addContact(contact: RCContactParams): Promise<RCContactResponse> {
    this.logger.log(`Creating contact for customer ${contact['customer-id']}`);
    return this.post<RCContactResponse>('/contacts/add', contact as unknown as Record<string, unknown>);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THEFT / LOCK PROTECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Enable registrar lock (theft protection).
   */
  async enableTheftProtection(orderId: string): Promise<RCLockResponse> {
    this.logger.log(`Enabling theft protection for order ${orderId}`);
    return this.post<RCLockResponse>('/domains/enable-theft-protection', {
      'order-id': orderId,
    });
  }

  /**
   * Disable registrar lock (theft protection).
   */
  async disableTheftProtection(orderId: string): Promise<RCLockResponse> {
    this.logger.log(`Disabling theft protection for order ${orderId}`);
    return this.post<RCLockResponse>('/domains/disable-theft-protection', {
      'order-id': orderId,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVACY PROTECTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Enable or disable WHOIS privacy protection.
   */
  async modifyPrivacyProtection(
    orderId: string,
    enable: boolean,
  ): Promise<RCPrivacyResponse> {
    this.logger.log(
      `${enable ? 'Enabling' : 'Disabling'} privacy protection for order ${orderId}`,
    );

    const endpoint = enable
      ? '/domains/purchase-privacy'
      : '/domains/modify-privacy-protection';

    const params: Record<string, unknown> = {
      'order-id': orderId,
    };

    if (enable) {
      params['invoice-option'] = 'NoInvoice';
    } else {
      params['protect-privacy'] = false;
      params['reason'] = 'Customer requested privacy removal';
    }

    return this.post<RCPrivacyResponse>(endpoint, params);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOMER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new customer under the reseller account.
   */
  async createCustomer(
    params: RCCreateCustomerParams,
  ): Promise<string> {
    this.logger.log(`Creating customer: ${params.username}`);
    const response = await this.post<string | number>('/customers/v2/signup', params as unknown as Record<string, unknown>);
    return String(response);
  }

  /**
   * Get details of a customer by ID.
   */
  async getCustomerDetails(customerId: string): Promise<RCCustomerDetails> {
    return this.get<RCCustomerDetails>('/customers/details-by-id', {
      'customer-id': customerId,
    });
  }

  /**
   * Get customer ID by email/username.
   */
  async getCustomerByEmail(email: string): Promise<string> {
    const response = await this.get<string | number>('/customers/details', {
      'username': email,
    });
    return String(response);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DNS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Activate DNS service for a domain order.
   */
  async activateDns(orderId: string): Promise<unknown> {
    this.logger.log(`Activating DNS for order ${orderId}`);
    return this.post('/dns/activate', { 'order-id': orderId });
  }

  /**
   * Add a DNS record to a domain.
   */
  async addDnsRecord(
    orderId: string,
    type: string,
    host: string,
    value: string,
    ttl = 14400,
  ): Promise<unknown> {
    this.logger.log(
      `Adding DNS ${type} record: ${host} -> ${value} for order ${orderId}`,
    );

    const endpoint = this.getDnsEndpointForType(type, 'add');

    const params: Record<string, unknown> = {
      'domain-name': '', // Will be resolved from orderId by caller
      host,
      value,
      ttl,
    };

    // For search we need domain-name, but add-record also takes it
    // The domain name must be provided by the caller — we use order-based lookup in domain.service
    return this.post(endpoint, params);
  }

  /**
   * Add a DNS record by domain name directly (preferred for RC DNS API).
   */
  async addDnsRecordByDomain(
    domainName: string,
    type: string,
    host: string,
    value: string,
    ttl = 14400,
    priority?: number,
  ): Promise<unknown> {
    this.logger.log(
      `Adding DNS ${type} record: ${host} -> ${value} for ${domainName}`,
    );

    const endpoint = this.getDnsEndpointForType(type, 'add');

    const params: Record<string, unknown> = {
      'domain-name': domainName,
      host,
      value,
      ttl,
    };

    if (priority !== undefined && (type === 'MX' || type === 'SRV')) {
      params.priority = priority;
    }

    return this.post(endpoint, params);
  }

  /**
   * Update an existing DNS record.
   */
  async updateDnsRecord(
    domainName: string,
    type: string,
    host: string,
    oldValue: string,
    newValue: string,
    ttl?: number,
    priority?: number,
  ): Promise<unknown> {
    this.logger.log(
      `Updating DNS ${type} record: ${host} from ${oldValue} to ${newValue} for ${domainName}`,
    );

    const endpoint = this.getDnsEndpointForType(type, 'update');

    const params: Record<string, unknown> = {
      'domain-name': domainName,
      host,
      'current-value': oldValue,
      'new-value': newValue,
    };

    if (ttl !== undefined) {
      params.ttl = ttl;
    }

    if (priority !== undefined && (type === 'MX' || type === 'SRV')) {
      params.priority = priority;
    }

    return this.post(endpoint, params);
  }

  /**
   * Delete a DNS record.
   */
  async deleteDnsRecord(
    domainName: string,
    type: string,
    host: string,
    value: string,
  ): Promise<unknown> {
    this.logger.log(
      `Deleting DNS ${type} record: ${host} -> ${value} for ${domainName}`,
    );

    const endpoint = this.getDnsEndpointForType(type, 'delete');

    return this.post(endpoint, {
      'domain-name': domainName,
      host,
      value,
    });
  }

  /**
   * Search / list all DNS records for a domain.
   */
  async searchDnsRecords(
    domainName: string,
    type?: string,
  ): Promise<RCDnsRecord[]> {
    this.logger.debug(`Searching DNS records for ${domainName}`);

    const params: Record<string, unknown> = {
      'domain-name': domainName,
      'no-of-records': 50,
      'page-no': 1,
    };

    if (type) {
      params.type = type;
    }

    const response = await this.get<RCDnsSearchResponse>(
      '/dns/manage/search',
      params,
    );

    return this.parseDnsRecords(response);
  }

  /**
   * Map record type to the appropriate RC DNS endpoint.
   */
  private getDnsEndpointForType(
    type: string,
    action: 'add' | 'update' | 'delete',
  ): string {
    const typeMap: Record<string, string> = {
      A: 'ipv4',
      AAAA: 'ipv6',
      CNAME: 'cname',
      MX: 'mx',
      TXT: 'txt',
      SRV: 'srv',
      NS: 'ns',
      SOA: 'soa',
    };

    const rcType = typeMap[type.toUpperCase()] || type.toLowerCase();
    return `/dns/manage/${action}-${rcType}-record`;
  }

  /**
   * Parse the RC DNS search response into a clean array of records.
   */
  private parseDnsRecords(response: RCDnsSearchResponse): RCDnsRecord[] {
    const records: RCDnsRecord[] = [];
    const totalRecords = parseInt(response.recsindb || '0', 10);

    if (totalRecords === 0) return records;

    for (const [key, value] of Object.entries(response)) {
      if (key === 'recsonpage' || key === 'recsindb') continue;
      if (typeof value === 'object' && value !== null && 'host' in value) {
        records.push(value as RCDnsRecord);
      }
    }

    return records;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRICING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get reseller-level pricing for a product.
   */
  async getResellerPricing(productKey = 'domorder'): Promise<RCPricingResponse> {
    return this.get<RCPricingResponse>('/products/reseller-cost-price', {
      'product-key': productKey,
    });
  }

  /**
   * Get customer-level pricing for a product.
   */
  async getCustomerPricing(
    productKey = 'domorder',
    customerId?: string,
  ): Promise<RCPricingResponse> {
    const params: Record<string, unknown> = {
      'product-key': productKey,
    };
    if (customerId) {
      params['customer-id'] = customerId;
    }
    return this.get<RCPricingResponse>('/products/customer-price', params);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SSL CERTIFICATES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Order a new SSL certificate.
   */
  async orderSslCertificate(params: {
    domainName: string;
    months: number;
    planId: string;
    customerId: string;
  }): Promise<any> {
    this.logger.log(
      `Ordering SSL certificate for ${params.domainName} (plan: ${params.planId})`,
    );

    return this.post('/sslcert/add', {
      'domain-name': params.domainName,
      months: params.months,
      'plan-id': params.planId,
      'customer-id': params.customerId,
      'invoice-option': 'NoInvoice',
    });
  }

  /**
   * Get details of an SSL certificate order.
   */
  async getSslCertificateDetails(orderId: string): Promise<any> {
    return this.get('/sslcert/details', {
      'order-id': orderId,
    });
  }

  /**
   * Enroll (activate) an SSL certificate by submitting a CSR and approver email.
   */
  async enrollSslCertificate(params: {
    orderId: string;
    csr: string;
    approverEmail: string;
  }): Promise<any> {
    this.logger.log(`Enrolling SSL certificate for order ${params.orderId}`);

    return this.post('/sslcert/enroll', {
      'order-id': params.orderId,
      csr: params.csr,
      'approver-email': params.approverEmail,
    });
  }

  /**
   * Get the list of valid approver emails for domain validation.
   */
  async getSslApproverEmails(
    domainName: string,
    productKey: string,
  ): Promise<any> {
    return this.get('/sslcert/approverlist', {
      'domain-name': domainName,
      'product-key': productKey,
    });
  }

  /**
   * Renew an SSL certificate order.
   */
  async renewSslCertificate(orderId: string, months: number): Promise<any> {
    this.logger.log(`Renewing SSL certificate order ${orderId} for ${months} month(s)`);

    return this.post('/sslcert/renew', {
      'order-id': orderId,
      months,
      'invoice-option': 'NoInvoice',
    });
  }

  /**
   * Reissue an SSL certificate with a new CSR.
   */
  async reissueSslCertificate(params: {
    orderId: string;
    csr: string;
    approverEmail: string;
  }): Promise<any> {
    this.logger.log(`Reissuing SSL certificate for order ${params.orderId}`);

    return this.post('/sslcert/reissue', {
      'order-id': params.orderId,
      csr: params.csr,
      'approver-email': params.approverEmail,
    });
  }

  /**
   * Delete an SSL certificate order.
   */
  async deleteSslCertificate(orderId: string): Promise<any> {
    this.logger.log(`Deleting SSL certificate order ${orderId}`);
    return this.post('/sslcert/delete', {
      'order-id': orderId,
    });
  }

  /**
   * Search SSL certificate orders with pagination and optional filters.
   */
  async searchSslCertificates(params: {
    noOfRecords: number;
    pageNo: number;
    customerId?: string;
    status?: string;
  }): Promise<any> {
    const queryParams: Record<string, unknown> = {
      'no-of-records': params.noOfRecords,
      'page-no': params.pageNo,
    };
    if (params.customerId) {
      queryParams['customer-id'] = params.customerId;
    }
    if (params.status) {
      queryParams.status = params.status;
    }
    return this.get('/sslcert/search', queryParams);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN TRANSFERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initiate a domain transfer to this reseller account.
   */
  async transferDomain(params: {
    domainName: string;
    authCode: string;
    customerId: string;
    contactId: string;
    ns: string[];
    invoiceOption?: string;
  }): Promise<any> {
    this.logger.log(`Initiating transfer for domain ${params.domainName}`);

    const flatParams: Record<string, unknown> = {
      'domain-name': params.domainName,
      'auth-code': params.authCode,
      'customer-id': params.customerId,
      'reg-contact-id': params.contactId,
      'admin-contact-id': params.contactId,
      'tech-contact-id': params.contactId,
      'billing-contact-id': params.contactId,
      'invoice-option': params.invoiceOption || 'NoInvoice',
    };

    // Nameservers need to be sent as ns[0], ns[1], etc.
    params.ns.forEach((ns, i) => {
      flatParams[`ns[${i}]`] = ns;
    });

    return this.post('/domains/transfer', flatParams);
  }

  /**
   * Cancel an ongoing domain transfer.
   */
  async cancelTransfer(orderId: string): Promise<any> {
    this.logger.log(`Cancelling domain transfer for order ${orderId}`);
    return this.post('/domains/cancel-transfer', {
      'order-id': orderId,
    });
  }

  /**
   * Delete a domain order.
   */
  async deleteDomain(orderId: string): Promise<any> {
    this.logger.log(`Deleting domain order ${orderId}`);
    return this.post('/domains/delete', {
      'order-id': orderId,
    });
  }

  /**
   * Get the auth/EPP code for a domain (used for outbound transfers).
   */
  async getAuthCode(orderId: string): Promise<any> {
    this.logger.log(`Retrieving auth code for order ${orderId}`);
    return this.get(
      '/domains/coms-au-cn-co-de-es-eu-in-me-mn-mobi-net-nz-org-uk-us/get-auth-code',
      { 'order-id': orderId },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GOOGLE WORKSPACE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Order Google Workspace for a domain.
   */
  async orderGoogleWorkspace(params: {
    domainName: string;
    customerId: string;
    numberOfAccounts: number;
    planType: string;
    months: number;
  }): Promise<any> {
    this.logger.log(
      `Ordering Google Workspace for ${params.domainName} (plan: ${params.planType}, accounts: ${params.numberOfAccounts})`,
    );

    return this.post('/gapps/add', {
      'domain-name': params.domainName,
      'customer-id': params.customerId,
      'no-of-accounts': params.numberOfAccounts,
      'plan-type': params.planType,
      months: params.months,
      'invoice-option': 'NoInvoice',
    });
  }

  /**
   * Delete a Google Workspace order.
   */
  async deleteGoogleWorkspace(orderId: string): Promise<any> {
    this.logger.log(`Deleting Google Workspace order ${orderId}`);
    return this.post('/gapps/delete', {
      'order-id': orderId,
    });
  }

  /**
   * Renew a Google Workspace subscription.
   */
  async renewGoogleWorkspace(
    orderId: string,
    months: number,
    numberOfAccounts: number,
  ): Promise<any> {
    this.logger.log(
      `Renewing Google Workspace order ${orderId} for ${months} month(s)`,
    );

    return this.post('/gapps/renew', {
      'order-id': orderId,
      months,
      'no-of-accounts': numberOfAccounts,
      'invoice-option': 'NoInvoice',
    });
  }

  /**
   * Get details of a Google Workspace order.
   */
  async getGoogleWorkspaceDetails(orderId: string): Promise<any> {
    return this.get('/gapps/details', {
      'order-id': orderId,
    });
  }

  /**
   * Add a user seat to a Google Workspace order.
   */
  async addGoogleWorkspaceUser(orderId: string): Promise<any> {
    this.logger.log(`Adding user to Google Workspace order ${orderId}`);
    return this.post('/gapps/add-user', {
      'order-id': orderId,
    });
  }

  /**
   * Remove a user seat from a Google Workspace order.
   */
  async deleteGoogleWorkspaceUser(orderId: string): Promise<any> {
    this.logger.log(`Removing user from Google Workspace order ${orderId}`);
    return this.post('/gapps/delete-user', {
      'order-id': orderId,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TITAN EMAIL RENEWAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Renew a Titan Email order.
   */
  async renewTitanEmail(
    orderId: string,
    months: number,
    numberOfAccounts: number,
  ): Promise<any> {
    this.logger.log(
      `Renewing Titan Email order ${orderId} for ${months} month(s)`,
    );

    return this.post('/email/us/renew', {
      'order-id': orderId,
      months,
      'no-of-accounts': numberOfAccounts,
      'invoice-option': 'NoInvoice',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUB-RESELLER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new sub-reseller account.
   */
  async createSubReseller(params: {
    username: string;
    password: string;
    name: string;
    company: string;
    addressLine1: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    phone: string;
    email: string;
  }): Promise<any> {
    this.logger.log(`Creating sub-reseller: ${params.username}`);

    return this.post('/resellers/signup', {
      username: params.username,
      passwd: params.password,
      name: params.name,
      company: params.company,
      'address-line-1': params.addressLine1,
      city: params.city,
      state: params.state,
      country: params.country,
      'zipcode': params.zipCode,
      'phone-cc': params.phone.split('.')[0] || '',
      phone: params.phone.split('.')[1] || params.phone,
      'lang-pref': 'en',
    });
  }

  /**
   * Get details of a sub-reseller.
   */
  async getSubResellerDetails(resellerId: string): Promise<any> {
    return this.get('/resellers/details', {
      'reseller-id': resellerId,
    });
  }

  /**
   * Suspend a sub-reseller account.
   */
  async suspendSubReseller(
    resellerId: string,
    reason: string,
  ): Promise<any> {
    this.logger.log(`Suspending sub-reseller ${resellerId}: ${reason}`);
    return this.post('/resellers/suspend', {
      'reseller-id': resellerId,
      reason,
    });
  }

  /**
   * Unsuspend a sub-reseller account.
   */
  async unsuspendSubReseller(resellerId: string): Promise<any> {
    this.logger.log(`Unsuspending sub-reseller ${resellerId}`);
    return this.post('/resellers/unsuspend', {
      'reseller-id': resellerId,
    });
  }

  /**
   * Add funds to a sub-reseller account.
   */
  async addResellerFund(
    resellerId: string,
    amount: number,
    transactionType: string,
  ): Promise<any> {
    this.logger.log(
      `Adding ${amount} funds to reseller ${resellerId} (type: ${transactionType})`,
    );

    return this.post('/billing/reseller-add-fund', {
      'reseller-id': resellerId,
      amount,
      'transaction-type': transactionType,
    });
  }

  /**
   * Get the balance of a sub-reseller account.
   */
  async getResellerBalance(resellerId: string): Promise<any> {
    return this.get('/billing/reseller-balance', {
      'reseller-id': resellerId,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOSTING MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Order a new Linux hosting plan (multi-domain or single-domain).
   */
  async orderHosting(params: {
    domainName: string;
    customerId: string;
    planId: string | number;
    months: number;
    productKey?: string;
  }): Promise<any> {
    const productKey = params.productKey || 'multidomainhosting';
    this.logger.log(
      `Ordering hosting for ${params.domainName} (product: ${productKey}, plan: ${params.planId})`,
    );

    return this.post(`/${productKey}/add`, {
      'domain-name': params.domainName,
      'customer-id': params.customerId,
      'plan-id': String(params.planId),
      'months': String(params.months),
      'invoice-option': 'NoInvoice',
    });
  }

  /**
   * Get hosting order details.
   */
  async getHostingDetails(orderId: string, productKey?: string): Promise<any> {
    const key = productKey || 'multidomainhosting';
    return this.get(`/${key}/details`, { 'order-id': orderId });
  }

  /**
   * Renew a hosting order.
   */
  async renewHosting(params: {
    orderId: string;
    months: number;
    productKey?: string;
  }): Promise<any> {
    const key = params.productKey || 'multidomainhosting';
    this.logger.log(
      `Renewing hosting order ${params.orderId} for ${params.months} month(s)`,
    );

    return this.post(`/${key}/renew`, {
      'order-id': params.orderId,
      'months': String(params.months),
      'invoice-option': 'NoInvoice',
    });
  }

  /**
   * Delete/cancel a hosting order.
   */
  async deleteHosting(orderId: string, productKey?: string): Promise<any> {
    const key = productKey || 'multidomainhosting';
    this.logger.log(`Deleting hosting order ${orderId}`);
    return this.post(`/${key}/delete`, { 'order-id': orderId });
  }

  /**
   * Upgrade/downgrade a hosting plan.
   */
  async upgradeHosting(params: {
    orderId: string;
    newPlanId: string | number;
    productKey?: string;
  }): Promise<any> {
    const key = params.productKey || 'multidomainhosting';
    this.logger.log(
      `Upgrading hosting order ${params.orderId} to plan ${params.newPlanId}`,
    );

    return this.post(`/${key}/modify`, {
      'order-id': params.orderId,
      'new-plan-id': String(params.newPlanId),
    });
  }

  /**
   * Search hosting orders.
   */
  async searchHostingOrders(params: {
    noOfRecords: number;
    pageNo: number;
    customerId?: string;
    domainName?: string;
    status?: string;
    productKey?: string;
  }): Promise<any> {
    const key = params.productKey || 'multidomainhosting';
    const queryParams: Record<string, string> = {
      'no-of-records': String(params.noOfRecords),
      'page-no': String(params.pageNo),
    };
    if (params.customerId) queryParams['customer-id'] = params.customerId;
    if (params.domainName) queryParams['domain-name'] = params.domainName;
    if (params.status) queryParams['status'] = params.status;
    return this.get(`/${key}/search`, queryParams);
  }

  // ─── WordPress Hosting ──────────────────────────────────────────────────

  /**
   * Order WordPress hosting.
   */
  async orderWordPressHosting(params: {
    domainName: string;
    customerId: string;
    planId: string | number;
    months: number;
  }): Promise<any> {
    return this.orderHosting({
      ...params,
      productKey: 'wordpresshostingusa',
    });
  }

  /**
   * Get WordPress hosting details.
   */
  async getWordPressHostingDetails(orderId: string): Promise<any> {
    return this.getHostingDetails(orderId, 'wordpresshostingusa');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VPS / CLOUD SERVER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Order a VPS (Virtual Server Linux US).
   */
  async orderVps(params: {
    domainName: string;
    customerId: string;
    planId: string | number;
    months: number;
    addons?: Record<string, string>;
  }): Promise<any> {
    this.logger.log(
      `Ordering VPS for ${params.domainName} (plan: ${params.planId})`,
    );

    const body: Record<string, string> = {
      'domain-name': params.domainName,
      'customer-id': params.customerId,
      'plan-id': String(params.planId),
      'months': String(params.months),
      'invoice-option': 'NoInvoice',
    };
    if (params.addons) {
      Object.entries(params.addons).forEach(([k, v]) => { body[k] = v; });
    }
    return this.post('/virtualserverlinuxus/add', body);
  }

  /**
   * Get VPS order details.
   */
  async getVpsDetails(orderId: string): Promise<any> {
    return this.get('/virtualserverlinuxus/details', { 'order-id': orderId });
  }

  /**
   * Renew VPS.
   */
  async renewVps(orderId: string, months: number): Promise<any> {
    this.logger.log(`Renewing VPS order ${orderId} for ${months} month(s)`);
    return this.post('/virtualserverlinuxus/renew', {
      'order-id': orderId,
      'months': String(months),
      'invoice-option': 'NoInvoice',
    });
  }

  /**
   * Delete VPS.
   */
  async deleteVps(orderId: string): Promise<any> {
    this.logger.log(`Deleting VPS order ${orderId}`);
    return this.post('/virtualserverlinuxus/delete', { 'order-id': orderId });
  }

  /**
   * Reboot VPS.
   */
  async rebootVps(orderId: string): Promise<any> {
    this.logger.log(`Rebooting VPS order ${orderId}`);
    return this.post('/virtualserverlinuxus/reboot', { 'order-id': orderId });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEDICATED SERVER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Order dedicated server.
   */
  async orderDedicatedServer(params: {
    domainName: string;
    customerId: string;
    planId: string | number;
    months: number;
  }): Promise<any> {
    this.logger.log(
      `Ordering dedicated server for ${params.domainName} (plan: ${params.planId})`,
    );

    return this.post('/dedicatedserverlinuxus/add', {
      'domain-name': params.domainName,
      'customer-id': params.customerId,
      'plan-id': String(params.planId),
      'months': String(params.months),
      'invoice-option': 'NoInvoice',
    });
  }

  /**
   * Get dedicated server details.
   */
  async getDedicatedServerDetails(orderId: string): Promise<any> {
    return this.get('/dedicatedserverlinuxus/details', { 'order-id': orderId });
  }

  /**
   * Renew dedicated server.
   */
  async renewDedicatedServer(orderId: string, months: number): Promise<any> {
    this.logger.log(
      `Renewing dedicated server order ${orderId} for ${months} month(s)`,
    );
    return this.post('/dedicatedserverlinuxus/renew', {
      'order-id': orderId,
      'months': String(months),
      'invoice-option': 'NoInvoice',
    });
  }

  /**
   * Delete dedicated server.
   */
  async deleteDedicatedServer(orderId: string): Promise<any> {
    this.logger.log(`Deleting dedicated server order ${orderId}`);
    return this.post('/dedicatedserverlinuxus/delete', { 'order-id': orderId });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOUD SITES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Order cloud site.
   */
  async orderCloudSite(params: {
    domainName: string;
    customerId: string;
    planId: string | number;
    months: number;
  }): Promise<any> {
    this.logger.log(
      `Ordering cloud site for ${params.domainName} (plan: ${params.planId})`,
    );

    return this.post('/cloudsiteslinuxus/add', {
      'domain-name': params.domainName,
      'customer-id': params.customerId,
      'plan-id': String(params.planId),
      'months': String(params.months),
      'invoice-option': 'NoInvoice',
    });
  }

  /**
   * Get cloud site details.
   */
  async getCloudSiteDetails(orderId: string): Promise<any> {
    return this.get('/cloudsiteslinuxus/details', { 'order-id': orderId });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESELLER HOSTING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Order reseller hosting.
   */
  async orderResellerHosting(params: {
    domainName: string;
    customerId: string;
    planId: string | number;
    months: number;
  }): Promise<any> {
    this.logger.log(
      `Ordering reseller hosting for ${params.domainName} (plan: ${params.planId})`,
    );

    return this.post('/resellerhosting/add', {
      'domain-name': params.domainName,
      'customer-id': params.customerId,
      'plan-id': String(params.planId),
      'months': String(params.months),
      'invoice-option': 'NoInvoice',
    });
  }

  /**
   * Get reseller hosting details.
   */
  async getResellerHostingDetails(orderId: string): Promise<any> {
    return this.get('/resellerhosting/details', { 'order-id': orderId });
  }

  /**
   * Renew reseller hosting.
   */
  async renewResellerHosting(orderId: string, months: number): Promise<any> {
    this.logger.log(
      `Renewing reseller hosting order ${orderId} for ${months} month(s)`,
    );
    return this.post('/resellerhosting/renew', {
      'order-id': orderId,
      'months': String(months),
      'invoice-option': 'NoInvoice',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOSTING PRODUCT PRICING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get reseller cost price for a hosting product.
   */
  async getHostingPricing(productKey: string): Promise<any> {
    return this.get('/products/reseller-cost-price', {
      'product-key': productKey,
    });
  }

  /**
   * Get all available hosting plan IDs for a product.
   */
  async getHostingPlanDetails(productKey: string): Promise<any> {
    return this.get('/products/plan-details', {
      'product-key': productKey,
    });
  }
}
