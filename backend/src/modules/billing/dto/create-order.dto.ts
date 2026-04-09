import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType } from '@prisma/client';

export class OrderItemDto {
  @ApiProperty({ enum: ServiceType, description: 'Type of service being ordered' })
  @IsEnum(ServiceType)
  @IsNotEmpty()
  serviceType!: ServiceType;

  @ApiProperty({ description: 'Name of the plan', example: 'starter-hosting' })
  @IsString()
  @IsNotEmpty()
  planName!: string;

  @ApiPropertyOptional({ description: 'Domain name if applicable', example: 'example.com.np' })
  @IsOptional()
  @IsString()
  domainName?: string;

  @ApiProperty({ description: 'Duration in months', example: 12 })
  @IsNumber()
  @Min(1)
  @Max(120)
  durationMonths!: number;

  @ApiPropertyOptional({ description: 'Quantity for multi-unit items', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quantity?: number;

  @ApiProperty({ description: 'Unit price in NPR', example: 1500 })
  @IsNumber()
  @Min(0)
  amountNpr!: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto], description: 'Order items' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiPropertyOptional({ description: 'Promo code to apply', example: 'SAVE20' })
  @IsOptional()
  @IsString()
  promoCode?: string;

  @ApiPropertyOptional({ description: 'Additional notes for the order' })
  @IsOptional()
  @IsString()
  notes?: string;
}
