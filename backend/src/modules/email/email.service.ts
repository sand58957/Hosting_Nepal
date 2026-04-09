import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmailStatus, EmailProvider } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TitanEmailService, TitanForwarder } from './services/titan-email.service';
import { ResellerClubService } from '../domain/services/resellerclub.service';
import { CreateEmailAccountDto } from './dto/create-email-account.dto';
import {
  EmailProvisioningJob,
  EmailDeprovisioningJob,
  GWorkspaceProvisioningJob,
} from './processors/email.processor';

// ─── Constants ───────────────────────────────────────────────────────────────

const USD_TO_NPR = 133;
const MARGIN_MULTIPLIER = 1.5; // 50% margin

// ─── Plan Definitions ─────────────────────────────────────────────────────────

export interface EmailPlan {
  id: string;
  name: string;
  provider: 'TITAN' | 'GOOGLE_WORKSPACE';
  description: string;
  mailboxes: number | 'unlimited';
  storageGb: number | 'unlimited';
  priceNprMonth: number;
  priceNprYear: number;
  rcPlanId: string;
  features: string[];
}

// Fallback hardcoded plans used when RC API is unavailable
const FALLBACK_PLANS: EmailPlan[] = [
  {
    id: 'titan-starter',
    name: 'Titan Starter',
    provider: 'TITAN',
    description: 'Perfect for individuals and small projects.',
    mailboxes: 1,
    storageGb: 5,
    priceNprMonth: 138,
    priceNprYear: 1656,
    rcPlanId: '1762',
    features: [
      '1 Mailbox',
      '5 GB Storage',
      'Webmail Access',
      'IMAP / POP3 / SMTP',
      'Mobile Sync',
      'Anti-Spam & Anti-Virus',
    ],
  },
  {
    id: 'titan-business',
    name: 'Titan Business',
    provider: 'TITAN',
    description: 'Great for small teams and growing businesses.',
    mailboxes: 5,
    storageGb: 25,
    priceNprMonth: 298,
    priceNprYear: 3576,
    rcPlanId: '1756',
    features: [
      '5 Mailboxes',
      '25 GB Storage (5 GB/mailbox)',
      'Webmail Access',
      'IMAP / POP3 / SMTP',
      'Mobile Sync',
      'Anti-Spam & Anti-Virus',
      'Email Forwarders',
      'Auto-Responders',
    ],
  },
  {
    id: 'gworkspace-starter',
    name: 'Google Workspace Business Starter',
    provider: 'GOOGLE_WORKSPACE',
    description: 'Professional email with 30 GB storage per user.',
    mailboxes: 1,
    storageGb: 30,
    priceNprMonth: 1395,
    priceNprYear: 16740,
    rcPlanId: '1657',
    features: [
      'Custom Business Email (you@yourdomain.com)',
      '30 GB Cloud Storage per User',
      'Google Meet (100 participants)',
      'Google Docs, Sheets, Slides',
      'Google Calendar',
      'Admin Console',
      'Standard Security',
    ],
  },
  {
    id: 'gworkspace-plus',
    name: 'Google Workspace Business Plus',
    provider: 'GOOGLE_WORKSPACE',
    description: 'Enhanced storage, security, and compliance for enterprises.',
    mailboxes: 1,
    storageGb: 5000,
    priceNprMonth: 7262,
    priceNprYear: 87144,
    rcPlanId: '1557',
    features: [
      'Custom Business Email (you@yourdomain.com)',
      '5 TB Cloud Storage per User',
      'Google Meet (500 participants + recording)',
      'Google Docs, Sheets, Slides',
      'Google Calendar',
      'Admin Console',
      'Enhanced Security & Compliance',
      'Vault for eDiscovery & Retention',
      'Endpoint Management',
    ],
  },
];

// Map RC plan IDs to our plan identifiers
const RC_PLAN_ID_MAP: Record<string, { id: string; name: string; provider: 'TITAN' | 'GOOGLE_WORKSPACE'; mailboxes: number | 'unlimited'; storageGb: number | 'unlimited'; description: string; features: string[] }> = {
  '1762': {
    id: 'titan-starter',
    name: 'Titan Starter',
    provider: 'TITAN',
    mailboxes: 1,
    storageGb: 5,
    description: 'Perfect for individuals and small projects.',
    features: ['1 Mailbox', '5 GB Storage', 'Webmail Access', 'IMAP / POP3 / SMTP', 'Mobile Sync', 'Anti-Spam & Anti-Virus'],
  },
  '1756': {
    id: 'titan-business',
    name: 'Titan Business',
    provider: 'TITAN',
    mailboxes: 5,
    storageGb: 25,
    description: 'Great for small teams and growing businesses.',
    features: ['5 Mailboxes', '25 GB Storage (5 GB/mailbox)', 'Webmail Access', 'IMAP / POP3 / SMTP', 'Mobile Sync', 'Anti-Spam & Anti-Virus', 'Email Forwarders', 'Auto-Responders'],
  },
  '1657': {
    id: 'gworkspace-starter',
    name: 'Google Workspace Business Starter',
    provider: 'GOOGLE_WORKSPACE',
    mailboxes: 1,
    storageGb: 30,
    description: 'Professional email with 30 GB storage per user.',
    features: ['Custom Business Email (you@yourdomain.com)', '30 GB Cloud Storage per User', 'Google Meet (100 participants)', 'Google Docs, Sheets, Slides', 'Google Calendar', 'Admin Console', 'Standard Security'],
  },
  '1557': {
    id: 'gworkspace-plus',
    name: 'Google Workspace Business Plus',
    provider: 'GOOGLE_WORKSPACE',
    mailboxes: 1,
    storageGb: 5000,
    description: 'Enhanced storage, security, and compliance for enterprises.',
    features: ['Custom Business Email (you@yourdomain.com)', '5 TB Cloud Storage per User', 'Google Meet (500 participants + recording)', 'Google Docs, Sheets, Slides', 'Google Calendar', 'Admin Console', 'Enhanced Security & Compliance', 'Vault for eDiscovery & Retention', 'Endpoint Management'],
  },
};

// Reverse lookup: plan string ID to RC plan ID
const PLAN_TO_RC_ID: Record<string, string> = {
  'titan-starter': '1762',
  'titan-business': '1756',
  'gworkspace-starter': '1657',
  'gworkspace-plus': '1557',
};

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly titanEmail: TitanEmailService,
    private readonly resellerClub: ResellerClubService,
    @InjectQueue('email-provisioning') private readonly emailQueue: Queue,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Pricing Helper ──────────────────────────────────────────────────────

  /**
   * Convert a USD monthly cost price to NPR with 50% margin.
   */
  private usdToNprWithMargin(usdPerMonth: number): { monthly: number; yearly: number } {
    const monthlyNpr = Math.ceil(usdPerMonth * USD_TO_NPR * MARGIN_MULTIPLIER);
    const yearlyNpr = monthlyNpr * 12;
    return { monthly: monthlyNpr, yearly: yearlyNpr };
  }

  // ─── Plans (Live from RC API) ────────────────────────────────────────────

  /**
   * Return available email plans with live NPR pricing fetched from ResellerClub.
   * Falls back to hardcoded pricing if the API is unreachable.
   */
  async getEmailPlans(): Promise<EmailPlan[]> {
    try {
      const [titanPricing, gwPricing] = await Promise.all([
        this.resellerClub.getHostingPricing('titanmailglobal').catch((err) => {
          this.logger.warn(`Failed to fetch Titan pricing: ${(err as Error).message}`);
          return null;
        }),
        this.resellerClub.getHostingPricing('gappsgbl').catch((err) => {
          this.logger.warn(`Failed to fetch Google Workspace pricing: ${(err as Error).message}`);
          return null;
        }),
      ]);

      const plans: EmailPlan[] = [];

      // Process Titan plans
      if (titanPricing) {
        for (const rcPlanId of ['1762', '1756']) {
          const planMeta = RC_PLAN_ID_MAP[rcPlanId];
          if (!planMeta) continue;

          // RC pricing structure: { planId: { addcost: { months: price }, ... } }
          const planPricing = titanPricing?.[rcPlanId] ?? titanPricing?.addcost?.[rcPlanId];
          let monthlyUsd = rcPlanId === '1762' ? 0.69 : 1.49; // defaults

          if (planPricing?.addcost?.['1']) {
            monthlyUsd = parseFloat(planPricing.addcost['1']);
          } else if (planPricing?.['1']) {
            monthlyUsd = parseFloat(planPricing['1']);
          }

          const { monthly, yearly } = this.usdToNprWithMargin(monthlyUsd);

          plans.push({
            id: planMeta.id,
            name: planMeta.name,
            provider: planMeta.provider,
            description: planMeta.description,
            mailboxes: planMeta.mailboxes,
            storageGb: planMeta.storageGb,
            priceNprMonth: monthly,
            priceNprYear: yearly,
            rcPlanId,
            features: planMeta.features,
          });
        }
      }

      // Process Google Workspace plans
      if (gwPricing) {
        for (const rcPlanId of ['1657', '1557']) {
          const planMeta = RC_PLAN_ID_MAP[rcPlanId];
          if (!planMeta) continue;

          const planPricing = gwPricing?.[rcPlanId] ?? gwPricing?.addcost?.[rcPlanId];
          let monthlyUsd = rcPlanId === '1657' ? 6.99 : 36.39; // defaults

          if (planPricing?.addcost?.['1']) {
            monthlyUsd = parseFloat(planPricing.addcost['1']);
          } else if (planPricing?.['1']) {
            monthlyUsd = parseFloat(planPricing['1']);
          }

          const { monthly, yearly } = this.usdToNprWithMargin(monthlyUsd);

          plans.push({
            id: planMeta.id,
            name: planMeta.name,
            provider: planMeta.provider,
            description: planMeta.description,
            mailboxes: planMeta.mailboxes,
            storageGb: planMeta.storageGb,
            priceNprMonth: monthly,
            priceNprYear: yearly,
            rcPlanId,
            features: planMeta.features,
          });
        }
      }

      // If we got at least one plan from the API, return them
      if (plans.length > 0) {
        this.logger.log(`Fetched ${plans.length} email plans from RC API`);
        return plans;
      }

      // Fall back to hardcoded plans
      this.logger.warn('No plans fetched from RC API, using fallback pricing');
      return FALLBACK_PLANS;
    } catch (error) {
      this.logger.error(
        `Failed to fetch email plans from RC API: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return FALLBACK_PLANS;
    }
  }

  // ─── RC Customer Helper ──────────────────────────────────────────────────

  /**
   * Ensure the user has an RC customer ID. If not, attempt to create one or
   * look it up by email.
   */
  private async ensureRcCustomerId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.rcCustomerId) {
      return user.rcCustomerId;
    }

    // Try to find existing RC customer by email
    try {
      const customerId = await this.resellerClub.getCustomerByEmail(user.email);
      if (customerId) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { rcCustomerId: customerId },
        });
        this.logger.log(`Found existing RC customer for user ${userId}: ${customerId}`);
        return customerId;
      }
    } catch {
      this.logger.log(`No existing RC customer found for ${user.email}, will create one`);
    }

    // Create a new RC customer
    try {
      const nameParts = (user.name || 'User').split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || 'Account';

      const customerId = await this.resellerClub.createCustomer({
        username: user.email,
        passwd: `RC_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        name: firstName,
        company: 'Individual',
        'address-line-1': 'N/A',
        city: 'Kathmandu',
        state: 'Bagmati',
        country: 'NP',
        zipcode: '44600',
        'phone-cc': '977',
        phone: '9800000000',
        'lang-pref': 'en',
      });

      await this.prisma.user.update({
        where: { id: userId },
        data: { rcCustomerId: customerId },
      });

      this.logger.log(`Created RC customer for user ${userId}: ${customerId}`);
      return customerId;
    } catch (error) {
      this.logger.error(
        `Failed to create RC customer for user ${userId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to set up billing account. Please contact support.',
      );
    }
  }

  // ─── Account Creation ─────────────────────────────────────────────────────

  /**
   * Create an EmailAccount record with PENDING_SETUP status and enqueue
   * a provisioning job to spin up the Titan/Google Workspace order asynchronously.
   */
  async createEmailAccount(
    userId: string,
    dto: CreateEmailAccountDto,
  ) {
    const months = dto.months ?? 12;

    // Determine provider from planId
    const isGoogleWorkspace = dto.planId.startsWith('gworkspace');
    const provider = isGoogleWorkspace ? EmailProvider.GOOGLE_WORKSPACE : EmailProvider.TITAN;

    // Resolve RC plan ID
    const rcPlanId = PLAN_TO_RC_ID[dto.planId];
    const planMeta = rcPlanId ? RC_PLAN_ID_MAP[rcPlanId] : null;

    const mailboxCount = planMeta && typeof planMeta.mailboxes === 'number' ? planMeta.mailboxes : 1;
    const storageGb = planMeta && typeof planMeta.storageGb === 'number' ? planMeta.storageGb : 5;
    const planName = planMeta ? planMeta.name : dto.planId;

    // Find the domain record for this user.
    const domain = await this.prisma.domain.findFirst({
      where: { domainName: dto.domain, userId },
    });

    if (!domain) {
      throw new NotFoundException(
        `Domain "${dto.domain}" not found in your account. Please register the domain first.`,
      );
    }

    this.logger.log(
      `Creating email account ${dto.emailAddress} for user ${userId} (plan: ${dto.planId}, provider: ${provider})`,
    );

    try {
      // Ensure the user has an RC customer ID before proceeding
      const rcCustomerId = await this.ensureRcCustomerId(userId);

      // Create the DB record first (PENDING_SETUP).
      const emailAccount = await this.prisma.emailAccount.create({
        data: {
          userId,
          domainId: domain.id,
          emailAddress: dto.emailAddress,
          provider,
          planName,
          mailboxCount,
          storageGb,
          status: EmailStatus.PENDING_SETUP,
        },
      });

      if (isGoogleWorkspace) {
        // ── Google Workspace provisioning via ResellerClub ──────────────────
        const gwPlanType = dto.planId === 'gworkspace-plus' ? 'business_plus' : 'basic';

        const gwPayload: GWorkspaceProvisioningJob = {
          emailAccountId: emailAccount.id,
          domain: dto.domain,
          rcCustomerId,
          planType: gwPlanType,
          months,
        };

        await this.emailQueue.add('provision-gworkspace', gwPayload, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        });
      } else {
        // ── Titan provisioning flow ────────────────────────────────────────
        const titanRcPlanId = rcPlanId || '1762'; // default to Titan Starter

        const jobPayload: EmailProvisioningJob = {
          emailAccountId: emailAccount.id,
          domain: dto.domain,
          planId: titanRcPlanId,
          months,
          noOfAccounts: mailboxCount,
          emailAddress: dto.emailAddress,
          password: dto.password,
          firstName: dto.firstName,
          lastName: dto.lastName,
        };

        await this.emailQueue.add('provision-email', jobPayload, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        });
      }

      this.logger.log(
        `Email provisioning job enqueued for account: ${emailAccount.id}`,
      );

      this.eventEmitter.emit('email.account_created', {
        emailAccountId: emailAccount.id,
        emailAddress: dto.emailAddress,
        userId,
        provider,
      });

      return emailAccount;
    } catch (error) {
      this.logger.error(
        `Failed to create email account ${dto.emailAddress}: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Re-throw known exceptions as-is
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to initiate email account creation. Please try again.',
      );
    }
  }

  // ─── Listing & Details ────────────────────────────────────────────────────

  /**
   * List all email accounts belonging to the authenticated user.
   * Enriches each account with live status from the provider API.
   */
  async getMyEmailAccounts(userId: string) {
    this.logger.log(`Listing email accounts for user: ${userId}`);

    const accounts = await this.prisma.emailAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { domain: { select: { domainName: true, tld: true } } },
    });

    // Enrich with live status from provider APIs (best-effort)
    const enrichedAccounts = await Promise.all(
      accounts.map(async (account) => {
        if (!account.rcOrderId) {
          return { ...account, liveStatus: null };
        }

        try {
          let liveDetails: Record<string, unknown> | null = null;

          if (account.provider === EmailProvider.TITAN) {
            liveDetails = await this.titanEmail.getAccountDetails(account.rcOrderId);
          } else if (account.provider === EmailProvider.GOOGLE_WORKSPACE) {
            liveDetails = await this.resellerClub.getGoogleWorkspaceDetails(account.rcOrderId);
          }

          return {
            ...account,
            liveStatus: liveDetails
              ? {
                  currentStatus: (liveDetails as any).currentstatus ?? (liveDetails as any).status ?? null,
                  expiryDate: (liveDetails as any).endtime ?? (liveDetails as any).expiryDate ?? null,
                  orderStatus: (liveDetails as any).orderstatus ?? null,
                }
              : null,
          };
        } catch (error) {
          this.logger.warn(
            `Failed to fetch live status for email account ${account.id}: ${(error as Error).message}`,
          );
          return { ...account, liveStatus: null };
        }
      }),
    );

    return enrichedAccounts;
  }

  /**
   * Get detailed information about a specific email account.
   * Enriches with live data from the provider API.
   * Throws NotFoundException if not found, ForbiddenException if owner mismatch.
   */
  async getEmailAccountDetails(id: string, userId: string) {
    const account = await this.prisma.emailAccount.findUnique({
      where: { id },
      include: { domain: { select: { domainName: true, tld: true } } },
    });

    if (!account) {
      throw new NotFoundException(`Email account with ID "${id}" not found.`);
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have access to this email account.');
    }

    // Enrich with live data from provider API
    if (account.rcOrderId) {
      try {
        let liveDetails: Record<string, unknown> | null = null;

        if (account.provider === EmailProvider.TITAN) {
          liveDetails = await this.titanEmail.getAccountDetails(account.rcOrderId);
        } else if (account.provider === EmailProvider.GOOGLE_WORKSPACE) {
          liveDetails = await this.resellerClub.getGoogleWorkspaceDetails(account.rcOrderId);
        }

        if (liveDetails) {
          return {
            ...account,
            liveDetails: {
              currentStatus: (liveDetails as any).currentstatus ?? (liveDetails as any).status ?? null,
              expiryDate: (liveDetails as any).endtime ?? (liveDetails as any).expiryDate ?? null,
              orderStatus: (liveDetails as any).orderstatus ?? null,
              noOfAccounts: (liveDetails as any).noofaccounts ?? null,
              autoRenew: (liveDetails as any).autorenew ?? null,
              domainName: (liveDetails as any).domainname ?? null,
              planName: (liveDetails as any).planname ?? null,
              rawDetails: liveDetails,
            },
          };
        }
      } catch (error) {
        this.logger.warn(
          `Failed to fetch live details for email account ${id}: ${(error as Error).message}`,
        );
      }
    }

    return { ...account, liveDetails: null };
  }

  // ─── Password Change ──────────────────────────────────────────────────────

  /**
   * Change the mailbox password via the Titan API and update the record.
   */
  async changeEmailPassword(
    id: string,
    userId: string,
    newPassword: string,
  ) {
    const account = await this.prisma.emailAccount.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException(`Email account with ID "${id}" not found.`);
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have access to this email account.');
    }

    if (!account.rcOrderId) {
      throw new InternalServerErrorException(
        'This email account has not been fully provisioned yet.',
      );
    }

    if (account.provider !== EmailProvider.TITAN) {
      throw new InternalServerErrorException(
        'Password change via API is only supported for Titan email accounts. For Google Workspace, use the Google Admin Console.',
      );
    }

    this.logger.log(`Changing password for email account: ${id}`);

    try {
      await this.titanEmail.changePassword(
        account.rcOrderId,
        account.emailAddress,
        newPassword,
      );

      const updated = await this.prisma.emailAccount.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      this.eventEmitter.emit('email.password_changed', {
        emailAccountId: id,
        emailAddress: account.emailAddress,
        userId,
      });

      this.logger.log(`Password changed for email account: ${id}`);
      return updated;
    } catch (error) {
      this.logger.error(
        `Failed to change password for email account ${id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        'Failed to change email password. Please try again.',
      );
    }
  }

  // ─── Account Deletion ─────────────────────────────────────────────────────

  /**
   * Delete an email account by calling the provider API and updating the DB.
   * For Titan: deletes the order via TitanEmailService.
   * For Google Workspace: deletes via ResellerClubService.
   */
  async deleteEmailAccount(id: string, userId: string) {
    const account = await this.prisma.emailAccount.findUnique({
      where: { id },
      include: { domain: { select: { domainName: true, tld: true } } },
    });

    if (!account) {
      throw new NotFoundException(`Email account with ID "${id}" not found.`);
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have access to this email account.');
    }

    this.logger.log(`Deleting email account: ${id} (${account.emailAddress})`);

    // Mark as suspended immediately to prevent further use.
    await this.prisma.emailAccount.update({
      where: { id },
      data: { status: EmailStatus.SUSPENDED },
    });

    if (account.rcOrderId) {
      try {
        if (account.provider === EmailProvider.TITAN) {
          // Delete Titan email order via TitanEmailService
          await this.titanEmail.deleteOrder(account.rcOrderId);
          this.logger.log(`Titan email order ${account.rcOrderId} deleted`);
        } else if (account.provider === EmailProvider.GOOGLE_WORKSPACE) {
          // Delete Google Workspace order via ResellerClubService
          await this.resellerClub.deleteGoogleWorkspace(account.rcOrderId);
          this.logger.log(`Google Workspace order ${account.rcOrderId} deleted`);
        }

        // Mark as cancelled after successful API deletion
        await this.prisma.emailAccount.update({
          where: { id },
          data: { status: EmailStatus.CANCELLED },
        });
      } catch (error) {
        this.logger.error(
          `Failed to delete provider order for email account ${id}: ${(error as Error).message}`,
          (error as Error).stack,
        );

        // Enqueue a deprovisioning job for retry
        const jobPayload: EmailDeprovisioningJob = {
          emailAccountId: id,
          rcOrderId: account.rcOrderId,
          emailAddress: account.emailAddress,
        };

        await this.emailQueue.add('deprovision-email', jobPayload, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        });

        this.logger.log(`Deprovision job enqueued for email account: ${id} (retry after direct delete failed)`);
      }
    } else {
      // No RC order created yet — directly mark cancelled.
      await this.prisma.emailAccount.update({
        where: { id },
        data: { status: EmailStatus.CANCELLED },
      });
    }

    this.eventEmitter.emit('email.account_deleted', {
      emailAccountId: id,
      emailAddress: account.emailAddress,
      userId,
      provider: account.provider,
    });

    return { success: true, message: 'Email account deletion initiated.' };
  }

  // ─── Forwarders ───────────────────────────────────────────────────────────

  /**
   * Get all forwarders for the given email account.
   */
  async getForwarders(id: string, userId: string): Promise<TitanForwarder[]> {
    const account = await this.prisma.emailAccount.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException(`Email account with ID "${id}" not found.`);
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have access to this email account.');
    }

    if (!account.rcOrderId) {
      throw new InternalServerErrorException(
        'This email account has not been fully provisioned yet.',
      );
    }

    return this.titanEmail.getForwarders(account.rcOrderId, account.emailAddress);
  }

  /**
   * Add a new forwarder to the given email account.
   */
  async addForwarder(
    id: string,
    userId: string,
    forwardTo: string,
  ): Promise<TitanForwarder> {
    const account = await this.prisma.emailAccount.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException(`Email account with ID "${id}" not found.`);
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have access to this email account.');
    }

    if (!account.rcOrderId) {
      throw new InternalServerErrorException(
        'This email account has not been fully provisioned yet.',
      );
    }

    this.logger.log(`Adding forwarder ${forwardTo} to email account: ${id}`);
    return this.titanEmail.addForwarder(
      account.rcOrderId,
      account.emailAddress,
      forwardTo,
    );
  }

  /**
   * Remove a forwarder from the given email account.
   */
  async removeForwarder(
    id: string,
    userId: string,
    forwarderId: string,
  ): Promise<{ success: boolean }> {
    const account = await this.prisma.emailAccount.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException(`Email account with ID "${id}" not found.`);
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have access to this email account.');
    }

    if (!account.rcOrderId) {
      throw new InternalServerErrorException(
        'This email account has not been fully provisioned yet.',
      );
    }

    this.logger.log(`Removing forwarder ${forwarderId} from email account: ${id}`);
    await this.titanEmail.removeForwarder(
      account.rcOrderId,
      account.emailAddress,
      forwarderId,
    );

    return { success: true };
  }

  // ─── Email Renewal ──────────────────────────────────────────────────────────

  /**
   * Renew an email account subscription via the appropriate provider API.
   */
  async renewEmail(
    id: string,
    userId: string,
    months: number = 12,
  ): Promise<{ success: boolean; message: string }> {
    const account = await this.prisma.emailAccount.findUnique({ where: { id } });

    if (!account) {
      throw new NotFoundException(`Email account with ID "${id}" not found.`);
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('You do not have access to this email account.');
    }

    if (!account.rcOrderId) {
      throw new InternalServerErrorException(
        'This email account has not been fully provisioned yet.',
      );
    }

    this.logger.log(
      `Renewing email account ${id} (provider=${account.provider}, months=${months})`,
    );

    try {
      if (account.provider === EmailProvider.GOOGLE_WORKSPACE) {
        await this.resellerClub.renewGoogleWorkspace(
          account.rcOrderId,
          months,
          account.mailboxCount || 1,
        );
      } else if (account.provider === EmailProvider.TITAN) {
        await this.resellerClub.renewTitanEmail(
          account.rcOrderId,
          months,
          account.mailboxCount || 1,
        );
      } else {
        throw new InternalServerErrorException(
          `Renewal is not supported for provider: ${account.provider}`,
        );
      }

      // Extend expiry date
      const newExpiry = account.expiryDate ? new Date(account.expiryDate) : new Date();
      newExpiry.setMonth(newExpiry.getMonth() + months);

      await this.prisma.emailAccount.update({
        where: { id },
        data: {
          expiryDate: newExpiry,
          status: EmailStatus.ACTIVE,
          updatedAt: new Date(),
        },
      });

      this.eventEmitter.emit('email.renewed', {
        emailAccountId: id,
        emailAddress: account.emailAddress,
        userId,
        months,
        provider: account.provider,
      });

      this.logger.log(`Email account ${id} renewed successfully for ${months} months`);
      return {
        success: true,
        message: `Email account renewed for ${months} months. New expiry: ${newExpiry.toISOString()}.`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to renew email account ${id}: ${(error as Error).message}`,
        (error as Error).stack,
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to renew email account. Please try again.',
      );
    }
  }
}
