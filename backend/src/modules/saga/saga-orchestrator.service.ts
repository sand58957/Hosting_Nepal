import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SagaStatus } from '@prisma/client';
import { SagaService } from './saga.service';
import { SagaStep, SagaResult } from './interfaces/saga.interface';

@Injectable()
export class SagaOrchestratorService {
  private readonly logger = new Logger(SagaOrchestratorService.name);

  constructor(
    private readonly sagaService: SagaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Executes all saga steps in order. On failure, runs compensation for all
   * previously completed steps in reverse order.
   *
   * @param sagaId  ID of the already-created Saga record
   * @param steps   Ordered array of SagaStep (execute + compensate pairs)
   * @returns SagaResult with success flag, sagaId, optional result or error
   */
  async executeSaga(sagaId: string, steps: SagaStep[]): Promise<SagaResult> {
    this.logger.log(`Starting saga execution: ${sagaId} (${steps.length} steps)`);

    await this.sagaService.updateSagaStatus(sagaId, SagaStatus.STARTED);

    const completedSteps: SagaStep[] = [];
    let lastResult: any;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      try {
        this.logger.log(`[Saga ${sagaId}] Executing step ${i + 1}/${steps.length}: ${step.name}`);

        await this.sagaService.addSagaEvent(
          sagaId,
          step.name,
          'STEP_STARTED',
          { stepIndex: i },
          'STARTED',
        );

        await this.sagaService.updateSagaStatus(sagaId, SagaStatus.IN_PROGRESS);

        lastResult = await step.execute();

        await this.sagaService.addSagaEvent(
          sagaId,
          step.name,
          'STEP_COMPLETED',
          { stepIndex: i, result: lastResult ?? null },
          'COMPLETED',
        );

        completedSteps.push(step);

        this.logger.log(`[Saga ${sagaId}] Step completed: ${step.name}`);
      } catch (err: any) {
        const errorMessage: string = err instanceof Error ? err.message : String(err);

        this.logger.error(
          `[Saga ${sagaId}] Step failed: ${step.name} — ${errorMessage}`,
          err instanceof Error ? err.stack : undefined,
        );

        await this.sagaService.addSagaEvent(
          sagaId,
          step.name,
          'STEP_FAILED',
          { stepIndex: i, error: errorMessage },
          'FAILED',
        );

        await this.sagaService.failSaga(sagaId, errorMessage);

        this.eventEmitter.emit('saga.step.failed', { sagaId, stepName: step.name, error: errorMessage });

        // Run compensation for all completed steps in reverse order
        await this.runCompensation(sagaId, completedSteps, completedSteps.length);

        return { success: false, sagaId, error: errorMessage };
      }
    }

    await this.sagaService.completeSaga(sagaId);

    this.logger.log(`[Saga ${sagaId}] All ${steps.length} steps completed successfully`);
    this.eventEmitter.emit('saga.completed', { sagaId, result: lastResult });

    return { success: true, sagaId, result: lastResult };
  }

  /**
   * Runs compensation steps from failedAt-1 down to index 0.
   *
   * @param sagaId         The saga being compensated
   * @param completedSteps Steps that ran successfully (and now need reverting)
   * @param failedAt       Index one past the last successful step
   */
  async runCompensation(
    sagaId: string,
    completedSteps: SagaStep[],
    failedAt: number,
  ): Promise<void> {
    if (completedSteps.length === 0) {
      this.logger.log(`[Saga ${sagaId}] No completed steps to compensate`);
      return;
    }

    this.logger.log(
      `[Saga ${sagaId}] Starting compensation for ${failedAt} step(s)`,
    );

    await this.sagaService.compensateSaga(sagaId);
    this.eventEmitter.emit('saga.compensation.started', { sagaId });

    for (let i = failedAt - 1; i >= 0; i--) {
      const step = completedSteps[i];

      try {
        this.logger.log(`[Saga ${sagaId}] Compensating step: ${step.name}`);

        await this.sagaService.addSagaEvent(
          sagaId,
          step.name,
          'COMPENSATION_STARTED',
          { stepIndex: i },
          'COMPENSATING',
        );

        await step.compensate();

        await this.sagaService.addSagaEvent(
          sagaId,
          step.name,
          'COMPENSATION_COMPLETED',
          { stepIndex: i },
          'COMPENSATED',
        );

        this.logger.log(`[Saga ${sagaId}] Compensation complete for step: ${step.name}`);
      } catch (compensationErr: any) {
        const compensationError: string =
          compensationErr instanceof Error ? compensationErr.message : String(compensationErr);

        this.logger.error(
          `[Saga ${sagaId}] Compensation failed for step: ${step.name} — ${compensationError}`,
          compensationErr instanceof Error ? compensationErr.stack : undefined,
        );

        await this.sagaService.addSagaEvent(
          sagaId,
          step.name,
          'COMPENSATION_FAILED',
          { stepIndex: i, error: compensationError },
          'COMPENSATION_FAILED',
        );

        this.eventEmitter.emit('saga.compensation.failed', {
          sagaId,
          stepName: step.name,
          error: compensationError,
        });

        // Continue compensating remaining steps even if one compensation fails
      }
    }

    await this.sagaService.compensationCompleteSaga(sagaId);

    this.logger.log(`[Saga ${sagaId}] Compensation sequence finished`);
    this.eventEmitter.emit('saga.compensation.completed', { sagaId });
  }
}
