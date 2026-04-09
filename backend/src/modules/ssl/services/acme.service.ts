import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(execCb);

export interface CertPaths {
  certFile: string;
  keyFile: string;
  caFile: string;
  fullchainFile: string;
}

export interface CertInfo {
  domain: string;
  expiry: string | null;
  keyLength: string | null;
  issuedAt: string | null;
}

export interface CertFiles {
  cert: string;
  key: string;
  ca: string;
  fullchain: string;
}

@Injectable()
export class AcmeService {
  private readonly logger = new Logger(AcmeService.name);
  private readonly acmeHome: string;
  private readonly webRoot: string;

  constructor(private readonly configService: ConfigService) {
    this.acmeHome = this.configService.get<string>('ACME_HOME', '/root/.acme.sh');
    this.webRoot = this.configService.get<string>('ACME_WEBROOT', '/var/www');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACME.SH INSTALLATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Install acme.sh if it is not already present on the system.
   */
  async installAcme(): Promise<void> {
    this.logger.log('Checking if acme.sh is installed...');

    try {
      await this.exec(`test -f ${this.acmeHome}/acme.sh`);
      this.logger.log('acme.sh is already installed');
    } catch {
      this.logger.log('acme.sh not found — installing...');
      await this.exec('curl -s https://get.acme.sh | sh');
      this.logger.log('acme.sh installed successfully');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CERTIFICATE ISSUANCE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Issue a DV certificate for a domain using the HTTP webroot challenge.
   */
  async issueCertificate(domain: string, webRootPath?: string): Promise<CertPaths> {
    const webroot = webRootPath || path.join(this.webRoot, domain, 'public_html');
    this.logger.log(`Issuing Let's Encrypt certificate for ${domain} (webroot: ${webroot})`);

    const cmd = [
      `${this.acmeHome}/acme.sh`,
      '--issue',
      `-d ${domain}`,
      `-w ${webroot}`,
      '--server letsencrypt',
    ].join(' ');

    try {
      const output = await this.exec(cmd);
      this.logger.log(`Certificate issued successfully for ${domain}`);
      this.logger.debug(output);
    } catch (error) {
      // acme.sh exits 2 when the cert already exists and is not due for renewal —
      // treat that as a success so subsequent steps can proceed.
      const message = (error as Error).message || '';
      if (!message.includes('Cert success') && !message.includes('Skip')) {
        this.logger.error(`Failed to issue certificate for ${domain}: ${message}`);
        throw error;
      }
    }

    return this.getCertPaths(domain);
  }

  /**
   * Issue a wildcard certificate using a DNS API challenge.
   */
  async issueWildcard(domain: string, dnsProvider: string): Promise<CertPaths> {
    this.logger.log(`Issuing wildcard Let's Encrypt certificate for *.${domain} via ${dnsProvider}`);

    const cmd = [
      `${this.acmeHome}/acme.sh`,
      '--issue',
      `-d ${domain}`,
      `-d *.${domain}`,
      `--dns ${dnsProvider}`,
      '--server letsencrypt',
    ].join(' ');

    try {
      const output = await this.exec(cmd);
      this.logger.log(`Wildcard certificate issued successfully for ${domain}`);
      this.logger.debug(output);
    } catch (error) {
      const message = (error as Error).message || '';
      if (!message.includes('Cert success') && !message.includes('Skip')) {
        this.logger.error(`Failed to issue wildcard certificate for ${domain}: ${message}`);
        throw error;
      }
    }

    return this.getCertPaths(domain);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CERTIFICATE RENEWAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Force-renew an existing certificate for the given domain.
   */
  async renewCertificate(domain: string): Promise<void> {
    this.logger.log(`Renewing certificate for ${domain}`);

    const cmd = [
      `${this.acmeHome}/acme.sh`,
      '--renew',
      `-d ${domain}`,
      '--force',
    ].join(' ');

    try {
      const output = await this.exec(cmd);
      this.logger.log(`Certificate renewed successfully for ${domain}`);
      this.logger.debug(output);
    } catch (error) {
      this.logger.error(`Failed to renew certificate for ${domain}: ${(error as Error).message}`);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CERTIFICATE REVOCATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Revoke the certificate for the given domain and remove it from disk.
   */
  async revokeCertificate(domain: string): Promise<void> {
    this.logger.log(`Revoking certificate for ${domain}`);

    const cmd = [
      `${this.acmeHome}/acme.sh`,
      '--revoke',
      `-d ${domain}`,
    ].join(' ');

    try {
      const output = await this.exec(cmd);
      this.logger.log(`Certificate revoked successfully for ${domain}`);
      this.logger.debug(output);
    } catch (error) {
      this.logger.error(`Failed to revoke certificate for ${domain}: ${(error as Error).message}`);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CERTIFICATE INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Retrieve metadata about the issued certificate for a domain.
   * Parses the key=value output produced by `acme.sh --info`.
   */
  async getCertInfo(domain: string): Promise<CertInfo> {
    this.logger.log(`Fetching certificate info for ${domain}`);

    const cmd = [
      `${this.acmeHome}/acme.sh`,
      '--info',
      `-d ${domain}`,
    ].join(' ');

    let output = '';
    try {
      output = await this.exec(cmd);
    } catch (error) {
      this.logger.error(`Failed to get cert info for ${domain}: ${(error as Error).message}`);
      throw error;
    }

    const getValue = (key: string): string | null => {
      const match = output.match(new RegExp(`${key}=['"]?([^'"\n]+)['"]?`));
      return match ? match[1].trim() : null;
    };

    return {
      domain,
      expiry: getValue('Le_NextRenewTime') || getValue('Le_CertCreateTimeStr'),
      keyLength: getValue('Le_Keylength'),
      issuedAt: getValue('Le_CertCreateTimeStr'),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CERTIFICATE DEPLOYMENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Install an issued certificate into a given Nginx cert directory and reload
   * Nginx on success.
   */
  async deployCertToNginx(domain: string, nginxCertPath: string): Promise<void> {
    this.logger.log(`Deploying certificate for ${domain} to ${nginxCertPath}`);

    const cmd = [
      `${this.acmeHome}/acme.sh`,
      '--install-cert',
      `-d ${domain}`,
      `--cert-file ${nginxCertPath}/cert.pem`,
      `--key-file ${nginxCertPath}/key.pem`,
      `--fullchain-file ${nginxCertPath}/fullchain.pem`,
      `--reloadcmd "nginx -s reload"`,
    ].join(' ');

    try {
      const output = await this.exec(cmd);
      this.logger.log(`Certificate deployed to Nginx for ${domain}`);
      this.logger.debug(output);
    } catch (error) {
      this.logger.error(`Failed to deploy certificate to Nginx for ${domain}: ${(error as Error).message}`);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Return the canonical on-disk paths for a domain's certificate files as
   * stored by acme.sh.
   */
  getCertPaths(domain: string): CertPaths {
    const base = path.join(this.acmeHome, domain);
    return {
      certFile: path.join(base, `${domain}.cer`),
      keyFile: path.join(base, `${domain}.key`),
      caFile: path.join(base, 'ca.cer'),
      fullchainFile: path.join(base, 'fullchain.cer'),
    };
  }

  /**
   * Read certificate file contents from disk and return them as strings.
   */
  async readCertFiles(domain: string): Promise<CertFiles> {
    const paths = this.getCertPaths(domain);
    this.logger.log(`Reading certificate files for ${domain}`);

    try {
      const [cert, key, ca, fullchain] = await Promise.all([
        fs.readFile(paths.certFile, 'utf-8'),
        fs.readFile(paths.keyFile, 'utf-8'),
        fs.readFile(paths.caFile, 'utf-8'),
        fs.readFile(paths.fullchainFile, 'utf-8'),
      ]);

      return { cert, key, ca, fullchain };
    } catch (error) {
      this.logger.error(`Failed to read certificate files for ${domain}: ${(error as Error).message}`);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Execute a shell command and return its combined stdout output.
   * Rejects with an error containing the stderr message on non-zero exit.
   */
  private async exec(cmd: string): Promise<string> {
    this.logger.debug(`Executing: ${cmd}`);

    try {
      const { stdout, stderr } = await execAsync(cmd, {
        env: { ...process.env, HOME: '/root' },
        timeout: 300_000, // 5 minutes max for ACME operations
      });

      if (stderr) {
        this.logger.debug(`stderr: ${stderr}`);
      }

      return stdout;
    } catch (error) {
      const execError = error as { message: string; stdout?: string; stderr?: string; code?: number };
      const detail = execError.stderr || execError.stdout || execError.message;
      throw new Error(`Command failed (exit ${execError.code ?? '?'}): ${detail}`);
    }
  }
}
