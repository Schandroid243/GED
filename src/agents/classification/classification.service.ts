import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';

import { QueueName } from '../../common/queues/queue-names.enum';
import { DocumentService } from '../../documents/document.service';
import { DocumentStatus } from '../../documents/enums/document-status.enum';
import { DocumentType } from '../../documents/enums/document-type.enum';
import { ClassificationJobData } from './interfaces/classification-job.interface';
import { IndexingJobData } from '../indexing/interfaces/indexing-job.interface';
import { WorkflowEngineJobData } from '../workflow-engine/interfaces/workflow-engine-job.interface';

/**
 * Règles heuristiques pour la classification de documents.
 * Format : [expression régulière, DocumentType associé]
 */
const CLASSIFICATION_RULES: [RegExp, DocumentType][] = [
  [/facture|invoice|bill|payment|montant|tva|ht\s*total/i, DocumentType.INVOICE],
  [/contrat|contract|agreement|clause|signature|parties/i, DocumentType.CONTRACT],
  [/carte\s*d'identité|passeport|permis|id_card|passport|driver.?license/i, DocumentType.ID_CARD],
  [/reçu|reçu|receipt|ticket|justificatif|paiement|remboursement/i, DocumentType.RECEIPT],
  [/rapport|report|bilan|analyse|analysis|summary|synthèse/i, DocumentType.REPORT],
];

@Injectable()
export class ClassificationService {
  private readonly logger = new Logger(ClassificationService.name);
  private readonly mlClassificationEnabled: boolean;

  constructor(
    private readonly documentService: DocumentService,
    @InjectQueue(QueueName.INDEXING)
    private readonly indexingQueue: Queue,
    @InjectQueue(QueueName.WORKFLOW_ENGINE)
    private readonly workflowEngineQueue: Queue,
    private readonly config: ConfigService,
  ) {
    this.mlClassificationEnabled = config.get<boolean>('AGENT_ML_CLASSIFICATION', false);
  }

  /**
   * Classifie un document en appliquant :
   * 1. Règles heuristiques (expressions régulières) sur le texte OCR
   * 2. Optionnellement, appel ML si AGENT_ML_CLASSIFICATION=true et data.useMlModel=true
   *
   * Retourne le type de document et le niveau de confiance associé.
   */
  async classify(
    data: ClassificationJobData,
    onProgress: (p: number) => void,
  ): Promise<{ documentType: string; confidence: number }> {
    const { documentId, tenantId, ocrText, existingMetadata, correlationId } = data;

    onProgress(20);

    // ── Phase 1 : Classification par règles heuristiques ──
    let bestMatch: { type: DocumentType; score: number } | null = null;

    for (const [regex, docType] of CLASSIFICATION_RULES) {
      const matches = ocrText.match(regex);
      if (matches) {
        const score = this.calculateHeuristicScore(matches, ocrText.length);
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { type: docType, score };
        }
      }
    }

    onProgress(50);

    // ── Phase 2 : ML optionnel ────────────────────────────
    if (this.mlClassificationEnabled && data.useMlModel) {
      try {
        const mlResult = await this.callMlService(ocrText, existingMetadata);
        // Le ML a priorité s'il a une confiance > 0.7
        if (mlResult.confidence > 0.7) {
          bestMatch = { type: mlResult.documentType, score: mlResult.confidence };
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          this.logger.warn(`[${correlationId}] Appel ML échoué, fallback heuristique : ${err.message}`);
        }
      }
    }

    onProgress(70);

    // ── Phase 3 : Attribution du type ─────────────────────
    const finalType = bestMatch?.type ?? DocumentType.UNKNOWN;
    const confidence = bestMatch?.score ?? 0;

    // Mise à jour du document en base
    await this.documentService.updateClassification(documentId, finalType, confidence);
    this.logger.log(`[${correlationId}] Document ${documentId} classifié : ${finalType} (${confidence})`);

    // ── Phase 4 : Enqueue indexing ─────────────────────────
    onProgress(85);
    const indexingJobData: IndexingJobData = {
      tenantId,
      documentId,
      textContent: ocrText,
      metadata: existingMetadata,
      correlationId,
      language: 'fra',
    };

    await this.indexingQueue.add('index', indexingJobData, {
      jobId: `index-${documentId}`,
    });
    this.logger.log(`[${correlationId}] Job indexation enqueue : index-${documentId}`);

    // ── Phase 5 : Enqueue workflow engine ──────────────────
    onProgress(95);
    const workflowJobData: WorkflowEngineJobData = {
      tenantId,
      documentId,
      eventType: 'DOCUMENT_CLASSIFIED',
      correlationId,
      context: {
        documentType: finalType,
        confidence,
      },
    };

    await this.workflowEngineQueue.add('event', workflowJobData, {
      jobId: `workflow-${documentId}-classified`,
    });
    this.logger.log(`[${correlationId}] Job workflow enqueue : workflow-${documentId}-classified`);

    onProgress(100);

    return {
      documentType: finalType,
      confidence,
    };
  }

  /**
   * Calcule un score heuristique basé sur le nombre et la pertinence des matchs.
   */
  private calculateHeuristicScore(matches: RegExpMatchArray, textLength: number): number {
    const matchLength = matches[0].length;
    // Score de base : proportion du texte couvert par le match
    const baseScore = Math.min(matchLength / textLength, 0.5);
    // Bonus si plusieurs occurrences
    const occurrenceBonus = Math.min(matches.length * 0.1, 0.3);
    return Math.min(baseScore + occurrenceBonus, 1.0);
  }

  /**
   * Appel au service ML interne (HTTP).
   * Placeholder : à implémenter lorsque le service ML sera disponible.
   */
  private async callMlService(
    ocrText: string,
    metadata: Record<string, string>,
  ): Promise<{ documentType: DocumentType; confidence: number }> {
    // TODO: Appel HTTP vers le service ML
    this.logger.debug('Appel ML non implémenté, fallback heuristique');
    throw new Error('Service ML non disponible');
  }

  /**
   * Fallback en cas d'échec définitif : classifie comme UNKNOWN.
   * Appelé par @OnQueueFailed du processor.
   */
  async classifyAsUnknown(documentId: string, errorMessage: string): Promise<void> {
    this.logger.error(
      `Classification échouée après 3 tentatives, fallback UNKNOWN pour ${documentId} : ${errorMessage}`,
    );

    const doc = await this.documentService.findById(documentId);
    if (!doc) {
      this.logger.warn(`Document ${documentId} introuvable pour fallback classification`);
      return;
    }

    await this.documentService.updateClassification(documentId, DocumentType.UNKNOWN, 0);
  }
}
