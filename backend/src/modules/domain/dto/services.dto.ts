import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class DomainBrokerRequestDto {
  @ApiProperty({ example: 'premium-domain.com' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/, {
    message: 'Please provide a valid domain name',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  domainName!: string;

  @ApiProperty({ example: 5000, description: 'Maximum budget in USD' })
  @IsNumber()
  @Min(1)
  maxBudget!: number;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  contactEmail!: string;
}

export class PreRegisterDomainDto {
  @ApiProperty({ example: 'my-new-domain' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  domainName!: string;

  @ApiProperty({ example: 'com' })
  @IsString()
  @IsNotEmpty()
  tld!: string;
}

export class BlockDomainDto {
  @ApiProperty({ example: 'mybrand' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  domainName!: string;

  @ApiProperty({ example: ['com', 'net', 'org'], description: 'TLDs to block across' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  tlds!: string[];
}

export class NegotiationRequestDto {
  @ApiProperty({ example: 'premium-domain.com' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/, {
    message: 'Please provide a valid domain name',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  domainName!: string;

  @ApiProperty({ example: 10000, description: 'Maximum budget in USD' })
  @IsNumber()
  @Min(1)
  maxBudget!: number;

  @ApiPropertyOptional({ example: 'Interested in acquiring this domain for our business' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
