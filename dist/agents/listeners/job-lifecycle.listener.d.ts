import { QueueEventsHost } from '@nestjs/bullmq';
import { Repository } from 'typeorm';
import { JobRecord } from '../entities/job-record.entity';
export declare class JobLifecycleListener extends QueueEventsHost {
    private readonly jobRecordRepo;
    private readonly logger;
    constructor(jobRecordRepo: Repository<JobRecord>);
    onActive({ jobId }: {
        jobId: string;
    }): Promise<void>;
    onCompleted({ jobId, returnvalue }: {
        jobId: string;
        returnvalue: string;
    }): Promise<void>;
    onFailed({ jobId, failedReason }: {
        jobId: string;
        failedReason: string;
    }): Promise<void>;
    onDelayed({ jobId }: {
        jobId: string;
    }): Promise<void>;
}
