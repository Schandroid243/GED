import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { OcrResult } from './entities/ocr-result.entity';
import { DocumentService } from './document.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, OcrResult]),
  ],
  providers: [DocumentService],
  exports: [
    TypeOrmModule,   // permet aux agents d'injecter les repositories
    DocumentService, // partagé entre tous les agents
  ],
})
export class DocumentModule {}
