import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DeployContainerDto {
  @ApiProperty({ description: 'Hosting account ID (VPS) to deploy on' })
  @IsString()
  hostingId!: string;

  @ApiProperty({ description: 'Template ID to deploy (e.g. wordpress, mysql, redis)' })
  @IsString()
  templateId!: string;

  @ApiPropertyOptional({ description: 'Custom environment variables for the deployment' })
  @IsOptional()
  @IsObject()
  envVars?: Record<string, string>;
}

export class GenerateScriptDto {
  @ApiProperty({
    description: 'Container stack type to generate install script for',
    enum: ['docker', 'docker-portainer', 'k3s', 'k3s-portainer', 'full-stack'],
  })
  @IsString()
  @IsEnum(['docker', 'docker-portainer', 'k3s', 'k3s-portainer', 'full-stack'])
  type!: string;
}
