import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SagaStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SagaService {
  private readonly logger = new Logger(SagaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new Saga record in the database with PENDING status.
   * Note: The Prisma schema default is STARTED; we use STARTED here as the
   * closest equivalent to PENDING since PENDING is not in the SagaStatus enum.
   */
  async createSaga(type: string, payload: any, userId?: string) {
    this.logger.log(`Creating saga of type: ${type}, userId: ${userId ?? 'anonymous'}`);
    const saga = await this.prisma.saga.create({
      data: {
        sagaType: type,
        customerId: userId ?? null,
        status: SagaStatus.STARTED,
        context: payload ?? {},
      },
    });
    this.logger.log(`Saga created with id: ${saga.id}`);
    return saga;
  }

  async getSaga(id: string) {
    const saga = await this.prisma.saga.findUnique({ where: { id } });
    if (!saga) {
      throw new NotFoundException(`Saga with id ${id} not found`);
    }
    return saga;
  }

  async updateSagaStatus(id: string, status: SagaStatus) {
    this.logger.log(`Updating saga ${id} status to ${status}`);
    return this.prisma.saga.update({
      where: { id },
      data: { status },
    });
  }

  async completeSaga(id: string) {
    this.logger.log(`Completing saga ${id}`);
    return this.prisma.saga.update({
      where: { id },
      data: {
        status: SagaStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  async failSaga(id: string, error: string) {
    this.logger.warn(`Failing saga ${id}: ${error}`);
    return this.prisma.saga.update({
      where: { id },
      data: {
        status: SagaStatus.FAILED,
        errorMessage: error,
      },
    });
  }

  async compensateSaga(id: string) {
    this.logger.log(`Setting saga ${id} to COMPENSATING`);
    return this.prisma.saga.update({
      where: { id },
      data: { status: SagaStatus.COMPENSATING },
    });
  }

  async compensationCompleteSaga(id: string) {
    this.logger.log(`Compensation complete for saga ${id}`);
    return this.prisma.saga.update({
      where: { id },
      data: { status: SagaStatus.COMPENSATED },
    });
  }

  async addSagaEvent(
    sagaId: string,
    stepName: string,
    type: string,
    payload: any,
    status: string,
  ) {
    this.logger.debug(`Adding saga event [${sagaId}] step=${stepName} type=${type} status=${status}`);
    return this.prisma.sagaEvent.create({
      data: {
        sagaId,
        stepName,
        eventType: type,
        payload: { ...payload, status },
      },
    });
  }

  async getSagaEvents(sagaId: string) {
    return this.prisma.sagaEvent.findMany({
      where: { sagaId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Returns sagas in STARTED or IN_PROGRESS status that were created
   * more than 5 minutes ago — used by the recovery/retry mechanism.
   */
  async getPendingSagas() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.prisma.saga.findMany({
      where: {
        status: { in: [SagaStatus.STARTED, SagaStatus.IN_PROGRESS] },
        createdAt: { lt: fiveMinutesAgo },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
