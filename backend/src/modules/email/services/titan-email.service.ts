import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

// ─── Custom Error ─────────────────────────────────────────────────────────────

export class TitanEmailApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly apiResponse?: unknown,
  ) {
    super(message);
    this.name = 'TitanEmailApiError';
  }
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface TitanOrderResult {
  orderId: string;
  domain: string;
  status: string;
  noOfAccounts: number;
  storageGb: number;
  [key: string]: unknown;
}

export interface TitanMailboxResult {
  emailAddress: string;
  firstName: string;
  lastName: string;
  status: string;
  [key: string]: unknown;
}

export interface TitanForwarder {
  id: string;
  forwardTo: string;
  emailAddress: string;
  [key: string]: unknown;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class TitanEmailService {
  private readonly logger = new Logger(TitanEmailService.name);

  /** ResellerClub HTTP client for order management. */
  private readonly rcClient: AxiosInstance;

  /** Titan Admin API HTTP client for mailbox management. */
  private readonly titanClient: AxiosInstance;

  private readonly authUserId: string;
  private readonly apiKey: string;
  private readonly rcBaseUrl: string;
  private readonly titanBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.authUserId = this.configService.get<string>('RESELLERCLUB_AUTH_USERID', '');
    this.apiKey = this.configService.get<string>('RESELLERCLUB_API_KEY', '');

    const isSandbox =
      (this.configService.get<string>('RESELLERCLUB_USE_SANDBOX') ??
       this.configService.get<string>('RESELLERCLUB_SANDBOX', 'true')) === 'true';

    this.rcBaseUrl = this.configService.get<string>(
      'RESELLERCLUB_BASE_URL',
      isSandbox
        ? 'https://test.httpapi.com/api'
        : 'https://httpapi.com/api',
    );

    this.titanBaseUrl = this.configService.get<string>(
      'TITAN_API_URL',
      'https://api.titan.email/admin/api',
    );

    this.rcClient = axios.create({
      baseURL: this.rcBaseUrl,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    this.titanClient = axios.create({
      baseURL: this.titanBaseUrl,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── Auth Helpers ──────────────────────────────────────────────────────────

  /** Returns the common auth params appended to every RC API call. */
  private get rcAuthParams(): Record<string, string> {
    return {
      'auth-userid': this.authUserId,
      'api-key': this.apiKey,
    };
  }

  // ─── Order Management (ResellerClub) ──────────────────────────────────────

  /**
   * Create a Titan Email order via ResellerClub.
   * @param domain      The domain name to attach the email service to.
   * @param planId      ResellerClub plan identifier.
   * @param months      Subscription duration in months.
   * @param noOfAccounts Number of mailboxes to provision (default: 1).
   */
  async createOrder(
    domain: string,
    planId: string,
    months: number = 12,
    noOfAccounts: number = 1,
  ): Promise<TitanOrderResult> {
    this.logger.log(`Creating Titan email order for domain: ${domain}, plan: ${planId}`);

    try {
      const params = new URLSearchParams({
        ...this.rcAuthParams,
        'domain-name': domain,
        'plan-id': planId,
        'months': String(months),
        'no-of-accounts': String(noOfAccounts),
      });

      const response = await this.rcClient.get<TitanOrderResult>(
        `/email/us/add.json?${params.toString()}`,
      );

      this.logger.log(`Email order created for ${domain}: orderId=${response.data.orderId}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to create email order for ${domain}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new TitanEmailApiError(
        `Failed to create email order: ${(error as Error).message}`,
        500,
        error,
      );
    }
  }

  /**
   * Delete (cancel) a Titan Email order via ResellerClub.
   * @param orderId  The RC order ID to delete.
   */
  async deleteOrder(orderId: string): Promise<void> {
    this.logger.log(`Deleting Titan email order: ${orderId}`);

    try {
      const params = new URLSearchParams({
        ...this.rcAuthParams,
        'order-id': orderId,
      });

      await this.rcClient.delete(`/email/us/delete.json?${params.toString()}`);
      this.logger.log(`Email order deleted: ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete email order ${orderId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new TitanEmailApiError(
        `Failed to delete email order: ${(error as Error).message}`,
        500,
        error,
      );
    }
  }

  /**
   * Get email order details from ResellerClub.
   * @param orderId  The RC order ID.
   */
  async getAccountDetails(orderId: string): Promise<TitanOrderResult> {
    this.logger.log(`Fetching email order details: ${orderId}`);

    try {
      const params = new URLSearchParams({
        ...this.rcAuthParams,
        'order-id': orderId,
      });

      const response = await this.rcClient.get<TitanOrderResult>(
        `/email/us/details.json?${params.toString()}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to get email order details ${orderId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new TitanEmailApiError(
        `Failed to get email order details: ${(error as Error).message}`,
        500,
        error,
      );
    }
  }

  /**
   * Suspend a Titan Email order.
   * @param orderId  The RC order ID to suspend.
   */
  async suspendOrder(orderId: string): Promise<void> {
    this.logger.log(`Suspending Titan email order: ${orderId}`);

    try {
      const params = new URLSearchParams({
        ...this.rcAuthParams,
        'order-id': orderId,
      });

      await this.rcClient.post(`/email/us/suspend.json?${params.toString()}`);
      this.logger.log(`Email order suspended: ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to suspend email order ${orderId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new TitanEmailApiError(
        `Failed to suspend email order: ${(error as Error).message}`,
        500,
        error,
      );
    }
  }

  /**
   * Unsuspend a Titan Email order.
   * @param orderId  The RC order ID to unsuspend.
   */
  async unsuspendOrder(orderId: string): Promise<void> {
    this.logger.log(`Unsuspending Titan email order: ${orderId}`);

    try {
      const params = new URLSearchParams({
        ...this.rcAuthParams,
        'order-id': orderId,
      });

      await this.rcClient.post(`/email/us/unsuspend.json?${params.toString()}`);
      this.logger.log(`Email order unsuspended: ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Failed to unsuspend email order ${orderId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new TitanEmailApiError(
        `Failed to unsuspend email order: ${(error as Error).message}`,
        500,
        error,
      );
    }
  }

  // ─── Mailbox Management (Titan Admin API) ─────────────────────────────────

  /**
   * Create a mailbox under an existing Titan email order.
   * @param orderId       The RC order ID.
   * @param emailAddress  Full email address (user@domain.com).
   * @param password      Initial mailbox password.
   * @param firstName     Account holder first name.
   * @param lastName      Account holder last name.
   */
  async createEmailAccount(
    orderId: string,
    emailAddress: string,
    password: string,
    firstName: string,
    lastName: string,
  ): Promise<TitanMailboxResult> {
    this.logger.log(`Creating Titan mailbox: ${emailAddress} (orderId=${orderId})`);

    try {
      const response = await this.titanClient.post<TitanMailboxResult>(
        '/mailbox/create',
        {
          orderId,
          emailAddress,
          password,
          firstName,
          lastName,
        },
      );

      this.logger.log(`Titan mailbox created: ${emailAddress}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to create Titan mailbox ${emailAddress}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new TitanEmailApiError(
        `Failed to create mailbox: ${(error as Error).message}`,
        500,
        error,
      );
    }
  }

  /**
   * Delete a mailbox from a Titan email order.
   * @param orderId       The RC order ID.
   * @param emailAddress  Full email address to delete.
   */
  async deleteEmailAccount(orderId: string, emailAddress: string): Promise<void> {
    this.logger.log(`Deleting Titan mailbox: ${emailAddress} (orderId=${orderId})`);

    try {
      await this.titanClient.delete('/mailbox/delete', {
        data: { orderId, emailAddress },
      });

      this.logger.log(`Titan mailbox deleted: ${emailAddress}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete Titan mailbox ${emailAddress}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new TitanEmailApiError(
        `Failed to delete mailbox: ${(error as Error).message}`,
        500,
        error,
      );
    }
  }

  /**
   * Change the password for a Titan mailbox.
   * @param orderId       The RC order ID.
   * @param emailAddress  Full email address.
   * @param newPassword   The new password to set.
   */
  async changePassword(
    orderId: string,
    emailAddress: string,
    newPassword: string,
  ): Promise<void> {
    this.logger.log(`Changing password for Titan mailbox: ${emailAddress}`);

    try {
      await this.titanClient.post('/mailbox/change-password', {
        orderId,
        emailAddress,
        newPassword,
      });

      this.logger.log(`Password changed for Titan mailbox: ${emailAddress}`);
    } catch (error) {
      this.logger.error(
        `Failed to change password for ${emailAddress}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new TitanEmailApiError(
        `Failed to change mailbox password: ${(error as Error).message}`,
        500,
        error,
      );
    }
  }

  // ─── Email Forwarders ─────────────────────────────────────────────────────

  /**
   * List all forwarders for a given mailbox.
   * @param orderId       The RC order ID.
   * @param emailAddress  The source mailbox address.
   */
  async getForwarders(orderId: string, emailAddress: string): Promise<TitanForwarder[]> {
    this.logger.log(`Fetching forwarders for: ${emailAddress} (orderId=${orderId})`);

    try {
      const response = await this.titanClient.get<{ forwarders: TitanForwarder[] }>(
        '/mailbox/forwarders',
        { params: { orderId, emailAddress } },
      );

      return response.data?.forwarders ?? [];
    } catch (error) {
      this.logger.error(
        `Failed to get forwarders for ${emailAddress}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new TitanEmailApiError(
        `Failed to get forwarders: ${(error as Error).message}`,
        500,
        error,
      );
    }
  }

  /**
   * Add a forwarder to a mailbox.
   * @param orderId       The RC order ID.
   * @param emailAddress  The source mailbox address.
   * @param forwardTo     The destination email address to forward to.
   */
  async addForwarder(
    orderId: string,
    emailAddress: string,
    forwardTo: string,
  ): Promise<TitanForwarder> {
    this.logger.log(`Adding forwarder ${forwardTo} to mailbox: ${emailAddress}`);

    try {
      const response = await this.titanClient.post<TitanForwarder>(
        '/mailbox/forwarder/add',
        { orderId, emailAddress, forwardTo },
      );

      this.logger.log(`Forwarder added: ${emailAddress} -> ${forwardTo}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to add forwarder for ${emailAddress}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new TitanEmailApiError(
        `Failed to add forwarder: ${(error as Error).message}`,
        500,
        error,
      );
    }
  }

  /**
   * Remove a forwarder from a mailbox.
   * @param orderId       The RC order ID.
   * @param emailAddress  The source mailbox address.
   * @param forwarderId   The forwarder ID to remove.
   */
  async removeForwarder(
    orderId: string,
    emailAddress: string,
    forwarderId: string,
  ): Promise<void> {
    this.logger.log(`Removing forwarder ${forwarderId} from mailbox: ${emailAddress}`);

    try {
      await this.titanClient.delete('/mailbox/forwarder/remove', {
        data: { orderId, emailAddress, forwarderId },
      });

      this.logger.log(`Forwarder removed: ${forwarderId} from ${emailAddress}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove forwarder ${forwarderId} for ${emailAddress}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new TitanEmailApiError(
        `Failed to remove forwarder: ${(error as Error).message}`,
        500,
        error,
      );
    }
  }
}
