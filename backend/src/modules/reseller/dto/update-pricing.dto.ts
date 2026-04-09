import { IsObject, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePricingDto {
  @ApiPropertyOptional({
    description: 'Global markup percentage applied to all products (0-200)',
    minimum: 0,
    maximum: 200,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  globalMarkupPercent?: number;

  @ApiPropertyOptional({
    description: 'Per-TLD domain markup overrides (e.g. { "com": 15, "np": 10 })',
  })
  @IsOptional()
  @IsObject()
  domainMarkup?: Record<string, number>;

  @ApiPropertyOptional({
    description: 'Per-plan hosting markup overrides (e.g. { "starter": 20, "pro": 25 })',
  })
  @IsOptional()
  @IsObject()
  hostingMarkup?: Record<string, number>;

  @ApiPropertyOptional({
    description: 'Per-type SSL markup overrides (e.g. { "DV": 10, "EV": 30 })',
  })
  @IsOptional()
  @IsObject()
  sslMarkup?: Record<string, number>;
}
