import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';

@Injectable()
export class ContaboService {
  private readonly logger = new Logger(ContaboService.name);
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly apiUser: string;
  private readonly apiPassword: string;
  private readonly authUrl =
    'https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token';
  private readonly apiBase = 'https://api.contabo.com/v1';

  private readonly http: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.clientId = configService.get<string>('CONTABO_CLIENT_ID', '');
    this.clientSecret = configService.get<string>('CONTABO_CLIENT_SECRET', '');
    this.apiUser = configService.get<string>('CONTABO_API_USER', '');
    this.apiPassword = configService.get<string>('CONTABO_API_PASSWORD', '');

    this.http = axios.create({
      baseURL: this.apiBase,
      timeout: 30000,
    });
  }

  // ── Auth ────────────────────────────────────────────────────────────────────

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 30_000) {
      return this.accessToken;
    }

    this.logger.log('Fetching new Contabo OAuth2 token');

    const params = new URLSearchParams();
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);
    params.append('username', this.apiUser);
    params.append('password', this.apiPassword);
    params.append('grant_type', 'password');

    const { data } = await axios.post(this.authUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;
    this.logger.log('Contabo OAuth2 token acquired');
    return this.accessToken!;
  }

  private generateRequestId(): string {
    return randomUUID();
  }

  // ── HTTP helpers ────────────────────────────────────────────────────────────

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return {
      Authorization: `Bearer ${token}`,
      'x-request-id': this.generateRequestId(),
      'Content-Type': 'application/json',
    };
  }

  private async apiGet<T = any>(
    path: string,
    params?: Record<string, string | number | boolean>,
  ): Promise<T> {
    const headers = await this.getHeaders();
    const { data } = await this.http.get<T>(path, { headers, params });
    return data;
  }

  private async apiPost<T = any>(
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const headers = await this.getHeaders();
    const { data } = await this.http.post<T>(path, body ?? {}, { headers });
    return data;
  }

  private async apiPut<T = any>(
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const headers = await this.getHeaders();
    const { data } = await this.http.put<T>(path, body ?? {}, { headers });
    return data;
  }

  private async apiPatch<T = any>(
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const headers = await this.getHeaders();
    const { data } = await this.http.patch<T>(path, body ?? {}, { headers });
    return data;
  }

  private async apiDelete<T = any>(path: string): Promise<T> {
    const headers = await this.getHeaders();
    const { data } = await this.http.delete<T>(path, { headers });
    return data;
  }

  // ── Instance Management ─────────────────────────────────────────────────────

  async listInstances(): Promise<any> {
    return this.apiGet('/compute/instances');
  }

  async getInstance(instanceId: number): Promise<any> {
    return this.apiGet(`/compute/instances/${instanceId}`);
  }

  async createInstance(params: {
    imageId: string;
    productId: string;
    region: string;
    period?: number;
    displayName?: string;
    defaultUser?: string;
    rootPassword?: number;
    sshKeys?: number[];
    addOns?: Record<string, unknown>;
    userData?: string;
  }): Promise<any> {
    const body: Record<string, unknown> = {
      imageId: params.imageId,
      productId: params.productId,
      region: params.region,
      period: params.period ?? 1,
    };
    if (params.displayName) body.displayName = params.displayName;
    if (params.defaultUser) body.defaultUser = params.defaultUser;
    if (params.rootPassword) body.rootPassword = params.rootPassword;
    if (params.sshKeys && params.sshKeys.length > 0)
      body.sshKeys = params.sshKeys;
    if (params.addOns) body.addOns = params.addOns;
    if (params.userData) body.userData = Buffer.from(params.userData).toString('base64');

    this.logger.log(
      `Creating Contabo instance: productId=${params.productId}, region=${params.region}`,
    );
    return this.apiPost('/compute/instances', body);
  }

  async startInstance(instanceId: number): Promise<any> {
    this.logger.log(`Starting Contabo instance ${instanceId}`);
    return this.apiPost(`/compute/instances/${instanceId}/actions/start`);
  }

  async stopInstance(instanceId: number): Promise<any> {
    this.logger.log(`Stopping Contabo instance ${instanceId}`);
    return this.apiPost(`/compute/instances/${instanceId}/actions/stop`);
  }

  async restartInstance(instanceId: number): Promise<any> {
    this.logger.log(`Restarting Contabo instance ${instanceId}`);
    return this.apiPost(`/compute/instances/${instanceId}/actions/restart`);
  }

  async rescueInstance(
    instanceId: number,
    rootPassword?: number,
    sshKeys?: number[],
  ): Promise<any> {
    const body: Record<string, unknown> = {};
    if (rootPassword) body.rootPassword = rootPassword;
    if (sshKeys && sshKeys.length > 0) body.sshKeys = sshKeys;

    this.logger.log(`Entering rescue mode for Contabo instance ${instanceId}`);
    return this.apiPost(
      `/compute/instances/${instanceId}/actions/rescue`,
      body,
    );
  }

  async reinstallInstance(
    instanceId: number,
    imageId: string,
    defaultUser?: string,
    rootPassword?: number,
    sshKeys?: number[],
  ): Promise<any> {
    const body: Record<string, unknown> = { imageId };
    if (defaultUser) body.defaultUser = defaultUser;
    if (rootPassword) body.rootPassword = rootPassword;
    if (sshKeys && sshKeys.length > 0) body.sshKeys = sshKeys;

    this.logger.log(
      `Reinstalling Contabo instance ${instanceId} with image ${imageId}`,
    );
    return this.apiPut(`/compute/instances/${instanceId}`, body);
  }

  async upgradeInstance(
    instanceId: number,
    productId?: string,
  ): Promise<any> {
    const body: Record<string, unknown> = {};
    if (productId) body.productId = productId;

    this.logger.log(`Upgrading Contabo instance ${instanceId}`);
    return this.apiPatch(`/compute/instances/${instanceId}`, body);
  }

  async cancelInstance(instanceId: number): Promise<any> {
    this.logger.log(`Cancelling Contabo instance ${instanceId}`);
    return this.apiPost(`/compute/instances/${instanceId}/cancel`);
  }

  // ── Snapshots ───────────────────────────────────────────────────────────────

  async createSnapshot(
    instanceId: number,
    name: string,
    description?: string,
  ): Promise<any> {
    const body: Record<string, unknown> = { name };
    if (description) body.description = description;

    this.logger.log(
      `Creating snapshot '${name}' for Contabo instance ${instanceId}`,
    );
    return this.apiPost(
      `/compute/instances/${instanceId}/snapshots`,
      body,
    );
  }

  async listSnapshots(instanceId: number): Promise<any> {
    return this.apiGet(`/compute/instances/${instanceId}/snapshots`);
  }

  async deleteSnapshot(
    instanceId: number,
    snapshotId: string,
  ): Promise<any> {
    this.logger.log(
      `Deleting snapshot ${snapshotId} for Contabo instance ${instanceId}`,
    );
    return this.apiDelete(
      `/compute/instances/${instanceId}/snapshots/${snapshotId}`,
    );
  }

  async rollbackSnapshot(
    instanceId: number,
    snapshotId: string,
  ): Promise<any> {
    this.logger.log(
      `Rolling back snapshot ${snapshotId} for Contabo instance ${instanceId}`,
    );
    return this.apiPost(
      `/compute/instances/${instanceId}/snapshots/${snapshotId}/rollback`,
    );
  }

  // ── Instance Polling ────────────────────────────────────────────────────────

  /** Find image by name (partial match) */
  async getImageByName(name: string): Promise<any> {
    const images = await this.listImages(true);
    const data = images?.data || images || [];
    return data.find(
      (img: any) =>
        img.name?.toLowerCase().includes(name.toLowerCase()),
    );
  }

  /** Poll until instance is running and has an IP address */
  async waitForInstanceReady(
    instanceId: number,
    maxWaitMs = 300000,
  ): Promise<any> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      const instance = await this.getInstance(instanceId);
      const data =
        instance?.data?.[0] || instance?.data || instance;
      if (data.status === 'running' && data.ipConfig?.v4?.ip) {
        return data;
      }
      this.logger.log(
        `Waiting for instance ${instanceId}... status: ${data.status}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 15000));
    }
    throw new Error(
      `Instance ${instanceId} not ready after ${maxWaitMs / 1000}s`,
    );
  }

  // ── Images ──────────────────────────────────────────────────────────────────

  async listImages(standardImage?: boolean): Promise<any> {
    const params: Record<string, string> = { size: '100' };
    if (standardImage !== undefined) {
      params.standardImage = String(standardImage);
    }
    return this.apiGet('/compute/images', params);
  }

  async getImage(imageId: string): Promise<any> {
    return this.apiGet(`/compute/images/${imageId}`);
  }

  // ── SSH Keys / Secrets ──────────────────────────────────────────────────────

  async createSecret(
    name: string,
    value: string,
    type: string = 'ssh',
  ): Promise<any> {
    this.logger.log(`Creating Contabo secret '${name}' (type: ${type})`);
    return this.apiPost('/secrets', { name, value, type });
  }

  async listSecrets(): Promise<any> {
    return this.apiGet('/secrets');
  }

  async deleteSecret(secretId: number): Promise<any> {
    this.logger.log(`Deleting Contabo secret ${secretId}`);
    return this.apiDelete(`/secrets/${secretId}`);
  }

  // ── Tags ────────────────────────────────────────────────────────────────────

  async createTag(name: string, color?: string): Promise<any> {
    const body: Record<string, unknown> = { name };
    if (color) body.color = color;
    return this.apiPost('/tags', body);
  }

  async listTags(): Promise<any> {
    return this.apiGet('/tags');
  }

  // ── Private Networks ────────────────────────────────────────────────────────

  async listPrivateNetworks(): Promise<any> {
    return this.apiGet('/private-networks');
  }

  // ── Object Storage ──────────────────────────────────────────────────────────

  async listObjectStorages(): Promise<any> {
    return this.apiGet('/object-storages');
  }

  // ── Audit Log ───────────────────────────────────────────────────────────────

  async getInstanceAudits(
    instanceId?: number,
    size?: number,
  ): Promise<any> {
    const params: Record<string, string> = {};
    if (instanceId) params.instanceId = String(instanceId);
    if (size) params.size = String(size);
    return this.apiGet('/compute/instances/audits', params);
  }

  // ── Pricing (hardcoded — Contabo has no pricing API) ────────────────────────

  getVpsPricing(): Array<{
    productId: string;
    name: string;
    cpu: number;
    ram: number;
    diskGb: number;
    bandwidthMbps: number;
    priceEur: number;
  }> {
    return [
      {
        productId: 'V45',
        name: 'VPS 10',
        cpu: 4,
        ram: 8,
        diskGb: 75,
        bandwidthMbps: 200,
        priceEur: 3.6,
      },
      {
        productId: 'V46',
        name: 'VPS 20',
        cpu: 6,
        ram: 12,
        diskGb: 100,
        bandwidthMbps: 400,
        priceEur: 5.6,
      },
      {
        productId: 'V47',
        name: 'VPS 30',
        cpu: 8,
        ram: 24,
        diskGb: 200,
        bandwidthMbps: 600,
        priceEur: 11.2,
      },
      {
        productId: 'V48',
        name: 'VPS 40',
        cpu: 12,
        ram: 48,
        diskGb: 250,
        bandwidthMbps: 800,
        priceEur: 20.0,
      },
      {
        productId: 'V49',
        name: 'VPS 50',
        cpu: 16,
        ram: 64,
        diskGb: 300,
        bandwidthMbps: 1000,
        priceEur: 29.6,
      },
      {
        productId: 'V50',
        name: 'VPS 60',
        cpu: 18,
        ram: 96,
        diskGb: 350,
        bandwidthMbps: 1000,
        priceEur: 39.2,
      },
    ];
  }

  getVdsPricing(): Array<{
    productId: string;
    name: string;
    cores: number;
    ram: number;
    diskGb: number;
    priceEur: number;
  }> {
    return [
      {
        productId: 'V90',
        name: 'VDS S',
        cores: 3,
        ram: 24,
        diskGb: 180,
        priceEur: 27.52,
      },
      {
        productId: 'V91',
        name: 'VDS M',
        cores: 4,
        ram: 32,
        diskGb: 240,
        priceEur: 35.84,
      },
      {
        productId: 'V92',
        name: 'VDS L',
        cores: 6,
        ram: 48,
        diskGb: 360,
        priceEur: 51.2,
      },
      {
        productId: 'V93',
        name: 'VDS XL',
        cores: 8,
        ram: 64,
        diskGb: 480,
        priceEur: 65.92,
      },
      {
        productId: 'V94',
        name: 'VDS XXL',
        cores: 12,
        ram: 96,
        diskGb: 720,
        priceEur: 95.2,
      },
    ];
  }
}
