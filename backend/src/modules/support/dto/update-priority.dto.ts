import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';

export class UpdatePriorityDto {
  @ApiProperty({ enum: TicketPriority, description: 'New priority level for the ticket' })
  @IsEnum(TicketPriority)
  priority!: TicketPriority;
}
