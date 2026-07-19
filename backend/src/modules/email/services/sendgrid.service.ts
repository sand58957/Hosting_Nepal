// Despite the legacy filename / class name, this service now dispatches via the
// Nepal Fillings email API (https://nepalfillings.com/api/v1/email/send) instead
// of SendGrid. Shape of public methods is preserved so existing callers keep
// working unchanged. Renaming is left as a separate cleanup pass.

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface SendgridSendResult {
  success: boolean;
  messageId?: string;
}

interface MailDispatchPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class SendgridService {
  private readonly logger = new Logger('MailService');
  private readonly httpClient: AxiosInstance;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly replyTo: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey =
      this.configService.get<string>('NF_EMAIL_API_KEY') ||
      this.configService.get<string>('SENDGRID_API_KEY', '');
    const apiUrl =
      this.configService.get<string>('NF_EMAIL_API_URL') ||
      'https://nepalfillings.com/api/v1';

    this.fromEmail = this.configService.get<string>(
      'MAIL_FROM_EMAIL',
      'noreply@hostingnepals.com',
    );
    this.fromName = this.configService.get<string>(
      'MAIL_FROM_NAME',
      'Hosting Nepal',
    );
    this.replyTo = this.configService.get<string>(
      'MAIL_REPLY_TO',
      'support@hostingnepals.com',
    );

    this.httpClient = axios.create({
      baseURL: apiUrl,
      timeout: 15_000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // ─── Core Send ────────────────────────────────────────────────────────────

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
  ): Promise<SendgridSendResult> {
    return this.dispatch({ to, subject, html: htmlContent, text: textContent });
  }

  // ─── Branded Template Wrapper ─────────────────────────────────────────────

  private brandedTemplate(
    title: string,
    body: string,
    footerNote?: string,
  ): string {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'https://hostingnepals.com',
    );
    return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0f0f1a 0%,#1a1a2e 100%);padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;">
    <div style="display:inline-block;width:40px;height:40px;background:#7367F0;border-radius:10px;line-height:40px;color:#fff;font-weight:800;font-size:18px;margin-bottom:12px;">H</div>
    <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:8px 0 4px;">Hosting Nepal</h1>
    <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">Nepal's Premier Web Hosting Platform</p>
  </td></tr>
  <!-- Title Bar -->
  <tr><td style="background:#7367F0;padding:16px 40px;text-align:center;">
    <h2 style="color:#ffffff;font-size:18px;font-weight:600;margin:0;">${title}</h2>
  </td></tr>
  <!-- Body -->
  <tr><td style="background:#ffffff;padding:40px;border-left:1px solid #e8e8ed;border-right:1px solid #e8e8ed;">
    ${body}
  </td></tr>
  <!-- Footer -->
  <tr><td style="background:#f8f8fa;padding:24px 40px;border-radius:0 0 12px 12px;border:1px solid #e8e8ed;border-top:none;text-align:center;">
    ${footerNote ? `<p style="color:#6b7280;font-size:12px;margin:0 0 12px;">${footerNote}</p>` : ''}
    <p style="color:#9ca3af;font-size:12px;margin:0 0 4px;">Hosting Nepal — Koteshwor-32, Kathmandu, Nepal</p>
    <p style="color:#9ca3af;font-size:12px;margin:0;">
      <a href="${frontendUrl}" style="color:#7367F0;text-decoration:none;">hostingnepals.com</a> &bull;
      <a href="mailto:support@hostingnepals.com" style="color:#7367F0;text-decoration:none;">support@hostingnepals.com</a> &bull;
      +977-9802348957
    </p>
    <p style="color:#d1d5db;font-size:11px;margin:8px 0 0;">&copy; ${new Date().getFullYear()} Marketminds Investment Group. All rights reserved.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
  }

  /**
   * Escape user-supplied text before interpolating it into HTML email bodies,
   * so a malicious value (e.g. a crafted hostname or display name) cannot inject
   * markup or links into admin/customer emails. Apply to ALL free-text fields.
   */
  private htmlEscape(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private emailButton(text: string, url: string, color = '#7367F0'): string {
    return `<div style="text-align:center;margin:28px 0;">
      <a href="${this.htmlEscape(url)}" style="display:inline-block;background:${color};color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">${this.htmlEscape(text)}</a>
    </div>`;
  }

  private infoCard(label: string, value: string, accent = '#7367F0'): string {
    return `<tr>
      <td style="padding:14px 0;border-bottom:1px solid #f0f0f5;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:1px;">${this.htmlEscape(label)}</td>
      <td style="padding:14px 0;border-bottom:1px solid #f0f0f5;color:#111827;font-size:15px;font-weight:600;text-align:right;">
        <span style="color:${accent};">${this.htmlEscape(value)}</span>
      </td>
    </tr>`;
  }

  // ─── Authentication Emails ────────────────────────────────────────────────

  async sendWelcome(user: {
    email: string;
    firstName: string;
  }): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'https://hostingnepals.com',
    );
    const firstName = this.htmlEscape(user.firstName);
    const subject = `Welcome to Hosting Nepal, ${user.firstName}!`;
    const htmlContent = this.brandedTemplate(
      'Welcome Aboard!',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">Thank you for joining <strong>Hosting Nepal</strong>! Your account has been created and you're ready to start building your online presence.</p>
      <div style="background:#f0f0ff;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #7367F0;">
        <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>Here's what you can do next:</strong></p>
        <ul style="color:#4b5563;font-size:14px;margin:0;padding-left:20px;line-height:2;">
          <li>Register your domain name</li>
          <li>Set up WordPress or shared hosting</li>
          <li>Configure professional business email</li>
          <li>Deploy a VPS or dedicated server</li>
        </ul>
      </div>
      ${this.emailButton('Go to Dashboard', `${frontendUrl}/dashboard`, '#28C76F')}
      <p style="color:#6b7280;font-size:13px;line-height:1.6;">Need help getting started? Reply to this email or open a ticket from your dashboard — we're available 24/7.</p>
    `,
    );

    return this.sendEmail(user.email, subject, htmlContent);
  }

  async sendPasswordReset(
    user: { email: string; firstName: string },
    resetUrl: string,
  ): Promise<SendgridSendResult> {
    const firstName = this.htmlEscape(user.firstName);
    const safeResetUrl = this.htmlEscape(resetUrl);
    const subject = 'Reset Your Hosting Nepal Password';
    const htmlContent = this.brandedTemplate(
      'Password Reset',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">We received a request to reset your Hosting Nepal account password. Click the button below to create a new one.</p>
      ${this.emailButton('Reset My Password', resetUrl, '#FF4C51')}
      <div style="background:#FFF5F5;border-radius:8px;padding:16px;margin:20px 0;border-left:4px solid #FF4C51;">
        <p style="color:#9B1C1C;font-size:13px;margin:0;"><strong>Important:</strong> This link expires in <strong>1 hour</strong>. If you did not request this reset, please ignore this email — your password will remain unchanged.</p>
      </div>
      <p style="color:#9ca3af;font-size:12px;line-height:1.6;">Can't click the button? Copy this link:<br><a href="${safeResetUrl}" style="color:#7367F0;word-break:break-all;">${safeResetUrl}</a></p>
    `,
      'This is an automated security email. Do not share this link with anyone.',
    );

    return this.sendEmail(user.email, subject, htmlContent);
  }

  async sendVerificationEmail(
    user: { email: string; firstName: string },
    verifyUrl: string,
  ): Promise<SendgridSendResult> {
    const firstName = this.htmlEscape(user.firstName);
    const safeVerifyUrl = this.htmlEscape(verifyUrl);
    const subject = 'Verify Your Hosting Nepal Email Address';
    const htmlContent = this.brandedTemplate(
      'Verify Your Email',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">Please verify your email address to activate your Hosting Nepal account and unlock all features.</p>
      ${this.emailButton('Verify My Email', verifyUrl, '#28C76F')}
      <p style="color:#6b7280;font-size:13px;">This verification link expires in <strong>24 hours</strong>.</p>
      <p style="color:#9ca3af;font-size:12px;line-height:1.6;">Can't click the button? Copy this link:<br><a href="${safeVerifyUrl}" style="color:#7367F0;word-break:break-all;">${safeVerifyUrl}</a></p>
    `,
    );

    return this.sendEmail(user.email, subject, htmlContent);
  }

  async sendSubscriptionWelcome(email: string): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'https://hostingnepals.com',
    );
    const subject = 'Welcome to Hosting Nepal Newsletter!';
    const htmlContent = this.brandedTemplate(
      "You're Subscribed!",
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Thank you for subscribing to the <strong>Hosting Nepal</strong> newsletter!</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">You'll receive:</p>
      <div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #28C76F;">
        <ul style="color:#374151;font-size:14px;margin:0;padding-left:20px;line-height:2.2;">
          <li>Latest hosting deals and promotions</li>
          <li>Web development tips and tutorials</li>
          <li>SEO and digital marketing insights</li>
          <li>Nepal tech industry updates</li>
          <li>Exclusive subscriber-only offers</li>
        </ul>
      </div>
      ${this.emailButton('Read Our Blog', `${frontendUrl}/articles`, '#7367F0')}
      <p style="color:#9ca3af;font-size:12px;">You can unsubscribe at any time by clicking the link in our emails.</p>
    `,
    );

    return this.sendEmail(email, subject, htmlContent);
  }

  // ─── Billing Emails ───────────────────────────────────────────────────────

  async sendOrderConfirmation(
    user: { email: string; firstName: string },
    order: {
      id: string;
      total: number;
      items: Array<{ name: string; amount: number }>;
    },
  ): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'https://hostingnepals.com',
    );
    const subject = `Order Confirmed – #${order.id.slice(0, 8)}`;
    const firstName = this.htmlEscape(user.firstName);
    const itemRows = order.items
      .map(
        (item) =>
          `<tr><td style="padding:12px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;">${this.htmlEscape(item.name)}</td>
       <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;text-align:right;font-weight:600;">NPR ${item.amount.toLocaleString()}</td></tr>`,
      )
      .join('');

    const htmlContent = this.brandedTemplate(
      'Order Confirmed',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">Your order has been confirmed. Here's your summary:</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead><tr style="border-bottom:2px solid #7367F0;">
          <th style="padding:10px 0;text-align:left;color:#7367F0;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Item</th>
          <th style="padding:10px 0;text-align:right;color:#7367F0;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Amount</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
        <tfoot><tr><td style="padding:14px 0;font-weight:700;font-size:15px;color:#0f0f1a;">Total</td>
          <td style="padding:14px 0;font-weight:700;font-size:18px;color:#28C76F;text-align:right;">NPR ${order.total.toLocaleString()}</td></tr></tfoot>
      </table>
      <p style="color:#6b7280;font-size:13px;">Order ID: <strong>${this.htmlEscape(order.id)}</strong></p>
      ${this.emailButton('View Order', `${frontendUrl}/billing/orders/${order.id}`)}
    `,
    );

    return this.sendEmail(user.email, subject, htmlContent);
  }

  async sendPaymentReceipt(
    user: { email: string; firstName: string },
    payment: {
      id: string;
      amount: number;
      method: string;
      orderNumber?: string;
      paidAt?: Date;
    },
  ): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'https://hostingnepals.com',
    );
    const paidAtStr = (payment.paidAt || new Date()).toLocaleString('en-NP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const firstName = this.htmlEscape(user.firstName);
    const subject = `Payment Receipt – NPR ${payment.amount.toLocaleString()}`;
    const htmlContent = this.brandedTemplate(
      'Payment Received',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">Thank you — we've received your payment. Here's your receipt:</p>
      <div style="background:#f0fdf4;border-radius:10px;padding:24px;margin:24px 0;text-align:center;border:1px solid #d1fae5;">
        <p style="color:#065f46;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Amount Paid</p>
        <p style="color:#28C76F;font-size:34px;font-weight:800;margin:0;">NPR ${payment.amount.toLocaleString()}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        ${this.infoCard('Payment ID', payment.id, '#111827')}
        ${payment.orderNumber ? this.infoCard('Order', `#${payment.orderNumber}`, '#7367F0') : ''}
        ${this.infoCard('Method', payment.method, '#111827')}
        ${this.infoCard('Paid On', paidAtStr, '#111827')}
        ${this.infoCard('Status', 'COMPLETED', '#28C76F')}
      </table>
      ${payment.orderNumber ? this.emailButton('View Order', `${frontendUrl}/billing/orders`, '#28C76F') : this.emailButton('View Billing', `${frontendUrl}/billing`, '#28C76F')}
      <p style="color:#6b7280;font-size:13px;line-height:1.6;">Keep this email for your records. Your services will be activated once provisioning completes (usually within minutes).</p>
    `,
      'Need a tax invoice? Email support@hostingnepals.com.',
    );
    const textContent = `Payment received: NPR ${payment.amount.toLocaleString()} via ${payment.method}. Payment ID: ${payment.id}`;

    return this.sendEmail(user.email, subject, htmlContent, textContent);
  }

  // ─── Service Emails ───────────────────────────────────────────────────────

  async sendServiceExpiry(
    user: { email: string; firstName: string },
    service: { name: string; expiry: Date },
  ): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'https://hostingnepals.com',
    );
    const expiryDate = service.expiry.toLocaleDateString('en-NP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const daysLeft = Math.ceil(
      (service.expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const isUrgent = daysLeft <= 3;
    const accent = isUrgent ? '#FF4C51' : '#FF9F43';

    const firstName = this.htmlEscape(user.firstName);
    const serviceName = this.htmlEscape(service.name);
    const subject = `Action Required: ${service.name} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
    const htmlContent = this.brandedTemplate(
      'Service Expiring Soon',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">Your service <strong>${serviceName}</strong> is approaching expiry. Renew now to keep it running without interruption.</p>
      <div style="background:${isUrgent ? '#FFF5F5' : '#FFF7ED'};border-radius:10px;padding:24px;margin:24px 0;text-align:center;border:1px solid ${isUrgent ? '#FECACA' : '#FED7AA'};">
        <p style="color:${accent};font-size:13px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;font-weight:600;">Expires In</p>
        <p style="color:${accent};font-size:34px;font-weight:800;margin:0;">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</p>
        <p style="color:#6b7280;font-size:13px;margin:8px 0 0;">${expiryDate}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        ${this.infoCard('Service', service.name, '#111827')}
        ${this.infoCard('Expires On', expiryDate, accent)}
      </table>
      ${this.emailButton('Renew Now', `${frontendUrl}/dashboard`, accent)}
      <p style="color:#9ca3af;font-size:12px;line-height:1.6;">If you don't renew, your service may be suspended after the expiry date. Contact support if you need a hand.</p>
    `,
    );
    const textContent = `Your service ${service.name} expires on ${expiryDate} (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left). Renew at ${frontendUrl}/dashboard`;

    return this.sendEmail(user.email, subject, htmlContent, textContent);
  }

  async sendSupportTicketUpdate(
    user: { email: string; firstName: string },
    ticket: { id: string; subject: string; status: string },
  ): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'https://hostingnepals.com',
    );
    const statusAccent =
      ticket.status === 'RESOLVED'
        ? '#28C76F'
        : ticket.status === 'CLOSED'
          ? '#6b7280'
          : ticket.status === 'WAITING_CUSTOMER'
            ? '#FF9F43'
            : '#7367F0';

    const firstName = this.htmlEscape(user.firstName);
    const subject = `Support Update – #${ticket.id.slice(0, 8)}: ${ticket.subject}`;
    const htmlContent = this.brandedTemplate(
      'Support Ticket Updated',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">There's a new update on your support ticket. View the latest reply or add more details from your dashboard.</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        ${this.infoCard('Ticket', `#${ticket.id.slice(0, 8)}`, '#111827')}
        ${this.infoCard('Subject', ticket.subject, '#111827')}
        ${this.infoCard('Status', ticket.status.replace(/_/g, ' '), statusAccent)}
      </table>
      ${this.emailButton('View Ticket', `${frontendUrl}/support/tickets/${ticket.id}`, statusAccent)}
      <p style="color:#9ca3af;font-size:12px;line-height:1.6;">Replying to this email won't update the ticket. Use the dashboard link above to respond.</p>
    `,
    );
    const textContent = `Ticket #${ticket.id.slice(0, 8)} "${ticket.subject}" is now ${ticket.status}. View at ${frontendUrl}/support/tickets/${ticket.id}`;

    return this.sendEmail(user.email, subject, htmlContent, textContent);
  }

  // ─── VPS Lifecycle Emails ─────────────────────────────────────────────────

  /** Contabo-style "your server is ready" email with full login details. */
  async sendVpsProvisioned(
    user: { email: string; firstName: string },
    vps: {
      displayName: string;
      planName: string;
      ipAddress?: string | null;
      ipv6?: string | null;
      location?: string | null;
      username?: string | null;
      sshKeyInstalled?: boolean;
    },
  ): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://hostingnepals.com');
    const sshUser = vps.username || 'admin';
    const firstName = this.htmlEscape(user.firstName);
    const displayName = this.htmlEscape(vps.displayName);
    const sshUserSafe = this.htmlEscape(sshUser);
    const ipSafe = this.htmlEscape(vps.ipAddress || '<ip>');
    const htmlContent = this.brandedTemplate(
      'Your VPS Is Ready 🚀',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Dear <strong>${firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">Great news — your server <strong>${displayName}</strong> has been provisioned successfully. Below are the access details you need to manage it.</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 8px;">
        ${this.infoCard('Server Name', vps.displayName, '#111827')}
        ${this.infoCard('Plan', vps.planName, '#111827')}
        ${this.infoCard('IP Address', vps.ipAddress || 'assigning…', '#28C76F')}
        ${vps.ipv6 ? this.infoCard('IPv6 Subnet', `${vps.ipv6}/64`, '#111827') : ''}
        ${this.infoCard('Location', vps.location || 'Hub Europe (EU)', '#111827')}
        ${this.infoCard('Username', sshUser, '#111827')}
        ${this.infoCard('Password', vps.sshKeyInstalled ? 'SSH key installed (password as chosen at order)' : 'as chosen by you during the order process', '#111827')}
      </table>
      <div style="background:#f8f8fa;border:1px solid #e8e8ed;border-radius:8px;padding:14px 18px;margin:20px 0;">
        <p style="color:#6b7280;font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:1px;">Connect via SSH</p>
        <p style="font-family:monospace;font-size:14px;color:#111827;margin:0;">ssh ${sshUserSafe}@${ipSafe}</p>
      </div>
      ${this.emailButton('Manage Your Server', `${frontendUrl}/vps`, '#28C76F')}
      <p style="color:#9ca3af;font-size:12px;line-height:1.6;">Need help getting started? Reply to this email or open a ticket from your dashboard — our team is happy to assist.</p>
      `,
      'Keep these credentials safe. We will never ask for your password by email.',
    );
    const textContent = `Your VPS ${vps.displayName} (${vps.planName}) is ready. IP: ${vps.ipAddress}. SSH: ssh ${sshUser}@${vps.ipAddress}. Manage: ${frontendUrl}/vps`;
    return this.sendEmail(user.email, `Your VPS "${vps.displayName}" is ready — login details inside`, htmlContent, textContent);
  }

  // ─── Billing Lifecycle Emails ─────────────────────────────────────────────

  /** Friendly renewal/payment reminder (due in N days). */
  async sendPaymentReminder(
    user: { email: string; firstName: string },
    info: {
      totalDueNpr: number;
      daysLeft: number;
      services: Array<{ name: string; paidUntil?: string | null; amountNpr: number }>;
    },
  ): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://hostingnepals.com');
    const firstName = this.htmlEscape(user.firstName);
    const rows = info.services
      .map(
        (s) => `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f5;color:#374151;font-size:14px;">${this.htmlEscape(s.name)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f5;color:#6b7280;font-size:13px;">${s.paidUntil ? this.htmlEscape(s.paidUntil) : '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f5;color:#111827;font-size:14px;font-weight:600;text-align:right;">NPR ${s.amountNpr.toLocaleString()}</td>
        </tr>`,
      )
      .join('');
    const htmlContent = this.brandedTemplate(
      `Payment Due in ${info.daysLeft} Day${info.daysLeft === 1 ? '' : 's'} ⏰`,
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Dear <strong>${firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">This is a friendly reminder that the payment for some of your services is due in <strong>${info.daysLeft} day${info.daysLeft === 1 ? '' : 's'}</strong>. To keep everything running smoothly, please complete a payment of <strong style="color:#FF9F43;">NPR ${info.totalDueNpr.toLocaleString()}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #e8e8ed;border-radius:8px;overflow:hidden;">
        <tr style="background:#f8f8fa;">
          <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Service</th>
          <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Paid Until</th>
          <th style="padding:10px 12px;text-align:right;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Amount Due</th>
        </tr>
        ${rows}
      </table>
      ${this.emailButton('View & Pay Invoices', `${frontendUrl}/billing`, '#FF9F43')}
      <p style="color:#6b7280;font-size:13px;line-height:1.7;">You can pay by bank transfer or from your dashboard. If you have already paid, please ignore this reminder — payments can take a little while to reflect.</p>
      `,
      'Set up auto-renewal in your dashboard to never miss a payment.',
    );
    const textContent = `Payment of NPR ${info.totalDueNpr.toLocaleString()} due in ${info.daysLeft} days. Pay at ${frontendUrl}/billing`;
    return this.sendEmail(user.email, `[Action required] Your payment is due in ${info.daysLeft} days`, htmlContent, textContent);
  }

  /** Urgent suspension/data-loss warning for overdue payments. */
  async sendSuspensionWarning(
    user: { email: string; firstName: string },
    info: {
      totalDueNpr: number;
      graceDays: number;
      reactivationFeeNpr?: number;
      services: Array<{ name: string; paidUntil?: string | null; amountNpr: number }>;
    },
  ): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://hostingnepals.com');
    const firstName = this.htmlEscape(user.firstName);
    const rows = info.services
      .map(
        (s) => `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f5;color:#374151;font-size:14px;">${this.htmlEscape(s.name)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f5;color:#6b7280;font-size:13px;">${s.paidUntil ? this.htmlEscape(s.paidUntil) : '—'}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f0f0f5;color:#EA5455;font-size:14px;font-weight:700;text-align:right;">NPR ${s.amountNpr.toLocaleString()}</td>
        </tr>`,
      )
      .join('');
    const htmlContent = this.brandedTemplate(
      'Urgent: Avoid Service Suspension ⚠️',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Dear <strong>${firstName}</strong>,</p>
      <div style="background:#fdecec;border:1px solid #f5b5b8;border-radius:8px;padding:14px 18px;margin:0 0 20px;">
        <p style="color:#b42318;font-size:14px;font-weight:600;margin:0;">Your payment is overdue. If we do not receive payment within the next ${info.graceDays} day${info.graceDays === 1 ? '' : 's'}, the services below will be suspended and may subsequently be deleted — <u>meaning loss of all data on them</u>.</p>
      </div>
      <p style="color:#374151;font-size:15px;line-height:1.7;">Outstanding amount: <strong style="color:#EA5455;">NPR ${info.totalDueNpr.toLocaleString()}</strong></p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #e8e8ed;border-radius:8px;overflow:hidden;">
        <tr style="background:#f8f8fa;">
          <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Service</th>
          <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Paid Until</th>
          <th style="padding:10px 12px;text-align:right;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Amount Due</th>
        </tr>
        ${rows}
      </table>
      ${info.reactivationFeeNpr ? `<p style="color:#6b7280;font-size:13px;line-height:1.7;">Reactivating a suspended service incurs a reactivation fee of <strong>NPR ${info.reactivationFeeNpr.toLocaleString()}</strong> per service.</p>` : ''}
      ${this.emailButton('Pay Now to Keep Your Services', `${frontendUrl}/billing`, '#EA5455')}
      <p style="color:#6b7280;font-size:13px;line-height:1.7;">Already paid? Please disregard this notice — or reply with your payment reference so we can match it quickly.</p>
      `,
      'This is the final automated notice before suspension.',
    );
    const textContent = `URGENT: NPR ${info.totalDueNpr.toLocaleString()} overdue. Pay within ${info.graceDays} days to avoid suspension and data loss: ${frontendUrl}/billing`;
    return this.sendEmail(user.email, '[Action required] Payment overdue — avoid service suspension and data loss', htmlContent, textContent);
  }

  /** Cancellation confirmation for a service. */
  async sendServiceCancelled(
    user: { email: string; firstName: string },
    info: { serviceName: string; planName?: string | null; endsOn?: string | null; reason?: string | null },
  ): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://hostingnepals.com');
    const firstName = this.htmlEscape(user.firstName);
    const endsOnSafe = info.endsOn ? this.htmlEscape(info.endsOn) : null;
    const htmlContent = this.brandedTemplate(
      'Service Cancellation Confirmed',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Dear <strong>${firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">This confirms that the following service has been cancelled${info.endsOn ? ' and will remain active until the end of its paid period' : ''}.</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 8px;">
        ${this.infoCard('Service', info.serviceName, '#111827')}
        ${info.planName ? this.infoCard('Plan', info.planName, '#111827') : ''}
        ${info.endsOn ? this.infoCard('Active Until', info.endsOn, '#FF9F43') : ''}
        ${info.reason ? this.infoCard('Reason', info.reason, '#6b7280') : ''}
      </table>
      <div style="background:#fdecec;border:1px solid #f5b5b8;border-radius:8px;padding:14px 18px;margin:20px 0;">
        <p style="color:#b42318;font-size:13px;margin:0;"><strong>Important:</strong> all data on this service will be permanently deleted${endsOnSafe ? ` after ${endsOnSafe}` : ' shortly'}. Please download any backups you need before then.</p>
      </div>
      ${this.emailButton('Go to Dashboard', `${frontendUrl}/dashboard`, '#7367F0')}
      <p style="color:#9ca3af;font-size:12px;line-height:1.6;">Cancelled by mistake, or changed your mind? Reply to this email within the active period and we’ll help you restore the service.</p>
      `,
    );
    const textContent = `Your service "${info.serviceName}" has been cancelled${info.endsOn ? `, active until ${info.endsOn}` : ''}. Data will be deleted afterwards.`;
    return this.sendEmail(user.email, `Cancellation confirmed — ${info.serviceName}`, htmlContent, textContent);
  }

  // ─── Security Emails ──────────────────────────────────────────────────────

  /** "New login detected" security alert (sent when login IP changes). */
  async sendLoginAlert(
    user: { email: string; firstName: string },
    info: { ip: string; time?: string; method?: string },
  ): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://hostingnepals.com');
    const when = info.time || new Date().toUTCString();
    const firstName = this.htmlEscape(user.firstName);
    const htmlContent = this.brandedTemplate(
      'New Login to Your Account 🔐',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">We noticed a sign-in to your Hosting Nepal account from a new location or device:</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 8px;">
        ${this.infoCard('IP Address', info.ip, '#111827')}
        ${this.infoCard('Time', when, '#111827')}
        ${info.method ? this.infoCard('Method', info.method, '#111827') : ''}
      </table>
      <p style="color:#374151;font-size:15px;line-height:1.7;"><strong>Was this you?</strong> No action is needed.</p>
      <div style="background:#fdecec;border:1px solid #f5b5b8;border-radius:8px;padding:14px 18px;margin:20px 0;">
        <p style="color:#b42318;font-size:13px;margin:0;">If you don't recognise this sign-in, change your password immediately and consider enabling two-factor authentication.</p>
      </div>
      ${this.emailButton('Secure My Account', `${frontendUrl}/settings`, '#EA5455')}
      `,
      'You receive this alert whenever your account signs in from a new IP address.',
    );
    const textContent = `New login to your Hosting Nepal account from ${info.ip} at ${when}. Not you? Change your password: ${frontendUrl}/settings`;
    return this.sendEmail(user.email, 'Security alert: new login to your Hosting Nepal account', htmlContent, textContent);
  }

  /** "We received your VPS request" — sent at order time (pending admin approval). */
  async sendVpsRequestReceived(
    user: { email: string; firstName: string },
    vps: { planName: string; hostname?: string | null },
  ): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://hostingnepals.com');
    const firstName = this.htmlEscape(user.firstName);
    const htmlContent = this.brandedTemplate(
      'VPS Request Received ✅',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Dear <strong>${firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">Thanks for your order! We've received your VPS request and it's now being reviewed by our team.</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 8px;">
        ${this.infoCard('Plan', vps.planName, '#111827')}
        ${vps.hostname ? this.infoCard('Hostname', vps.hostname, '#111827') : ''}
        ${this.infoCard('Status', 'Pending review', '#FF9F43')}
      </table>
      <p style="color:#374151;font-size:15px;line-height:1.7;">Once approved (usually within a few hours), your server will be provisioned automatically and we'll email you the <strong>login details</strong>.</p>
      ${this.emailButton('Track Your Request', `${frontendUrl}/vps`, '#7367F0')}
      `,
    );
    const textContent = `We received your VPS request (${vps.planName}). It's pending review — you'll get login details by email once approved. Track: ${frontendUrl}/vps`;
    return this.sendEmail(user.email, `We received your VPS request — ${vps.planName}`, htmlContent, textContent);
  }

  /** Upgrade-complete confirmation. */
  async sendVpsUpgradeApplied(
    user: { email: string; firstName: string },
    info: { serviceName: string; newPlan: string; ipAddress?: string | null },
  ): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://hostingnepals.com');
    const firstName = this.htmlEscape(user.firstName);
    const htmlContent = this.brandedTemplate(
      'Upgrade Complete 🎉',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Dear <strong>${firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">Good news — your server upgrade has been applied successfully.</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 8px;">
        ${this.infoCard('Server', info.serviceName, '#111827')}
        ${this.infoCard('New Plan', info.newPlan, '#28C76F')}
        ${info.ipAddress ? this.infoCard('IP Address', info.ipAddress, '#111827') : ''}
      </table>
      <p style="color:#6b7280;font-size:13px;line-height:1.7;">Your data and IP address are unchanged. If the server was restarted during the upgrade, all services should be back online now.</p>
      ${this.emailButton('View Your Server', `${frontendUrl}/vps`, '#28C76F')}
      `,
    );
    const textContent = `Your server ${info.serviceName} has been upgraded to ${info.newPlan}.`;
    return this.sendEmail(user.email, `Upgrade complete — ${info.serviceName} is now on ${info.newPlan}`, htmlContent, textContent);
  }

  /** Generic security-change confirmation (password changed, 2FA on/off…). */
  async sendSecurityChangeNotice(
    user: { email: string; firstName: string },
    info: { change: string; detail?: string },
  ): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://hostingnepals.com');
    const firstName = this.htmlEscape(user.firstName);
    const htmlContent = this.brandedTemplate(
      'Account Security Update 🔐',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">This is a confirmation that a security setting on your account was just changed:</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 8px;">
        ${this.infoCard('Change', info.change, '#7367F0')}
        ${info.detail ? this.infoCard('Details', info.detail, '#111827') : ''}
        ${this.infoCard('Time', new Date().toUTCString(), '#111827')}
      </table>
      <div style="background:#fdecec;border:1px solid #f5b5b8;border-radius:8px;padding:14px 18px;margin:20px 0;">
        <p style="color:#b42318;font-size:13px;margin:0;"><strong>Didn't make this change?</strong> Your account may be compromised — reset your password immediately and contact support.</p>
      </div>
      ${this.emailButton('Review Security Settings', `${frontendUrl}/settings`, '#7367F0')}
      `,
    );
    const textContent = `Security change on your Hosting Nepal account: ${info.change}. Not you? Reset your password: ${frontendUrl}/settings`;
    return this.sendEmail(user.email, `Security update: ${info.change}`, htmlContent, textContent);
  }

  // ─── Admin Notifications ──────────────────────────────────────────────────

  /** Notify the operator inbox (ADMIN_NOTIFY_EMAIL) that a VPS request awaits approval. */
  async sendAdminVpsRequestAlert(info: {
    customerName: string;
    customerEmail: string;
    planName: string;
    hostname?: string | null;
    isFree?: boolean;
  }): Promise<SendgridSendResult> {
    const to = this.configService.get<string>('ADMIN_NOTIFY_EMAIL', this.replyTo);
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://hostingnepals.com');
    const htmlContent = this.brandedTemplate(
      'New VPS Request — Approval Needed',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">A customer just submitted a VPS request. It will not provision (or bill on Contabo) until you approve it.</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 8px;">
        ${this.infoCard('Customer', `${info.customerName} (${info.customerEmail})`, '#111827')}
        ${this.infoCard('Plan', info.planName, '#7367F0')}
        ${info.hostname ? this.infoCard('Hostname', info.hostname, '#111827') : ''}
        ${this.infoCard('Billing', info.isFree ? 'FREE (billing-exempt)' : 'Standard', info.isFree ? '#28C76F' : '#111827')}
      </table>
      ${this.emailButton('Review & Approve', `${frontendUrl}/vps/approvals`, '#FF9F43')}
      `,
      'Internal operator notification — not sent to customers.',
    );
    return this.sendEmail(to, `[Approval needed] VPS request: ${info.planName} — ${info.customerName}`, htmlContent);
  }

  // ─── Provider Dispatch ────────────────────────────────────────────────────

  private async dispatch(
    payload: MailDispatchPayload,
  ): Promise<SendgridSendResult> {
    const body = {
      to: payload.to,
      from: this.fromEmail,
      from_name: this.fromName,
      reply_to: this.replyTo,
      subject: payload.subject,
      html: payload.html,
      ...(payload.text ? { text: payload.text } : {}),
    };

    try {
      const response = await this.httpClient.post('/email/send', body);
      const messageId = response.data?.data?.message_id as string | undefined;
      this.logger.log(
        `Mail sent to ${payload.to} subject="${payload.subject.slice(0, 60)}" msg=${messageId ?? 'n/a'}`,
      );
      return { success: true, messageId };
    } catch (error) {
      const axiosError = error as {
        response?: { status: number; data: unknown };
        message: string;
      };
      // Log at error level with full context so failed sends are never silent —
      // most callers are fire-and-forget and won't inspect the return value.
      this.logger.error(
        `Mail send failed to=${payload.to} subject="${payload.subject.slice(0, 60)}" status=${axiosError.response?.status ?? 'n/a'}: ${axiosError.message}`,
        axiosError.response?.data,
      );
      // Don't throw — caller flows (auth, billing) shouldn't fail because of email.
      // NOTE: failures are reported only via the returned { success: false }.
      // Callers for whom delivery is critical MUST check `result.success`
      // (fire-and-forget listeners intentionally ignore it and rely on the
      // error log above for observability).
      return { success: false };
    }
  }
}
