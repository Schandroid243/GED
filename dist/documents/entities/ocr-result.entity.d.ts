export declare class OcrResult {
    id: string;
    documentId: string;
    tenantId: string;
    pageNumber: number;
    rawText: string;
    hocrData?: Record<string, unknown>;
    language: string;
    createdAt: Date;
}
