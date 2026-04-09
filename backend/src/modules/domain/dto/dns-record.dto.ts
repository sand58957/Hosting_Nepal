import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DnsRecordType {
  A = 'A',
  AAAA = 'AAAA',
  CNAME = 'CNAME',
  MX = 'MX',
  TXT = 'TXT',
  SRV = 'SRV',
  NS = 'NS',
  SOA = 'SOA',
}

export class AddDnsRecordDto {
  @ApiProperty({ enum: DnsRecordType, example: 'A' })
  @IsEnum(DnsRecordType, {
    message: `Record type must be one of: ${Object.values(DnsRecordType).join(', ')}`,
  })
  @IsNotEmpty()
  type!: DnsRecordType;

  @ApiProperty({ example: '@', description: 'Hostname/subdomain (@ for root)' })
  @IsString()
  @IsNotEmpty({ message: 'Host is required' })
  @MaxLength(253)
  host!: string;

  @ApiProperty({ example: '192.168.1.1', description: 'Record value (IP, hostname, text, etc.)' })
  @IsString()
  @IsNotEmpty({ message: 'Value is required' })
  @MaxLength(1024)
  value!: string;

  @ApiPropertyOptional({ example: 14400, default: 14400, description: 'Time-to-live in seconds' })
  @IsOptional()
  @IsInt({ message: 'TTL must be an integer' })
  @Min(60, { message: 'Minimum TTL is 60 seconds' })
  @Max(86400, { message: 'Maximum TTL is 86400 seconds (24 hours)' })
  ttl?: number = 14400;

  @ApiPropertyOptional({ example: 10, description: 'Priority (required for MX and SRV records)' })
  @IsOptional()
  @IsInt({ message: 'Priority must be an integer' })
  @Min(0)
  @Max(65535)
  priority?: number;
}

export class UpdateDnsRecordDto {
  @ApiProperty({ enum: DnsRecordType, example: 'A' })
  @IsEnum(DnsRecordType, {
    message: `Record type must be one of: ${Object.values(DnsRecordType).join(', ')}`,
  })
  @IsNotEmpty()
  type!: DnsRecordType;

  @ApiProperty({ example: '@', description: 'Hostname/subdomain' })
  @IsString()
  @IsNotEmpty({ message: 'Host is required' })
  @MaxLength(253)
  host!: string;

  @ApiProperty({ example: '192.168.1.2', description: 'New record value' })
  @IsString()
  @IsNotEmpty({ message: 'New value is required' })
  @MaxLength(1024)
  value!: string;

  @ApiPropertyOptional({ example: 14400, description: 'Time-to-live in seconds' })
  @IsOptional()
  @IsInt({ message: 'TTL must be an integer' })
  @Min(60)
  @Max(86400)
  ttl?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(65535)
  priority?: number;
}
