import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserFreeDto {
  @ApiProperty({
    description:
      'Whether the user is billing-exempt (free). true grants free status, false revokes it.',
  })
  @IsBoolean()
  isFree!: boolean;

  @ApiPropertyOptional({
    description: 'Reason for granting/revoking free status (kept for audit).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
