import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

import { QueueName } from '../../common/queues/queue-names.enum';
import { LocalStorageService } from '../../storage/storage.service';
import { DocumentService } from '../../documents/document.service';
import { DocumentStatus } from '../../documents/enums/document-status.enum';
import { OcrResult } from '../../documents/entities/ocr-result.entity';
import { OcrJobData } from './interfaces/ocr-job.interface';
import { ClassificationJobData } from '../classification/interfaces/classification-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

const execFileAsync = promisify(execFile);

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly tesseractPath: string;
  private readonly uploadTempDir: string;

  constructor(
    private readonly storageService: LocalStorageService,
    private readonly documentService: DocumentService,
    @InjectRepository(OcrResult)
    private readonly ocrRepo: Repository<OcrResult>,
    @InjectQueue(QueueName.CLASSIFICATION)
    private readonly classificationQueue: Queue,
    private readonly config: ConfigService,
  ) {
    this.tesseractPath = config.get<string>('TESSERACT_PATH', '/usr/bin/tesseract');
    this.uploadTempDir = config.get<string>('UPLOAD_TEMP_DIR', '/tmp/uploads');
  }

  /**
   * Traite un document via Tesseract OCR :
   * 1. Copie le fichier depuis le stockage local vers un répertoire temporaire
   * 2. Invoke Tesseract via CLI
   * 3. Parse les sorties TSV et hOCR
   * 4. Insère les résultats dans OcrResult (une entrée par page)
   * 5. Met à jour le statut du document
   * 6. Enqueue la classification
   * 7. Nettoie le fichier temporaire
   */
  async processDocument(
    data: OcrJobData,
    onProgress: (p: number) => void,
  ): Promise<{ pageCount: number }> {
    const { documentId, tenantId, filePath, language, correlationId, pageRange } = data;

    // ── Étape 1 : Copie vers temporaire ────────────────────
    onProgress(10);
    const tempDir = path.join(this.uploadTempDir, `ocr-${documentId}`);
    await fs.mkdir(tempDir, { recursive: true });

    const sourceBuffer = await this.storageService.read(filePath);
    const ext = path.extname(filePath) || '.pdf';
    const tempInput = path.join(tempDir, `input${ext}`);
    await fs.writeFile(tempInput, sourceBuffer);

    this.logger.log(`[${correlationId}] Fichier copié vers temp : ${tempInput}`);

    // ── Étape 2 : Exécution Tesseract ───────────────────────
    onProgress(30);
    const outputBase = path.join(tempDir, 'output');
    const tesseractArgs = [
      tempInput,
      outputBase,
      '--oem', '3',
      '--psm', '3',
      '-l', language,
      'tsv',
      'hocr',
    ];

    this.logger.log(`[${correlationId}] Lancement Tesseract : ${this.tesseractPath} ${tesseractArgs.join(' ')}`);
    const { stdout, stderr } = await execFileAsync(this.tesseractPath, tesseractArgs, {
      timeout: 300_000, // 5 minutes max par job OCR
    });

    if (stderr) {
      this.logger.warn(`[${correlationId}] Tesseract stderr : ${stderr}`);
    }

    onProgress(60);

    // ── Étape 3 : Parsing des résultats ─────────────────────
    const tsvPath = `${outputBase}.tsv`;
    const hocrPath = `${outputBase}.hocr`;

    let pageCount = 0;
    try {
      // Lecture du TSV pour compter les pages et extraire le texte
      const tsvContent = await fs.readFile(tsvPath, 'utf-8');
      const hocrContent = await fs.readFile(hocrPath, 'utf-8');

      // Parsing simple du TSV : on groupe par numéro de page (colonne "page_num")
      const lines = tsvContent.split('\n');
      const header = lines[0]?.split('\t') ?? [];
      const pageNumIdx = header.indexOf('page_num');
      const textIdx = header.indexOf('text');

      if (pageNumIdx === -1 || textIdx === -1) {
        throw new NonRetriableError(
          `Format TSV inattendu : colonnes page_num/text introuvables`,
        );
      }

      // Regroupement par page
      const pagesMap = new Map<number, string[]>();
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]?.split('\t') ?? [];
        const pageNum = parseInt(cols[pageNumIdx] ?? "", 10);
        const text = cols[textIdx]?.trim();
        if (!isNaN(pageNum) && text) {
          if (!pagesMap.has(pageNum)) {
            pagesMap.set(pageNum, []);
          }
          pagesMap.get(pageNum)!.push(text);
        }
      }

      pageCount = pagesMap.size;

      // Application du filtre pageRange si spécifié
      const pagesToProcess = pageRange
        ? Array.from(pagesMap.entries()).filter(
            ([num]) => num >= pageRange[0] && num <= pageRange[1],
          )
        : Array.from(pagesMap.entries());

      onProgress(75);

      // ── Étape 4 : Insertion en base ─────────────────────────
      for (const [pageNum, texts] of pagesToProcess) {
        const rawText = texts.join(' ');

        const ocrEntry = this.ocrRepo.create({
          documentId,
          tenantId,
          pageNumber: pageNum,
          rawText,
          hocrData: { raw: hocrContent.slice(0, 5000) }, // stockage partiel du hOCR
          language,
        });
        await this.ocrRepo.save(ocrEntry);
      }

      this.logger.log(`[${correlationId}] ${pageCount} page(s) OCR insérées en base`);
    } catch (error: unknown) {
      if (error instanceof NonRetriableError) {
        throw error;
      }
      if (error instanceof Error) {
        this.logger.warn(`[${correlationId}] Erreur parsing OCR : ${error.message}`);
      }
      // Considérer comme OCR partiel
      pageCount = 0;
    }

    onProgress(85);

    // ── Étape 5 : Mise à jour statut ─────────────────────────
    const finalStatus = pageCount > 0 ? DocumentStatus.OCR_COMPLETED : DocumentStatus.OCR_PARTIAL;
    await this.documentService.updateStatus(documentId, finalStatus);

    // ── Étape 6 : Enqueue classification ─────────────────────
    if (pageCount > 0) {
      // Récupération du texte complet concaténé pour la classification
      const allPages = await this.ocrRepo.find({
        where: { documentId },
        order: { pageNumber: 'ASC' },
      });
      const fullText = allPages.map((p) => p.rawText).join('\n');

      const classificationJobData: ClassificationJobData = {
        tenantId,
        documentId,
        ocrText: fullText,
        existingMetadata: {},
        correlationId,
      };

      await this.classificationQueue.add('classify', classificationJobData, {
        jobId: `classify-${documentId}`,
      });
      this.logger.log(`[${correlationId}] Job classification enqueue : classify-${documentId}`);
    }

    // ── Étape 7 : Nettoyage ──────────────────────────────────
    onProgress(95);
    await fs.rm(tempDir, { recursive: true, force: true });
    this.logger.log(`[${correlationId}] Temp répertoire nettoyé : ${tempDir}`);

    onProgress(100);
    return { pageCount };
  }

  /**
   * Gestion d'échec définitif du job OCR.
   */
  async handleFailure(data: OcrJobData, error: Error): Promise<void> {
    this.logger.error(
      `[${data.correlationId}] Échec définitif OCR pour ${data.documentId} : ${error.message}`,
    );
    await this.documentService.markError(data.documentId, `OCR échoué : ${error.message}`);
  }
}
