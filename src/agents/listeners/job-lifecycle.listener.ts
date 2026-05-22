import { Injectable, Logger } from '@nestjs/common';
import { QueueEventsHost, QueueEventsListener, OnQueueEvent } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobRecord } from '../entities/job-record.entity';

/**
 * Écoute les événements de toutes les files BullMQ et persist les changements
 * de statut dans la table job_records.
 *
 * QueueEventsListener('*') écoute les événements sur le QueueEvents de chaque file
 * enregistrée dans le module. Les méthodes annotées avec @OnQueueEvent sont
 * automatiquement liées aux événements correspondants.
 */
@Injectable()
@QueueEventsListener('*')
export class JobLifecycleListener extends QueueEventsHost {
  private readonly logger = new Logger(JobLifecycleListener.name);

  constructor(
    @InjectRepository(JobRecord)
    private readonly jobRecordRepo: Repository<JobRecord>,
  ) {
    super();
  }

  @OnQueueEvent('active')
  async onActive({ jobId }: { jobId: string }): Promise<void> {
    if (!jobId) return;
    try {
      await this.jobRecordRepo.update(jobId, { status: 'active' });
      this.logger.debug(`Job ${jobId} → active`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.warn(`Impossible de mettre à jour job ${jobId} → active : ${err.message}`);
      }
    }
  }

  @OnQueueEvent('completed')
  async onCompleted({ jobId, returnvalue }: { jobId: string; returnvalue: string }): Promise<void> {
    if (!jobId) return;
    try {
      await this.jobRecordRepo.update(jobId, {
        status:      'completed',
        returnValue: JSON.parse(returnvalue || 'null'),
      });
      this.logger.debug(`Job ${jobId} → completed`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.warn(`Impossible de mettre à jour job ${jobId} → completed : ${err.message}`);
      }
    }
  }

  @OnQueueEvent('failed')
  async onFailed({ jobId, failedReason }: { jobId: string; failedReason: string }): Promise<void> {
    if (!jobId) return;
    try {
      await this.jobRecordRepo.update(jobId, { status: 'failed', failedReason });
      this.logger.error(`Job ${jobId} échoué : ${failedReason}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.warn(`Impossible de mettre à jour job ${jobId} → failed : ${err.message}`);
      }
    }
  }

  @OnQueueEvent('delayed')
  async onDelayed({ jobId }: { jobId: string }): Promise<void> {
    if (!jobId) return;
    try {
      await this.jobRecordRepo.update(jobId, { status: 'delayed' });
      this.logger.debug(`Job ${jobId} → delayed`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        this.logger.warn(`Impossible de mettre à jour job ${jobId} → delayed : ${err.message}`);
      }
    }
  }
}
