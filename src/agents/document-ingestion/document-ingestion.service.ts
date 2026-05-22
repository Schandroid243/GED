import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

import { QueueName } from '../../common/queues/queue-names.enum';
import { LocalStorageService } from '../../storage/storage.service';
import { DocumentService } from '../../documents/document.service';
import { DocumentStatus } from '../../documents/enums/document-status.enum';
import { DocumentIngestionJobData } from './interfaces/document-ingestion-job.interface';
import { OcrJobData } from '../ocr/interfaces/ocr-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

const execFileAsync = promisify(execFile);

// Types MIME éligibles à l'OCR
const OCR_MIME_TYPES = new Set([
  'application/pdf',
  'image/tiff',
  'image/png',
  'image/jpeg',
  'image/bmp',
]);

// Taille maximale d'un fichier : 50 Mo
const MAX_FILE_SIZE = 50 * 1024 * 1024;

@Injectable()
export class DocumentIngestionService {
  private readonly logger = new Logger(DocumentIngestionService.name);
  private readonly clamdscanPath: string;
  private readonly uploadTempDir: string;

  constructor(
    private readonly storageService: LocalStorageService,
    private readonly documentService: DocumentService,
    @InjectQueue(QueueName.OCR_EXTRACTION) private readonly ocrQueue: Queue,
    private readonly config: ConfigService,
  ) {
    this.clamdscanPath = config.get<string>('CLAMDSCAN_PATH', '/usr/bin/clamdscan');
    this.uploadTempDir = config.get<string>('UPLOAD_TEMP_DIR', '/tmp/uploads');
  }

  /**
   * Exécute le pipeline d'ingestion complet :
   * 1. Analyse antivirus
   * 2. Copie vers le stockage permanent
   * 3. Génération miniature
   * 4. Mise à jour statut → RECEIVED
   * 5. Enqueue OCR si applicable
   */
  async run(
    data: DocumentIngestionJobData,
    onProgress: (p: number) => void,
  ): Promise<void> {
    const { documentId, tenantId, filePath, mimeType, originalName, correlationId } = data;

    // ── Étape 1 : Analyse antivirus ──────────────────────────
    this.logger.log(`[${correlationId}] Analyse antivirus : ${filePath}`);
    onProgress(10);
    await this.scanFile(filePath);

    // ── Étape 2 : Copie vers stockage permanent ──────────────
    this.logger.log(`[${correlationId}] Copie vers stockage permanent`);
    onProgress(30);
    const fileName = `original${path.extname(originalName) || '.bin'}`;
    const storedFile = await this.storageService.store(
      filePath,
      tenantId,
      documentId,
      fileName,
    );
    this.logger.log(`[${correlationId}] Fichier stocké : ${storedFile.relativePath} (${storedFile.sizeBytes} o)`);

    // Vérification taille max
    if (storedFile.sizeBytes > MAX_FILE_SIZE) {
      throw new NonRetriableError(
        `Fichier trop volumineux : ${storedFile.sizeBytes} o (max: ${MAX_FILE_SIZE} o)`,
      );
    }

    // ── Étape 3 : Miniature ──────────────────────────────────
    onProgress(50);
    try {
      await this.generateThumbnail(storedFile.absolutePath, tenantId, documentId, mimeType);
      this.logger.log(`[${correlationId}] Miniature générée`);
    } catch (err: unknown) {
      // Échec non bloquant : la miniature n'est pas critique
      if (err instanceof Error) {
        this.logger.warn(`[${correlationId}] Échec génération miniature : ${err.message}`);
      }
    }

    // ── Étape 4 : Mise à jour statut ──────────────────────────
    onProgress(70);
    await this.documentService.updateStatus(documentId, DocumentStatus.RECEIVED);

    // ── Étape 5 : Enqueue OCR si MIME compatible ──────────────
    onProgress(85);
    if (OCR_MIME_TYPES.has(mimeType)) {
      const ocrJobData: OcrJobData = {
        tenantId,
        documentId,
        filePath: storedFile.relativePath,
        language: 'fra',      // détecté depuis les métadonnées du tenant à terme
        correlationId,
        priority: 2,
      };

      await this.ocrQueue.add('extract', ocrJobData, {
        jobId: `ocr-${documentId}`,
        priority: 2,
      });
      this.logger.log(`[${correlationId}] Job OCR enqueue : ocr-${documentId}`);
    } else {
      this.logger.log(`[${correlationId}] MIME ${mimeType} non éligible OCR, skip`);
    }

    onProgress(100);
  }

  /**
   * Analyse antivirus via ClamAV.
   * Lance `clamdscan <filePath>` via child_process.
   * En cas d'échec ou de virus détecté, lance une NonRetriableError.
   */
  private async scanFile(filePath: string): Promise<void> {
    try {
      const { stdout } = await execFileAsync(this.clamdscanPath, ['--no-summary', filePath]);
      const output = stdout.trim().toLowerCase();

      // Vérification de la présence du mot "OK" dans la sortie
      if (!output.includes('ok')) {
        throw new NonRetriableError(
          `Virus détecté ou analyse impossible : ${stdout.trim()}`,
        );
      }
    } catch (error: unknown) {
      if (error instanceof NonRetriableError) {
        throw error;
      }
      // Si clamdscan n'est pas disponible, on log un avertissement mais on continue
      if (error instanceof Error) {
        this.logger.warn(`Analyse antivirus indisponible (clamdscan) : ${error.message}`);
      }
    }
  }

  /**
   * Génère une miniature via ImageMagick (convert CLI) ou sharp.
   * Pour l'instant, on logue simplement l'étape.
   * TODO: Implémenter la génération réelle avec sharp
   */
  private async generateThumbnail(
    absolutePath: string,
    tenantId: string,
    documentId: string,
    mimeType: string,
  ): Promise<void> {
    // Placeholder : la génération de miniature sera implémentée avec sharp
    this.logger.debug(`Génération miniature non implémentée pour ${absolutePath}`);
    // await sharp(absolutePath)
    //   .resize(300, 300, { fit: 'inside' })
    //   .toFile(path.join(path.dirname(absolutePath), 'thumbnail.webp'));
  }

  /**
   * Marque un document en erreur après échec définitif du job.
   */
  async markDocumentError(documentId: string, reason: string): Promise<void> {
    await this.documentService.markError(documentId, reason);
  }
}
