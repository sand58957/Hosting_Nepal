import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { SiteConfigController } from './site-config.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../../database/prisma.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [ConfigModule, EmailModule],
  controllers: [AdminController, SiteConfigController],
  providers: [AdminService, PrismaService],
  exports: [AdminService],
})
export class AdminModule {}
