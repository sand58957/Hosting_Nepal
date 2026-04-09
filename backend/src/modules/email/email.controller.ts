import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EmailService } from './email.service';
import { CreateEmailAccountDto } from './dto/create-email-account.dto';
import { ChangeEmailPasswordDto } from './dto/change-email-password.dto';
import { AddForwarderDto } from './dto/add-forwarder.dto';
import { RenewEmailDto } from './dto/renew-email.dto';

interface AuthenticatedRequest {
  user: { id: string; email: string };
}

@ApiTags('Email')
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // PLANS (public — no auth required)
  // ═══════════════════════════════════════════════════════════════════════════

  @Get('plans')
  @ApiOperation({ summary: 'List available email plans (Titan + Google Workspace) with NPR pricing' })
  @ApiResponse({ status: 200, description: 'List of available email plans' })
  async getEmailPlans() {
    const plans = await this.emailService.getEmailPlans();
    return { success: true, data: plans };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL ACCOUNT MANAGEMENT (auth required)
  // ═══════════════════════════════════════════════════════════════════════════

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Provision a new Titan email account for a domain' })
  @ApiResponse({ status: 201, description: 'Email account creation initiated (PENDING_SETUP)' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Domain not found in your account' })
  async createEmailAccount(
    @Body() dto: CreateEmailAccountDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.emailService.createEmailAccount(req.user.id, dto);
    return {
      success: true,
      data: result,
      message: 'Email account creation initiated. It will be active shortly.',
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all email accounts for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of email accounts' })
  async getMyEmailAccounts(@Req() req: AuthenticatedRequest) {
    const result = await this.emailService.getMyEmailAccounts(req.user.id);
    return { success: true, data: result };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get details of a specific email account' })
  @ApiParam({ name: 'id', description: 'Email account ID' })
  @ApiResponse({ status: 200, description: 'Email account details' })
  @ApiResponse({ status: 404, description: 'Email account not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async getEmailAccountDetails(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.emailService.getEmailAccountDetails(id, req.user.id);
    return { success: true, data: result };
  }

  @Patch(':id/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change the password for an email account mailbox' })
  @ApiParam({ name: 'id', description: 'Email account ID' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Password does not meet requirements' })
  @ApiResponse({ status: 404, description: 'Email account not found' })
  async changeEmailPassword(
    @Param('id') id: string,
    @Body() dto: ChangeEmailPasswordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.emailService.changeEmailPassword(
      id,
      req.user.id,
      dto.newPassword,
    );
    return { success: true, data: result, message: 'Password changed successfully.' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete (cancel) an email account and its Titan order' })
  @ApiParam({ name: 'id', description: 'Email account ID' })
  @ApiResponse({ status: 200, description: 'Email account deletion initiated' })
  @ApiResponse({ status: 404, description: 'Email account not found' })
  async deleteEmailAccount(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.emailService.deleteEmailAccount(id, req.user.id);
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL RENEWAL
  // ═══════════════════════════════════════════════════════════════════════════

  @Post(':id/renew')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renew an email account subscription' })
  @ApiParam({ name: 'id', description: 'Email account ID' })
  @ApiResponse({ status: 200, description: 'Email account renewed successfully' })
  @ApiResponse({ status: 404, description: 'Email account not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async renewEmail(
    @Param('id') id: string,
    @Body() dto: RenewEmailDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.emailService.renewEmail(id, req.user.id, dto.months);
    return { success: true, data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMAIL FORWARDERS
  // ═══════════════════════════════════════════════════════════════════════════

  @Get(':id/forwarders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all forwarders for an email account' })
  @ApiParam({ name: 'id', description: 'Email account ID' })
  @ApiResponse({ status: 200, description: 'List of forwarders' })
  @ApiResponse({ status: 404, description: 'Email account not found' })
  async getForwarders(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.emailService.getForwarders(id, req.user.id);
    return { success: true, data: result };
  }

  @Post(':id/forwarders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a forwarder to an email account' })
  @ApiParam({ name: 'id', description: 'Email account ID' })
  @ApiResponse({ status: 201, description: 'Forwarder added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid forwarder email address' })
  @ApiResponse({ status: 404, description: 'Email account not found' })
  async addForwarder(
    @Param('id') id: string,
    @Body() dto: AddForwarderDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.emailService.addForwarder(id, req.user.id, dto.forwardTo);
    return { success: true, data: result, message: 'Forwarder added successfully.' };
  }

  @Delete(':id/forwarders/:forwarderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a forwarder from an email account' })
  @ApiParam({ name: 'id', description: 'Email account ID' })
  @ApiParam({ name: 'forwarderId', description: 'Forwarder ID to remove' })
  @ApiResponse({ status: 200, description: 'Forwarder removed successfully' })
  @ApiResponse({ status: 404, description: 'Email account or forwarder not found' })
  async removeForwarder(
    @Param('id') id: string,
    @Param('forwarderId') forwarderId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const result = await this.emailService.removeForwarder(id, req.user.id, forwarderId);
    return { success: true, data: result, message: 'Forwarder removed successfully.' };
  }
}
