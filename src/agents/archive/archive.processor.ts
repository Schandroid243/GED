import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { ArchiveService } from './archive.service';
import { ArchiveJobData } from './interfaces/archive-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

@Processor(QueueName.ARCHIVE)
export class ArchiveProcessor {
  private readonly logger = new Logger(ArchiveProcessor.name);
  private readonly concurrency: number;

  constructor(
    private readonly archiveService: ArchiveService,
    private readonly config: ConfigService,
  ) {
    this.concurrency = config.get<number>('ARCHIVE_CONCURRENCY', 2);
  }

  /**
   * Traite un lot de documents à archiver (job batch).
   */
  @Process({ name: 'batch-archive', concurrency: 2 })
  async handleBatchArchive(job: Job<ArchiveJobData>): Promise<void> {
    const { documentIds, correlationId, tenantId } = job.data;
    this.logger.log(
      `[${correlationId}] Archivage batch démarré : ${documentIds.length} document(s) pour tenant=${tenantId}`,
    );

    await job.updateProgress(0);
    try {
      await this.archiveService.archiveDocuments(job.data, (p) => job.updateProgress(p));
      await job.updateProgress(100);
      this.logger.log(
        `[${correlationId}] Archivage batch terminé : ${documentIds.length} document(s)`,
      );
    } catch (error) {
      if (error instanceof NonRetriableError) {
        this.logger.error(
          `[${correlationId}] Erreur non-retriable archivage batch : ${error.message}`,
        );
        throw error;
      }
      this.logger.warn(
        `[${correlationId}] Échec transitoire archivage batch, retry planifié : ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Traite la destruction programmée d'un document unique.
   */
  @Process({ name: 'destroy', concurrency: 2 })
  async handleDestroy(job: Job<{ documentId: string; tenantId: string; correlationId: string }>): Promise<void> {
    const { documentId, correlationId } = job.data;
    this.logger.log(`[${correlationId}] Destruction document démarrée : ${documentId}`);

    await job.updateProgress(0);
    try {
      await this.archiveService.destroyDocument(job.data, (p) => job.updateProgress(p));
      await job.updateProgress(100);
      this.logger.log(`[${correlationId}] Destruction terminée : ${documentId}`);
    } catch (error) {
      if (error instanceof NonRetriableError) {
        this.logger.error(
          `[${correlationId}] Erreur non-retriable destruction : ${error.message}`,
        );
        throw error;
      }
      this.logger.warn(
        `[${correlationId}] Échec transitoire destruction, retry planifié : ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Nettoie les fichiers temporaires et les vieux enregistrements (job CRON).
   */
  @Process({ name: 'cleanup', concurrency: 1 })
  async handleCleanup(job: Job): Promise<void> {
    this.logger.log(`Nettoyage périodique démarré (job ${job.id})`);
    try {
      await this.archiveService.performCleanup();
      this.logger.log('Nettoyage périodique terminé');
    } catch (error) {
      this.logger.error(`Échec du nettoyage périodique : ${error.message}`);
      throw error;
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job<ArchiveJobData>, error: Error): Promise<void> {
    this.logger.error(
      `[${job.data?.correlationId ?? 'N/A'}] Job archive ${job.id} échoué définitivement : ${error.message}`,
    );
    // Reprogrammation manuelle nécessaire (log + alerte)
  }
}
