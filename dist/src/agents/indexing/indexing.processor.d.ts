import { Job } from 'bullmq';
import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { IndexingService } from './indexing.service';
import { IndexingJobData } from './interfaces/indexing-job.interface';
export declare class IndexingProcessor extends WorkerHost {
    private readonly indexingService;
    private readonly config;
    private readonly logger;
    constructor(indexingService: IndexingService, config: ConfigService);
    process(job: Job<IndexingJobData, unknown, string>): Promise<void>;
    onFailed(job: Job<IndexingJobData>, error: Error): Promise<void>;
}
