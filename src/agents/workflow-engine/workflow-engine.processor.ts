import { Processor, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowEngineJobData } from './interfaces/workflow-engine-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

@Processor(QueueName.WORKFLOW_ENGINE, { concurrency: 1 })
export class WorkflowEngineProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowEngineProcessor.name);

  constructor(
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  /**
   * Concurrency: 1 est OBLIGATOIRE pour garantir l'ordre des événements métier par tenant.
   */
  async process(job: Job<WorkflowEngineJobData, unknown, string>): Promise<void> {
    const { documentId, eventType, correlationId } = job.data;
    this.logger.log(
      `[${correlationId}] Événement workflow reçu : ${eventType} pour ${documentId}`,
    );

    try {
      await this.workflowEngineService.processEvent(job.data, (p) => job.updateProgress(p));
      this.logger.log(
        `[${correlationId}] Événement workflow traité : ${eventType} pour ${documentId}`,
      );
    } catch (error: unknown) {
      if (error instanceof NonRetriableError) {
        this.logger.error(
          `[${correlationId}] Erreur non-retriable workflow : ${error.message}`,
        );
        throw error;
      }
      if (error instanceof Error) {
        this.logger.warn(
          `[${correlationId}] Échec transitoire workflow, retry planifié : ${error.message}`,
        );
      }
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<WorkflowEngineJobData>, error: Error): Promise<void> {
    this.logger.error(
      `[${job.data.correlationId}] Job workflow ${job.id} échoué définitivement : ${error.message}` +
        ` | eventType=${job.data.eventType} documentId=${job.data.documentId}`,
    );
    // Log + escalade manuelle (le service ne fait rien de plus)
  }
}
