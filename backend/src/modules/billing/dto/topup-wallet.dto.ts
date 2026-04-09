import { IsEnum, IsNotEmpty, IsNumber, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentGateway } from '@prisma/client';

export class TopupWalletDto {
  @ApiProperty({ description: 'Amount to add in NPR', minimum: 100, maximum: 100000 })
  @IsNumber()
  @Min(100)
  @Max(100000)
  @IsNotEmpty()
  amount!: number;

  @ApiProperty({ enum: PaymentGateway, description: 'Payment gateway for top-up' })
  @IsEnum(PaymentGateway)
  @IsNotEmpty()
  gateway!: PaymentGateway;
}
