import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchDomainDto {
  @ApiProperty({
    description: 'Domain name to search (without TLD)',
    example: 'mybusiness',
  })
  @IsString()
  @IsNotEmpty({ message: 'Search query is required' })
  @MinLength(1, { message: 'Query must be at least 1 character' })
  @MaxLength(63, { message: 'Query must not exceed 63 characters' })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    let cleaned = value.toLowerCase().trim();
    // Strip TLD if user typed full domain (e.g. "hostingnepal.com" → "hostingnepal")
    const dotIndex = cleaned.indexOf('.');
    if (dotIndex > 0) {
      cleaned = cleaned.substring(0, dotIndex);
    }
    // Strip protocol if present
    cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?/, '');
    return cleaned;
  })
  q!: string;

  @ApiPropertyOptional({
    description: 'Comma-separated list of TLDs to check',
    example: 'com,net,org',
    default: 'com,net,org',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((tld: string) => tld.trim().toLowerCase().replace(/^\./, ''));
    }
    if (Array.isArray(value)) {
      return value.map((tld: string) =>
        String(tld).trim().toLowerCase().replace(/^\./, ''),
      );
    }
    return ['com', 'net', 'org'];
  })
  tlds?: string[] = ['com', 'net', 'org'];
}

export class SuggestDomainDto {
  @ApiProperty({
    description: 'Keyword for domain suggestions',
    example: 'mybusiness',
  })
  @IsString()
  @IsNotEmpty({ message: 'Search query is required' })
  @MinLength(2, { message: 'Query must be at least 2 characters' })
  @MaxLength(63, { message: 'Query must not exceed 63 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  q!: string;

  @ApiPropertyOptional({
    description: 'Comma-separated list of TLDs to include in suggestions',
    example: 'com,net,org',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((tld: string) => tld.trim().toLowerCase().replace(/^\./, ''));
    }
    if (Array.isArray(value)) {
      return value.map((tld: string) =>
        String(tld).trim().toLowerCase().replace(/^\./, ''),
      );
    }
    return ['com', 'net', 'org', 'io', 'co'];
  })
  tlds?: string[] = ['com', 'net', 'org', 'io', 'co'];
}
