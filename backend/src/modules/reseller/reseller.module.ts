import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ResellerController } from './reseller.controller';
import { ResellerService } from './reseller.service';
import { PrismaService } from '../../database/prisma.service';
import { ResellerClubService } from '../domain/services/resellerclub.service';

@Module({
  imports: [ConfigModule],
  controllers: [ResellerController],
  providers: [ResellerService, PrismaService, ResellerClubService],
  exports: [ResellerService],
})
export class ResellerModule {}
