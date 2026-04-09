import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SslType } from '@prisma/client';

export class IssueSslDto {
  @ApiProperty({ description: 'Domain name for the SSL certificate', example: 'example.com' })
  @IsString()
  domain!: string;

  @ApiProperty({ enum: SslType, description: 'SSL certificate type', example: SslType.LETS_ENCRYPT })
  @IsEnum(SslType)
  sslType!: SslType;

  @ApiPropertyOptional({ description: 'Web root path for ACME HTTP challenge', example: '/var/www/example.com/public_html' })
  @IsOptional()
  @IsString()
  webRootPath?: string;

  @ApiPropertyOptional({ description: 'DNS provider for wildcard certificate (e.g. dns_cf for Cloudflare)', example: 'dns_cf' })
  @IsOptional()
  @IsString()
  dnsProvider?: string;

  @ApiPropertyOptional({ description: 'Hosting account ID to associate this certificate with', example: 'uuid-here' })
  @IsOptional()
  @IsString()
  hostingAccountId?: string;
}
