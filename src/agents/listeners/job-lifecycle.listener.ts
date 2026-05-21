import { Injectable, Logger } from '@nestjs/common';
import { OnQueueEvent, QueueEventsHost } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobRecord, JobStatus } from '../entities/job-record.entity';

@Injectable()
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
    await this.jobRecordRepo.update(jobId, { status: 'active' });
    this.logger.debug(`Job ${jobId} → active`);
  }

  @OnQueueEvent('completed')
  async onCompleted({ jobId, returnvalue }: { jobId: string; returnvalue: string }): Promise<void> {
    await this.jobRecordRepo.update(jobId, {
      status:      'completed',
      returnValue: JSON.parse(returnvalue || 'null'),
    });
    this.logger.debug(`Job ${jobId} → completed`);
  }

  @OnQueueEvent('failed')
  async onFailed({ jobId, failedReason }: { jobId: string; failedReason: string }): Promise<void> {
    await this.jobRecordRepo.update(jobId, { status: 'failed', failedReason });
    this.logger.error(`Job ${jobId} échoué : ${failedReason}`);
  }

  @OnQueueEvent('delayed')
  async onDelayed({ jobId }: { jobId: string }): Promise<void> {
    await this.jobRecordRepo.update(jobId, { status: 'delayed' });
    this.logger.debug(`Job ${jobId} → delayed`);
  }
}
