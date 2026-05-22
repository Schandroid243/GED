import { Job, Queue } from 'bullmq';
import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { NotificationJobData } from './interfaces/notification-job.interface';
export declare class NotificationProcessor extends WorkerHost {
    private readonly notificationService;
    private readonly deadLetterQueue;
    private readonly config;
    private readonly logger;
    constructor(notificationService: NotificationService, deadLetterQueue: Queue, config: ConfigService);
    process(job: Job<NotificationJobData, unknown, string>): Promise<void>;
    onFailed(job: Job<NotificationJobData>, error: Error): Promise<void>;
}
