import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [ConfigModule],
  controllers: [SupportController],
  providers: [SupportService, PrismaService],
  exports: [SupportService],
})
export class SupportModule {}
