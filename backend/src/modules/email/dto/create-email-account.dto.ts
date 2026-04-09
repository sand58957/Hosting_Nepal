import { IsString, IsEmail, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmailAccountDto {
  @ApiProperty({ description: 'Domain name for the email account', example: 'example.com' })
  @IsString()
  domain!: string;

  @ApiProperty({ description: 'Full email address to create', example: 'user@example.com' })
  @IsEmail()
  emailAddress!: string;

  @ApiProperty({ description: 'Password for the mailbox (min 8 characters)', example: 'SecurePass123!' })
  @IsString()
  password!: string;

  @ApiProperty({ description: 'First name of the mailbox owner', example: 'John' })
  @IsString()
  firstName!: string;

  @ApiProperty({ description: 'Last name of the mailbox owner', example: 'Doe' })
  @IsString()
  lastName!: string;

  @ApiProperty({ description: 'Email plan identifier', example: 'titan-starter' })
  @IsString()
  planId!: string;

  @ApiPropertyOptional({ description: 'Subscription duration in months (default: 12)', example: 12 })
  @IsOptional()
  @IsNumber()
  months?: number;
}
