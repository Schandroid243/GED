import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { LocalStorageService } from '../../storage/storage.service';
import { DocumentService } from '../../documents/document.service';
import { DocumentIngestionJobData } from './interfaces/document-ingestion-job.interface';
export declare class DocumentIngestionService {
    private readonly storageService;
    private readonly documentService;
    private readonly ocrQueue;
    private readonly config;
    private readonly logger;
    private readonly clamdscanPath;
    private readonly uploadTempDir;
    constructor(storageService: LocalStorageService, documentService: DocumentService, ocrQueue: Queue, config: ConfigService);
    run(data: DocumentIngestionJobData, onProgress: (p: number) => void): Promise<void>;
    private scanFile;
    private generateThumbnail;
    markDocumentError(documentId: string, reason: string): Promise<void>;
}
