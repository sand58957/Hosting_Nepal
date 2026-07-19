import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../database/prisma.service';
import { SendgridService } from '../services/sendgrid.service';

interface HostingProvisionedEvent {
  hostingId: string;
  displayName?: string;
  type?: string;
  instanceId?: number | string;
  ipAddress?: string | null;
  ipv6?: string | null;
  defaultUser?: string | null;
  sshKeyInstalled?: boolean;
  // Set when a reinstall reuses the provisioning job; the full "VPS ready"
  // welcome (SSH details etc.) should only fire on the FIRST provision.
  isReinstall?: boolean;
}

interface VpsRejectedEvent {
  hostingId: string;
  email: string;
  firstName: string;
  serviceName: string;
  planName?: string | null;
  reason?: string | null;
}

@Injectable()
export class HostingEmailListener {
  private readonly logger = new Logger(HostingEmailListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: SendgridService,
  ) {}

  @OnEvent('hosting.provisioned', { async: true })
  async onProvisioned(payload: HostingProvisionedEvent): Promise<void> {
    // This event also fires for shared/WordPress provisioning — the "Your VPS is
    // ready" email (SSH details etc.) only makes sense for VPS types.
    if (!payload.type || !payload.type.toLowerCase().includes('vps')) return;
    // A reinstall reuses the provisioning job and re-emits this event. The full
    // welcome (credentials, SSH setup) would be misleading on a reinstall, so
    // skip it — the customer initiated the reinstall and already has access.
    if (payload.isReinstall) {
      this.logger.log(`hosting.provisioned (reinstall) for ${payload.hostingId}: skipping VPS welcome email`);
      return;
    }
    try {
      const hosting = await this.prisma.hostingAccount.findUnique({
        where: { id: payload.hostingId },
        include: { user: { select: { email: true, name: true } } },
      });
      if (!hosting?.user?.email) {
        this.logger.warn(`hosting.provisioned: no user for ${payload.hostingId}`);
        return;
      }
      await this.mail.sendVpsProvisioned(
        {
          email: hosting.user.email,
          firstName: hosting.user.name?.split(' ')[0] || 'Customer',
        },
        {
          displayName: payload.displayName || hosting.planName,
          planName: hosting.planName,
          ipAddress: payload.ipAddress ?? hosting.ipAddress,
          ipv6: payload.ipv6 ?? null,
          location: 'Hub Europe (EU)',
          username: payload.defaultUser || 'admin',
          sshKeyInstalled: payload.sshKeyInstalled,
        },
      );
    } catch (e) {
      this.logger.warn(`provisioned email failed: ${(e as Error).message}`);
    }
  }

  @OnEvent('vps.requested', { async: true })
  async onRequested(payload: {
    hostingId: string;
    email: string;
    firstName: string;
    planName: string;
    hostname?: string | null;
  }): Promise<void> {
    try {
      await this.mail.sendVpsRequestReceived(
        { email: payload.email, firstName: payload.firstName },
        { planName: payload.planName, hostname: payload.hostname },
      );
    } catch (e) {
      this.logger.warn(`request-received email failed: ${(e as Error).message}`);
    }

    // Operator heads-up so requests don't sit unnoticed in the approvals queue.
    try {
      const hosting = await this.prisma.hostingAccount.findUnique({
        where: { id: payload.hostingId },
        include: { user: { select: { name: true, email: true, isFree: true } } },
      });
      await this.mail.sendAdminVpsRequestAlert({
        customerName: hosting?.user?.name || payload.firstName,
        customerEmail: hosting?.user?.email || payload.email,
        planName: payload.planName,
        hostname: payload.hostname,
        isFree: hosting?.user?.isFree,
      });
    } catch (e) {
      this.logger.warn(`admin vps-request alert failed: ${(e as Error).message}`);
    }
  }

  @OnEvent('vps.upgrade-requested', { async: true })
  async onUpgradeRequested(payload: {
    hostingId: string;
    userId: string;
    currentPlan: string;
    newPlanId: string;
    newPlanName: string;
  }): Promise<void> {
    // Contabo upgrades are applied manually by an admin in the Contabo panel, so
    // alert the operator that a request is waiting (mirrors vps.requested). Reuse
    // the existing admin VPS-request alert rather than a bespoke template.
    try {
      const hosting = await this.prisma.hostingAccount.findUnique({
        where: { id: payload.hostingId },
        include: { user: { select: { name: true, email: true, isFree: true } } },
      });
      await this.mail.sendAdminVpsRequestAlert({
        customerName: hosting?.user?.name || 'Customer',
        customerEmail: hosting?.user?.email || 'unknown',
        planName: `Upgrade: ${payload.currentPlan} → ${payload.newPlanName}`,
        hostname: null,
        isFree: hosting?.user?.isFree,
      });
    } catch (e) {
      this.logger.warn(`admin vps-upgrade alert failed: ${(e as Error).message}`);
    }
  }

  @OnEvent('vps.upgrade-applied', { async: true })
  async onUpgradeApplied(payload: {
    email: string;
    firstName: string;
    serviceName: string;
    newPlan: string;
    ipAddress?: string | null;
  }): Promise<void> {
    try {
      await this.mail.sendVpsUpgradeApplied(
        { email: payload.email, firstName: payload.firstName },
        { serviceName: payload.serviceName, newPlan: payload.newPlan, ipAddress: payload.ipAddress },
      );
    } catch (e) {
      this.logger.warn(`upgrade-applied email failed: ${(e as Error).message}`);
    }
  }

  @OnEvent('hosting.expiry-reminder', { async: true })
  async onExpiryReminder(payload: {
    hostingId: string;
    email: string;
    firstName: string;
    serviceName: string;
    expiry: Date | string;
  }): Promise<void> {
    try {
      await this.mail.sendServiceExpiry(
        { email: payload.email, firstName: payload.firstName },
        { name: payload.serviceName, expiry: new Date(payload.expiry) },
      );
    } catch (e) {
      this.logger.warn(`expiry-reminder email failed: ${(e as Error).message}`);
      // The sweep already claimed this account (set expiryReminderSentAt). Release
      // the claim so the next daily sweep retries — otherwise a transient email
      // failure would permanently suppress the 7-day renewal reminder.
      if (payload.hostingId) {
        try {
          await this.prisma.hostingAccount.update({
            where: { id: payload.hostingId },
            data: { expiryReminderSentAt: null },
          });
        } catch {
          // best-effort; if the reset fails the reminder simply isn't retried
        }
      }
    }
  }

  @OnEvent('vps.rejected', { async: true })
  async onRejected(payload: VpsRejectedEvent): Promise<void> {
    try {
      await this.mail.sendServiceCancelled(
        { email: payload.email, firstName: payload.firstName },
        {
          serviceName: payload.serviceName,
          planName: payload.planName,
          reason: payload.reason ?? 'Request was not approved',
        },
      );
    } catch (e) {
      this.logger.warn(`rejected email failed: ${(e as Error).message}`);
    }
  }
}
