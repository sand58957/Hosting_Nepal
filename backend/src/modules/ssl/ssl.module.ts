import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { SslController } from './ssl.controller';
import { SslService } from './ssl.service';
import { AcmeService } from './services/acme.service';
import { SslProcessor } from './processors/ssl.processor';
import { PrismaService } from '../../database/prisma.service';
import { ResellerClubService } from '../domain/services/resellerclub.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({ name: 'ssl' }),
  ],
  controllers: [SslController],
  providers: [SslService, AcmeService, SslProcessor, PrismaService, ResellerClubService],
  exports: [SslService, AcmeService],
})
export class SslModule {}
