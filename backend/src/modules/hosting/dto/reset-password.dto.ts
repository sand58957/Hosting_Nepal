import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'New password for the VPS (min 8 characters)' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
