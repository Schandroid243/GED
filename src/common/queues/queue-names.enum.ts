export enum QueueName {
  DOCUMENT_INGESTION = 'document-ingestion',
  OCR_EXTRACTION     = 'ocr-extraction',
  CLASSIFICATION     = 'classification',
  INDEXING           = 'indexing',
  WORKFLOW_ENGINE    = 'workflow-engine',
  NOTIFICATION       = 'notification',
  ARCHIVE            = 'archive',
  DEAD_LETTER        = 'dead-letter',
}
