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

  // ─── Notification Emails ──────────────────────────────────────────────────

  /**
   * Send a welcome email to a newly registered user.
   */
  async sendWelcome(user: { email: string; firstName: string }): Promise<SendgridSendResult> {
    const subject = `Welcome to Hosting Nepal, ${user.firstName}!`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to Hosting Nepal!</h2>
        <p>Hi ${user.firstName},</p>
        <p>Thank you for joining Hosting Nepal. Your account has been successfully created.</p>
        <p>You can now log in and start managing your domains, hosting, and email services.</p>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <br>
        <p>Best regards,<br><strong>Hosting Nepal Team</strong></p>
      </div>
    `;
    const textContent = `Welcome to Hosting Nepal, ${user.firstName}! Your account has been successfully created.`;

    this.logger.log(`Sending welcome email to: ${user.email}`);
    return this.sendEmail(user.email, subject, htmlContent, textContent);
  }

  /**
   * Send a password reset email with a secure reset link.
   */
  async sendPasswordReset(
    user: { email: string; firstName: string },
    resetUrl: string,
  ): Promise<SendgridSendResult> {
    const subject = 'Reset Your Hosting Nepal Password';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hi ${user.firstName},</p>
        <p>We received a request to reset your Hosting Nepal account password.</p>
        <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        <p>If you did not request this, please ignore this email. Your password will remain unchanged.</p>
        <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
        <br>
        <p>Best regards,<br><strong>Hosting Nepal Team</strong></p>
      </div>
    `;
    const textContent = `Reset your Hosting Nepal password by visiting: ${resetUrl}`;

    this.logger.log(`Sending password reset email to: ${user.email}`);
    return this.sendEmail(user.email, subject, htmlContent, textContent);
  }

  /**
   * Send an email verification link to a newly registered user.
   */
  async sendVerificationEmail(
    user: { email: string; firstName: string },
    verifyUrl: string,
  ): Promise<SendgridSendResult> {
    const subject = 'Verify Your Hosting Nepal Email Address';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Verify Your Email Address</h2>
        <p>Hi ${user.firstName},</p>
        <p>Please verify your email address to activate your Hosting Nepal account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}"
             style="background-color: #16a34a; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            Verify Email
          </a>
        </div>
        <p>This verification link expires in <strong>24 hours</strong>.</p>
        <p>Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a></p>
        <br>
        <p>Best regards,<br><strong>Hosting Nepal Team</strong></p>
      </div>
    `;
    const textContent = `Verify your Hosting Nepal email by visiting: ${verifyUrl}`;

    this.logger.log(`Sending verification email to: ${user.email}`);
    return this.sendEmail(user.email, subject, htmlContent, textContent);
  }

  /**
   * Send an order confirmation email.
   */
  async sendOrderConfirmation(
    user: { email: string; firstName: string },
    order: { id: string; total: number; items: Array<{ name: string; amount: number }> },
  ): Promise<SendgridSendResult> {
    const subject = `Order Confirmation – Order #${order.id}`;
    const itemRows = order.items
      .map(
        (item) =>
          `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
              NPR ${item.amount.toLocaleString()}
            </td>
          </tr>`,
      )
      .join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Order Confirmed!</h2>
        <p>Hi ${user.firstName},</p>
        <p>Thank you for your order. Here is your order summary:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr style="font-weight: bold;">
              <td style="padding: 10px;">Total</td>
              <td style="padding: 10px; text-align: right;">NPR ${order.total.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p>You will receive a separate notification once your service is provisioned.</p>
        <br>
        <p>Best regards,<br><strong>Hosting Nepal Team</strong></p>
      </div>
    `;
    const textContent = `Order confirmed! Order #${order.id} — Total: NPR ${order.total.toLocaleString()}`;

    this.logger.log(`Sending order confirmation to: ${user.email} for order: ${order.id}`);
    return this.sendEmail(user.email, subject, htmlContent, textContent);
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
