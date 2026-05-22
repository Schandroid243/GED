import { Processor, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { WorkerHost } from '@nestjs/bullmq';
import { QueueName } from '../../common/queues/queue-names.enum';
import { DocumentIngestionService } from './document-ingestion.service';
import { DocumentIngestionJobData } from './interfaces/document-ingestion-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

@Processor(QueueName.DOCUMENT_INGESTION, { concurrency: 2 })
export class DocumentIngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentIngestionProcessor.name);

  constructor(
    private readonly ingestionService: DocumentIngestionService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<DocumentIngestionJobData, unknown, string>): Promise<void> {
    const { documentId, tenantId, correlationId } = job.data;
    this.logger.log(`[${correlationId}] Ingestion démarrée : ${documentId} (tenant: ${tenantId})`);

    try {
      await this.ingestionService.run(job.data, (p) => job.updateProgress(p));
      this.logger.log(`[${correlationId}] Ingestion terminée : ${documentId}`);
    } catch (error) {
      if (error instanceof NonRetriableError) {
        this.logger.error(`[${correlationId}] Erreur non-retriable : ${error.message}`);
        throw error; // BullMQ ne réessaiera pas si NonRetriableError
      }
      this.logger.warn(`[${correlationId}] Échec transitoire, retry planifié : ${(error as Error).message}`);
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<DocumentIngestionJobData>, error: Error): Promise<void> {
    this.logger.error(
      `[${job.data.correlationId}] Job ${job.id} échoué définitivement : ${error.message}`,
    );
    await this.ingestionService.markDocumentError(job.data.documentId, error.message);
  }
}
