import { Processor, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { WorkerHost } from '@nestjs/bullmq';
import { QueueName } from '../../common/queues/queue-names.enum';
import { OcrService } from './ocr.service';
import { OcrJobData } from './interfaces/ocr-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

@Processor(QueueName.OCR_EXTRACTION, { concurrency: 1 })
export class OcrProcessor extends WorkerHost {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(
    private readonly ocrService: OcrService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<OcrJobData, { pageCount: number }, string>): Promise<{ pageCount: number }> {
    const { documentId, correlationId } = job.data;
    this.logger.log(`[${correlationId}] OCR démarré : ${documentId}`);

    try {
      const result = await this.ocrService.processDocument(job.data, (p) => job.updateProgress(p));
      this.logger.log(`[${correlationId}] OCR terminé : ${documentId} — ${result.pageCount} page(s)`);
      return result;
    } catch (error: unknown) {
      if (error instanceof NonRetriableError) {
        this.logger.error(`[${correlationId}] Erreur non-retriable OCR : ${error.message}`);
        throw error;
      }
      if (error instanceof Error) {
        this.logger.warn(`[${correlationId}] Échec transitoire OCR, retry planifié : ${error.message}`);
      }
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<OcrJobData>, error: Error): Promise<void> {
    this.logger.error(
      `[${job.data.correlationId}] Job OCR ${job.id} échoué définitivement : ${error.message}`,
    );
    await this.ocrService.handleFailure(job.data, error);
  }
}
