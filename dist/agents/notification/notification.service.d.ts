import { ConfigService } from '@nestjs/config';
import { NotificationJobData } from './interfaces/notification-job.interface';
export declare class NotificationService {
    private readonly config;
    private readonly logger;
    private emailTransporter;
    private emailInitialized;
    constructor(config: ConfigService);
    send(data: NotificationJobData, onProgress: (p: number) => void): Promise<void>;
    private resolveTemplate;
    private interpolate;
    private sendEmail;
    private initEmailTransporter;
    private sendInApp;
    private sendWebhook;
}
