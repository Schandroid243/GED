export enum DocumentStatus {
  UPLOADING         = 'UPLOADING',
  RECEIVED          = 'RECEIVED',
  SCANNING          = 'SCANNING',         // antivirus en cours
  SCAN_FAILED       = 'SCAN_FAILED',
  OCR_IN_PROGRESS   = 'OCR_IN_PROGRESS',
  OCR_COMPLETED     = 'OCR_COMPLETED',
  OCR_PARTIAL       = 'OCR_PARTIAL',      // pages partiellement extraites
  CLASSIFIED        = 'CLASSIFIED',
  INDEXED           = 'INDEXED',
  ARCHIVED          = 'ARCHIVED',
  DOCUMENT_ERROR    = 'DOCUMENT_ERROR',
}
