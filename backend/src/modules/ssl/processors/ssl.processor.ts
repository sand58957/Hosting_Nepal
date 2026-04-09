import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SslStatus } from '@prisma/client';
import { AcmeService } from '../services/acme.service';
import { PrismaService } from '../../../database/prisma.service';
import { ResellerClubService } from '../../domain/services/resellerclub.service';

// ─── Job payload shapes ───────────────────────────────────────────────────────

export interface IssueSslJobData {
  certId: string;
  domain: string;
  webRootPath?: string;
  dnsProvider?: string;
  isWildcard?: boolean;
  provider?: string;
  planId?: string;
}

export interface RenewSslJobData {
  certId: string;
  domain: string;
}

export interface RevokeSslJobData {
  certId: string;
  domain: string;
}

// ─── Processor ───────────────────────────────────────────────────────────────

@Processor('ssl')
export class SslProcessor {
  private readonly logger = new Logger(SslProcessor.name);

  constructor(
    private readonly acmeService: AcmeService,
    private readonly prisma: PrismaService,
    private readonly resellerClub: ResellerClubService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUE
  // ═══════════════════════════════════════════════════════════════════════════

  @Process('issue-ssl')
  async handleIssueSsl(job: Job<IssueSslJobData>): Promise<void> {
    const { certId, domain, webRootPath, dnsProvider, isWildcard, provider, planId } = job.data;

    this.logger.log(`[issue-ssl] Starting certificate issuance for ${domain} (certId=${certId}, provider=${provider || 'LETS_ENCRYPT'})`);

    try {
      if (provider === 'RESELLERCLUB') {
        // ── ResellerClub SSL flow ──────────────────────────────────────────
        const cert = await this.prisma.sslCertificate.findUnique({
          where: { id: certId },
          include: { domain: { include: { user: true } } },
        });

        if (!cert) {
          throw new Error(`SSL certificate record not found: ${certId}`);
        }

        const rcCustomerId = (cert.domain as any).user?.rcCustomerId;
        if (!rcCustomerId) {
          throw new Error(`User does not have a ResellerClub customer ID — cannot order SSL for ${domain}`);
        }

        const rcResponse = await this.resellerClub.orderSslCertificate({
          domainName: domain,
          months: 12,
          planId: planId || 'comodossl',
          customerId: rcCustomerId,
        });

        await this.prisma.sslCertificate.update({
          where: { id: certId },
          data: {
            rcOrderId: String(rcResponse.entityid || rcResponse),
            status: SslStatus.PENDING_VALIDATION,
            provider: 'RESELLERCLUB',
            updatedAt: new Date(),
          },
        });

        this.logger.log(`[issue-ssl] ResellerClub SSL order placed for ${domain} — pending validation`);
      } else {
        // ── Existing ACME / Let's Encrypt flow ─────────────────────────────
        let certPaths: { certFile: string; keyFile: string; caFile: string; fullchainFile: string };

        if (isWildcard && dnsProvider) {
          certPaths = await this.acmeService.issueWildcard(domain, dnsProvider);
        } else {
          certPaths = await this.acmeService.issueCertificate(domain, webRootPath);
        }

        // Let's Encrypt issues 90-day certificates
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90);

        await this.prisma.sslCertificate.update({
          where: { id: certId },
          data: {
            status: SslStatus.ACTIVE,
            issuedDate: new Date(),
            expiryDate: expiresAt,
            // Store paths in the certificate field as JSON for retrieval
            certificate: JSON.stringify({
              certFile: certPaths.certFile,
              keyFile: certPaths.keyFile,
              caFile: certPaths.caFile,
              fullchainFile: certPaths.fullchainFile,
            }),
            updatedAt: new Date(),
          },
        });

        this.logger.log(`[issue-ssl] Certificate issued successfully for ${domain} — expires ${expiresAt.toISOString()}`);
      }
    } catch (error) {
      this.logger.error(
        `[issue-ssl] Failed to issue certificate for ${domain}: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Mark as failed so the user can see the error state
      await this.prisma.sslCertificate.update({
        where: { id: certId },
        data: { status: SslStatus.CANCELLED, updatedAt: new Date() },
      }).catch((dbErr) =>
        this.logger.error(`[issue-ssl] Could not update status to CANCELLED: ${(dbErr as Error).message}`),
      );

      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENEW
  // ═══════════════════════════════════════════════════════════════════════════

  @Process('renew-ssl')
  async handleRenewSsl(job: Job<RenewSslJobData>): Promise<void> {
    const { certId, domain } = job.data;

    this.logger.log(`[renew-ssl] Renewing certificate for ${domain} (certId=${certId})`);

    try {
      // Look up the certificate to determine provider
      const cert = await this.prisma.sslCertificate.findUnique({
        where: { id: certId },
      });

      if (cert?.provider === 'RESELLERCLUB' && cert.rcOrderId) {
        // ── ResellerClub renewal ───────────────────────────────────────────
        await this.resellerClub.renewSslCertificate(cert.rcOrderId, 12);

        const newExpiresAt = new Date();
        newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1);

        await this.prisma.sslCertificate.update({
          where: { id: certId },
          data: {
            status: SslStatus.ACTIVE,
            expiryDate: newExpiresAt,
            issuedDate: new Date(),
            updatedAt: new Date(),
          },
        });

        this.logger.log(`[renew-ssl] ResellerClub certificate renewed for ${domain} — new expiry ${newExpiresAt.toISOString()}`);
      } else {
        // ── Existing ACME renewal ──────────────────────────────────────────
        await this.acmeService.renewCertificate(domain);

        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 90);

        await this.prisma.sslCertificate.update({
          where: { id: certId },
          data: {
            status: SslStatus.ACTIVE,
            expiryDate: newExpiresAt,
            issuedDate: new Date(),
            updatedAt: new Date(),
          },
        });

        this.logger.log(`[renew-ssl] Certificate renewed for ${domain} — new expiry ${newExpiresAt.toISOString()}`);
      }
    } catch (error) {
      this.logger.error(
        `[renew-ssl] Failed to renew certificate for ${domain}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REVOKE
  // ═══════════════════════════════════════════════════════════════════════════

  @Process('revoke-ssl')
  async handleRevokeSsl(job: Job<RevokeSslJobData>): Promise<void> {
    const { certId, domain } = job.data;

    this.logger.log(`[revoke-ssl] Revoking certificate for ${domain} (certId=${certId})`);

    try {
      await this.acmeService.revokeCertificate(domain);

      await this.prisma.sslCertificate.update({
        where: { id: certId },
        data: { status: SslStatus.REVOKED, updatedAt: new Date() },
      });

      this.logger.log(`[revoke-ssl] Certificate revoked for ${domain}`);
    } catch (error) {
      this.logger.error(
        `[revoke-ssl] Failed to revoke certificate for ${domain}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
