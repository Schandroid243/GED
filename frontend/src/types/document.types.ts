export type DocumentStatus =
  | 'UPLOADING' | 'RECEIVED' | 'SCANNING' | 'SCAN_FAILED'
  | 'OCR_IN_PROGRESS' | 'OCR_COMPLETED' | 'OCR_PARTIAL'
  | 'CLASSIFIED' | 'INDEXED' | 'ARCHIVED' | 'DOCUMENT_ERROR';

export type DocumentType =
  | 'INVOICE' | 'CONTRACT' | 'ID_CARD' | 'RECEIPT' | 'REPORT' | 'UNKNOWN';

export interface Document {
  id:                       string;
  tenantId:                 string;
  originalName:             string;
  mimeType:                 string;
  status:                   DocumentStatus;
  documentType:             DocumentType | null;
  classificationConfidence: number | null; // 0.0 – 1.0
  indexed:                  boolean;
  filePath:                 string;        // chemin relatif LOCAL_STORAGE_ROOT
  thumbnailPath:            string | null;
  metadata:                 Record<string, string>;
  uploadedBy:               string;        // UUID utilisateur
  createdAt:                string;        // ISO 8601
  updatedAt:                string;
}

export interface DocumentListResponse {
  data:  Document[];
  total: number;
  page:  number;
  limit: number;
}

export interface OcrPage {
  pageNumber: number;
  rawText:    string;
}
