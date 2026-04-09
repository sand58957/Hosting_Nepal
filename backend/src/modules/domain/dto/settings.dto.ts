import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class AddDelegateDto {
  @ApiProperty({ example: 'delegate@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: ['view', 'dns', 'renew'],
    description: 'Permissions: view, dns, renew, transfer, settings',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissions!: string[];
}

export class DnsTemplateRecordDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ example: '@' })
  @IsString()
  @IsNotEmpty()
  host!: string;

  @ApiProperty({ example: '192.168.1.1' })
  @IsString()
  @IsNotEmpty()
  value!: string;

  @ApiPropertyOptional({ example: 14400 })
  @IsOptional()
  @IsInt()
  @Min(60)
  ttl?: number = 14400;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;
}

export class CreateDnsTemplateDto {
  @ApiProperty({ example: 'Default Web Hosting' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ type: [DnsTemplateRecordDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DnsTemplateRecordDto)
  records!: DnsTemplateRecordDto[];
}

export class UpdateDnsTemplateDto {
  @ApiPropertyOptional({ example: 'Updated Template Name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ type: [DnsTemplateRecordDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DnsTemplateRecordDto)
  records?: DnsTemplateRecordDto[];
}

export class ApplyDnsTemplateDto {
  @ApiProperty({ description: 'DNS Template ID to apply' })
  @IsString()
  @IsNotEmpty()
  templateId!: string;
}

export class ExportDomainListDto {
  @ApiProperty({ enum: ['csv', 'json'], example: 'csv' })
  @IsIn(['csv', 'json'])
  @IsNotEmpty()
  format!: 'csv' | 'json';

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by TLD' })
  @IsOptional()
  @IsString()
  tld?: string;
}

export class ActivityLogQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by domain ID' })
  @IsOptional()
  @IsString()
  domainId?: string;

  @ApiPropertyOptional({ description: 'Filter by action type' })
  @IsOptional()
  @IsString()
  action?: string;
}
