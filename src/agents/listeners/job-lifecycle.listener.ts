import { Injectable, Logger } from '@nestjs/common';
import { Processor, OnQueueEvent, InjectQueue } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobRecord, JobStatus } from '../entities/job-record.entity';
import { Job } from 'bullmq';


@Injectable()
@Processor('job-queue')
export class JobLifecycleListener {
  private readonly logger = new Logger(JobLifecycleListener.name);

  constructor(
    @InjectQueue('job-queue') private readonly jobQueue: any,
    @InjectRepository(JobRecord)
    private readonly jobRecordRepo: Repository<JobRecord>,
  ) {
  }

  onModuleInit() {
    this.jobQueue.on('delayed', (job: Job, delayedTimestamp: number) => {
      this.jobRecordRepo.update(job.id ?? "", { status: 'delayed' });
      this.logger.debug(`Job ${job.id} → delayed`);
    });
  };

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

  // @OnQueueEvent('delayed')
  // async onDelayed(job: Job, delayedTimestamp: number): Promise<void> {
  //   await this.jobRecordRepo.update(job.id, { status: 'delayed' });
  //   this.logger.debug(`Job ${job.id} → delayed`);
  // }
}
