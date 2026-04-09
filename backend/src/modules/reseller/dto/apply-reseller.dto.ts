import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyResellerDto {
  @ApiProperty({ description: 'Company name for the reseller account' })
  @IsString()
  companyName!: string;

  @ApiProperty({ description: 'Business email address' })
  @IsEmail()
  businessEmail!: string;

  @ApiPropertyOptional({ description: 'Business website URL' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Type of business (e.g. IT Company, Freelancer)' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({ description: 'PAN or VAT registration number' })
  @IsOptional()
  @IsString()
  panVatNumber?: string;

  @ApiPropertyOptional({ description: 'Business address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;
}
