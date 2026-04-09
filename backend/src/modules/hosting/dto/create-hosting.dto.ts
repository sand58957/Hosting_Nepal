import { IsString, IsEnum, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HostingPlanType, HostingProvider } from '@prisma/client';

export class CreateHostingDto {
  @ApiProperty({ description: 'Domain name for the hosting account' })
  @IsString()
  domain!: string;

  @ApiProperty({ enum: HostingPlanType, description: 'Type of hosting plan' })
  @IsEnum(HostingPlanType)
  planType!: HostingPlanType;

  @ApiProperty({ description: 'Plan identifier (e.g. starter, business, vps-2)' })
  @IsString()
  planId!: string;

  @ApiPropertyOptional({ description: 'Admin email address' })
  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @ApiPropertyOptional({ description: 'Admin username' })
  @IsOptional()
  @IsString()
  adminUsername?: string;

  @ApiPropertyOptional({ description: 'Admin password' })
  @IsOptional()
  @IsString()
  adminPassword?: string;

  @ApiPropertyOptional({ description: 'WordPress site title (for WP hosting)' })
  @IsOptional()
  @IsString()
  siteTitle?: string;

  @ApiPropertyOptional({ enum: HostingProvider, description: 'Hosting provider (RESELLERCLUB or CUSTOM)' })
  @IsOptional()
  @IsEnum(HostingProvider)
  provider?: HostingProvider;
}
