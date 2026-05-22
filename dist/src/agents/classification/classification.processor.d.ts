import { Job } from 'bullmq';
import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ClassificationService } from './classification.service';
import { ClassificationJobData } from './interfaces/classification-job.interface';
export declare class ClassificationProcessor extends WorkerHost {
    private readonly classificationService;
    private readonly config;
    private readonly logger;
    constructor(classificationService: ClassificationService, config: ConfigService);
    process(job: Job<ClassificationJobData, {
        documentType: string;
        confidence: number;
    }, string>): Promise<{
        documentType: string;
        confidence: number;
    }>;
    onFailed(job: Job<ClassificationJobData>, error: Error): Promise<void>;
}
