import { IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReinstallVpsDto {
  @ApiProperty({
    description:
      'OS to reinstall: a Contabo image UUID (from GET /hosting/vps-images) or a legacy slug (e.g. ubuntu-22.04)',
  })
  @IsString()
  osTemplate!: string;

  @ApiPropertyOptional({
    description: 'Container stack to pre-install via cloud-init',
    enum: ['none', 'docker', 'docker-portainer', 'k3s', 'k3s-portainer', 'full-stack'],
  })
  @IsOptional()
  @IsString()
  containerStack?: string;

  @ApiPropertyOptional({ description: 'New root password to set during reinstall' })
  @IsOptional()
  @IsString()
  rootPassword?: string;

  @ApiPropertyOptional({ description: 'SSH public key to install during reinstall' })
  @IsOptional()
  @IsString()
  sshKey?: string;
}
