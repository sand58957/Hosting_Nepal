import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleRescueDto {
  @ApiProperty({ description: 'Enable or disable rescue mode' })
  @IsBoolean()
  enabled!: boolean;
}
