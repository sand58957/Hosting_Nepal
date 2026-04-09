import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from 'eventemitter2';
import { SslStatus, SslProvider, SslType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import { PrismaService } from '../../database/prisma.service';
import { AcmeService, CertFiles } from './services/acme.service';
import { ResellerClubService } from '../domain/services/resellerclub.service';
import { IssueSslDto } from './dto/issue-ssl.dto';
import {
  IssueSslJobData,
  RenewSslJobData,
  RevokeSslJobData,
} from './processors/ssl.processor';

@Injectable()
export class SslService {
  private readonly logger = new Logger(SslService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly acmeService: AcmeService,
    private readonly resellerClub: ResellerClubService,
    @InjectQueue('ssl') private readonly sslQueue: Queue,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // LISTING & DETAILS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Return all SSL certificates belonging to the given user (via domain
   * ownership).
   */
  async getMyCertificates(userId: string): Promise<unknown[]> {
    const certs = await this.prisma.sslCertificate.findMany({
      where: {
        domain: { userId },
      },
      include: {
        domain: { select: { domainName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return certs;
  }

  /**
   * Return a single certificate owned by the user, or throw.
   */
  async getCertificateDetails(id: string, userId: string): Promise<unknown> {
    const cert = await this.prisma.sslCertificate.findFirst({
      where: { id, domain: { userId } },
      include: {
        domain: { select: { domainName: true } },
      },
    });

    if (!cert) {
      throw new NotFoundException('SSL certificate not found');
    }

    return cert;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ISSUANCE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a pending SSL certificate record and enqueue an issuance job.
   * For Let's Encrypt certificates the actual issuance happens in the
   * background processor via acme.sh.
   */
  async issueCertificate(
    userId: string,
    dto: IssueSslDto,
  ): Promise<{ id: string; domain: string; status: SslStatus; message: string }> {
    const { domain, sslType, webRootPath, dnsProvider } = dto;

    // Resolve the domain record owned by this user
    const domainRecord = await this.prisma.domain.findFirst({
      where: { domainName: domain, userId },
    });

    if (!domainRecord) {
      throw new NotFoundException(
        `Domain ${domain} not found in your account`,
      );
    }

    // Prevent duplicate active/pending certs for the same domain
    const existing = await this.prisma.sslCertificate.findFirst({
      where: {
        domainId: domainRecord.id,
        status: { in: [SslStatus.ACTIVE, SslStatus.PENDING_ISSUANCE, SslStatus.PENDING_VALIDATION] },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `An active or pending SSL certificate already exists for ${domain}`,
      );
    }

    const isWildcard = sslType === SslType.WILDCARD;
    const provider =
      sslType === SslType.LETS_ENCRYPT || isWildcard
        ? SslProvider.LETS_ENCRYPT
        : SslProvider.RESELLERCLUB;

    // Create the record in PENDING_ISSUANCE state
    const cert = await this.prisma.sslCertificate.create({
      data: {
        id: uuidv4(),
        domainId: domainRecord.id,
        type: sslType,
        provider,
        status: SslStatus.PENDING_ISSUANCE,
        autoRenew: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Enqueue background issuance job
    const jobData: IssueSslJobData = {
      certId: cert.id,
      domain,
      webRootPath,
      dnsProvider,
      isWildcard,
      provider: provider === SslProvider.RESELLERCLUB ? 'RESELLERCLUB' : 'LETS_ENCRYPT',
      planId: dto.hostingAccountId, // reuse hostingAccountId or default in processor
    };

    await this.sslQueue.add('issue-ssl', jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
    });

    this.eventEmitter.emit('ssl.issue_requested', { certId: cert.id, domain, userId });
    this.logger.log(`SSL issuance queued for ${domain} (certId=${cert.id})`);

    return {
      id: cert.id,
      domain,
      status: SslStatus.PENDING_ISSUANCE,
      message: `SSL certificate issuance has been queued for ${domain}. This may take a few minutes.`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENEWAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Enqueue a manual renewal job for the specified certificate.
   */
  async renewCertificate(
    id: string,
    userId: string,
  ): Promise<{ message: string }> {
    const cert = await this.findCertOrFail(id, userId);

    if (cert.status === SslStatus.REVOKED || cert.status === SslStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot renew a revoked or cancelled certificate',
      );
    }

    const domain = (cert as unknown as { domain: { domainName: string } }).domain.domainName;

    const jobData: RenewSslJobData = { certId: cert.id, domain };

    await this.sslQueue.add('renew-ssl', jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10_000 },
    });

    this.eventEmitter.emit('ssl.renew_requested', { certId: cert.id, domain, userId });
    this.logger.log(`SSL renewal queued for ${domain} (certId=${cert.id})`);

    return {
      message: `Certificate renewal has been queued for ${domain}.`,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REVOCATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Revoke a certificate immediately via acme.sh and update its status.
   */
  async revokeCertificate(
    id: string,
    userId: string,
  ): Promise<{ message: string }> {
    const cert = await this.findCertOrFail(id, userId);

    if (cert.status === SslStatus.REVOKED) {
      throw new BadRequestException('Certificate is already revoked');
    }

    const domain = (cert as unknown as { domain: { domainName: string } }).domain.domainName;

    try {
      await this.acmeService.revokeCertificate(domain);
    } catch (error) {
      this.logger.warn(
        `acme.sh revoke failed for ${domain} — marking as revoked anyway: ${(error as Error).message}`,
      );
    }

    await this.prisma.sslCertificate.update({
      where: { id },
      data: { status: SslStatus.REVOKED, updatedAt: new Date() },
    });

    this.eventEmitter.emit('ssl.revoked', { certId: id, domain, userId });
    this.logger.log(`Certificate revoked for ${domain} (certId=${id})`);

    return { message: `Certificate for ${domain} has been revoked.` };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Delete the certificate record and attempt to remove the on-disk cert files.
   */
  async deleteCertificate(id: string, userId: string): Promise<{ message: string }> {
    const cert = await this.findCertOrFail(id, userId);
    const domain = (cert as unknown as { domain: { domainName: string } }).domain.domainName;

    // Best-effort removal of cert files from disk
    const paths = this.acmeService.getCertPaths(domain);
    await Promise.allSettled(
      Object.values(paths).map((filePath) => fs.unlink(filePath)),
    );

    await this.prisma.sslCertificate.delete({ where: { id } });

    this.eventEmitter.emit('ssl.deleted', { certId: id, domain, userId });
    this.logger.log(`Certificate deleted for ${domain} (certId=${id})`);

    return { message: `Certificate for ${domain} has been deleted.` };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOWNLOAD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Read the cert files from disk and return them as strings so the controller
   * can serve them to the client.
   */
  async downloadCertificate(id: string, userId: string): Promise<CertFiles> {
    const cert = await this.findCertOrFail(id, userId);

    if (cert.status !== SslStatus.ACTIVE) {
      throw new BadRequestException(
        'Certificate files are only available for ACTIVE certificates',
      );
    }

    const domain = (cert as unknown as { domain: { domainName: string } }).domain.domainName;

    try {
      return await this.acmeService.readCertFiles(domain);
    } catch (error) {
      this.logger.error(
        `Failed to read cert files for ${domain}: ${(error as Error).message}`,
      );
      throw new BadRequestException(
        `Certificate files for ${domain} could not be read. They may not be present on disk.`,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-RENEWAL (called by scheduler)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find all ACTIVE certificates expiring within 7 days and enqueue renewal
   * jobs for each one.  Intended to be called by a NestJS Cron scheduler.
   */
  async checkExpiringSoon(): Promise<void> {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const expiring = await this.prisma.sslCertificate.findMany({
      where: {
        status: SslStatus.ACTIVE,
        autoRenew: true,
        expiryDate: { lte: sevenDaysFromNow },
      },
      include: {
        domain: { select: { domainName: true } },
      },
    });

    if (expiring.length === 0) {
      this.logger.log('checkExpiringSoon: no certificates due for auto-renewal');
      return;
    }

    this.logger.log(
      `checkExpiringSoon: found ${expiring.length} certificate(s) expiring within 7 days — enqueueing renewal`,
    );

    for (const cert of expiring) {
      const domain = (cert as unknown as { domain: { domainName: string } }).domain.domainName;

      const jobData: RenewSslJobData = { certId: cert.id, domain };

      await this.sslQueue.add('renew-ssl', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
      });

      this.logger.log(`Auto-renewal queued for ${domain} (certId=${cert.id})`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetch a certificate record that belongs to the user, or throw
   * NotFoundException.
   */
  private async findCertOrFail(id: string, userId: string) {
    const cert = await this.prisma.sslCertificate.findFirst({
      where: { id, domain: { userId } },
      include: {
        domain: { select: { domainName: true } },
      },
    });

    if (!cert) {
      throw new NotFoundException('SSL certificate not found');
    }

    return cert;
  }
}
