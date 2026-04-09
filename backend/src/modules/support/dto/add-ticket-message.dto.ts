import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddTicketMessageDto {
  @ApiProperty({ description: 'Message content to add to the ticket thread' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ type: [String], description: 'Optional array of attachment URLs' })
  @IsOptional()
  @IsArray()
  attachments?: string[];
}
