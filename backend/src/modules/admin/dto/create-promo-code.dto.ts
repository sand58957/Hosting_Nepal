import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '@prisma/client';

export class CreatePromoCodeDto {
  @ApiProperty({ description: 'Unique promo code string' })
  @IsString()
  code!: string;

  @ApiProperty({ enum: DiscountType, description: 'Type of discount' })
  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @ApiProperty({ description: 'Discount value (percentage or fixed amount)' })
  @IsNumber()
  discountValue!: number;

  @ApiPropertyOptional({ description: 'Maximum number of uses' })
  @IsOptional()
  @IsNumber()
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Expiry date in ISO format' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Minimum order amount in NPR' })
  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @ApiPropertyOptional({ description: 'Whether promo code is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
