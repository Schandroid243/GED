export interface DocumentIngestionJobData {
    tenantId: string;
    documentId: string;
    filePath: string;
    mimeType: string;
    originalName: string;
    uploadedBy: string;
    correlationId: string;
    metadata?: Record<string, string>;
}
