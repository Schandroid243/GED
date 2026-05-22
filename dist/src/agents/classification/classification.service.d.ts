import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { DocumentService } from '../../documents/document.service';
import { ClassificationJobData } from './interfaces/classification-job.interface';
export declare class ClassificationService {
    private readonly documentService;
    private readonly indexingQueue;
    private readonly workflowEngineQueue;
    private readonly config;
    private readonly logger;
    private readonly mlClassificationEnabled;
    constructor(documentService: DocumentService, indexingQueue: Queue, workflowEngineQueue: Queue, config: ConfigService);
    classify(data: ClassificationJobData, onProgress: (p: number) => void): Promise<{
        documentType: string;
        confidence: number;
    }>;
    private calculateHeuristicScore;
    private callMlService;
    classifyAsUnknown(documentId: string, errorMessage: string): Promise<void>;
}
