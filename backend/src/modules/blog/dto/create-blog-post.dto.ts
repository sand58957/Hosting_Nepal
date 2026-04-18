import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsUUID, MaxLength, IsDateString, ValidateNested } from 'class-validator';
import { BlogPostStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateBlogPostDto {
  @ApiProperty({ description: 'Blog post title', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  title!: string;

  @ApiProperty({ description: 'Blog post content (markdown)' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: 'Short excerpt' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  excerpt?: string;

  @ApiPropertyOptional({ description: 'Featured image URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  featuredImage?: string;

  @ApiPropertyOptional({ enum: BlogPostStatus, default: 'DRAFT' })
  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;

  @ApiPropertyOptional({ description: 'Scheduled publish date' })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Tag IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ description: 'SEO title' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  seoTitle?: string;

  @ApiPropertyOptional({ description: 'SEO description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string;

  @ApiPropertyOptional({ description: 'SEO keywords (comma separated)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoKeywords?: string;

  @ApiPropertyOptional({ description: 'OpenGraph image URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ogImage?: string;

  @ApiPropertyOptional({ description: 'FAQ items for FAQ schema [{question, answer}]', type: 'array' })
  @IsOptional()
  @IsArray()
  faqItems?: Array<{ question: string; answer: string }>;

  @ApiPropertyOptional({ description: 'HowTo steps for HowTo schema [{name, text}]', type: 'array' })
  @IsOptional()
  @IsArray()
  howtoSteps?: Array<{ name: string; text: string }>;
}
