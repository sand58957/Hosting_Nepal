import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentGateway } from '@prisma/client';

export class InitiatePaymentDto {
  @ApiProperty({ enum: PaymentGateway, description: 'Payment gateway to use' })
  @IsEnum(PaymentGateway)
  @IsNotEmpty()
  gateway!: PaymentGateway;

  @ApiPropertyOptional({ description: 'Return URL after payment (for redirect-based gateways)' })
  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  returnUrl?: string;
}
