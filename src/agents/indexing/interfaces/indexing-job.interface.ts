export interface IndexingJobData {
  tenantId:      string;              // UUID
  documentId:    string;              // UUID
  textContent:   string;              // texte brut à indexer
  metadata:      Record<string, string>;
  correlationId: string;              // UUID pour le tracing distribué
  language:      string;              // code ISO 639-2 (fra, eng, ...)
}
