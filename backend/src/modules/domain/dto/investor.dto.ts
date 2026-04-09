import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListDomainForSaleDto {
  @ApiProperty({ description: 'Domain ID to list for sale' })
  @IsString()
  @IsNotEmpty()
  domainId!: string;

  @ApiProperty({ example: 5000, description: 'Asking price in USD' })
  @IsNumber()
  @Min(1)
  askingPrice!: number;

  @ApiPropertyOptional({ example: 'Premium one-word .com domain' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class ToggleParkingDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  @IsNotEmpty()
  enabled!: boolean;
}
