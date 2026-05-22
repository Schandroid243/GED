import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueName } from '../../common/queues/queue-names.enum';
import { CleanupService } from './cleanup.service';
import { JobRecord } from '../entities/job-record.entity';

@Module({
  imports: [
    // Enregistrement de la file ARCHIVE pour pouvoir y pousser des jobs CRON
    BullModule.registerQueue({ name: QueueName.ARCHIVE }),
    // Repository pour les requêtes de purge
    TypeOrmModule.forFeature([JobRecord]),
  ],
  providers: [CleanupService],
})
export class CleanupModule {}
