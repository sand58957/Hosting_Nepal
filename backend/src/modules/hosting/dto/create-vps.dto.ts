import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HostingProvider } from '@prisma/client';

export class CreateVpsDto {
  @ApiProperty({ description: 'Hostname for the VPS' })
  @IsString()
  hostname!: string;

  @ApiProperty({ description: 'VPS plan identifier (e.g. vps-1, vps-2, vps-4)' })
  @IsString()
  planId!: string;

  @ApiProperty({ description: 'OS template identifier (e.g. ubuntu-22.04, centos-9, debian-12)' })
  @IsString()
  osTemplate!: string;

  @ApiPropertyOptional({ description: 'SSH public key for authentication' })
  @IsOptional()
  @IsString()
  sshKey?: string;

  @ApiPropertyOptional({ description: 'Root password for the VPS' })
  @IsOptional()
  @IsString()
  rootPassword?: string;

  @ApiPropertyOptional({ description: 'Datacenter location (e.g. np-1)', default: 'np-1' })
  @IsOptional()
  @IsString()
  datacenter?: string;

  @ApiPropertyOptional({ enum: HostingProvider, description: 'Hosting provider (RESELLERCLUB or CUSTOM)' })
  @IsOptional()
  @IsEnum(HostingProvider)
  provider?: HostingProvider;

  @ApiPropertyOptional({
    description: 'Container stack to pre-install via cloud-init',
    enum: ['none', 'docker', 'docker-portainer', 'k3s', 'k3s-portainer', 'full-stack'],
  })
  @IsOptional()
  @IsString()
  containerStack?: string;
}
