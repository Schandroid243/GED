import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository, LessThan } from 'typeorm';

import { QueueName } from '../common/queues/queue-names.enum';
import { JobRecord } from '../agents/entities/job-record.entity';

export interface QueueStats {
  name: QueueName;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(JobRecord)
    private readonly jobRecordRepo: Repository<JobRecord>,

    @InjectQueue(QueueName.DOCUMENT_INGESTION)
    private readonly ingestionQueue: Queue,
    @InjectQueue(QueueName.OCR_EXTRACTION)
    private readonly ocrQueue: Queue,
    @InjectQueue(QueueName.CLASSIFICATION)
    private readonly classificationQueue: Queue,
    @InjectQueue(QueueName.INDEXING)
    private readonly indexingQueue: Queue,
    @InjectQueue(QueueName.WORKFLOW_ENGINE)
    private readonly workflowQueue: Queue,
    @InjectQueue(QueueName.NOTIFICATION)
    private readonly notificationQueue: Queue,
    @InjectQueue(QueueName.ARCHIVE)
    private readonly archiveQueue: Queue,
    @InjectQueue(QueueName.DEAD_LETTER)
    private readonly deadLetterQueue: Queue,
  ) {}

  /** Récupère les statistiques de toutes les files BullMQ */
  async getQueueStats(): Promise<QueueStats[]> {
    const queues = [
      { name: QueueName.DOCUMENT_INGESTION, queue: this.ingestionQueue },
      { name: QueueName.OCR_EXTRACTION, queue: this.ocrQueue },
      { name: QueueName.CLASSIFICATION, queue: this.classificationQueue },
      { name: QueueName.INDEXING, queue: this.indexingQueue },
      { name: QueueName.WORKFLOW_ENGINE, queue: this.workflowQueue },
      { name: QueueName.NOTIFICATION, queue: this.notificationQueue },
      { name: QueueName.ARCHIVE, queue: this.archiveQueue },
      { name: QueueName.DEAD_LETTER, queue: this.deadLetterQueue },
    ];

    const stats: QueueStats[] = [];

    for (const { name, queue } of queues) {
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);

        stats.push({ name: name as QueueName, waiting, active, completed, failed, delayed });
      } catch (error) {
        this.logger.error(`Impossible de récupérer les stats de la file ${name} : ${(error as Error).message}`);
        stats.push({ name: name as QueueName, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 });
      }
    }

    return stats;
  }

  /** Récupère les jobs d'une file spécifique */
  async getQueueJobs(
    queueName: QueueName,
    status: string = 'failed',
    limit: number = 20,
  ): Promise<JobRecord[]> {
    return this.jobRecordRepo.find({
      where: { queueName, status: status as any },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
    });
  }

  /** Vider une file BullMQ */
  async drainQueue(queueName: QueueName): Promise<void> {
    const queueMap: Record<string, Queue> = {
      [QueueName.DOCUMENT_INGESTION]: this.ingestionQueue,
      [QueueName.OCR_EXTRACTION]: this.ocrQueue,
      [QueueName.CLASSIFICATION]: this.classificationQueue,
      [QueueName.INDEXING]: this.indexingQueue,
      [QueueName.WORKFLOW_ENGINE]: this.workflowQueue,
      [QueueName.NOTIFICATION]: this.notificationQueue,
      [QueueName.ARCHIVE]: this.archiveQueue,
      [QueueName.DEAD_LETTER]: this.deadLetterQueue,
    };

    const queue = queueMap[queueName];
    if (!queue) {
      throw new Error(`File ${queueName} inconnue`);
    }

    await queue.drain();
    this.logger.log(`File ${queueName} vidée`);
  }

  /** Récupère le nombre total de jobs en attente (pour les KPI) */
  async getTotalJobsWaiting(): Promise<number> {
    const stats = await this.getQueueStats();
    return stats.reduce((acc, s) => acc + s.waiting, 0);
  }

  /** Purge les jobs terminés de plus de X jours */
  async purgeOldJobs(daysOld: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - daysOld * 24 * 3600 * 1000);

    const result = await this.jobRecordRepo.delete({
      createdAt: LessThan(cutoff),
      status: 'completed' as any,
    });

    this.logger.log(`${result.affected ?? 0} jobs purgés (plus de ${daysOld} jours)`);
    return result.affected ?? 0;
  }
}

