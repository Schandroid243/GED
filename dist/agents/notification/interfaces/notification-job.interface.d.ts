export type NotificationChannel = 'email' | 'inapp' | 'webhook';
export interface NotificationJobData {
    tenantId: string;
    userIds: string[];
    channels: NotificationChannel[];
    templateName: string;
    data: Record<string, unknown>;
    correlationId: string;
}
