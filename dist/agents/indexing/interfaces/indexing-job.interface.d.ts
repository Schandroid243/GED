export interface IndexingJobData {
    tenantId: string;
    documentId: string;
    textContent: string;
    metadata: Record<string, string>;
    correlationId: string;
    language: string;
}
