import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository, LessThan, In } from 'typeorm';
import * as fs from 'fs/promises';
import * as path from 'path';

import { QueueName } from '../../common/queues/queue-names.enum';
import { JobRecord } from '../entities/job-record.entity';

@Injectable()
export class CleanupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    @InjectQueue(QueueName.ARCHIVE)
    private readonly archiveQueue: Queue,
    @InjectRepository(JobRecord)
    private readonly jobRecordRepo: Repository<JobRecord>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Au démarrage de l'application, enregistre un job CRON répétable
   * qui déclenche le nettoyage toutes les 6 heures.
   */
  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.archiveQueue.add(
        'cleanup',
        {},
        {
          repeat: { cron: '0 */6 * * *' },
          jobId: 'recurring-cleanup',
        },
      );
      this.logger.log('Nettoyage périodique enregistré : toutes les 6h (CRON: 0 */6 * * *)');
    } catch (err) {
      this.logger.error(
        `Impossible d'enregistrer le CRON de nettoyage : ${err.message}`,
      );
    }
  }

  /**
   * Effectue le nettoyage :
   * 1. Supprime les fichiers dans UPLOAD_TEMP_DIR plus vieux que 24h
   * 2. Purge les JobRecord en état final (completed/failed) créés il y a > 30 jours
   * 3. Libère les verrous Redis orphelins (via redlock)
   */
  async performCleanup(): Promise<void> {
    this.logger.log('Début du nettoyage périodique...');

    // ── Étape 1 : Nettoyage des fichiers temporaires ───────────
    await this.cleanupTempFiles();

    // ── Étape 2 : Purge des JobRecord obsolètes ────────────────
    await this.purgeOldJobRecords();

    // ── Étape 3 : Libération des verrous Redis orphelins ───────
    await this.releaseOrphanedLocks();

    this.logger.log('Nettoyage périodique terminé.');
  }

  /**
   * Supprime les fichiers dans UPLOAD_TEMP_DIR plus vieux que 24h.
   */
  private async cleanupTempFiles(): Promise<void> {
    const tempDir = this.config.get<string>('UPLOAD_TEMP_DIR', '/tmp/uploads');
    const maxAgeMs = 24 * 3600 * 1000; // 24 heures
    const now = Date.now();

    let deletedCount = 0;

    try {
      await fs.mkdir(tempDir, { recursive: true });
      const files = await fs.readdir(tempDir);

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          const stat = await fs.stat(filePath);
          // Vérifier si le fichier a été modifié il y a plus de 24h
          if (now - stat.mtimeMs > maxAgeMs) {
            await fs.unlink(filePath);
            deletedCount++;
            this.logger.debug(`Fichier temporaire supprimé : ${filePath}`);
          }
        } catch {
          // Ignorer les erreurs sur les fichiers individuels
        }
      }
    } catch (err) {
      this.logger.warn(
        `Impossible de nettoyer le répertoire temporaire ${tempDir} : ${err.message}`,
      );
    }

    if (deletedCount > 0) {
      this.logger.log(`${deletedCount} fichier(s) temporaire(s) supprimé(s)`);
    }
  }

  /**
   * Purge les JobRecord en état final (completed, failed) créés il y a plus de 30 jours.
   */
  private async purgeOldJobRecords(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    try {
      const result = await this.jobRecordRepo.delete({
        status: In(['completed', 'failed']),
        createdAt: LessThan(thirtyDaysAgo),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(
          `${result.affected} enregistrement(s) JobRecord purgé(s) (plus de 30 jours)`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Erreur lors de la purge des JobRecord : ${err.message}`,
      );
    }
  }

  /**
   * Libère les verrous Redis orphelins.
   * TODO: Implémenter avec redlock pour libérer les verrous dont le TTL est expiré
   * et qui n'ont plus de propriétaire actif.
   */
  private async releaseOrphanedLocks(): Promise<void> {
    // Placeholder — en production :
    // 1. Lister tous les verrous Redis actifs via redlock
    // 2. Vérifier si le processus propriétaire existe encore
    // 3. Libérer les verrous orphelins
    this.logger.debug('Vérification des verrous Redis orphelins (non implémentée)');
  }
}
