import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { DocumentIngestionProcessor } from './document-ingestion.processor';
import { DocumentIngestionService } from './document-ingestion.service';
import { DocumentModule } from '../../documents/document.module';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: QueueName.DOCUMENT_INGESTION,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
      }),
      inject: [ConfigService],
    }),
    // Enregistrement de la file OCR pour pouvoir y pousser des jobs
    BullModule.registerQueue({ name: QueueName.OCR_EXTRACTION }),
    DocumentModule,
    StorageModule,
  ],
  providers: [DocumentIngestionService, DocumentIngestionProcessor],
})
export class DocumentIngestionModule {}
