import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { WorkerHost } from '@nestjs/bullmq';
import { OcrService } from './ocr.service';
import { OcrJobData } from './interfaces/ocr-job.interface';
export declare class OcrProcessor extends WorkerHost {
    private readonly ocrService;
    private readonly config;
    private readonly logger;
    constructor(ocrService: OcrService, config: ConfigService);
    process(job: Job<OcrJobData, {
        pageCount: number;
    }, string>): Promise<{
        pageCount: number;
    }>;
    onFailed(job: Job<OcrJobData>, error: Error): Promise<void>;
}
