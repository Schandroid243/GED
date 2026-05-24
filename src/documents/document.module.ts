import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { OcrResult } from './entities/ocr-result.entity';
import { DocumentService } from './document.service';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { QueueName } from '../common/queues/queue-names.enum';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, OcrResult]),
    BullModule.registerQueue({ name: QueueName.DOCUMENT_INGESTION }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentService, DocumentsService],
  exports: [
    TypeOrmModule,
    DocumentService,
    DocumentsService,
  ],
})
export class DocumentModule {}

