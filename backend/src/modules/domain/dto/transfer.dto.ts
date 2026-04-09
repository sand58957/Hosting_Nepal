import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class InitiateTransferDto {
  @ApiProperty({ example: 'example.com', description: 'Domain name to transfer' })
  @IsString()
  @IsNotEmpty({ message: 'Domain name is required' })
  @Matches(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/, {
    message: 'Please provide a valid domain name',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  domainName!: string;

  @ApiProperty({ example: 'AUTH-CODE-123', description: 'EPP/Auth code from current registrar' })
  @IsString()
  @IsNotEmpty({ message: 'Auth code is required' })
  @MaxLength(255)
  authCode!: string;
}
