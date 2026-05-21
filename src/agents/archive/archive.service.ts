import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

import { QueueName } from '../../common/queues/queue-names.enum';
import { DocumentService } from '../../documents/document.service';
import { DocumentStatus } from '../../documents/enums/document-status.enum';
import { ArchiveJobData } from './interfaces/archive-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

const execFileAsync = promisify(execFile);

/**
 * Ensembles MIME convertibles en PDF/A.
 */
const CONVERTIBLE_MIMES = new Set([
  'application/pdf',
  'image/tiff',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.ms-excel',
]);

@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);
  private readonly ghostscriptPath: string;
  private readonly libreofficePath: string;

  constructor(
    private readonly documentService: DocumentService,
    @InjectQueue(QueueName.ARCHIVE)
    private readonly archiveQueue: Queue,
    private readonly config: ConfigService,
  ) {
    this.ghostscriptPath = config.get<string>('GHOSTSCRIPT_PATH', '/usr/bin/gs');
    this.libreofficePath = config.get<string>('LIBREOFFICE_PATH', '/usr/bin/soffice');
  }

  /**
   * Archive un lot de documents :
   * 1. Pour chaque documentId, récupère le fichier depuis LOCAL_STORAGE_ROOT
   * 2. Convertit en PDF/A via Ghostscript ou LibreOffice selon le MIME
   * 3. Si signElectronically, applique signature PAdES
   * 4. Déplace vers LOCAL_STORAGE_ARCHIVE
   * 5. Met à jour Document.status = ARCHIVED
   * 6. Programme la destruction différée
   */
  async archiveDocuments(
    data: ArchiveJobData,
    onProgress: (p: number) => void,
  ): Promise<void> {
    const { documentIds, tenantId, correlationId, signElectronically, archiveProfile } = data;
    const total = documentIds.length;

    for (let i = 0; i < total; i++) {
      const documentId = documentIds[i];
      const progress = Math.round(((i) / total) * 100);
      onProgress(progress);

      try {
        this.logger.log(
          `[${correlationId}] Archivage document ${i + 1}/${total} : ${documentId}`,
        );

        // ── Étape 1 : Récupération des infos document ────────────
        const doc = await this.documentService.getDocument(documentId);
        if (!doc) {
          this.logger.warn(
            `[${correlationId}] Document ${documentId} introuvable, ignoré`,
          );
          continue;
        }

        const relativePath = path.join(
          'tenants', tenantId, 'documents', documentId, 'original.pdf',
        );

        // ── Étape 2 : Conversion en PDF/A ───────────────────────
        const tempDir = this.config.get<string>('UPLOAD_TEMP_DIR', '/tmp/uploads');
        const outputPdf = path.join(tempDir, `archive-${documentId}.pdf`);

        try {
          await this.convertToPdfA(relativePath, outputPdf, doc.mimeType ?? 'application/pdf');
        } catch (convertErr) {
          this.logger.error(
            `[${correlationId}] Échec conversion PDF/A pour ${documentId} : ${convertErr.message}`,
          );
          throw new NonRetriableError(
            `Conversion PDF/A impossible pour ${documentId} (${convertErr.message})`,
          );
        }

        // ── Étape 3 : Signature électronique (PAdES) ────────────
        if (signElectronically) {
          try {
            await this.signPades(outputPdf, documentId);
          } catch (signErr) {
            this.logger.warn(
              `[${correlationId}] Signature PAdES ignorée pour ${documentId} : ${signErr.message}`,
            );
          }
        }

        // ── Étape 4 : Déplacement vers l'archive ────────────────
        // Utilise directement le filesystem pour déplacer vers LOCAL_STORAGE_ARCHIVE
        const archiveDir = path.join(
          this.config.get<string>('LOCAL_STORAGE_ARCHIVE', '/var/ged/archive'),
          'tenants', tenantId, documentId,
        );
        await fs.mkdir(archiveDir, { recursive: true });
        const destPath = path.join(archiveDir, 'archive.pdf');
        await fs.rename(outputPdf, destPath);

        this.logger.log(`[${correlationId}] Fichier archivé vers ${destPath}`);

        // ── Étape 5 : Mise à jour du statut ─────────────────────
        await this.documentService.updateStatus(documentId, DocumentStatus.ARCHIVED);

        // ── Étape 6 : Programmation de la destruction ───────────
        const retentionMs = this.resolveRetentionMs(archiveProfile);
        if (retentionMs > 0) {
          await this.archiveQueue.add(
            'destroy',
            { documentId, tenantId, correlationId },
            {
              delay: retentionMs,
              jobId: `destroy-${documentId}`,
            },
          );
          this.logger.log(
            `[${correlationId}] Destruction programmée dans ${Math.round(retentionMs / 86400000)} jours pour ${documentId}`,
          );
        }
      } catch (err) {
        this.logger.error(
          `[${correlationId}] Échec archivage document ${documentId} : ${err.message}`,
        );
        throw err; // Le processor gèrera le retry
      }
    }

    onProgress(100);
  }

  /**
   * Détruit un document archivé (nettoyage physique + logique).
   */
  async destroyDocument(
    data: { documentId: string; tenantId: string; correlationId: string },
    onProgress: (p: number) => void,
  ): Promise<void> {
    const { documentId, tenantId, correlationId } = data;
    this.logger.log(`[${correlationId}] Destruction document ${documentId}`);

    // Suppression du fichier d'archive
    const archiveDir = path.join(
      this.config.get<string>('LOCAL_STORAGE_ARCHIVE', '/var/ged/archive'),
      'tenants', tenantId, documentId,
    );
    await fs.rm(archiveDir, { recursive: true, force: true });

    this.logger.log(`[${correlationId}] Fichier archive supprimé : ${archiveDir}`);
    onProgress(100);
  }

  /**
   * Nettoie les fichiers temporaires et les vieux enregistrements.
   */
  async performCleanup(): Promise<void> {
    // 1. Supprimer fichiers dans UPLOAD_TEMP_DIR plus vieux que 24h
    const tempDir = this.config.get<string>('UPLOAD_TEMP_DIR', '/tmp/uploads');
    try {
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      const maxAge = 24 * 3600 * 1000; // 24h

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          const stat = await fs.stat(filePath);
          if (now - stat.mtimeMs > maxAge) {
            await fs.unlink(filePath);
            this.logger.debug(`Fichier temporaire nettoyé : ${filePath}`);
          }
        } catch {
          // Ignorer les erreurs individuelles
        }
      }
    } catch (err) {
      this.logger.warn(`Impossible de nettoyer ${tempDir} : ${err.message}`);
    }

    // 2. Purger JobRecord en état final (completed/failed) créés il y a > 30 jours
    // TODO: Implémenter la purge via le repository JobRecord
    // await this.jobRecordRepo.delete({
    //   status: In(['completed', 'failed']),
    //   createdAt: LessThan(new Date(Date.now() - 30 * 24 * 3600 * 1000)),
    // });

    this.logger.log('Nettoyage périodique terminé');
  }

  /**
   * Convertit un fichier en PDF/A en utilisant Ghostscript ou LibreOffice.
   */
  private async convertToPdfA(
    inputRelativePath: string,
    outputPath: string,
    mimeType: string,
  ): Promise<void> {
    if (!CONVERTIBLE_MIMES.has(mimeType)) {
      throw new NonRetriableError(
        `Type MIME non convertible en PDF/A : ${mimeType}`,
      );
    }

    const storageRoot = this.config.get<string>('LOCAL_STORAGE_ROOT', '/var/ged/storage');
    const inputPath = path.join(storageRoot, inputRelativePath);

    // Vérifier que le fichier source existe
    try {
      await fs.access(inputPath);
    } catch {
      throw new NonRetriableError(`Fichier source introuvable : ${inputPath}`);
    }

    if (mimeType === 'application/pdf') {
      // Utiliser Ghostscript pour PDF/A
      try {
        await execFileAsync(this.ghostscriptPath, [
          '-dPDFA',
          '-dPDFACompatibilityPolicy=1',
          '-dNOPAUSE',
          '-dBATCH',
          '-sDEVICE=pdfwrite',
          '-sOutputFile=' + outputPath,
          inputPath,
        ], { timeout: 120_000 });
      } catch (gsErr) {
        throw new NonRetriableError(
          `Ghostscript a échoué pour ${inputPath} : ${gsErr.message}`,
        );
      }
    } else {
      // Utiliser LibreOffice pour les autres formats (docx, xlsx, images)
      try {
        const tempDir = path.dirname(outputPath);
        await execFileAsync(this.libreofficePath, [
          '--headless',
          '--convert-to', 'pdf',
          '--outdir', tempDir,
          inputPath,
        ], { timeout: 120_000 });

        // LibreOffice crée un fichier .pdf du même nom, on le renomme
        const generatedPdf = path.join(tempDir, path.basename(inputPath, path.extname(inputPath)) + '.pdf');
        await fs.rename(generatedPdf, outputPath);
      } catch (loErr) {
        throw new NonRetriableError(
          `LibreOffice a échoué pour ${inputPath} : ${loErr.message}`,
        );
      }
    }
  }

  /**
   * Applique une signature électronique PAdES sur un PDF.
   * TODO: Implémenter avec une bibliothèque de signature (ex: node-signpdf, pdfsign).
   */
  private async signPades(pdfPath: string, documentId: string): Promise<void> {
    // Placeholder — en production, utiliser une bibliothèque comme node-signpdf
    // ou un appel API vers un service de signature externe.
    this.logger.log(`Signature PAdES simulée pour ${documentId} (${pdfPath})`);
  }

  /**
   * Résout la durée de rétention en millisecondes pour un profil d'archivage.
   * TODO: Charger depuis la base des profils de rétention.
   */
  private resolveRetentionMs(archiveProfile: string): number {
    // Profil par défaut : 365 jours
    return 365 * 24 * 3600 * 1000;
  }
}
