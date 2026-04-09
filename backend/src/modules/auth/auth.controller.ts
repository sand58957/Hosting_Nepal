import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Registration ──────────────────────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Ip() ip: string) {
    return this.authService.register(dto, ip);
  }

  // ─── Login ─────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(dto, ip);

    // Set refresh token as HTTP-only cookie
    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/auth/refresh',
    });

    return {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  // ─── Refresh Token ─────────────────────────────────────────────────────

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = req.user as any;
    const tokens = await this.authService.refreshToken(
      user.id,
      user.refreshToken,
    );

    response.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });

    return { accessToken: tokens.accessToken };
  }

  // ─── Logout ────────────────────────────────────────────────────────────

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = req.user as any;

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/auth/refresh',
    });

    return this.authService.logout(user.id);
  }

  // ─── Forgot Password ──────────────────────────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  // ─── Reset Password ───────────────────────────────────────────────────

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // ─── Verify Email ──────────────────────────────────────────────────────

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  // ─── Get Current User ──────────────────────────────────────────────────

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req: Request) {
    const user = req.user as any;
    return this.authService.getProfile(user.id);
  }

  // ─── Update Profile ────────────────────────────────────────────────────

  @Put('me')
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(
    @Req() req: Request,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = req.user as any;
    return this.authService.updateProfile(user.id, dto);
  }

  // ─── Enable 2FA ────────────────────────────────────────────────────────

  @Post('2fa/enable')
  @UseGuards(AuthGuard('jwt'))
  async enable2FA(@Req() req: Request) {
    const user = req.user as any;
    return this.authService.enable2FA(user.id);
  }

  // ─── Verify 2FA Setup ─────────────────────────────────────────────────

  @Post('2fa/verify')
  @UseGuards(AuthGuard('jwt'))
  async verify2FA(@Req() req: Request, @Body() dto: Verify2FADto) {
    const user = req.user as any;
    return this.authService.verify2FA(user.id, dto.code);
  }

  // ─── Disable 2FA ───────────────────────────────────────────────────────

  @Post('2fa/disable')
  @UseGuards(AuthGuard('jwt'))
  async disable2FA(@Req() req: Request, @Body() dto: Verify2FADto) {
    const user = req.user as any;
    return this.authService.disable2FA(user.id, dto.code);
  }
}
