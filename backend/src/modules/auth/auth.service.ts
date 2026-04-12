import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

import { PrismaService } from '../../database/prisma.service';
import { SendgridService } from '../email/services/sendgrid.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  AuthResponse,
  TokenPair,
  TwoFactorSetupResponse,
} from './interfaces/auth-response.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;
  private readonly RESET_TOKEN_EXPIRY_HOURS = 1;
  private readonly VERIFY_TOKEN_EXPIRY_HOURS = 24;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly sendgridService: SendgridService,
  ) {}

  // ─── Registration ──────────────────────────────────────────────────────

  async register(dto: RegisterDto, ip?: string): Promise<{ message: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const verificationToken = randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(
      Date.now() + this.VERIFY_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        name: dto.name.trim(),
        phone: dto.phone ?? null,
        passwordHash,
        companyName: dto.companyName?.trim() ?? null,
        role: 'CUSTOMER',
        status: 'PENDING_VERIFICATION',
        emailVerified: false,
        phoneVerified: false,
        twoFactorEnabled: false,
        verificationToken,
        verificationTokenExpiry,
      },
    });

    // Send welcome + verification email
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://hostingnepals.com');
    const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    const firstName = user.name?.split(' ')[0] || 'User';

    this.sendgridService.sendWelcome({ email: user.email, firstName })
      .catch(err => this.logger.error(`Welcome email error: ${err.message}`));

    this.sendgridService.sendVerificationEmail({ email: user.email, firstName }, verifyUrl)
      .catch(err => this.logger.error(`Verification email error: ${err.message}`));

    this.eventEmitter.emit('auth.register', {
      userId: user.id,
      email: user.email,
      name: user.name,
      verificationToken,
      ip,
    });

    this.logger.log(`New user registered: ${user.email}`);

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  // ─── Login ─────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ip?: string): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException(
        'Your account has been suspended. Please contact support.',
      );
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.twoFactorEnabled) {
      if (!dto.twoFactorCode) {
        throw new UnauthorizedException({
          message: 'Two-factor authentication code is required',
          requiresTwoFactor: true,
        });
      }

      const isCodeValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret!,
        encoding: 'base32',
        token: dto.twoFactorCode,
        window: 1,
      });

      if (!isCodeValid) {
        throw new UnauthorizedException(
          'Invalid two-factor authentication code',
        );
      }
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip ?? null,
        refreshToken: await bcrypt.hash(tokens.refreshToken, this.SALT_ROUNDS),
      },
    });

    this.eventEmitter.emit('auth.login', {
      userId: user.id,
      email: user.email,
      ip,
    });

    this.logger.log(`User logged in: ${user.email}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        companyName: user.companyName,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // ─── Refresh Token ─────────────────────────────────────────────────────

  async refreshToken(
    userId: string,
    currentRefreshToken: string,
  ): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      currentRefreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      // Potential token reuse detected; invalidate all sessions
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
      });
      throw new UnauthorizedException(
        'Refresh token has been revoked. Please log in again.',
      );
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: await bcrypt.hash(tokens.refreshToken, this.SALT_ROUNDS),
      },
    });

    return tokens;
  }

  // ─── Logout ────────────────────────────────────────────────────────────

  async logout(userId: string): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    this.logger.log(`User logged out: ${userId}`);

    return { message: 'Logged out successfully' };
  }

  // ─── Forgot Password ──────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    const successMessage = {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };

    if (!user || user.status === 'INACTIVE') {
      return successMessage;
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(
      Date.now() + this.RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordTokenExpiry: resetTokenExpiry,
      },
    });

    // Send password reset email
    const frontendUrl = this.configService.get('FRONTEND_URL', 'https://hostingnepals.com');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    const firstName = user.name?.split(' ')[0] || 'User';

    this.sendgridService.sendPasswordReset({ email: user.email, firstName }, resetUrl)
      .then(result => {
        if (result.success) {
          this.logger.log(`Password reset email sent to: ${user.email}`);
        } else {
          this.logger.error(`Failed to send password reset email to: ${user.email}`);
        }
      })
      .catch(err => this.logger.error(`Password reset email error: ${err.message}`));

    this.eventEmitter.emit('auth.forgot-password', {
      userId: user.id,
      email: user.email,
      name: user.name,
      resetToken,
    });

    this.logger.log(`Password reset requested for: ${user.email}`);

    return successMessage;
  }

  // ─── Reset Password ───────────────────────────────────────────────────

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired password reset token. Please request a new one.',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordTokenExpiry: null,
        refreshToken: null, // Invalidate all sessions
      },
    });

    this.eventEmitter.emit('auth.password-reset', {
      userId: user.id,
      email: user.email,
    });

    this.logger.log(`Password reset completed for: ${user.email}`);

    return { message: 'Password has been reset successfully. Please log in.' };
  }

  // ─── Verify Email ──────────────────────────────────────────────────────

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        verificationToken: token,
        verificationTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Invalid or expired verification token. Please request a new one.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: 'ACTIVE',
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    this.eventEmitter.emit('auth.email-verified', {
      userId: user.id,
      email: user.email,
    });

    this.logger.log(`Email verified for: ${user.email}`);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  // ─── Profile ───────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        companyName: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.companyName !== undefined)
      updateData.companyName = dto.companyName?.trim() ?? null;
    if (dto.preferredLanguage !== undefined)
      updateData.preferredLanguage = dto.preferredLanguage;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        companyName: true,
        role: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  // ─── Two-Factor Authentication ─────────────────────────────────────────

  async enable2FA(userId: string): Promise<TwoFactorSetupResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    }

    const secret = speakeasy.generateSecret({
      name: `HostingNepal:${user.email}`,
      issuer: 'HostingNepal',
      length: 32,
    });

    // Store the secret temporarily (not yet enabled)
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    let qrCodeDataUrl: string;
    try {
      qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url!);
    } catch {
      throw new InternalServerErrorException(
        'Failed to generate QR code. Please try again.',
      );
    }

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url!,
      qrCodeDataUrl,
    };
  }

  async verify2FA(
    userId: string,
    code: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is already enabled',
      );
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException(
        'Please initiate 2FA setup first by calling the enable endpoint',
      );
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValid) {
      throw new BadRequestException(
        'Invalid verification code. Please try again.',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    this.logger.log(`2FA enabled for user: ${user.email}`);

    return { message: 'Two-factor authentication has been enabled.' };
  }

  async disable2FA(
    userId: string,
    code: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException(
        'Two-factor authentication is not enabled',
      );
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret!,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!isValid) {
      throw new UnauthorizedException(
        'Invalid two-factor authentication code',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    this.logger.log(`2FA disabled for user: ${user.email}`);

    return { message: 'Two-factor authentication has been disabled.' };
  }

  // ─── Private Helpers ───────────────────────────────────────────────────

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<TokenPair> {
    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      role,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: userId,
      email,
      role,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
