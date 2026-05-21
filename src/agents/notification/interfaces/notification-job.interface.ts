export type NotificationChannel = 'email' | 'inapp' | 'webhook';

export interface NotificationJobData {
  tenantId:      string;                          // UUID
  userIds:       string[];                        // UUIDs des destinataires
  channels:      NotificationChannel[];
  templateName:  string;                          // clé dans le catalogue de templates
  data:          Record<string, unknown>;          // variables de template
  correlationId: string;                          // UUID pour le tracing distribué
}
