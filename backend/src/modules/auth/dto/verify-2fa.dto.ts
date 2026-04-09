import { IsNotEmpty, IsString, Length } from 'class-validator';

export class Verify2FADto {
  @IsString()
  @IsNotEmpty({ message: 'Two-factor authentication code is required' })
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code!: string;
}
