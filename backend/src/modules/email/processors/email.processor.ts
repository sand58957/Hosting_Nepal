import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmailStatus } from '@prisma/client';
import { TitanEmailService } from '../services/titan-email.service';
import { PrismaService } from '../../../database/prisma.service';
import { ResellerClubService } from '../../domain/services/resellerclub.service';

// ─── Job Payload Interfaces ───────────────────────────────────────────────────

export interface EmailProvisioningJob {
  /** Internal EmailAccount record ID. */
  emailAccountId: string;
  /** Domain name (e.g. example.com). */
  domain: string;
  /** ResellerClub plan ID. */
  planId: string;
  /** Subscription duration in months. */
  months: number;
  /** Number of mailboxes to provision. */
  noOfAccounts: number;
  /** Full email address to create (user@domain.com). */
  emailAddress: string;
  /** Initial mailbox password. */
  password: string;
  /** Mailbox owner's first name. */
  firstName: string;
  /** Mailbox owner's last name. */
  lastName: string;
}

export interface EmailDeprovisioningJob {
  /** Internal EmailAccount record ID. */
  emailAccountId: string;
  /** ResellerClub order ID to cancel. */
  rcOrderId: string;
  /** Full email address to delete. */
  emailAddress: string;
}

export interface GWorkspaceProvisioningJob {
  /** Internal EmailAccount record ID. */
  emailAccountId: string;
  /** Domain name (e.g. example.com). */
  domain: string;
  /** ResellerClub customer ID. */
  rcCustomerId: string;
  /** Google Workspace plan type (e.g. 'basic', 'business', 'enterprise'). */
  planType: string;
  /** Subscription duration in months. */
  months: number;
}

// ─── Processor ────────────────────────────────────────────────────────────────

@Processor('email-provisioning')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly titanEmail: TitanEmailService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly resellerClub: ResellerClubService,
  ) {}

  // ─── Provision Email ──────────────────────────────────────────────────────

  /**
   * Provision a new Titan email order and create the initial mailbox.
   * Steps:
   *  1. Create RC email order → obtain orderId.
   *  2. Create Titan mailbox under that order.
   *  3. Update the EmailAccount record to ACTIVE.
   *  4. Emit 'email.provisioned' event.
   */
  @Process('provision-email')
  async handleProvisionEmail(job: Job<EmailProvisioningJob>): Promise<void> {
    const {
      emailAccountId,
      domain,
      planId,
      months,
      noOfAccounts,
      emailAddress,
      password,
      firstName,
      lastName,
    } = job.data;

    this.logger.log(
      `Provisioning email [${emailAccountId}] address: ${emailAddress}, domain: ${domain}`,
    );

    try {
      // Step 1 – Create the ResellerClub/Titan email order.
      const orderResult = await this.titanEmail.createOrder(
        domain,
        planId,
        months,
        noOfAccounts,
      );

      const rcOrderId = String(orderResult.orderId);

      // Step 2 – Create the Titan mailbox.
      await this.titanEmail.createEmailAccount(
        rcOrderId,
        emailAddress,
        password,
        firstName,
        lastName,
      );

      // Step 3 – Update local record to ACTIVE.
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + months);

      await this.prisma.emailAccount.update({
        where: { id: emailAccountId },
        data: {
          rcOrderId,
          status: EmailStatus.ACTIVE,
          expiryDate,
        },
      });

      // Step 4 – Emit success event.
      this.eventEmitter.emit('email.provisioned', {
        emailAccountId,
        emailAddress,
        domain,
        rcOrderId,
      });

      this.logger.log(
        `Email provisioned successfully: ${emailAccountId} (rcOrderId=${rcOrderId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to provision email [${emailAccountId}]: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Keep status as PENDING_SETUP so administrators can investigate / retry.
      await this.prisma.emailAccount.update({
        where: { id: emailAccountId },
        data: { status: EmailStatus.PENDING_SETUP },
      });

      this.eventEmitter.emit('email.provision_failed', {
        emailAccountId,
        emailAddress,
        domain,
        error: (error as Error).message,
      });

      // Re-throw so Bull marks the job as failed and retries according to queue config.
      throw error;
    }
  }

  // ─── Deprovision Email ────────────────────────────────────────────────────

  /**
   * Cancel a Titan email order and mark the EmailAccount as CANCELLED.
   * Steps:
   *  1. Delete the RC/Titan email order.
   *  2. Update the EmailAccount record to CANCELLED.
   *  3. Emit 'email.deprovisioned' event.
   */
  @Process('deprovision-email')
  async handleDeprovisionEmail(job: Job<EmailDeprovisioningJob>): Promise<void> {
    const { emailAccountId, rcOrderId, emailAddress } = job.data;

    this.logger.log(
      `Deprovisioning email [${emailAccountId}] address: ${emailAddress}, rcOrderId: ${rcOrderId}`,
    );

    try {
      // Step 1 – Delete the order from ResellerClub/Titan.
      await this.titanEmail.deleteOrder(rcOrderId);

      // Step 2 – Mark as CANCELLED in the database.
      await this.prisma.emailAccount.update({
        where: { id: emailAccountId },
        data: { status: EmailStatus.CANCELLED },
      });

      // Step 3 – Emit success event.
      this.eventEmitter.emit('email.deprovisioned', {
        emailAccountId,
        emailAddress,
        rcOrderId,
      });

      this.logger.log(`Email deprovisioned successfully: ${emailAccountId}`);
    } catch (error) {
      this.logger.error(
        `Failed to deprovision email [${emailAccountId}]: ${(error as Error).message}`,
        (error as Error).stack,
      );

      this.eventEmitter.emit('email.deprovision_failed', {
        emailAccountId,
        emailAddress,
        rcOrderId,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  // ─── Provision Google Workspace ───────────────────────────────────────────

  /**
   * Provision a new Google Workspace order via ResellerClub.
   * Steps:
   *  1. Order Google Workspace from RC → obtain orderId.
   *  2. Update the EmailAccount record to ACTIVE.
   *  3. Emit 'email.provisioned' event.
   */
  @Process('provision-gworkspace')
  async handleProvisionGWorkspace(job: Job<GWorkspaceProvisioningJob>): Promise<void> {
    const { emailAccountId, domain, rcCustomerId, planType, months } = job.data;

    this.logger.log(
      `Provisioning Google Workspace [${emailAccountId}] domain: ${domain}, plan: ${planType}`,
    );

    try {
      const rcResponse = await this.resellerClub.orderGoogleWorkspace({
        domainName: domain,
        customerId: rcCustomerId,
        numberOfAccounts: 1,
        planType: planType || 'basic',
        months: months || 12,
      });

      const rcOrderId = String(rcResponse.entityid || rcResponse);

      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + (months || 12));

      await this.prisma.emailAccount.update({
        where: { id: emailAccountId },
        data: {
          rcOrderId,
          status: EmailStatus.ACTIVE,
          provider: 'GOOGLE_WORKSPACE',
          expiryDate,
        },
      });

      this.eventEmitter.emit('email.provisioned', {
        emailAccountId,
        domain,
        rcOrderId,
        provider: 'GOOGLE_WORKSPACE',
      });

      this.logger.log(
        `Google Workspace provisioned successfully: ${emailAccountId} (rcOrderId=${rcOrderId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to provision Google Workspace [${emailAccountId}]: ${(error as Error).message}`,
        (error as Error).stack,
      );

      await this.prisma.emailAccount.update({
        where: { id: emailAccountId },
        data: { status: EmailStatus.PENDING_SETUP },
      });

      this.eventEmitter.emit('email.provision_failed', {
        emailAccountId,
        domain,
        error: (error as Error).message,
      });

      throw error;
    }
  }
}
