import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { DocumentService } from '../../documents/document.service';
import { WorkflowEngineJobData } from './interfaces/workflow-engine-job.interface';
export declare class WorkflowEngineService {
    private readonly documentService;
    private readonly notificationQueue;
    private readonly workflowQueue;
    private readonly config;
    private readonly logger;
    constructor(documentService: DocumentService, notificationQueue: Queue, workflowQueue: Queue, config: ConfigService);
    processEvent(data: WorkflowEngineJobData, onProgress: (p: number) => void): Promise<void>;
    private executeAction;
    private loadWorkflowDefinition;
    private persistHistory;
}
