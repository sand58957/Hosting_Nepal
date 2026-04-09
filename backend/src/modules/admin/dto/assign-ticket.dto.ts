import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTicketDto {
  @ApiProperty({ description: 'Agent user ID to assign the ticket to' })
  @IsString()
  agentId!: string;
}
