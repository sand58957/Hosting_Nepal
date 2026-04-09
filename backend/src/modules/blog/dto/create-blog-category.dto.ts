import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateBlogCategoryDto {
  @ApiProperty({ description: 'Category name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Parent category ID for nesting' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
