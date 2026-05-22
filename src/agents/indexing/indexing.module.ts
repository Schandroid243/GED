import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { IndexingProcessor } from './indexing.processor';
import { IndexingService } from './indexing.service';
import { DocumentModule } from '../../documents/document.module';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: QueueName.INDEXING,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
        },
      }),
      inject: [ConfigService],
    }),
    DocumentModule,
  ],
  providers: [IndexingService, IndexingProcessor],
})
export class IndexingModule {}
