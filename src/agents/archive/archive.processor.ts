import { Processor, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { ArchiveService } from './archive.service';
import { ArchiveJobData } from './interfaces/archive-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

interface DestroyJobData {
  documentId: string;
  tenantId: string;
  correlationId: string;
}

@Processor(QueueName.ARCHIVE, { concurrency: 2 })
export class ArchiveProcessor extends WorkerHost {
  private readonly logger = new Logger(ArchiveProcessor.name);

  constructor(
    private readonly archiveService: ArchiveService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<ArchiveJobData | DestroyJobData | Record<string, never>, unknown, string>): Promise<void> {
    const jobData = job.data;

    // Routage par nom de job défini lors de l'ajout
    if ('documentIds' in jobData && Array.isArray(jobData.documentIds)) {
      return this.handleBatchArchive(job as Job<ArchiveJobData>);
    } else if ('documentId' in jobData && 'tenantId' in jobData && !('documentIds' in jobData)) {
      return this.handleDestroy(job as Job<DestroyJobData>);
    } else {
      return this.handleCleanup(job as Job);
    }
  }

  /**
   * Traite un lot de documents à archiver (job batch).
   */
  private async handleBatchArchive(job: Job<ArchiveJobData>): Promise<void> {
    const { documentIds, correlationId, tenantId } = job.data;
    this.logger.log(
      `[${correlationId}] Archivage batch démarré : ${documentIds.length} document(s) pour tenant=${tenantId}`,
    );

    try {
      await this.archiveService.archiveDocuments(job.data, (p) => job.updateProgress(p));
      this.logger.log(
        `[${correlationId}] Archivage batch terminé : ${documentIds.length} document(s)`,
      );
    } catch (error: unknown) {
      if (error instanceof NonRetriableError) {
        this.logger.error(
          `[${correlationId}] Erreur non-retriable archivage batch : ${error.message}`,
        );
        throw error;
      }
      if (error instanceof Error) {
        this.logger.warn(
          `[${correlationId}] Échec transitoire archivage batch, retry planifié : ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Traite la destruction programmée d'un document unique.
   */
  private async handleDestroy(job: Job<DestroyJobData>): Promise<void> {
    const { documentId, correlationId } = job.data;
    this.logger.log(`[${correlationId}] Destruction document démarrée : ${documentId}`);

    try {
      await this.archiveService.destroyDocument(job.data, (p) => job.updateProgress(p));
      this.logger.log(`[${correlationId}] Destruction terminée : ${documentId}`);
    } catch (error: unknown) {
      if (error instanceof NonRetriableError) {
        this.logger.error(
          `[${correlationId}] Erreur non-retriable destruction : ${error.message}`,
        );
        throw error;
      }
      if (error instanceof Error) {
        this.logger.warn(
          `[${correlationId}] Échec transitoire destruction, retry planifié : ${error.message}`,
        );
      }
      throw error;
    }
  }

  /**
   * Nettoie les fichiers temporaires et les vieux enregistrements (job CRON).
   */
  private async handleCleanup(job: Job): Promise<void> {
    this.logger.log(`Nettoyage périodique démarré (job ${job.id})`);
    try {
      await this.archiveService.performCleanup();
      this.logger.log('Nettoyage périodique terminé');
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Échec du nettoyage périodique : ${error.message}`);
      }
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<ArchiveJobData>, error: Error): Promise<void> {
    this.logger.error(
      `[${job.data?.correlationId ?? 'N/A'}] Job archive ${job.id} échoué définitivement : ${error.message}`,
    );
    // Reprogrammation manuelle nécessaire (log + alerte)
  }
}
