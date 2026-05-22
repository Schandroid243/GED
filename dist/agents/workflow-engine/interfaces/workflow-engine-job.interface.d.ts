export type WorkflowEventType = 'DOCUMENT_RECEIVED' | 'DOCUMENT_CLASSIFIED' | 'APPROVAL_SUBMITTED' | 'APPROVAL_REJECTED' | 'ARCHIVE_TRIGGERED';
export interface WorkflowEngineJobData {
    tenantId: string;
    documentId: string;
    eventType: WorkflowEventType;
    correlationId: string;
    context?: Record<string, unknown>;
}
