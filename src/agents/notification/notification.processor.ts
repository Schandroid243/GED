import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { QueueName } from '../../common/queues/queue-names.enum';
import { NotificationService } from './notification.service';
import { NotificationJobData } from './interfaces/notification-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

@Processor(QueueName.NOTIFICATION)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);
  private readonly concurrency: number;

  constructor(
    private readonly notificationService: NotificationService,
    @InjectQueue(QueueName.DEAD_LETTER)
    private readonly deadLetterQueue: Queue,
    private readonly config: ConfigService,
  ) {
    this.concurrency = config.get<number>('NOTIFICATION_CONCURRENCY', 5);
  }

  @Process({ name: 'send', concurrency: 5 })
  async handleSend(job: Job<NotificationJobData>): Promise<void> {
    const { correlationId, templateName, userIds } = job.data;
    this.logger.log(
      `[${correlationId}] Notification démarrée : template=${templateName} destinataires=${userIds.length}`,
    );

    await job.updateProgress(0);
    try {
      await this.notificationService.send(job.data, (p) => job.updateProgress(p));
      await job.updateProgress(100);
      this.logger.log(
        `[${correlationId}] Notification terminée : template=${templateName}`,
      );
    } catch (error: unknown) {
      if (error instanceof NonRetriableError) {
        this.logger.error(
          `[${correlationId}] Erreur non-retriable notification : ${error.message}`,
        );
        throw error;
      }
      if (error instanceof Error) {
        this.logger.warn(
          `[${correlationId}] Échec transitoire notification, retry planifié : ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Envoie le job vers la Dead Letter Queue après échec définitif.
   */
  @OnQueueFailed()
  async onFailed(job: Job<NotificationJobData>, error: Error): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 3;

    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(
        `[${job.data.correlationId}] Notification ${job.id} envoyée vers DEAD_LETTER après ${job.attemptsMade} tentative(s) : ${error.message}`,
      );

      await this.deadLetterQueue.add('failed-notification', {
        originalQueue: QueueName.NOTIFICATION,
        jobId: job.id,
        data: job.data,
        error: error.message,
        failedAt: new Date().toISOString(),
      });

      this.logger.log(
        `[${job.data.correlationId}] Job ${job.id} déposé dans DEAD_LETTER`,
      );
    } else {
      this.logger.warn(
        `[${job.data.correlationId}] Notification ${job.id} échouée (${job.attemptsMade}/${maxAttempts}) : ${error.message}`,
      );
    }
  }
}
