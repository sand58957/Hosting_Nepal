import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeEmailPasswordDto {
  @ApiProperty({ description: 'New password for the mailbox (min 8 characters)', example: 'NewSecurePass123!' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
