export interface DocumentIngestionJobData {
  tenantId:      string;   // UUID
  documentId:    string;   // UUID
  filePath:      string;   // chemin temporaire upload (ex: /tmp/uploads/abc.pdf)
  mimeType:      string;   // ex: 'application/pdf', 'image/tiff'
  originalName:  string;   // nom de fichier original
  uploadedBy:    string;   // UUID de l'utilisateur
  correlationId: string;   // UUID pour le tracing distribué
  metadata?:     Record<string, string>; // métadonnées libres du tenant
}
