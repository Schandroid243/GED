import { DocumentStatus } from '../enums/document-status.enum';
import { DocumentType } from '../enums/document-type.enum';
export declare class Document {
    id: string;
    tenantId: string;
    originalName: string;
    mimeType: string;
    status: DocumentStatus;
    documentType?: DocumentType;
    filePath?: string;
    thumbnailPath?: string;
    classificationConfidence?: number;
    indexed: boolean;
    metadata?: Record<string, string>;
    uploadedBy: string;
    createdAt?: Date;
    updatedAt: Date;
}
