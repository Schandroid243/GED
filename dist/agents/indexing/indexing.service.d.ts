import { ConfigService } from '@nestjs/config';
import { DocumentService } from '../../documents/document.service';
import { IndexingJobData } from './interfaces/indexing-job.interface';
export declare class IndexingService {
    private readonly documentService;
    private readonly config;
    private readonly logger;
    constructor(documentService: DocumentService, config: ConfigService);
    indexDocument(data: IndexingJobData, onProgress: (p: number) => void): Promise<void>;
}
