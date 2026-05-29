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

  private emailButton(text: string, url: string, color = '#7367F0'): string {
    return `<div style="text-align:center;margin:28px 0;">
      <a href="${url}" style="display:inline-block;background:${color};color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;">${text}</a>
    </div>`;
  }

  private infoCard(label: string, value: string, accent = '#7367F0'): string {
    return `<tr>
      <td style="padding:14px 0;border-bottom:1px solid #f0f0f5;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:1px;">${label}</td>
      <td style="padding:14px 0;border-bottom:1px solid #f0f0f5;color:#111827;font-size:15px;font-weight:600;text-align:right;">
        <span style="color:${accent};">${value}</span>
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
    const subject = `Welcome to Hosting Nepal, ${user.firstName}!`;
    const htmlContent = this.brandedTemplate(
      'Welcome Aboard!',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${user.firstName}</strong>,</p>
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
    const subject = 'Reset Your Hosting Nepal Password';
    const htmlContent = this.brandedTemplate(
      'Password Reset',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${user.firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">We received a request to reset your Hosting Nepal account password. Click the button below to create a new one.</p>
      ${this.emailButton('Reset My Password', resetUrl, '#FF4C51')}
      <div style="background:#FFF5F5;border-radius:8px;padding:16px;margin:20px 0;border-left:4px solid #FF4C51;">
        <p style="color:#9B1C1C;font-size:13px;margin:0;"><strong>Important:</strong> This link expires in <strong>1 hour</strong>. If you did not request this reset, please ignore this email — your password will remain unchanged.</p>
      </div>
      <p style="color:#9ca3af;font-size:12px;line-height:1.6;">Can't click the button? Copy this link:<br><a href="${resetUrl}" style="color:#7367F0;word-break:break-all;">${resetUrl}</a></p>
    `,
      'This is an automated security email. Do not share this link with anyone.',
    );

    return this.sendEmail(user.email, subject, htmlContent);
  }

  async sendVerificationEmail(
    user: { email: string; firstName: string },
    verifyUrl: string,
  ): Promise<SendgridSendResult> {
    const subject = 'Verify Your Hosting Nepal Email Address';
    const htmlContent = this.brandedTemplate(
      'Verify Your Email',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${user.firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">Please verify your email address to activate your Hosting Nepal account and unlock all features.</p>
      ${this.emailButton('Verify My Email', verifyUrl, '#28C76F')}
      <p style="color:#6b7280;font-size:13px;">This verification link expires in <strong>24 hours</strong>.</p>
      <p style="color:#9ca3af;font-size:12px;line-height:1.6;">Can't click the button? Copy this link:<br><a href="${verifyUrl}" style="color:#7367F0;word-break:break-all;">${verifyUrl}</a></p>
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
    const itemRows = order.items
      .map(
        (item) =>
          `<tr><td style="padding:12px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;">${item.name}</td>
       <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;text-align:right;font-weight:600;">NPR ${item.amount.toLocaleString()}</td></tr>`,
      )
      .join('');

    const htmlContent = this.brandedTemplate(
      'Order Confirmed',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${user.firstName}</strong>,</p>
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
      <p style="color:#6b7280;font-size:13px;">Order ID: <strong>${order.id}</strong></p>
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
    const subject = `Payment Receipt – NPR ${payment.amount.toLocaleString()}`;
    const htmlContent = this.brandedTemplate(
      'Payment Received',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${user.firstName}</strong>,</p>
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

    const subject = `Action Required: ${service.name} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
    const htmlContent = this.brandedTemplate(
      'Service Expiring Soon',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${user.firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">Your service <strong>${service.name}</strong> is approaching expiry. Renew now to keep it running without interruption.</p>
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

    const subject = `Support Update – #${ticket.id.slice(0, 8)}: ${ticket.subject}`;
    const htmlContent = this.brandedTemplate(
      'Support Ticket Updated',
      `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${user.firstName}</strong>,</p>
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
      this.logger.error(
        `Mail send failed to=${payload.to}: ${axiosError.message}`,
        axiosError.response?.data,
      );
      // Don't throw — caller flows (auth, billing) shouldn't fail because of email.
      return { success: false };
    }
  }
}
