import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { ArchiveProcessor } from './archive.processor';
import { ArchiveService } from './archive.service';
import { DocumentModule } from '../../documents/document.module';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: QueueName.ARCHIVE,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        defaultJobOptions: {
          attempts: 2,
          backoff: { type: 'fixed', delay: 300_000 }, // 5 minutes entre retries
        },
      }),
      inject: [ConfigService],
    }),
    DocumentModule,
  ],
  providers: [ArchiveService, ArchiveProcessor],
})
export class ArchiveModule {}
