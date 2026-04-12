import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface EmailPersonalization {
  to: Array<{ email: string; name?: string }>;
  dynamic_template_data?: Record<string, unknown>;
}

interface SendgridEmailPayload {
  personalizations: EmailPersonalization[];
  from: { email: string; name?: string };
  subject?: string;
  content?: Array<{ type: string; value: string }>;
  template_id?: string;
}

export interface SendgridSendResult {
  success: boolean;
  messageId?: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class SendgridService {
  private readonly logger = new Logger(SendgridService.name);
  private readonly httpClient: AxiosInstance;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY', '');
    this.fromEmail = this.configService.get<string>(
      'SENDGRID_FROM_EMAIL',
      'noreply@hostingnepal.com',
    );
    this.fromName = this.configService.get<string>(
      'SENDGRID_FROM_NAME',
      'Hosting Nepal',
    );

    this.httpClient = axios.create({
      baseURL: 'https://api.sendgrid.com/v3',
      timeout: 15_000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // ─── Core Send Methods ────────────────────────────────────────────────────

  /**
   * Send a transactional email with raw HTML/text content.
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
  ): Promise<SendgridSendResult> {
    const payload: SendgridEmailPayload = {
      personalizations: [{ to: [{ email: to }] }],
      from: { email: this.fromEmail, name: this.fromName },
      subject,
      content: [
        ...(textContent ? [{ type: 'text/plain', value: textContent }] : []),
        { type: 'text/html', value: htmlContent },
      ],
    };

    return this.dispatch(payload);
  }

  /**
   * Send a dynamic template email via SendGrid template engine.
   */
  async sendTemplate(
    to: string,
    templateId: string,
    dynamicData: Record<string, unknown>,
  ): Promise<SendgridSendResult> {
    const payload: SendgridEmailPayload = {
      personalizations: [
        {
          to: [{ email: to }],
          dynamic_template_data: dynamicData,
        },
      ],
      from: { email: this.fromEmail, name: this.fromName },
      template_id: templateId,
    };

    return this.dispatch(payload);
  }

  // ─── Branded Email Template Wrapper ────────────────────────────────────────

  private brandedTemplate(title: string, body: string, footerNote?: string): string {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://hostingnepals.com');
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
      <a href="mailto:admin@hostingnepals.com" style="color:#7367F0;text-decoration:none;">admin@hostingnepals.com</a> &bull;
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

  // ─── Notification Emails ──────────────────────────────────────────────────

  async sendWelcome(user: { email: string; firstName: string }): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://hostingnepals.com');
    const subject = `Welcome to Hosting Nepal, ${user.firstName}!`;
    const htmlContent = this.brandedTemplate('Welcome Aboard!', `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${user.firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">Thank you for joining <strong>Hosting Nepal</strong>! Your account has been successfully created and you're ready to start building your online presence.</p>
      <div style="background:#f0f0ff;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #7367F0;">
        <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>Here's what you can do next:</strong></p>
        <ul style="color:#4b5563;font-size:14px;margin:0;padding-left:20px;line-height:2;">
          <li>Register your domain name</li>
          <li>Set up WordPress hosting</li>
          <li>Configure business email</li>
          <li>Deploy VPS or dedicated servers</li>
        </ul>
      </div>
      ${this.emailButton('Go to Dashboard', `${frontendUrl}/dashboard`, '#28C76F')}
      <p style="color:#6b7280;font-size:13px;line-height:1.6;">Need help getting started? Our support team is available 24/7 — just create a ticket from your dashboard.</p>
    `);

    this.logger.log(`Sending welcome email to: ${user.email}`);
    return this.sendEmail(user.email, subject, htmlContent);
  }

  async sendPasswordReset(
    user: { email: string; firstName: string },
    resetUrl: string,
  ): Promise<SendgridSendResult> {
    const subject = 'Reset Your Hosting Nepal Password';
    const htmlContent = this.brandedTemplate('Password Reset', `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${user.firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">We received a request to reset your Hosting Nepal account password. Click the button below to create a new password.</p>
      ${this.emailButton('Reset My Password', resetUrl, '#FF4C51')}
      <div style="background:#FFF5F5;border-radius:8px;padding:16px;margin:20px 0;border-left:4px solid #FF4C51;">
        <p style="color:#9B1C1C;font-size:13px;margin:0;"><strong>Important:</strong> This link expires in <strong>1 hour</strong>. If you did not request this reset, please ignore this email — your password will remain unchanged.</p>
      </div>
      <p style="color:#9ca3af;font-size:12px;line-height:1.6;">Can't click the button? Copy this link:<br><a href="${resetUrl}" style="color:#7367F0;word-break:break-all;">${resetUrl}</a></p>
    `, 'This is an automated security email. Do not share this link with anyone.');

    this.logger.log(`Sending password reset email to: ${user.email}`);
    return this.sendEmail(user.email, subject, htmlContent);
  }

  /**
   * Send an email verification link to a newly registered user.
   */
  async sendVerificationEmail(
    user: { email: string; firstName: string },
    verifyUrl: string,
  ): Promise<SendgridSendResult> {
    const subject = 'Verify Your Hosting Nepal Email Address';
    const htmlContent = this.brandedTemplate('Verify Your Email', `
      <p style="color:#374151;font-size:15px;line-height:1.7;">Hi <strong>${user.firstName}</strong>,</p>
      <p style="color:#374151;font-size:15px;line-height:1.7;">Please verify your email address to activate your Hosting Nepal account and unlock all features.</p>
      ${this.emailButton('Verify My Email', verifyUrl, '#28C76F')}
      <p style="color:#6b7280;font-size:13px;">This verification link expires in <strong>24 hours</strong>.</p>
      <p style="color:#9ca3af;font-size:12px;line-height:1.6;">Can't click the button? Copy this link:<br><a href="${verifyUrl}" style="color:#7367F0;word-break:break-all;">${verifyUrl}</a></p>
    `);

    this.logger.log(`Sending verification email to: ${user.email}`);
    return this.sendEmail(user.email, subject, htmlContent);
  }

  async sendSubscriptionWelcome(email: string): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://hostingnepals.com');
    const subject = 'Welcome to Hosting Nepal Newsletter!';
    const htmlContent = this.brandedTemplate('You\'re Subscribed!', `
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
    `);

    this.logger.log(`Sending subscription welcome to: ${email}`);
    return this.sendEmail(email, subject, htmlContent);
  }

  /**
   * Send an order confirmation email.
   */
  async sendOrderConfirmation(
    user: { email: string; firstName: string },
    order: { id: string; total: number; items: Array<{ name: string; amount: number }> },
  ): Promise<SendgridSendResult> {
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://hostingnepals.com');
    const subject = `Order Confirmed – #${order.id.slice(0, 8)}`;
    const itemRows = order.items.map(item =>
      `<tr><td style="padding:12px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;">${item.name}</td>
       <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;text-align:right;font-weight:600;">NPR ${item.amount.toLocaleString()}</td></tr>`
    ).join('');

    const htmlContent = this.brandedTemplate('Order Confirmed', `
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
    `);

    this.logger.log(`Sending order confirmation to: ${user.email} for order: ${order.id}`);
    return this.sendEmail(user.email, subject, htmlContent);
  }

  /**
   * Send a payment receipt email.
   */
  async sendPaymentReceipt(
    user: { email: string; firstName: string },
    payment: { id: string; amount: number; method: string },
  ): Promise<SendgridSendResult> {
    const subject = `Payment Receipt – NPR ${payment.amount.toLocaleString()}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Payment Received</h2>
        <p>Hi ${user.firstName},</p>
        <p>We have received your payment. Here are the details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Payment ID</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${payment.id}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Amount</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">NPR ${payment.amount.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Payment Method</strong></td>
            <td style="padding: 8px;">${payment.method}</td>
          </tr>
        </table>
        <p>Thank you for choosing Hosting Nepal.</p>
        <br>
        <p>Best regards,<br><strong>Hosting Nepal Team</strong></p>
      </div>
    `;
    const textContent = `Payment received: NPR ${payment.amount.toLocaleString()} via ${payment.method}. Payment ID: ${payment.id}`;

    this.logger.log(`Sending payment receipt to: ${user.email} for payment: ${payment.id}`);
    return this.sendEmail(user.email, subject, htmlContent, textContent);
  }

  /**
   * Send a service expiry warning email.
   */
  async sendServiceExpiry(
    user: { email: string; firstName: string },
    service: { name: string; expiry: Date },
  ): Promise<SendgridSendResult> {
    const expiryDate = service.expiry.toLocaleDateString('en-NP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const daysLeft = Math.ceil(
      (service.expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    const subject = `Action Required: ${service.name} Expiring in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Service Expiry Notice</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your service <strong>${service.name}</strong> is expiring on <strong>${expiryDate}</strong>
           (in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>).</p>
        <p>Please renew your service to avoid interruption.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${this.configService.get('FRONTEND_URL', 'https://hostingnepal.com')}/dashboard"
             style="background-color: #2563eb; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            Renew Now
          </a>
        </div>
        <br>
        <p>Best regards,<br><strong>Hosting Nepal Team</strong></p>
      </div>
    `;
    const textContent = `Your service ${service.name} expires on ${expiryDate}. Please renew to avoid interruption.`;

    this.logger.log(`Sending service expiry notice to: ${user.email} for: ${service.name}`);
    return this.sendEmail(user.email, subject, htmlContent, textContent);
  }

  /**
   * Send a support ticket update notification email.
   */
  async sendSupportTicketUpdate(
    user: { email: string; firstName: string },
    ticket: { id: string; subject: string; status: string },
  ): Promise<SendgridSendResult> {
    const subject = `Support Ticket Update – #${ticket.id}: ${ticket.subject}`;
    const statusColor =
      ticket.status === 'RESOLVED'
        ? '#16a34a'
        : ticket.status === 'CLOSED'
          ? '#6b7280'
          : '#2563eb';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Support Ticket Updated</h2>
        <p>Hi ${user.firstName},</p>
        <p>Your support ticket has been updated:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Ticket ID</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">#${ticket.id}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Subject</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${ticket.subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px;"><strong>Status</strong></td>
            <td style="padding: 8px; color: ${statusColor}; font-weight: bold;">${ticket.status}</td>
          </tr>
        </table>
        <p>
          <a href="${this.configService.get('FRONTEND_URL', 'https://hostingnepal.com')}/support/tickets/${ticket.id}"
             style="color: #2563eb;">
            View Ticket
          </a>
        </p>
        <br>
        <p>Best regards,<br><strong>Hosting Nepal Support Team</strong></p>
      </div>
    `;
    const textContent = `Ticket #${ticket.id} "${ticket.subject}" status updated to: ${ticket.status}`;

    this.logger.log(`Sending ticket update to: ${user.email} for ticket: ${ticket.id}`);
    return this.sendEmail(user.email, subject, htmlContent, textContent);
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  /**
   * Send the payload to the SendGrid API and normalise the response.
   */
  private async dispatch(payload: SendgridEmailPayload): Promise<SendgridSendResult> {
    try {
      const response = await this.httpClient.post('/mail/send', payload);
      const messageId = response.headers['x-message-id'] as string | undefined;

      this.logger.debug(`Email dispatched via SendGrid, messageId=${messageId ?? 'n/a'}`);
      return { success: true, messageId };
    } catch (error) {
      const axiosError = error as { response?: { status: number; data: unknown }; message: string };
      this.logger.error(
        `SendGrid API error: ${axiosError.message}`,
        axiosError.response?.data,
      );
      // Do not throw — log and return failure so a notification email never breaks
      // the primary business flow. Callers can inspect the result if needed.
      return { success: false };
    }
  }
}
