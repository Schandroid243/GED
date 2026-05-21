import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { OcrProcessor } from './ocr.processor';
import { OcrService } from './ocr.service';
import { DocumentModule } from '../../documents/document.module';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: QueueName.OCR_EXTRACTION,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: QueueName.CLASSIFICATION }),
    DocumentModule,
  ],
  providers: [OcrService, OcrProcessor],
  exports: [OcrService],
})
export class OcrModule {}
