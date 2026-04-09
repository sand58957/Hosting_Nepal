import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RenewDomainDto {
  @ApiProperty({
    example: 1,
    minimum: 1,
    maximum: 10,
    description: 'Number of years to renew the domain for',
  })
  @IsInt({ message: 'Years must be an integer' })
  @Min(1, { message: 'Minimum renewal period is 1 year' })
  @Max(10, { message: 'Maximum renewal period is 10 years' })
  years!: number;
}
