import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { LocalStorageService } from '../../storage/storage.service';
import { DocumentService } from '../../documents/document.service';
import { OcrResult } from '../../documents/entities/ocr-result.entity';
import { OcrJobData } from './interfaces/ocr-job.interface';
export declare class OcrService {
    private readonly storageService;
    private readonly documentService;
    private readonly ocrRepo;
    private readonly classificationQueue;
    private readonly config;
    private readonly logger;
    private readonly tesseractPath;
    private readonly uploadTempDir;
    constructor(storageService: LocalStorageService, documentService: DocumentService, ocrRepo: Repository<OcrResult>, classificationQueue: Queue, config: ConfigService);
    processDocument(data: OcrJobData, onProgress: (p: number) => void): Promise<{
        pageCount: number;
    }>;
    handleFailure(data: OcrJobData, error: Error): Promise<void>;
}
