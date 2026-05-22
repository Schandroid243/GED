import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { DocumentStatus } from './enums/document-status.enum';
import { DocumentType } from './enums/document-type.enum';
export declare class DocumentService {
    private readonly documentRepo;
    private readonly logger;
    constructor(documentRepo: Repository<Document>);
    updateStatus(documentId: string, status: DocumentStatus): Promise<void>;
    updateClassification(documentId: string, documentType: DocumentType, confidence: number): Promise<void>;
    markIndexed(documentId: string): Promise<void>;
    markArchived(documentId: string): Promise<void>;
    markError(documentId: string, reason: string): Promise<void>;
    findById(documentId: string): Promise<Document | null>;
    findByTenant(tenantId: string, options?: {
        status?: DocumentStatus;
        limit?: number;
        offset?: number;
    }): Promise<[Document[], number]>;
}
