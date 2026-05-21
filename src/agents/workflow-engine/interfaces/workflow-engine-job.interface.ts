export type WorkflowEventType =
  | 'DOCUMENT_RECEIVED'
  | 'DOCUMENT_CLASSIFIED'
  | 'APPROVAL_SUBMITTED'
  | 'APPROVAL_REJECTED'
  | 'ARCHIVE_TRIGGERED';

export interface WorkflowEngineJobData {
  tenantId:      string;                    // UUID
  documentId:    string;                    // UUID
  eventType:     WorkflowEventType;
  correlationId: string;                    // UUID pour le tracing distribué
  context?:      Record<string, unknown>;   // données métier contextuelles
}
