import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { DocumentStatus } from './enums/document-status.enum';
import { DocumentType } from './enums/document-type.enum';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
  ) {}

  /** Met à jour le statut d'un document */
  async updateStatus(documentId: string, status: DocumentStatus): Promise<void> {
    await this.documentRepo.update(documentId, { status });
    this.logger.debug(`Document ${documentId} → statut ${status}`);
  }

  /** Met à jour le type et la confiance après classification */
  async updateClassification(
    documentId: string,
    documentType: DocumentType,
    confidence: number,
  ): Promise<void> {
    await this.documentRepo.update(documentId, {
      documentType,
      classificationConfidence: confidence,
      status: DocumentStatus.CLASSIFIED,
    });
    this.logger.debug(`Document ${documentId} classifié : ${documentType} (${confidence})`);
  }

  /** Marque un document comme indexé */
  async markIndexed(documentId: string): Promise<void> {
    await this.documentRepo.update(documentId, {
      indexed: true,
      status: DocumentStatus.INDEXED,
    });
    this.logger.debug(`Document ${documentId} indexé`);
  }

  /** Marque un document comme archivé */
  async markArchived(documentId: string): Promise<void> {
    await this.documentRepo.update(documentId, {
      status: DocumentStatus.ARCHIVED,
    });
    this.logger.debug(`Document ${documentId} archivé`);
  }

  /** Marque un document en erreur */
  async markError(documentId: string, reason: string): Promise<void> {
    await this.documentRepo.update(documentId, {
      status: DocumentStatus.DOCUMENT_ERROR,
    });
    this.logger.error(`Document ${documentId} en erreur : ${reason}`);
  }

  /** Récupère un document par son ID */
  async findById(documentId: string): Promise<Document | null> {
    return this.documentRepo.findOne({ where: { id: documentId } });
  }

  /** Récupère la liste des documents d'un tenant (pour les agents) */
  async findByTenant(
    tenantId: string,
    options?: { status?: DocumentStatus; limit?: number; offset?: number },
  ): Promise<[Document[], number]> {
    const where: Record<string, unknown> = { tenantId };
    if (options?.status) {
      where.status = options.status;
    }
    return this.documentRepo.findAndCount({
      where,
      take: options?.limit ?? 100,
      skip: options?.offset ?? 0,
      order: { updatedAt: 'DESC' },
    });
  }
}
