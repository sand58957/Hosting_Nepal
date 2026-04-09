import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class PortfolioQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'PENDING_REGISTRATION', 'PENDING_TRANSFER', 'PENDING_DELETION', 'DELETED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'com' })
  @IsOptional()
  @IsString()
  tld?: string;

  @ApiPropertyOptional({ enum: ['name', 'expiry', 'created'], default: 'created' })
  @IsOptional()
  @IsIn(['name', 'expiry', 'created'])
  sortBy?: string = 'created';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';

  @ApiPropertyOptional({ description: 'Search by domain name' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class ToggleAutoRenewDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  enabled!: boolean;
}

export class BulkDomainActionDto {
  @ApiProperty({ example: ['uuid-1', 'uuid-2'], description: 'Array of domain IDs' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  domainIds!: string[];

  @ApiProperty({ enum: ['renew', 'lock', 'unlock', 'delete'], example: 'lock' })
  @IsIn(['renew', 'lock', 'unlock', 'delete'])
  @IsNotEmpty()
  action!: 'renew' | 'lock' | 'unlock' | 'delete';
}
