import { Job } from 'bullmq';
import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ArchiveService } from './archive.service';
import { ArchiveJobData } from './interfaces/archive-job.interface';
interface DestroyJobData {
    documentId: string;
    tenantId: string;
    correlationId: string;
}
export declare class ArchiveProcessor extends WorkerHost {
    private readonly archiveService;
    private readonly config;
    private readonly logger;
    constructor(archiveService: ArchiveService, config: ConfigService);
    process(job: Job<ArchiveJobData | DestroyJobData | Record<string, never>, unknown, string>): Promise<void>;
    private handleBatchArchive;
    private handleDestroy;
    private handleCleanup;
    onFailed(job: Job<ArchiveJobData>, error: Error): Promise<void>;
}
export {};
