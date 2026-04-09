import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { HostingController } from './hosting.controller';
import { HostingService } from './hosting.service';
import { CyberPanelService } from './services/cyberpanel.service';
import { ProxmoxService } from './services/proxmox.service';
import { ContaboService } from './services/contabo.service';
import { DockerService } from './services/docker.service';
import { ProvisioningProcessor } from './processors/provisioning.processor';
import { PrismaService } from '../../database/prisma.service';
import { ResellerClubService } from '../domain/services/resellerclub.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'provisioning',
    }),
  ],
  controllers: [HostingController],
  providers: [
    HostingService,
    CyberPanelService,
    ProxmoxService,
    ContaboService,
    DockerService,
    ProvisioningProcessor,
    PrismaService,
    ResellerClubService,
  ],
  exports: [HostingService, CyberPanelService, ProxmoxService, ContaboService, DockerService],
})
export class HostingModule {}
