import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HostingStatus, HostingProvider } from '@prisma/client';
import { computeExpiry } from '../hosting-billing.util';
import { CyberPanelService } from '../services/cyberpanel.service';
import { ProxmoxService } from '../services/proxmox.service';
import { ContaboService } from '../services/contabo.service';
import { DockerService } from '../services/docker.service';
import { ResellerClubService } from '../../domain/services/resellerclub.service';
import { PrismaService } from '../../../database/prisma.service';
import { HostingService } from '../hosting.service';
import { ProvisioningJob, VpsProvisioningJob } from '../interfaces/hosting.interface';

const OS_TEMPLATE_MAP: Record<string, number> = {
  'ubuntu-22.04': 9000,
  'ubuntu-20.04': 9001,
  'debian-12': 9002,
  'debian-11': 9003,
  'centos-9': 9004,
  'almalinux-9': 9005,
  'rocky-9': 9006,
};

@Processor('provisioning')
export class ProvisioningProcessor {
  private readonly logger = new Logger(ProvisioningProcessor.name);

  constructor(
    private readonly cyberPanel: CyberPanelService,
    private readonly proxmox: ProxmoxService,
    private readonly contabo: ContaboService,
    private readonly dockerService: DockerService,
    private readonly resellerClub: ResellerClubService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly hostingService: HostingService,
  ) {}

  /**
   * Daily repeatable (registered by HostingService.onModuleInit): email clients
   * whose VPS/VDS contract expires within 7 days. Delegates to the service sweep.
   */
  @Process('expiry-reminder')
  async handleExpiryReminder(): Promise<void> {
    const { reminded } = await this.hostingService.runExpiryReminderSweep();
    this.logger.log(`expiry-reminder job done: ${reminded} reminder(s) sent`);
  }

  /** Contract-term expiry = now + the account's billing term (provision time). */
  private async computeExpiryForAccount(hostingId: string): Promise<Date> {
    const acc = await this.prisma.hostingAccount.findUnique({
      where: { id: hostingId },
      select: { billingCycle: true },
    });
    return computeExpiry(new Date(), acc?.billingCycle ?? 'MONTHLY');
  }

  @Process('provision-shared')
  async handleProvisionShared(job: Job<ProvisioningJob>): Promise<void> {
    const { hostingId, domain, planId, adminUsername, adminEmail, adminPassword } =
      job.data;

    this.logger.log(
      `Provisioning shared hosting [${hostingId}] for domain: ${domain}`,
    );

    try {
      const username = adminUsername || domain.replace(/\./g, '_').substring(0, 16);
      const email = adminEmail || `admin@${domain}`;
      const password =
        adminPassword || Math.random().toString(36).slice(-12) + 'A1!';

      await this.cyberPanel.createAccount(
        domain,
        username,
        email,
        password,
        planId,
      );

      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: {
          status: HostingStatus.ACTIVE,
          cpanelUsername: username,
          provisionedAt: new Date(),
        },
      });

      this.eventEmitter.emit('hosting.provisioned', { hostingId, domain, type: 'shared' });
      this.logger.log(`Shared hosting provisioned successfully: ${hostingId}`);
    } catch (error) {
      this.logger.error(
        `Failed to provision shared hosting [${hostingId}]: ${(error as Error).message}`,
        (error as Error).stack,
      );

      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: {
          status: HostingStatus.PENDING_SETUP,
        },
      });

      this.eventEmitter.emit('hosting.provision_failed', {
        hostingId,
        domain,
        type: 'shared',
        error: (error as Error).message,
      });
      throw error;
    }
  }

  @Process('provision-wordpress')
  async handleProvisionWordpress(job: Job<ProvisioningJob>): Promise<void> {
    const {
      hostingId,
      domain,
      planId,
      adminUsername,
      adminEmail,
      adminPassword,
      siteTitle,
    } = job.data;

    this.logger.log(
      `Provisioning WordPress hosting [${hostingId}] for domain: ${domain}`,
    );

    try {
      const username = adminUsername || domain.replace(/\./g, '_').substring(0, 16);
      const email = adminEmail || `admin@${domain}`;
      const password =
        adminPassword || Math.random().toString(36).slice(-12) + 'A1!';
      const wpAdmin = adminUsername || 'wpadmin';
      const title = siteTitle || domain;

      await this.cyberPanel.createAccount(
        domain,
        username,
        email,
        password,
        planId,
      );

      await this.cyberPanel.createWordPressSite(
        domain,
        username,
        email,
        wpAdmin,
        password,
        title,
      );

      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: {
          status: HostingStatus.ACTIVE,
          cpanelUsername: username,
          provisionedAt: new Date(),
        },
      });

      this.eventEmitter.emit('hosting.provisioned', {
        hostingId,
        domain,
        type: 'wordpress',
      });
      this.logger.log(`WordPress hosting provisioned successfully: ${hostingId}`);
    } catch (error) {
      this.logger.error(
        `Failed to provision WordPress hosting [${hostingId}]: ${(error as Error).message}`,
        (error as Error).stack,
      );

      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: {
          status: HostingStatus.PENDING_SETUP,
        },
      });

      this.eventEmitter.emit('hosting.provision_failed', {
        hostingId,
        domain,
        type: 'wordpress',
        error: (error as Error).message,
      });
      throw error;
    }
  }

  @Process('provision-vps')
  async handleProvisionVps(job: Job<VpsProvisioningJob>): Promise<void> {
    const { hostingId, hostname, planId, osTemplate, sshKey, node } = job.data;

    this.logger.log(
      `Provisioning VPS [${hostingId}] hostname: ${hostname}, plan: ${planId}`,
    );

    try {
      const templateId = OS_TEMPLATE_MAP[osTemplate] ?? OS_TEMPLATE_MAP['ubuntu-22.04'];
      const vmId = await this.proxmox.getNextVmId();

      await this.proxmox.cloneTemplate(node, templateId, vmId, {
        name: hostname,
        full: 1,
        description: `Hosted Nepal VPS - ${hostingId}`,
      });

      const ipAddress = await this.proxmox.allocateIp(vmId);

      await this.proxmox.startVm(node, vmId);

      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: {
          status: HostingStatus.ACTIVE,
          serverId: String(vmId),
          ipAddress,
          provisionedAt: new Date(),
          expiryDate: await this.computeExpiryForAccount(hostingId),
        },
      });

      this.eventEmitter.emit('hosting.provisioned', {
        hostingId,
        hostname,
        type: 'vps',
        vmId,
        ipAddress,
        // Reinstall reuses this job (isReinstall flag set by the service); pass it
        // through so the email listener can skip the full "VPS ready" welcome.
        isReinstall: (job.data as { isReinstall?: boolean }).isReinstall === true,
      });
      this.logger.log(
        `VPS provisioned successfully: ${hostingId} (vmId=${vmId}, ip=${ipAddress})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to provision VPS [${hostingId}]: ${(error as Error).message}`,
        (error as Error).stack,
      );

      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: {
          status: HostingStatus.PENDING_SETUP,
        },
      });

      this.eventEmitter.emit('hosting.provision_failed', {
        hostingId,
        hostname,
        type: 'vps',
        error: (error as Error).message,
      });
      throw error;
    }
  }

  @Process('provision-shared-rc')
  async handleProvisionSharedRc(
    job: Job<{ hostingId: string; userId: string; domain: string; planId: string; rcCustomerId: string }>,
  ): Promise<void> {
    const { hostingId, domain, planId, rcCustomerId } = job.data;

    this.logger.log(
      `Provisioning shared hosting via ResellerClub [${hostingId}] for domain: ${domain}`,
    );

    try {
      const rcResponse = await this.resellerClub.orderHosting({
        domainName: domain,
        customerId: rcCustomerId,
        planId: planId,
        months: 12,
        productKey: 'multidomainhosting',
      });

      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: {
          status: HostingStatus.ACTIVE,
          rcOrderId: String(rcResponse.entityid || rcResponse),
          provider: HostingProvider.RESELLERCLUB,
          provisionedAt: new Date(),
        },
      });

      this.eventEmitter.emit('hosting.provisioned', { hostingId, domain, type: 'shared-rc' });
      this.logger.log(
        `RC shared hosting provisioned for ${domain}: order ${rcResponse.entityid || rcResponse}`,
      );
    } catch (error) {
      this.logger.error(
        `RC shared hosting failed for ${domain} [${hostingId}]: ${(error as Error).message}`,
        (error as Error).stack,
      );

      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: { status: HostingStatus.PENDING_SETUP },
      });

      this.eventEmitter.emit('hosting.provision_failed', {
        hostingId,
        domain,
        type: 'shared-rc',
        error: (error as Error).message,
      });
      throw error;
    }
  }

  @Process('provision-wordpress-rc')
  async handleProvisionWordPressRc(
    job: Job<{ hostingId: string; userId: string; domain: string; planId: string; rcCustomerId: string }>,
  ): Promise<void> {
    const { hostingId, domain, planId, rcCustomerId } = job.data;

    this.logger.log(
      `Provisioning WordPress hosting via ResellerClub [${hostingId}] for domain: ${domain}`,
    );

    try {
      const rcResponse = await this.resellerClub.orderHosting({
        domainName: domain,
        customerId: rcCustomerId,
        planId: planId,
        months: 12,
        productKey: 'wordpresshostingusa',
      });

      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: {
          status: HostingStatus.ACTIVE,
          rcOrderId: String(rcResponse.entityid || rcResponse),
          provider: HostingProvider.RESELLERCLUB,
          provisionedAt: new Date(),
        },
      });

      this.eventEmitter.emit('hosting.provisioned', { hostingId, domain, type: 'wordpress-rc' });
      this.logger.log(
        `RC WordPress hosting provisioned for ${domain}: order ${rcResponse.entityid || rcResponse}`,
      );
    } catch (error) {
      this.logger.error(
        `RC WordPress hosting failed for ${domain} [${hostingId}]: ${(error as Error).message}`,
        (error as Error).stack,
      );

      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: { status: HostingStatus.PENDING_SETUP },
      });

      this.eventEmitter.emit('hosting.provision_failed', {
        hostingId,
        domain,
        type: 'wordpress-rc',
        error: (error as Error).message,
      });
      throw error;
    }
  }

  @Process('provision-vps-rc')
  async handleProvisionVpsRc(
    job: Job<{ hostingId: string; userId: string; hostname: string; planId: string; rcCustomerId: string }>,
  ): Promise<void> {
    const { hostingId, hostname, planId, rcCustomerId } = job.data;

    this.logger.log(
      `Provisioning VPS via ResellerClub [${hostingId}] hostname: ${hostname}`,
    );

    try {
      const rcResponse = await this.resellerClub.orderVps({
        domainName: hostname,
        customerId: rcCustomerId,
        planId: planId,
        months: 1,
      });

      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: {
          status: HostingStatus.ACTIVE,
          rcOrderId: String(rcResponse.entityid || rcResponse),
          provider: HostingProvider.RESELLERCLUB,
          provisionedAt: new Date(),
          expiryDate: await this.computeExpiryForAccount(hostingId),
        },
      });

      this.eventEmitter.emit('hosting.provisioned', {
        hostingId,
        hostname,
        type: 'vps-rc',
      });
      this.logger.log(
        `RC VPS provisioned for ${hostname}: order ${rcResponse.entityid || rcResponse}`,
      );
    } catch (error) {
      this.logger.error(
        `RC VPS provisioning failed for ${hostname} [${hostingId}]: ${(error as Error).message}`,
        (error as Error).stack,
      );

      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: { status: HostingStatus.PENDING_SETUP },
      });

      this.eventEmitter.emit('hosting.provision_failed', {
        hostingId,
        hostname,
        type: 'vps-rc',
        error: (error as Error).message,
      });
      throw error;
    }
  }

  @Process('provision-vps-contabo')
  async handleProvisionContabo(
    job: Job<{
      hostingId: string;
      productId: string;
      imageId: string;
      region: string;
      displayName?: string;
      rootPassword?: number;
      sshKeyPlain?: string | null;
      rootPasswordPlain?: string | null;
      containerStack?: string;
    }>,
  ): Promise<void> {
    const {
      hostingId,
      productId,
      imageId,
      region,
      displayName,
      sshKeyPlain,
      rootPasswordPlain,
      containerStack,
    } = job.data;
    let { rootPassword } = job.data;

    this.logger.log(
      `Provisioning VPS via Contabo [${hostingId}] productId: ${productId}, region: ${region}`,
    );

    try {
      // Idempotency guard: if this hosting row already has a provider instance id
      // (serverId) or is already ACTIVE, a previous run already provisioned the
      // (paid) VM. Re-running createInstance would create a SECOND billable VM,
      // so short-circuit instead.
      const current = await this.prisma.hostingAccount.findUnique({
        where: { id: hostingId },
        select: { serverId: true, status: true },
      });
      if (current?.serverId || current?.status === HostingStatus.ACTIVE) {
        this.logger.warn(
          `Contabo provisioning for ${hostingId} skipped: already provisioned ` +
            `(serverId=${current?.serverId ?? 'none'}, status=${current?.status})`,
        );
        return;
      }

      // Contabo takes credentials as SECRET IDs, not raw values. Convert the
      // customer's order inputs into secrets so their chosen root password and
      // SSH key are actually installed on the VM.
      let sshKeyIds: number[] | undefined;
      const shortId = hostingId.slice(0, 8);
      // Contabo wraps responses as {data:[{...}]}; tolerate flat shapes too.
      const extractSecretId = (sec: any): number | undefined => {
        const resp = sec?.data?.[0] ?? sec?.data ?? sec;
        const id = resp?.secretId;
        return id ? Number(id) : undefined;
      };
      if (rootPasswordPlain && !rootPassword) {
        try {
          const sec = await this.contabo.createSecret(`hn-${shortId}-pw`, rootPasswordPlain, 'password');
          rootPassword = extractSecretId(sec);
          if (!rootPassword) {
            this.logger.warn(
              `Contabo password secret for ${hostingId}: could not extract secretId from response ${JSON.stringify(sec).slice(0, 200)}`,
            );
          }
        } catch (e) {
          this.logger.warn(
            `Contabo password secret failed for ${hostingId} (${(e as Error).message}); VM will use an auto-generated password`,
          );
        }
      }
      if (sshKeyPlain) {
        try {
          const sec = await this.contabo.createSecret(`hn-${shortId}-ssh`, sshKeyPlain.trim(), 'ssh');
          const secId = extractSecretId(sec);
          if (secId) sshKeyIds = [secId];
          else
            this.logger.warn(
              `Contabo ssh secret for ${hostingId}: could not extract secretId from response ${JSON.stringify(sec).slice(0, 200)}`,
            );
        } catch (e) {
          this.logger.warn(
            `Contabo ssh secret failed for ${hostingId} (${(e as Error).message}); key will not be installed`,
          );
        }
      }

      // Generate cloud-init userData if a container stack was requested
      const userData = containerStack && containerStack !== 'none'
        ? this.dockerService.getInstallScriptForType(containerStack) || undefined
        : undefined;

      const result = await this.contabo.createInstance({
        productId,
        imageId,
        region,
        displayName,
        rootPassword,
        sshKeys: sshKeyIds,
        period: 1,
        userData,
      });

      // Extract instance data from Contabo response
      const instanceData = result?.data?.[0] || result?.data || result;
      const contaboInstanceId = instanceData?.instanceId || instanceData?.computeInstanceId;
      let ipAddress =
        instanceData?.ipConfig?.v4?.ip ||
        instanceData?.ipv4 ||
        (instanceData?.ipConfig?.v4Addresses?.[0]?.ip) ||
        null;
      let ipv6 = instanceData?.ipConfig?.v6?.ip || null;
      let defaultUser = instanceData?.defaultUser || null;

      // Persist the Contabo instance id IMMEDIATELY — before the long
      // waitForInstanceReady poll. If the worker dies (or the job retries) during
      // the poll, the idempotency guard above will see this serverId and refuse to
      // create a second billable VM.
      if (contaboInstanceId) {
        await this.prisma.hostingAccount.update({
          where: { id: hostingId },
          data: {
            serverId: String(contaboInstanceId),
            status: HostingStatus.PROVISIONING,
          },
        });
      }

      // The create response usually has no IP yet (instance still installing) — wait
      // for it to come up so we capture the assigned IPv4 for the dashboard.
      if (contaboInstanceId && !ipAddress) {
        try {
          const ready = await this.contabo.waitForInstanceReady(Number(contaboInstanceId));
          ipAddress =
            ready?.ipConfig?.v4?.ip ||
            ready?.ipv4 ||
            ready?.ipConfig?.v4Addresses?.[0]?.ip ||
            null;
          ipv6 = ready?.ipConfig?.v6?.ip || ipv6;
          defaultUser = ready?.defaultUser || defaultUser;
        } catch (e) {
          this.logger.warn(
            `Contabo ${contaboInstanceId}: waitForInstanceReady failed (${(e as Error).message}); IP will sync later`,
          );
        }
      }

      // Store metadata indicating this is a Contabo instance. Deliberately REPLACE
      // the pending-request blob (it held the plaintext order credentials), but
      // preserve a pendingUpgrade marker if one was added meanwhile.
      let carriedUpgrade: Record<string, unknown> | undefined;
      try {
        const existing = await this.prisma.hostingAccount.findUnique({
          where: { id: hostingId },
          select: { cpanelPasswordEncrypted: true },
        });
        const parsed = existing?.cpanelPasswordEncrypted
          ? JSON.parse(existing.cpanelPasswordEncrypted)
          : null;
        if (parsed?.pendingUpgrade) carriedUpgrade = parsed.pendingUpgrade;
      } catch {
        // non-JSON or missing — nothing to carry over
      }
      const meta = JSON.stringify({
        providerType: 'contabo',
        contaboInstanceId,
        productId,
        region,
        containerStack: containerStack || 'none',
        createdAt: new Date().toISOString(),
        ...(carriedUpgrade ? { pendingUpgrade: carriedUpgrade } : {}),
      });

      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: {
          status: HostingStatus.ACTIVE,
          serverId: contaboInstanceId ? String(contaboInstanceId) : undefined,
          ipAddress: ipAddress || undefined,
          cpanelPasswordEncrypted: meta,
          provisionedAt: new Date(),
          expiryDate: await this.computeExpiryForAccount(hostingId),
        },
      });

      this.eventEmitter.emit('hosting.provisioned', {
        hostingId,
        displayName,
        type: 'vps-contabo',
        instanceId: contaboInstanceId,
        ipAddress,
        ipv6,
        defaultUser,
        sshKeyInstalled: !!sshKeyIds?.length,
      });
      this.logger.log(
        `Contabo VPS provisioned successfully: ${hostingId} (instanceId=${contaboInstanceId}, ip=${ipAddress})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to provision Contabo VPS [${hostingId}]: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Terminal failure: move to a clear needs-attention state (SUSPENDED) and
      // NULL the pending-request blob. That blob holds BOTH the plaintext order
      // credentials (purge them — see #4) AND awaitingApproval:true. If we left it
      // and reset to PENDING_SETUP, the failed request would silently re-enter the
      // approval queue and a re-approval would create ANOTHER paid VM (see #1).
      // TODO: encrypt pending VPS request blob (at-rest encryption is a larger change)
      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: {
          status: HostingStatus.SUSPENDED,
          cpanelPasswordEncrypted: null,
        },
      });

      this.eventEmitter.emit('hosting.provision_failed', {
        hostingId,
        displayName,
        type: 'vps-contabo',
        error: (error as Error).message,
      });
      throw error;
    }
  }

  @Process('provision-wordpress-contabo')
  async handleProvisionWordPressContabo(
    job: Job<{
      hostingId: string;
      domain: string;
      productId: string;
      region: string;
      wpAdminEmail?: string;
      wpAdminUser?: string;
      wpAdminPass?: string;
      wpTitle?: string;
    }>,
  ): Promise<void> {
    const {
      hostingId,
      domain,
      productId,
      region,
      wpAdminEmail,
      wpAdminUser,
      wpAdminPass,
      wpTitle,
    } = job.data;

    try {
      this.logger.log(
        `[WP-Contabo] Starting WordPress provisioning for ${domain}`,
      );

      // Step 1: Create Contabo VPS with Ubuntu 22.04
      const ubuntuImageId = 'afecbb85-e2fc-46f0-9684-b46b1faf00bb';

      this.logger.log(
        `[WP-Contabo] Creating Contabo VPS with Ubuntu 22.04...`,
      );
      const instanceResult = await this.contabo.createInstance({
        imageId: ubuntuImageId,
        productId: productId || 'V45',
        region: region || 'EU',
        displayName: `wp-${domain}`,
        defaultUser: 'root',
        period: 1,
      });

      const instanceData =
        instanceResult?.data?.[0] ||
        instanceResult?.data ||
        instanceResult;
      const instanceId = instanceData.instanceId;
      this.logger.log(`[WP-Contabo] Instance created: ${instanceId}`);

      // Step 2: Wait for instance to be running with IP
      this.logger.log(
        `[WP-Contabo] Waiting for instance ${instanceId} to be ready...`,
      );
      const readyInstance =
        await this.contabo.waitForInstanceReady(instanceId);
      const ipAddress = readyInstance.ipConfig?.v4?.ip;
      this.logger.log(
        `[WP-Contabo] Instance ready: IP=${ipAddress}`,
      );

      // Step 3: Update DB with IP and instance info
      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: {
          ipAddress,
          serverId: String(instanceId),
          status: HostingStatus.PROVISIONING,
          cpanelPasswordEncrypted: JSON.stringify({
            providerType: 'contabo',
            instanceId,
            ipAddress,
            region: region || 'EU',
            productId: productId || 'V45',
            cyberPanelUrl: `https://${ipAddress}:8090`,
            cyberPanelUser: 'admin',
            cyberPanelPass: 'CyberP@nel2024',
            wpAdminUrl: `https://${domain}/wp-admin`,
            wpAdminUser: wpAdminUser || 'admin',
            wpAdminPass: wpAdminPass || 'admin',
          }),
        },
      });

      // Step 4: Wait for CyberPanel to be installed and ready (up to 15 mins)
      this.logger.log(
        `[WP-Contabo] Waiting for CyberPanel installation on ${ipAddress}...`,
      );
      const cpReady = await this.cyberPanel.waitForCyberPanelReady(
        ipAddress,
        900000,
      );

      if (!cpReady) {
        this.logger.warn(
          `[WP-Contabo] CyberPanel not ready on ${ipAddress} after 15 mins — marking for manual setup`,
        );
        await this.prisma.hostingAccount.update({
          where: { id: hostingId },
          data: { status: HostingStatus.PENDING_SETUP },
        });
        return;
      }

      // Step 5: Create website account on CyberPanel
      this.logger.log(
        `[WP-Contabo] Creating website ${domain} on CyberPanel...`,
      );
      const cpUsername = domain
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 8);
      const cpPassword =
        Math.random().toString(36).slice(-12) + 'Cp1!';

      await this.cyberPanel.createAccountRemote(
        ipAddress,
        'admin',
        'CyberP@nel2024',
        domain,
        cpUsername,
        wpAdminEmail || `admin@${domain}`,
        cpPassword,
        'Default',
      );

      // Step 6: Install WordPress
      this.logger.log(
        `[WP-Contabo] Installing WordPress on ${domain}...`,
      );
      await this.cyberPanel.installWordPressRemote(
        ipAddress,
        'admin',
        'CyberP@nel2024',
        domain,
        wpAdminEmail || `admin@${domain}`,
        wpAdminUser || 'admin',
        wpAdminPass || cpPassword,
        wpTitle || domain,
      );

      // Step 7: Create WordPress record in DB
      await this.prisma.wordPressSite.create({
        data: {
          hostingId,
          adminUrl: `https://${domain}/wp-admin`,
          wpVersion: 'latest',
          autoUpdatesEnabled: true,
          stagingActive: false,
          status: 'ACTIVE',
        },
      });

      // Step 8: Final update — ACTIVE
      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: {
          status: HostingStatus.ACTIVE,
          cpanelUsername: cpUsername,
          provisionedAt: new Date(),
        },
      });

      this.logger.log(
        `[WP-Contabo] WordPress hosting provisioned: ${domain} @ ${ipAddress}`,
      );

      this.eventEmitter.emit('hosting.provisioned', {
        hostingId,
        domain,
        ipAddress,
        provider: 'CONTABO',
        type: 'WORDPRESS',
      });
    } catch (error) {
      this.logger.error(
        `[WP-Contabo] Failed for ${domain}: ${(error as Error).message}`,
        (error as Error).stack,
      );

      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: { status: HostingStatus.PENDING_SETUP },
      });

      throw error;
    }
  }

  @Process('deprovision-hosting')
  async handleDeprovisionHosting(
    job: Job<{ hostingId: string; type: string; username?: string; vmId?: number; node?: string }>,
  ): Promise<void> {
    const { hostingId, type, username, vmId, node } = job.data;

    this.logger.log(`Deprovisioning hosting [${hostingId}] type: ${type}`);

    try {
      if ((type === 'shared' || type === 'wordpress') && username) {
        await this.cyberPanel.deleteAccount(username);
      } else if ((type === 'vps' || type === 'vds') && vmId) {
        // Check if this is a Contabo instance (vmId > 100000000)
        if (vmId > 100000000) {
          this.logger.log(`Cancelling Contabo instance ${vmId}`);
          await this.contabo.cancelInstance(vmId);
        } else if (node) {
          await this.proxmox.stopVm(node, vmId);
          await this.proxmox.deleteVm(node, vmId);
        }
      }

      await this.prisma.hostingAccount.update({
        where: { id: hostingId },
        data: { status: HostingStatus.DELETED },
      });

      this.eventEmitter.emit('hosting.deprovisioned', { hostingId, type });
      this.logger.log(`Hosting deprovisioned successfully: ${hostingId}`);
    } catch (error) {
      this.logger.error(
        `Failed to deprovision hosting [${hostingId}]: ${(error as Error).message}`,
        (error as Error).stack,
      );

      this.eventEmitter.emit('hosting.deprovision_failed', {
        hostingId,
        type,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
