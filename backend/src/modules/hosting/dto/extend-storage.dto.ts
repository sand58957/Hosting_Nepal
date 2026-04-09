import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExtendStorageDto {
  @ApiProperty({ description: 'Additional storage in GB (minimum 10)', minimum: 10 })
  @IsNumber()
  @Min(10)
  additionalGB!: number;
}
