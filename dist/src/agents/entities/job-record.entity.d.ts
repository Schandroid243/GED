import { QueueName } from '../../common/queues/queue-names.enum';
export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
export declare class JobRecord {
    jobId: string;
    queueName: QueueName;
    jobName: string;
    data: Record<string, unknown>;
    status: JobStatus;
    attemptsMade: number;
    correlationId?: string;
    failedReason?: string;
    returnValue?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
