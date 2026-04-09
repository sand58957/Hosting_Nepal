import { IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class GetNotificationsDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter unread notifications only', default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  unreadOnly?: boolean = false;
}
