import { OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { JobRecord } from '../entities/job-record.entity';
export declare class CleanupService implements OnApplicationBootstrap {
    private readonly archiveQueue;
    private readonly jobRecordRepo;
    private readonly config;
    private readonly logger;
    constructor(archiveQueue: Queue, jobRecordRepo: Repository<JobRecord>, config: ConfigService);
    onApplicationBootstrap(): Promise<void>;
    performCleanup(): Promise<void>;
    private cleanupTempFiles;
    private purgeOldJobRecords;
    private releaseOrphanedLocks;
}
