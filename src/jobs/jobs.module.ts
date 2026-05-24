import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueName } from '../common/queues/queue-names.enum';
import { JobRecord } from '../agents/entities/job-record.entity';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobRecord]),
    BullModule.registerQueue(
      { name: QueueName.DOCUMENT_INGESTION },
      { name: QueueName.OCR_EXTRACTION },
      { name: QueueName.CLASSIFICATION },
      { name: QueueName.INDEXING },
      { name: QueueName.WORKFLOW_ENGINE },
      { name: QueueName.NOTIFICATION },
      { name: QueueName.ARCHIVE },
      { name: QueueName.DEAD_LETTER },
    ),
  ],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}

