import { Job } from 'bullmq';
import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowEngineJobData } from './interfaces/workflow-engine-job.interface';
export declare class WorkflowEngineProcessor extends WorkerHost {
    private readonly workflowEngineService;
    private readonly config;
    private readonly logger;
    constructor(workflowEngineService: WorkflowEngineService, config: ConfigService);
    process(job: Job<WorkflowEngineJobData, unknown, string>): Promise<void>;
    onFailed(job: Job<WorkflowEngineJobData>, error: Error): Promise<void>;
}
