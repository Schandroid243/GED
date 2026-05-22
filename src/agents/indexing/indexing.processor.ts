import { Processor, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { IndexingService } from './indexing.service';
import { IndexingJobData } from './interfaces/indexing-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

@Processor(QueueName.INDEXING, { concurrency: 2 })
export class IndexingProcessor extends WorkerHost {
  private readonly logger = new Logger(IndexingProcessor.name);

  constructor(
    private readonly indexingService: IndexingService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<IndexingJobData, unknown, string>): Promise<void> {
    const { documentId, correlationId } = job.data;
    this.logger.log(`[${correlationId}] Indexation démarrée : ${documentId}`);

    try {
      await this.indexingService.indexDocument(job.data, (p) => job.updateProgress(p));
      this.logger.log(`[${correlationId}] Indexation terminée : ${documentId}`);
    } catch (error: unknown) {
      if (error instanceof NonRetriableError) {
        this.logger.error(`[${correlationId}] Erreur non-retriable indexation : ${error.message}`);
        throw error;
      }
      if (error instanceof Error) {
        this.logger.warn(`[${correlationId}] Échec transitoire indexation, retry planifié : ${error.message}`);
      }
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<IndexingJobData>, error: Error): Promise<void> {
    this.logger.error(
      `[${job.data.correlationId}] Job indexation ${job.id} échoué définitivement : ${error.message}`,
    );
    // Log + alerte Slack (logger suffit — alerte Slack gérée par l'observabilité)
  }
}
