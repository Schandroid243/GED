export interface ClassificationJobData {
    tenantId: string;
    documentId: string;
    ocrText: string;
    existingMetadata: Record<string, string>;
    correlationId: string;
    useMlModel?: boolean;
}
