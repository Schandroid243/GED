import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';

import { QueueName } from '../../common/queues/queue-names.enum';
import { DocumentService } from '../../documents/document.service';
import { DocumentStatus } from '../../documents/enums/document-status.enum';
import { WorkflowEngineJobData, WorkflowEventType } from './interfaces/workflow-engine-job.interface';
import { NotificationJobData } from '../notification/interfaces/notification-job.interface';

/**
 * Structure d'une transition de workflow (BPMN-JSON simplifié).
 */
interface WorkflowTransition {
  fromStatus: DocumentStatus;
  eventType:  WorkflowEventType;
  toStatus:   DocumentStatus;
  /** Actions à déclencher sur cette transition */
  actions:    WorkflowAction[];
}

type WorkflowAction =
  | { type: 'NOTIFY'; templateName: string; userIds?: string[] }
  | { type: 'SCHEDULE_TIMEOUT'; delayMs: number; eventOnTimeout: WorkflowEventType }
  | { type: 'UPDATE_STATUS' }
  | { type: 'LOG' };

/**
 * Définition BPMN-JSON par défaut (simplifiée, sans base de données).
 * En production, ces définitions sont chargées depuis la table `workflow_definitions`
 * filtrée par tenantId + isActive.
 */
const DEFAULT_WORKFLOW_DEFINITION: WorkflowTransition[] = [
  {
    fromStatus: DocumentStatus.RECEIVED,
    eventType: 'DOCUMENT_CLASSIFIED',
    toStatus: DocumentStatus.CLASSIFIED,
    actions: [
      { type: 'UPDATE_STATUS' },
      { type: 'NOTIFY', templateName: 'document_classified' },
    ],
  },
  {
    fromStatus: DocumentStatus.CLASSIFIED,
    eventType: 'ARCHIVE_TRIGGERED',
    toStatus: DocumentStatus.ARCHIVED,
    actions: [
      { type: 'UPDATE_STATUS' },
      { type: 'NOTIFY', templateName: 'document_archived' },
    ],
  },
];

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly documentService: DocumentService,
    @InjectQueue(QueueName.NOTIFICATION)
    private readonly notificationQueue: Queue,
    @InjectQueue(QueueName.WORKFLOW_ENGINE)
    private readonly workflowQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  /**
   * Traite un événement workflow :
   * 1. Charge la définition de workflow du tenant (depuis la base ou défaut)
   * 2. Évalue les transitions applicables à l'événement
   * 3. Exécute les actions associées (notification, mise à jour statut, jobs différés)
   * 4. Persiste l'historique
   */
  async processEvent(
    data: WorkflowEngineJobData,
    onProgress: (p: number) => void,
  ): Promise<void> {
    const { documentId, tenantId, eventType, correlationId, context } = data;

    onProgress(20);

    // ── Étape 1 : Chargement de la définition de workflow ───────
    // TODO: Charger depuis la table `workflow_definitions` filtrée par tenantId + isActive
    const workflowDefinition = await this.loadWorkflowDefinition(tenantId);
    this.logger.debug(
      `[${correlationId}] Définition workflow chargée : ${workflowDefinition.length} transitions`,
    );

    onProgress(40);

    // ── Étape 2 : Évaluation des transitions ────────────────────
    const matchingTransitions = workflowDefinition.filter(
      (t) => t.eventType === eventType,
    );

    if (matchingTransitions.length === 0) {
      this.logger.log(
        `[${correlationId}] Aucune transition trouvée pour eventType=${eventType} sur ${documentId}`,
      );
      onProgress(100);
      return;
    }

    onProgress(60);

    // ── Étape 3 : Exécution des actions ─────────────────────────
    for (const transition of matchingTransitions) {
      this.logger.log(
        `[${correlationId}] Transition appliquée : ${transition.fromStatus} → ${transition.toStatus} (${eventType})`,
      );

      for (const action of transition.actions) {
        await this.executeAction(action, {
          documentId,
          tenantId,
          correlationId,
          newStatus: transition.toStatus,
          context,
        });
      }

      // Mise à jour du statut (si non faite par UPDATE_STATUS)
      if (!transition.actions.some((a) => a.type === 'UPDATE_STATUS')) {
        await this.documentService.updateStatus(documentId, transition.toStatus);
      }

      // Persistance dans l'historique (table workflow_history)
      await this.persistHistory({
        documentId,
        tenantId,
        eventType,
        fromStatus: transition.fromStatus,
        toStatus: transition.toStatus,
        correlationId,
      });
    }

    onProgress(100);
  }

  /**
   * Exécute une action individuelle de workflow.
   */
  private async executeAction(
    action: WorkflowAction,
    ctx: {
      documentId: string;
      tenantId: string;
      correlationId: string;
      newStatus: DocumentStatus;
      context?: Record<string, unknown>;
    },
  ): Promise<void> {
    switch (action.type) {
      case 'NOTIFY': {
        const notificationData: NotificationJobData = {
          tenantId: ctx.tenantId,
          userIds: action.userIds ?? [],
          channels: ['inapp'],
          templateName: action.templateName,
          data: {
            documentId: ctx.documentId,
            newStatus: ctx.newStatus,
            ...ctx.context,
          },
          correlationId: ctx.correlationId,
        };

        await this.notificationQueue.add('send', notificationData, {
          jobId: `notify-${ctx.documentId}-${action.templateName}-${Date.now()}`,
        });
        this.logger.debug(
          `[${ctx.correlationId}] Action NOTIFY : ${action.templateName}`,
        );
        break;
      }

      case 'SCHEDULE_TIMEOUT': {
        // Programme un job différé pour les timeouts (ex : relance après 48h)
        if (action.eventOnTimeout && action.delayMs) {
          const timeoutData: WorkflowEngineJobData = {
            tenantId: ctx.tenantId,
            documentId: ctx.documentId,
            eventType: action.eventOnTimeout,
            correlationId: ctx.correlationId,
            context: ctx.context,
          };

          await this.workflowQueue.add('event', timeoutData, {
            delay: action.delayMs,
            jobId: `timeout-${ctx.documentId}-${action.eventOnTimeout}`,
          });
          this.logger.debug(
            `[${ctx.correlationId}] Action SCHEDULE_TIMEOUT : ${action.delayMs}ms → ${action.eventOnTimeout}`,
          );
        }
        break;
      }

      case 'UPDATE_STATUS': {
        await this.documentService.updateStatus(ctx.documentId, ctx.newStatus);
        this.logger.debug(
          `[${ctx.correlationId}] Action UPDATE_STATUS : ${ctx.newStatus}`,
        );
        break;
      }

      case 'LOG':
      default: {
        this.logger.log(
          `[${ctx.correlationId}] Action LOG : document ${ctx.documentId} transition vers ${ctx.newStatus}`,
        );
        break;
      }
    }
  }

  /**
   * Charge la définition de workflow pour un tenant.
   * TODO: Implémenter la lecture depuis la table `workflow_definitions`
   * avec filtrage par tenantId + isActive.
   */
  private async loadWorkflowDefinition(
    tenantId: string,
  ): Promise<WorkflowTransition[]> {
    // Placeholder : retourne la définition par défaut
    // En production :
    // return await this.workflowDefRepo.find({
    //   where: { tenantId, isActive: true },
    //   order: { priority: 'ASC' },
    // });
    return DEFAULT_WORKFLOW_DEFINITION;
  }

  /**
   * Persiste l'historique d'une transition dans la table workflow_history.
   * TODO: Implémenter l'écriture en base.
   */
  private async persistHistory(entry: {
    documentId: string;
    tenantId: string;
    eventType: WorkflowEventType;
    fromStatus: DocumentStatus;
    toStatus: DocumentStatus;
    correlationId: string;
  }): Promise<void> {
    this.logger.debug(
      `[${entry.correlationId}] Historique workflow : ${entry.documentId} ` +
        `${entry.fromStatus} → ${entry.toStatus} (${entry.eventType})`,
    );
    // TODO: Insérer dans la table workflow_history
    // await this.workflowHistoryRepo.save({ ...entry, timestamp: new Date() });
  }
}
