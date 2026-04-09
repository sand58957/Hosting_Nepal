import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSnapshotDto {
  @ApiProperty({ description: 'Name for the snapshot' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'Optional description for the snapshot' })
  @IsOptional()
  @IsString()
  description?: string;
}
