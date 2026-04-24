import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BlogGeneratorService } from './blog-generator.service';

@ApiTags('Blog Generator')
@Controller('blog/generator')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
export class BlogGeneratorController {
  constructor(private readonly service: BlogGeneratorService) {}

  @Post('dry-run')
  @ApiOperation({ summary: 'Generate a post without saving (for prompt QA)' })
  async dryRun() {
    return this.service.generateOne({ dryRun: true });
  }

  @Post('run-now')
  @ApiOperation({ summary: 'Generate and save one post immediately' })
  async runNow() {
    return this.service.generateOne();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Generation stats for the last N days' })
  async stats(@Query('days') days?: string) {
    const d = days ? Math.min(parseInt(days, 10) || 7, 90) : 7;

    return this.service.stats(d);
  }
}
