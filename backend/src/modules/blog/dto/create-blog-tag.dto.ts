import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateBlogTagDto {
  @ApiProperty({ description: 'Tag name', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name!: string;
}
