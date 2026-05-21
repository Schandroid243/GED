import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { ClassificationService } from './classification.service';
import { ClassificationJobData } from './interfaces/classification-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

@Processor(QueueName.CLASSIFICATION)
export class ClassificationProcessor {
  private readonly logger = new Logger(ClassificationProcessor.name);
  private readonly concurrency: number;

  constructor(
    private readonly classificationService: ClassificationService,
    private readonly config: ConfigService,
  ) {
    this.concurrency = config.get<number>('CLASSIFICATION_CONCURRENCY', 4);
  }

  @Process({ name: 'classify', concurrency: 4 })
  async handleClassify(job: Job<ClassificationJobData>): Promise<{ documentType: string; confidence: number }> {
    const { documentId, correlationId } = job.data;
    this.logger.log(`[${correlationId}] Classification démarrée : ${documentId}`);

    await job.updateProgress(0);
    try {
      const result = await this.classificationService.classify(job.data, (p) => job.updateProgress(p));
      await job.updateProgress(100);
      this.logger.log(
        `[${correlationId}] Classification terminée : ${documentId} → ${result.documentType} (conf: ${result.confidence})`,
      );
      return result;
    } catch (error) {
      if (error instanceof NonRetriableError) {
        this.logger.error(`[${correlationId}] Erreur non-retriable classification : ${error.message}`);
        throw error;
      }
      this.logger.warn(`[${correlationId}] Échec transitoire classification, retry planifié : ${error.message}`);
      throw error;
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job<ClassificationJobData>, error: Error): Promise<void> {
    this.logger.error(
      `[${job.data.correlationId}] Job classification ${job.id} échoué définitivement : ${error.message}`,
    );
    // Fallback : classer en UNKNOWN après échec définitif
    await this.classificationService.classifyAsUnknown(job.data.documentId, error.message);
  }
}
