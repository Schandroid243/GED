import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { IndexingService } from './indexing.service';
import { IndexingJobData } from './interfaces/indexing-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

@Processor(QueueName.INDEXING)
export class IndexingProcessor {
  private readonly logger = new Logger(IndexingProcessor.name);
  private readonly concurrency: number;

  constructor(
    private readonly indexingService: IndexingService,
    private readonly config: ConfigService,
  ) {
    this.concurrency = config.get<number>('INDEXING_CONCURRENCY', 2);
  }

  @Process({ name: 'index', concurrency: 2 })
  async handleIndex(job: Job<IndexingJobData>): Promise<void> {
    const { documentId, correlationId } = job.data;
    this.logger.log(`[${correlationId}] Indexation démarrée : ${documentId}`);

    await job.updateProgress(0);
    try {
      await this.indexingService.indexDocument(job.data, (p) => job.updateProgress(p));
      await job.updateProgress(100);
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

  @OnQueueFailed()
  async onFailed(job: Job<IndexingJobData>, error: Error): Promise<void> {
    this.logger.error(
      `[${job.data.correlationId}] Job indexation ${job.id} échoué définitivement : ${error.message}`,
    );
    // Log + alerte Slack (logger suffit — alerte Slack gérée par l'observabilité)
  }
}
