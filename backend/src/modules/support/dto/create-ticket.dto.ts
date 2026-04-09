import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketCategory, TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({ description: 'Short subject line for the ticket', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  subject!: string;

  @ApiProperty({ description: 'Initial message / description of the issue' })
  @IsString()
  message!: string;

  @ApiProperty({ enum: TicketCategory, description: 'Category of the support request' })
  @IsEnum(TicketCategory)
  category!: TicketCategory;

  @ApiPropertyOptional({ enum: TicketPriority, description: 'Priority level (defaults to MEDIUM)' })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'ID of the related service (e.g. hosting plan ID)' })
  @IsOptional()
  @IsString()
  relatedServiceId?: string;

  @ApiPropertyOptional({ description: 'Type of the related service (e.g. HOSTING, DOMAIN)' })
  @IsOptional()
  @IsString()
  relatedServiceType?: string;
}
