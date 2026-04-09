import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpgradeVpsDto {
  @ApiProperty({ description: 'ID of the new plan to upgrade to' })
  @IsString()
  newPlanId!: string;
}
