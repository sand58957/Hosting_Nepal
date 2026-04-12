import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('Site Config')
@Controller('site-config')
export class SiteConfigController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get public site configuration (WhatsApp, etc.)' })
  async getPublicConfig() {
    return this.adminService.getSiteConfig();
  }
}
