import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReinstallVpsDto {
  @ApiProperty({ description: 'OS template to reinstall (e.g. ubuntu-22.04, debian-12)' })
  @IsString()
  osTemplate!: string;
}
