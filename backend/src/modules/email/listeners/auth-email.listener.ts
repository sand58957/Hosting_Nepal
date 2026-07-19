import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SendgridService } from '../services/sendgrid.service';

interface AuthLoginEvent {
  userId: string;
  email: string;
  name?: string;
  ip?: string | null;
  previousIp?: string | null;
  provider?: string;
}

@Injectable()
export class AuthEmailListener {
  private readonly logger = new Logger(AuthEmailListener.name);

  constructor(private readonly mail: SendgridService) {}

  /**
   * Security alert on login from a NEW IP. First-ever login (no previousIp) is
   * covered by the welcome email; same-IP logins stay silent to avoid spam.
   */
  @OnEvent('auth.login', { async: true })
  async onLogin(payload: AuthLoginEvent): Promise<void> {
    if (!payload.ip || !payload.previousIp) return;
    if (payload.ip === payload.previousIp) return;
    try {
      await this.mail.sendLoginAlert(
        {
          email: payload.email,
          firstName: payload.name?.split(' ')[0] || 'Customer',
        },
        {
          ip: payload.ip,
          time: new Date().toUTCString(),
          method: payload.provider === 'google' ? 'Google sign-in' : 'Email & password',
        },
      );
    } catch (e) {
      this.logger.warn(`login alert email failed: ${(e as Error).message}`);
    }
  }

  @OnEvent('auth.password-reset', { async: true })
  async onPasswordReset(payload: { email: string; name?: string }): Promise<void> {
    try {
      await this.mail.sendSecurityChangeNotice(
        { email: payload.email, firstName: payload.name?.split(' ')[0] || 'Customer' },
        { change: 'Password changed', detail: 'All active sessions were signed out.' },
      );
    } catch (e) {
      this.logger.warn(`password-reset notice failed: ${(e as Error).message}`);
    }
  }

  @OnEvent('auth.2fa-changed', { async: true })
  async onTwoFactorChanged(payload: { email: string; name?: string; enabled: boolean }): Promise<void> {
    try {
      await this.mail.sendSecurityChangeNotice(
        { email: payload.email, firstName: payload.name?.split(' ')[0] || 'Customer' },
        {
          change: payload.enabled
            ? 'Two-factor authentication ENABLED'
            : 'Two-factor authentication DISABLED',
          detail: payload.enabled
            ? 'Your account now requires a 2FA code at login.'
            : 'Your account no longer requires a 2FA code — consider re-enabling it for better security.',
        },
      );
    } catch (e) {
      this.logger.warn(`2fa-changed notice failed: ${(e as Error).message}`);
    }
  }
}
