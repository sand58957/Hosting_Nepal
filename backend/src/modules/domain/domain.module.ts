import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DomainController } from './domain.controller';
import { DomainService } from './domain.service';
import { ResellerClubService } from './services/resellerclub.service';
import { NameSiloService } from './services/namesilo.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [ConfigModule],
  controllers: [DomainController],
  providers: [DomainService, ResellerClubService, NameSiloService, PrismaService],
  exports: [DomainService, ResellerClubService, NameSiloService],
})
export class DomainModule {}
