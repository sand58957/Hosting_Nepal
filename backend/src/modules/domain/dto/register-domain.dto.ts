import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegistrantContactDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty({ message: 'Contact name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  @MaxLength(200)
  company!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: 'Valid email is required' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({ example: '+977-9812345678', description: 'Phone in international format' })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+?[\d\s-]+$/, { message: 'Phone must be a valid phone number' })
  phone!: string;

  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  @MaxLength(200)
  address!: string;

  @ApiPropertyOptional({ example: 'Suite 100' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiProperty({ example: 'Kathmandu' })
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: 'Bagmati' })
  @IsString()
  @IsNotEmpty({ message: 'State/Province is required' })
  @MaxLength(100)
  state!: string;

  @ApiProperty({ example: 'NP', description: 'ISO 3166-1 alpha-2 country code' })
  @IsString()
  @IsNotEmpty({ message: 'Country code is required' })
  @MinLength(2)
  @MaxLength(2)
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  country!: string;

  @ApiProperty({ example: '44600' })
  @IsString()
  @IsNotEmpty({ message: 'ZIP/Postal code is required' })
  @MaxLength(20)
  zip!: string;
}

export class RegisterDomainDto {
  @ApiProperty({ example: 'mybusiness.com', description: 'Full domain name including TLD' })
  @IsString()
  @IsNotEmpty({ message: 'Domain name is required' })
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/, {
    message: 'Please provide a valid domain name (e.g., example.com)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  domainName!: string;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt({ message: 'Years must be an integer' })
  @Min(1, { message: 'Minimum registration period is 1 year' })
  @Max(10, { message: 'Maximum registration period is 10 years' })
  years?: number = 1;

  @ApiPropertyOptional({
    example: ['ns1.hostingnepal.com', 'ns2.hostingnepal.com'],
    description: 'Custom nameservers. Defaults to Hosting Nepal nameservers.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/, {
    each: true,
    message: 'Each nameserver must be a valid hostname',
  })
  nameservers?: string[];

  @ApiProperty({ type: RegistrantContactDto })
  @ValidateNested()
  @Type(() => RegistrantContactDto)
  @IsNotEmpty({ message: 'Registrant contact information is required' })
  registrantContact!: RegistrantContactDto;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  privacyProtection?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean = false;
}
