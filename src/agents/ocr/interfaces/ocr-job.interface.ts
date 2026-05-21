export interface OcrJobData {
  tenantId:      string;          // UUID
  documentId:    string;          // UUID
  filePath:      string;          // chemin relatif depuis LOCAL_STORAGE_ROOT (ex: tenants/uuid/documents/uuid/original.pdf)
  language:      string;          // code ISO 639-2 (fra, eng, deu, ...)
  correlationId: string;          // UUID pour le tracing distribué
  pageRange?:    [number, number]; // pages [début, fin] (1-indexé), undefined = toutes
  priority?:     1 | 2 | 3;       // 1=haute, 2=normale, 3=basse
}
