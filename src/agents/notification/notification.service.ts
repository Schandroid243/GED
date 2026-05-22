import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import { NotificationJobData, NotificationChannel } from './interfaces/notification-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

/**
 * Structure d'un template de notification.
 */
interface NotificationTemplate {
  subject: string;
  body: string;
}

/**
 * Catalogue de templates prédéfinis.
 * En production, ces templates sont stockés en base (table notification_templates)
 * et chargés par tenant + locale.
 */
const TEMPLATE_CATALOG: Record<string, NotificationTemplate> = {
  document_classified: {
    subject: 'Document classifié',
    body: 'Le document {{documentId}} a été classifié avec le statut {{newStatus}}.',
  },
  document_archived: {
    subject: 'Document archivé',
    body: 'Le document {{documentId}} a été archivé.',
  },
  document_error: {
    subject: 'Erreur document',
    body: 'Une erreur est survenue sur le document {{documentId}} : {{errorMessage}}.',
  },
  approval_required: {
    subject: 'Approbation requise',
    body: 'Le document {{documentId}} nécessite votre approbation.',
  },
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  /**
   * Transporteur SMTP. Initialisé au premier envoi email nécessaire.
   * null si aucune configuration SMTP n'est présente dans .env.
   */
  private emailTransporter: Transporter | null = null;
  private emailInitialized = false;

  constructor(private readonly config: ConfigService) {}

  /**
   * Envoie une notification sur les canaux demandés :
   * 1. Résout le template depuis le catalogue
   * 2. Interpole les variables {{key}} dans le sujet et le corps
   * 3. Dispatch par canal (email, inapp, webhook)
   * 4. Logger le résultat
   */
  async send(
    data: NotificationJobData,
    onProgress: (p: number) => void,
  ): Promise<void> {
    const { templateName, data: templateVars, channels, correlationId } = data;

    onProgress(10);

    // ── Étape 1 : Résolution du template ──────────────────────
    const template = this.resolveTemplate(templateName);
    if (!template) {
      throw new NonRetriableError(
        `Template introuvable : ${templateName}`,
      );
    }

    onProgress(30);

    // ── Étape 2 : Interpolation des variables ─────────────────
    const subject = this.interpolate(template.subject, templateVars);
    const body = this.interpolate(template.body, templateVars);

    onProgress(50);

    // ── Étape 3 : Dispatch par canal ──────────────────────────
    let successCount = 0;
    const channelErrors: string[] = [];

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmail(data, subject, body);
            break;
          case 'inapp':
            await this.sendInApp(data, subject, body);
            break;
          case 'webhook':
            await this.sendWebhook(data, subject, body);
            break;
          default:
            this.logger.warn(
              `[${correlationId}] Canal inconnu : ${channel}`,
            );
            continue;
        }
        successCount++;
        this.logger.debug(
          `[${correlationId}] Notification envoyée via ${channel}`,
        );
      } catch (err: unknown) {
        if (err instanceof Error) {
          const errorMsg = `Échec ${channel} : ${err.message}`;
          channelErrors.push(errorMsg);
          this.logger.warn(`[${correlationId}] ${errorMsg}`);
        }
      }
    }

    onProgress(80);

    // ── Étape 4 : Log du résultat ─────────────────────────────
    const logEntry = {
      templateName,
      channels,
      successCount,
      totalChannels: channels.length,
      errors: channelErrors.length > 0 ? channelErrors : undefined,
      correlationId,
    };
    this.logger.log(
      `[${correlationId}] Notification : ${successCount}/${channels.length} canaux réussis`,
    );

    // Si aucun canal n'a fonctionné, on lève une erreur transitoire
    if (successCount === 0 && channels.length > 0) {
      throw new Error(
        `Échec de tous les canaux de notification : ${channelErrors.join('; ')}`,
      );
    }

    onProgress(100);
  }

  /**
   * Résout un template depuis le catalogue.
   * TODO: Charger depuis la table notification_templates (filtre name + locale).
   */
  private resolveTemplate(templateName: string): NotificationTemplate | null {
    // Tente d'abord le catalogue statique
    if (TEMPLATE_CATALOG[templateName]) {
      return TEMPLATE_CATALOG[templateName];
    }

    // TODO: Charger depuis la base
    // return await this.notifTemplateRepo.findOne({ where: { name: templateName, locale } });

    this.logger.warn(`Template "${templateName}" non trouvé dans le catalogue`);
    return null;
  }

  /**
   * Interpole les variables {{key}} dans un texte.
   */
  private interpolate(text: string, vars: Record<string, unknown>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      const value = vars[key];
      return value !== undefined ? String(value) : `{{${key}}}`;
    });
  }

  /**
   * Envoie une notification par email via SMTP (nodemailer).
   */
  private async sendEmail(
    data: NotificationJobData,
    subject: string,
    body: string,
  ): Promise<void> {
    // Initialisation lazy du transporteur SMTP
    if (!this.emailInitialized) {
      this.initEmailTransporter();
    }

    if (!this.emailTransporter) {
      throw new Error('Transporteur SMTP non configuré');
    }

    const { tenantId, userIds } = data;
    // TODO: Résoudre les emails des userIds depuis le service utilisateurs
    const to = userIds.length > 0
      ? `${userIds[0]}@${tenantId}.ged.internal` // placeholder
      : 'noreply@ged.internal';

    await this.emailTransporter.sendMail({
      from: '"GED Notification" <noreply@ged.internal>',
      to,
      subject,
      html: body.replace(/\n/g, '<br/>'),
    });
  }

  /**
   * Initialise le transporteur SMTP depuis la configuration.
   * Utilise les variables SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
   */
  private initEmailTransporter(): void {
    this.emailInitialized = true;

    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host || !port) {
      this.logger.warn('SMTP non configuré — les notifications email seront ignorées');
      this.emailTransporter = null;
      return;
    }

    this.emailTransporter = nodemailer.createTransport({
      host,
      port: port || 587,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    this.logger.log(`Transporteur SMTP initialisé : ${host}:${port}`);
  }

  /**
   * Envoie une notification in-app (insère dans la table `notifications`).
   * TODO: Implémenter l'insertion en base.
   */
  private async sendInApp(
    data: NotificationJobData,
    subject: string,
    body: string,
  ): Promise<void> {
    const { tenantId, userIds, correlationId } = data;

    for (const userId of userIds) {
      this.logger.debug(
        `[${correlationId}] Notification in-app pour ${userId} : ${subject}`,
      );
      // TODO: Insérer dans la table notifications
      // await this.notificationRepo.save({
      //   tenantId,
      //   userId,
      //   title: subject,
      //   message: body,
      //   read: false,
      //   correlationId,
      // });
    }
  }

  /**
   * Envoie une notification par webhook (HTTP POST).
   * TODO: Récupérer l'URL webhook depuis la configuration du tenant.
   */
  private async sendWebhook(
    data: NotificationJobData,
    subject: string,
    body: string,
  ): Promise<void> {
    const { correlationId } = data;

    this.logger.debug(
      `[${correlationId}] Webhook non implémenté : ${subject}`,
    );
    // TODO: Récupérer l'URL webhook du tenant et faire un POST
    // const webhookUrl = await this.tenantService.getWebhookUrl(data.tenantId);
    // await axios.post(webhookUrl, { subject, body, data: data.data });
  }
}
