import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ApplicationType {
  WORDPRESS = 'wordpress',
  BLANK = 'blank',
  WOOCOMMERCE = 'woocommerce',
}

export class CreateWebsiteDto {
  @ApiProperty({ description: 'Domain name for the website' })
  @IsString()
  domain!: string;

  @ApiProperty({ description: 'Plan identifier (e.g. starter, wp-business)' })
  @IsString()
  planId!: string;

  @ApiPropertyOptional({ enum: ApplicationType, description: 'Application type to install' })
  @IsOptional()
  @IsEnum(ApplicationType)
  applicationType?: ApplicationType;

  @ApiPropertyOptional({ description: 'WordPress admin email' })
  @IsOptional()
  @IsEmail()
  wpAdminEmail?: string;

  @ApiPropertyOptional({ description: 'WordPress admin username' })
  @IsOptional()
  @IsString()
  wpAdminUser?: string;

  @ApiPropertyOptional({ description: 'WordPress admin password' })
  @IsOptional()
  @IsString()
  wpAdminPass?: string;

  @ApiPropertyOptional({ description: 'WordPress site title' })
  @IsOptional()
  @IsString()
  wpTitle?: string;

  @ApiPropertyOptional({ description: 'Data center location' })
  @IsOptional()
  @IsString()
  dataCenter?: string;

  @ApiPropertyOptional({ description: 'Hosting provider (RESELLERCLUB, CONTABO, or CUSTOM)', enum: ['RESELLERCLUB', 'CONTABO', 'CUSTOM'] })
  @IsOptional()
  @IsString()
  provider?: string;
}

export class CreateFtpDto {
  @ApiProperty({ description: 'FTP username' })
  @IsString()
  username!: string;

  @ApiProperty({ description: 'FTP password' })
  @IsString()
  password!: string;

  @ApiPropertyOptional({ description: 'FTP path' })
  @IsOptional()
  @IsString()
  path?: string;
}

export class CreateDatabaseDto {
  @ApiProperty({ description: 'Database name' })
  @IsString()
  dbName!: string;

  @ApiProperty({ description: 'Database username' })
  @IsString()
  dbUser!: string;

  @ApiProperty({ description: 'Database password' })
  @IsString()
  dbPass!: string;
}

export class InstallWordPressDto {
  @ApiProperty({ description: 'Admin email' })
  @IsEmail()
  adminEmail!: string;

  @ApiProperty({ description: 'Admin username' })
  @IsString()
  adminUser!: string;

  @ApiProperty({ description: 'Admin password' })
  @IsString()
  adminPass!: string;

  @ApiProperty({ description: 'Site title' })
  @IsString()
  siteTitle!: string;
}

export class RestoreBackupDto {
  @ApiProperty({ description: 'Backup file name to restore' })
  @IsString()
  backupFile!: string;
}

export class ChangePhpDto {
  @ApiProperty({ description: 'PHP version (e.g. 7.4, 8.0, 8.1, 8.2, 8.3)' })
  @IsString()
  version!: string;
}

export class InstallSslDto {
  @ApiPropertyOptional({ description: 'SSL provider (defaults to letsencrypt)' })
  @IsOptional()
  @IsString()
  provider?: string;
}
