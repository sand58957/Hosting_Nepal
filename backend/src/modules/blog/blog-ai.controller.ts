import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { BlogAiService } from './blog-ai.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

class GenerateSeoDto {
  @ApiProperty()
  @IsString()
  content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
}

class GenerateSummaryDto {
  @ApiProperty()
  @IsString()
  content!: string;
}

@ApiTags('Blog AI')
@Controller('blog/ai')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@ApiBearerAuth()
export class BlogAiController {
  constructor(private readonly aiService: BlogAiService) {}

  @Post('generate-seo')
  @ApiOperation({ summary: 'Generate SEO metadata from content using AI' })
  async generateSeo(@Body() dto: GenerateSeoDto) {
    return this.aiService.generateSeo(dto.content, dto.title);
  }

  @Post('generate-summary')
  @ApiOperation({ summary: 'Generate TL;DR summary from content using AI' })
  async generateSummary(@Body() dto: GenerateSummaryDto) {
    return this.aiService.generateSummary(dto.content);
  }

  @Post('generate-excerpt')
  @ApiOperation({ summary: 'Generate excerpt from content using AI' })
  async generateExcerpt(@Body() dto: GenerateSummaryDto) {
    return this.aiService.generateExcerpt(dto.content);
  }
}
