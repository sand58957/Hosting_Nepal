import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddForwarderDto {
  @ApiProperty({ description: 'Email address to forward messages to', example: 'forward@example.com' })
  @IsEmail()
  forwardTo!: string;
}
