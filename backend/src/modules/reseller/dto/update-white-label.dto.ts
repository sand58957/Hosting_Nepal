import { IsString, IsEmail, IsOptional, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWhiteLabelDto {
  @ApiPropertyOptional({ description: 'Brand name shown to end customers' })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiPropertyOptional({ description: 'Full URL to brand logo image' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Custom domain for white-label portal (e.g. hosting.mybrand.com)' })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiPropertyOptional({ description: 'Support email shown to end customers' })
  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @ApiPropertyOptional({ description: 'Primary brand color as hex code (e.g. #1a73e8)' })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Brand tagline or slogan' })
  @IsOptional()
  @IsString()
  tagline?: string;
}
