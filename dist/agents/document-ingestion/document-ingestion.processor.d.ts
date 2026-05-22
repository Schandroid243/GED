import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { WorkerHost } from '@nestjs/bullmq';
import { DocumentIngestionService } from './document-ingestion.service';
import { DocumentIngestionJobData } from './interfaces/document-ingestion-job.interface';
export declare class DocumentIngestionProcessor extends WorkerHost {
    private readonly ingestionService;
    private readonly config;
    private readonly logger;
    constructor(ingestionService: DocumentIngestionService, config: ConfigService);
    process(job: Job<DocumentIngestionJobData, unknown, string>): Promise<void>;
    onFailed(job: Job<DocumentIngestionJobData>, error: Error): Promise<void>;
}
