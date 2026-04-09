import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpgradePlanDto {
  @ApiProperty({ description: 'New plan name to upgrade to', example: 'pro-hosting' })
  @IsString()
  @IsNotEmpty()
  newPlanName!: string;

  @ApiProperty({ description: 'Duration in months for the new plan', example: 12 })
  @IsNumber()
  @Min(1)
  @Max(120)
  @IsNotEmpty()
  newDurationMonths!: number;

  @ApiProperty({ description: 'Price of the new plan in NPR', example: 3000 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  newPlanAmountNpr!: number;
}
