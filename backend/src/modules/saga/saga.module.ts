import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SagaService } from './saga.service';
import { SagaOrchestratorService } from './saga-orchestrator.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [ConfigModule],
  providers: [SagaService, SagaOrchestratorService, PrismaService],
  exports: [SagaService, SagaOrchestratorService],
})
export class SagaModule {}
