import { Processor, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { ClassificationService } from './classification.service';
import { ClassificationJobData } from './interfaces/classification-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

@Processor(QueueName.CLASSIFICATION, { concurrency: 4 })
export class ClassificationProcessor extends WorkerHost {
  private readonly logger = new Logger(ClassificationProcessor.name);

  constructor(
    private readonly classificationService: ClassificationService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<ClassificationJobData, { documentType: string; confidence: number }, string>): Promise<{ documentType: string; confidence: number }> {
    const { documentId, correlationId } = job.data;
    this.logger.log(`[${correlationId}] Classification démarrée : ${documentId}`);

    try {
      const result = await this.classificationService.classify(job.data, (p) => job.updateProgress(p));
      this.logger.log(
        `[${correlationId}] Classification terminée : ${documentId} → ${result.documentType} (conf: ${result.confidence})`,
      );
      return result;
    } catch (error: unknown) {
      if (error instanceof NonRetriableError) {
        this.logger.error(`[${correlationId}] Erreur non-retriable classification : ${error.message}`);
        throw error;
      }
      if (error instanceof Error) {
        this.logger.warn(`[${correlationId}] Échec transitoire classification, retry planifié : ${error.message}`);
      }
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<ClassificationJobData>, error: Error): Promise<void> {
    this.logger.error(
      `[${job.data.correlationId}] Job classification ${job.id} échoué définitivement : ${error.message}`,
    );
    // Fallback : classer en UNKNOWN après échec définitif
    await this.classificationService.classifyAsUnknown(job.data.documentId, error.message);
  }
}
