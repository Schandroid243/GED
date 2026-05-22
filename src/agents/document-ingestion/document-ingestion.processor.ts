import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { DocumentIngestionService } from './document-ingestion.service';
import { DocumentIngestionJobData } from './interfaces/document-ingestion-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

@Processor(QueueName.DOCUMENT_INGESTION)
export class DocumentIngestionProcessor {
  private readonly logger = new Logger(DocumentIngestionProcessor.name);

  constructor(
    private readonly ingestionService: DocumentIngestionService,
    private readonly config: ConfigService,
  ) {}

  @Process({ name: 'ingest', concurrency: 2 })
  async handleIngest(job: Job<DocumentIngestionJobData>): Promise<void> {
    const { documentId, tenantId, correlationId } = job.data;
    this.logger.log(`[${correlationId}] Ingestion démarrée : ${documentId} (tenant: ${tenantId})`);

    await job.updateProgress(0);
    try {
      await this.ingestionService.run(job.data, (p) => job.updateProgress(p));
      await job.updateProgress(100);
      this.logger.log(`[${correlationId}] Ingestion terminée : ${documentId}`);
    } catch (error) {
      if (error instanceof NonRetriableError) {
        this.logger.error(`[${correlationId}] Erreur non-retriable : ${error.message}`);
        throw error; // BullMQ ne réessaiera pas si NonRetriableError
      }

      if (error instanceof NonRetriableError) {
        this.logger.warn(`[${correlationId}] Échec transitoire, retry planifié : ${error.message}`);
      }
      throw error;
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job<DocumentIngestionJobData>, error: Error): Promise<void> {
    this.logger.error(
      `[${job.data.correlationId}] Job ${job.id} échoué définitivement : ${error.message}`,
    );
    await this.ingestionService.markDocumentError(job.data.documentId, error.message);
  }
}
