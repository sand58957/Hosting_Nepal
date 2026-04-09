import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ServiceType } from '@prisma/client';

export class ValidatePromoDto {
  @ApiProperty({ description: 'Promo code to validate', example: 'SAVE20' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ enum: ServiceType, description: 'Service type the promo is being applied to' })
  @IsEnum(ServiceType)
  @IsNotEmpty()
  serviceType!: ServiceType;

  @ApiProperty({ description: 'Order amount in NPR', example: 5000 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount!: number;
}
