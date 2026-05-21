export interface ClassificationJobData {
  tenantId:         string;              // UUID
  documentId:       string;              // UUID
  ocrText:          string;              // texte brut extrait par OCR
  existingMetadata: Record<string, string>;
  correlationId:    string;              // UUID pour le tracing distribué
  useMlModel?:      boolean;             // surchargé par AGENT_ML_CLASSIFICATION
}
