import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { ClassificationProcessor } from './classification.processor';
import { ClassificationService } from './classification.service';
import { DocumentModule } from '../../documents/document.module';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: QueueName.CLASSIFICATION,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'fixed', delay: 500 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: QueueName.INDEXING }),
    BullModule.registerQueue({ name: QueueName.WORKFLOW_ENGINE }),
    DocumentModule,
  ],
  providers: [ClassificationService, ClassificationProcessor],
})
export class ClassificationModule {}
