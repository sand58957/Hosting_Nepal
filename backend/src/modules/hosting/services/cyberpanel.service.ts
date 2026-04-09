import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';

@Injectable()
export class CyberPanelService {
  private readonly logger = new Logger(CyberPanelService.name);
  private readonly http: AxiosInstance;
  private readonly adminUser: string;
  private readonly adminPass: string;

  constructor(private readonly configService: ConfigService) {
    const baseURL =
      this.configService.get<string>('CYBERPANEL_URL') || 'http://localhost:8090';
    this.adminUser =
      this.configService.get<string>('CYBERPANEL_ADMIN_USER') || 'admin';
    this.adminPass =
      this.configService.get<string>('CYBERPANEL_ADMIN_PASS') || 'admin';

    this.http = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          this.configService.get<string>('CYBERPANEL_API_KEY') || '',
      },
      timeout: 30000,
    });
  }

  private buildBody(extra: Record<string, unknown>): Record<string, unknown> {
    return {
      adminUser: this.adminUser,
      adminPass: this.adminPass,
      websiteOwner: this.adminUser,
      ...extra,
    };
  }

  private handleError(method: string, error: unknown): never {
    if (error instanceof AxiosError) {
      this.logger.error(
        `CyberPanel [${method}] HTTP ${error.response?.status}: ${JSON.stringify(error.response?.data)}`,
        error.stack,
      );
      throw new Error(
        `CyberPanel ${method} failed: ${error.response?.data?.error_message || error.message}`,
      );
    }
    this.logger.error(`CyberPanel [${method}] unexpected error`, error as string);
    throw error;
  }

  async createAccount(
    domain: string,
    username: string,
    email: string,
    password: string,
    plan: string,
    reseller: string = 'admin',
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Creating CyberPanel account for domain: ${domain}`);
      const response = await this.http.post<Record<string, unknown>>(
        '/cloudAPI/createWebsite',
        this.buildBody({
          domainName: domain,
          ownerEmail: email,
          websiteOwner: username,
          packageName: plan,
          reseller,
          password,
        }),
      );
      this.logger.log(`Account created for domain: ${domain}`);
      return response.data;
    } catch (error) {
      this.handleError('createAccount', error);
    }
  }

  async suspendAccount(username: string): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Suspending CyberPanel account: ${username}`);
      const response = await this.http.post<Record<string, unknown>>(
        '/cloudAPI/suspendWebsite',
        this.buildBody({ websiteOwner: username }),
      );
      return response.data;
    } catch (error) {
      this.handleError('suspendAccount', error);
    }
  }

  async unsuspendAccount(username: string): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Unsuspending CyberPanel account: ${username}`);
      const response = await this.http.post<Record<string, unknown>>(
        '/cloudAPI/unsuspendWebsite',
        this.buildBody({ websiteOwner: username }),
      );
      return response.data;
    } catch (error) {
      this.handleError('unsuspendAccount', error);
    }
  }

  async deleteAccount(username: string): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Deleting CyberPanel account: ${username}`);
      const response = await this.http.post<Record<string, unknown>>(
        '/cloudAPI/deleteWebsite',
        this.buildBody({ websiteOwner: username }),
      );
      return response.data;
    } catch (error) {
      this.handleError('deleteAccount', error);
    }
  }

  async getAccountUsage(username: string): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Fetching usage for CyberPanel account: ${username}`);
      const response = await this.http.post<Record<string, unknown>>(
        '/cloudAPI/fetchWebsiteUsage',
        this.buildBody({ websiteOwner: username }),
      );
      return response.data;
    } catch (error) {
      this.handleError('getAccountUsage', error);
    }
  }

  async createWordPressSite(
    domain: string,
    username: string,
    adminEmail: string,
    adminUser: string,
    adminPass: string,
    siteTitle: string,
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Installing WordPress on domain: ${domain}`);
      const response = await this.http.post<Record<string, unknown>>(
        '/cloudAPI/installWordpress',
        this.buildBody({
          domainName: domain,
          websiteOwner: username,
          adminEmail,
          adminUser,
          adminPass,
          websiteTitle: siteTitle,
        }),
      );
      this.logger.log(`WordPress installed on: ${domain}`);
      return response.data;
    } catch (error) {
      this.handleError('createWordPressSite', error);
    }
  }

  async getWordPressSites(username: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.http.post<Record<string, unknown>>(
        '/cloudAPI/listWordpressSites',
        this.buildBody({ websiteOwner: username }),
      );
      return response.data;
    } catch (error) {
      this.handleError('getWordPressSites', error);
    }
  }

  async createDatabase(
    username: string,
    dbName: string,
    dbUser: string,
    dbPass: string,
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Creating database ${dbName} for account: ${username}`);
      const response = await this.http.post<Record<string, unknown>>(
        '/cloudAPI/createDatabase',
        this.buildBody({
          websiteOwner: username,
          dbName,
          dbUsername: dbUser,
          dbPassword: dbPass,
        }),
      );
      return response.data;
    } catch (error) {
      this.handleError('createDatabase', error);
    }
  }

  async createFtpAccount(
    username: string,
    ftpUser: string,
    ftpPass: string,
    path: string,
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Creating FTP account ${ftpUser} for: ${username}`);
      const response = await this.http.post<Record<string, unknown>>(
        '/cloudAPI/createFTPaccount',
        this.buildBody({
          websiteOwner: username,
          ftpUser,
          ftpPass,
          ftpPath: path,
        }),
      );
      return response.data;
    } catch (error) {
      this.handleError('createFtpAccount', error);
    }
  }

  async changePlan(
    username: string,
    newPlan: string,
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Changing plan for ${username} to: ${newPlan}`);
      const response = await this.http.post<Record<string, unknown>>(
        '/cloudAPI/changePackage',
        this.buildBody({
          websiteOwner: username,
          packageName: newPlan,
        }),
      );
      return response.data;
    } catch (error) {
      this.handleError('changePlan', error);
    }
  }

  async createBackup(username: string): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Creating backup for account: ${username}`);
      const response = await this.http.post<Record<string, unknown>>(
        '/cloudAPI/createBackup',
        this.buildBody({ websiteOwner: username }),
      );
      return response.data;
    } catch (error) {
      this.handleError('createBackup', error);
    }
  }

  async restoreBackup(
    username: string,
    backupFile: string,
  ): Promise<Record<string, unknown>> {
    try {
      this.logger.log(`Restoring backup for account: ${username}`);
      const response = await this.http.post<Record<string, unknown>>(
        '/cloudAPI/restoreBackup',
        this.buildBody({
          websiteOwner: username,
          backupFile,
        }),
      );
      return response.data;
    } catch (error) {
      this.handleError('restoreBackup', error);
    }
  }

  // ── Remote CyberPanel Methods (for Contabo VPS) ────────────────────────────

  /** Create CyberPanel API client config for a remote server */
  createRemoteClient(
    host: string,
    adminUser?: string,
    adminPass?: string,
  ): { baseUrl: string; adminUser: string; adminPass: string } {
    return {
      baseUrl: `https://${host}:8090`,
      adminUser:
        adminUser ||
        this.configService.get<string>('CYBERPANEL_ADMIN_USER', 'admin'),
      adminPass:
        adminPass ||
        this.configService.get<string>('CYBERPANEL_ADMIN_PASS', 'admin'),
    };
  }

  /** Poll until CyberPanel is ready on a remote host */
  async waitForCyberPanelReady(
    host: string,
    maxWaitMs = 600000,
  ): Promise<boolean> {
    const startTime = Date.now();
    const httpsAgent = new (require('https').Agent)({
      rejectUnauthorized: false,
    });

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const res = await axios.post(
          `https://${host}:8090/api/verifyConn`,
          JSON.stringify({
            adminUser: 'admin',
            adminPass: '1234567',
          }),
          {
            httpsAgent,
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' },
          },
        );
        if (res.status === 200) return true;
      } catch {
        // CyberPanel not ready yet
      }
      this.logger.log(`Waiting for CyberPanel on ${host}:8090...`);
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
    return false;
  }

  /** Create account on a REMOTE CyberPanel instance */
  async createAccountRemote(
    host: string,
    adminUser: string,
    adminPass: string,
    domain: string,
    username: string,
    email: string,
    password: string,
    plan: string,
  ): Promise<any> {
    const url = `https://${host}:8090/cloudAPI/createWebsite`;
    const body = {
      adminUser,
      adminPass,
      domainName: domain,
      ownerEmail: email,
      packageName: plan || 'Default',
      websiteOwner: username,
      ownerPassword: password,
    };
    const httpsAgent = new (require('https').Agent)({
      rejectUnauthorized: false,
    });

    this.logger.log(
      `Creating remote CyberPanel account: ${domain} on ${host}`,
    );
    const res = await axios.post(url, body, {
      httpsAgent,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
    return res.data;
  }

  /** Install WordPress on a REMOTE CyberPanel instance */
  async installWordPressRemote(
    host: string,
    adminUser: string,
    adminPass: string,
    domain: string,
    wpAdminEmail: string,
    wpAdminUser: string,
    wpAdminPass: string,
    wpTitle: string,
  ): Promise<any> {
    const url = `https://${host}:8090/cloudAPI/installWordpress`;
    const body = {
      adminUser,
      adminPass,
      domainName: domain,
      siteName: wpTitle || domain,
      adminUsername: wpAdminUser || 'admin',
      adminPassword: wpAdminPass,
      adminEmail: wpAdminEmail,
    };
    const httpsAgent = new (require('https').Agent)({
      rejectUnauthorized: false,
    });

    this.logger.log(
      `Installing WordPress remotely: ${domain} on ${host}`,
    );
    const res = await axios.post(url, body, {
      httpsAgent,
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' },
    });
    return res.data;
  }
}
