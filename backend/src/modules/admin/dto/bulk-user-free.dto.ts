import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BulkFreeScope {
  ALL_CUSTOMERS = 'ALL_CUSTOMERS',
  ALL_NON_STAFF = 'ALL_NON_STAFF',
}

export class BulkUserFreeDto {
  @ApiProperty({ description: 'true grants billing-exempt status, false revokes it.' })
  @IsBoolean()
  isFree!: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'Explicit user UUIDs to update (staff are always skipped).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5000)
  @IsUUID('4', { each: true })
  userIds?: string[];

  @ApiPropertyOptional({
    enum: BulkFreeScope,
    description:
      'Apply to a whole group instead of explicit ids. ALL_CUSTOMERS = every CUSTOMER; ALL_NON_STAFF = CUSTOMER/RESELLER/SUPPORT_AGENT.',
  })
  @IsOptional()
  @IsEnum(BulkFreeScope)
  scope?: BulkFreeScope;

  @ApiPropertyOptional({ description: 'Reason kept for audit (used when granting).' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
