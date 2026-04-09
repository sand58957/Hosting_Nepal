import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RenewEmailDto {
  @ApiPropertyOptional({
    description: 'Renewal duration in months (default: 12)',
    example: 12,
    minimum: 1,
    maximum: 120,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  months?: number;
}
