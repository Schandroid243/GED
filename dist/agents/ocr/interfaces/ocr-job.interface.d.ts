export interface OcrJobData {
    tenantId: string;
    documentId: string;
    filePath: string;
    language: string;
    correlationId: string;
    pageRange?: [number, number];
    priority?: 1 | 2 | 3;
}
