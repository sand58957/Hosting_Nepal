import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\+977)?[9][6-9]\d{8}$/, {
    message:
      'Phone number must be a valid Nepal mobile number (e.g., +9779812345678 or 9812345678)',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Company name must not exceed 200 characters' })
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10, { message: 'Language code must not exceed 10 characters' })
  preferredLanguage?: string;
}
