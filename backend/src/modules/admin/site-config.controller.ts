import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { SendgridService } from '../email/services/sendgrid.service';

@ApiTags('Site Config')
@Controller('site-config')
export class SiteConfigController {
  constructor(
    private readonly adminService: AdminService,
    private readonly sendgridService: SendgridService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get public site configuration (WhatsApp, etc.)' })
  async getPublicConfig() {
    return this.adminService.getSiteConfig();
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to newsletter' })
  async subscribe(@Body() body: { email: string }) {
    if (!body.email || !body.email.includes('@')) {
      return { success: false, message: 'Valid email is required' };
    }

    // Save subscriber to config file
    await this.adminService.addSubscriber(body.email);

    // Send welcome email
    await this.sendgridService.sendSubscriptionWelcome(body.email);

    return { success: true, message: 'Subscribed successfully!' };
  }
}
