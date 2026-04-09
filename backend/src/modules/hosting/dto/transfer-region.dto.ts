import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferRegionDto {
  @ApiProperty({ description: 'Target region identifier to transfer the VPS to' })
  @IsString()
  targetRegion!: string;
}
