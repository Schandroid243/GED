import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, Between } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';

import { Document } from './entities/document.entity';
import { OcrResult } from './entities/ocr-result.entity';
import { DocumentStatus } from './enums/document-status.enum';
import { DocumentType } from './enums/document-type.enum';
import { QueueName } from '../common/queues/queue-names.enum';
import { LocalStorageService } from '../storage/storage.service';
import { DocumentIngestionJobData } from '../agents/document-ingestion/interfaces/document-ingestion-job.interface';

export interface DocumentListParams {
  page: number;
  limit: number;
  status?: DocumentStatus | undefined;
  type?: DocumentType | undefined;
  search?: string | undefined;
  tenantId?: string | undefined;
  sort?: string | undefined;
  order?: 'ASC' | 'DESC' | undefined;
}

export interface DocumentListResult {
  data: Document[];
  total: number;
  page: number;
  limit: number;
}

export interface KpiStats {
  documentsToday: number;
  jobsWaiting: number;
  ocrSuccessRate: number;
  storageUsedBytes: number;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(OcrResult)
    private readonly ocrRepo: Repository<OcrResult>,
    private readonly storageService: LocalStorageService,
    @InjectQueue(QueueName.DOCUMENT_INGESTION)
    private readonly ingestionQueue: Queue,
  ) {}

  /** Liste paginee des documents */
  async findAll(params: DocumentListParams): Promise<DocumentListResult> {
    const { page = 1, limit = 20, status, type, search, tenantId, sort = 'createdAt', order = 'DESC' } = params;

    const where: FindOptionsWhere<Document> = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }
    if (status) {
      where.status = status;
    }
    if (type) {
      where.documentType = type;
    }
    if (search) {
      where.originalName = Like(`%${search}%`);
    }

    const [data, total] = await this.documentRepo.findAndCount({
      where,
      order: { [sort]: order },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /** Recupere un document par son ID */
  async findById(id: string): Promise<Document> {
    const doc = await this.documentRepo.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException(`Document ${id} introuvable`);
    }
    return doc;
  }

  /** Cree un document et enqueue le job d ingestion */
  async create(
    file: Express.Multer.File,
    tenantId: string,
    uploadedBy: string,
    metadata?: Record<string, string>,
  ): Promise<Document> {
    const documentId = uuidv4();
    const correlationId = uuidv4();

    // Stocker le fichier localement
    const stored = await this.storageService.store(
      file.path,
      tenantId,
      documentId,
      file.originalname,
    );

    // Creer l entree en base
    const doc = this.documentRepo.create({
      id: documentId,
      tenantId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      status: DocumentStatus.RECEIVED,
      filePath: stored.relativePath,
      uploadedBy,
      metadata: metadata ?? {},
    });

    const saved = await this.documentRepo.save(doc);

    // Enqueue le job d ingestion
    const jobData: DocumentIngestionJobData = {
      tenantId,
      documentId,
      filePath: stored.relativePath,
      mimeType: file.mimetype,
      originalName: file.originalname,
      uploadedBy,
      correlationId,
      ...(metadata !== undefined ? { metadata } : {}),
    };

    await this.ingestionQueue.add('ingest', jobData, {
      jobId: `ingest-${documentId}`,
      priority: 2,
    });

    this.logger.log(`[${correlationId}] Document ${documentId} cree et job ingestion enqueue`);

    return saved;
  }

  /** Supprime un document et ses fichiers */
  async delete(id: string): Promise<void> {
    const doc = await this.findById(id);
    await this.storageService.deleteDocument(doc.tenantId, id);
    await this.documentRepo.remove(doc);
    this.logger.log(`Document ${id} supprime`);
  }

  /** Met a jour les metadonnees d un document */
  async updateMetadata(id: string, metadata: Record<string, string>): Promise<Document> {
    const doc = await this.findById(id);
    doc.metadata = { ...doc.metadata, ...metadata };
    return this.documentRepo.save(doc);
  }

  /** Recupere le texte OCR d un document */
  async findOcrByDocumentId(documentId: string): Promise<OcrResult[]> {
    return this.ocrRepo.find({
      where: { documentId },
      order: { pageNumber: 'ASC' },
    });
  }

  /** Recupere les KPI du tableau de bord */
  async getKpiStats(tenantId?: string): Promise<KpiStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const whereBase: FindOptionsWhere<Document> = {};
    if (tenantId) {
      whereBase.tenantId = tenantId;
    }

    // Documents traites aujourd hui
    const documentsToday = await this.documentRepo.count({
      where: { ...whereBase, createdAt: Between(today, tomorrow) },
    });

    // Taux de reussite OCR (7 derniers jours)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    const totalOcrDocs = await this.documentRepo.count({
      where: { ...whereBase, status: DocumentStatus.OCR_COMPLETED, updatedAt: Between(sevenDaysAgo, new Date()) },
    });

    const totalFailedOcrDocs = await this.documentRepo.count({
      where: { ...whereBase, status: DocumentStatus.DOCUMENT_ERROR, updatedAt: Between(sevenDaysAgo, new Date()) },
    });

    const ocrSuccessRate = totalOcrDocs + totalFailedOcrDocs > 0
      ? Math.round((totalOcrDocs / (totalOcrDocs + totalFailedOcrDocs)) * 100)
      : 100;

    // Stockage utilise (local)
    let storageUsedBytes = 0;
    if (tenantId) {
      storageUsedBytes = await this.storageService.tenantUsage(tenantId);
    }

    return {
      documentsToday,
      jobsWaiting: 0, // sera peuple par le controller jobs
      ocrSuccessRate,
      storageUsedBytes,
    };
  }
}
