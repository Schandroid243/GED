export interface ArchiveJobData {
  tenantId:            string;    // UUID
  documentIds:         string[];  // batch d'IDs à archiver
  archiveProfile:      string;    // ID du profil de rétention (en base)
  correlationId:       string;    // UUID pour le tracing distribué
  signElectronically?: boolean;   // signature PAdES long terme
}
