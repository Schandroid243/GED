import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { DocumentService } from '../../documents/document.service';
import { ArchiveJobData } from './interfaces/archive-job.interface';
export declare class ArchiveService {
    private readonly documentService;
    private readonly archiveQueue;
    private readonly config;
    private readonly logger;
    private readonly ghostscriptPath;
    private readonly libreofficePath;
    constructor(documentService: DocumentService, archiveQueue: Queue, config: ConfigService);
    archiveDocuments(data: ArchiveJobData, onProgress: (p: number) => void): Promise<void>;
    destroyDocument(data: {
        documentId: string;
        tenantId: string;
        correlationId: string;
    }, onProgress: (p: number) => void): Promise<void>;
    performCleanup(): Promise<void>;
    private convertToPdfA;
    private signPades;
    private resolveRetentionMs;
}
