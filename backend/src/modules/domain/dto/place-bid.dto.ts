import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PlaceBidDto {
  @ApiProperty({ example: 5000, minimum: 1, description: 'Bid amount (must be a positive number)' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Bid amount must be a number' })
  @Min(1, { message: 'Bid amount must be at least 1' })
  amount!: number;
}
